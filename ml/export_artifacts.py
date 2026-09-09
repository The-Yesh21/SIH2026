"""Export the trained model and the real dataset into the web app.

Writes to src/data/:
  model.json      – the trained LightGBM trees (compact form of Booster.dump_model)
  dataset.json    – corridor, stations, section statistics, dataset summary
  evaluation.json – measured test metrics, baseline comparison, feature importance
  journeys.json   – real historical journeys used by the replay/demo mode
  scenarios.json  – labeled real journey scenarios for the scenario library
  sources.json    – data provenance

The browser scorer walks exactly these trees, so app predictions come from the
trained model rather than a reimplemented formula. A parity check against the
Python booster is run here and its result is stored in evaluation.json.
"""

from __future__ import annotations

import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
MODELS = ROOT / "models"
OUT = ROOT / "src" / "data"
MAX_JOURNEYS = 120
SCENARIO_CANDIDATES = 60


def compact_trees(dump: dict) -> dict:
    feature_names = dump["feature_names"]
    index = {name: i for i, name in enumerate(feature_names)}

    def walk(node: dict) -> dict:
        if "leaf_value" in node:
            return {"v": round(float(node["leaf_value"]), 8)}
        return {
            "f": index[feature_names[node["split_feature"]]],
            "t": float(node["threshold"]),
            "d": node["decision_type"],
            "dl": bool(node.get("default_left", False)),
            "l": walk(node["left_child"]),
            "r": walk(node["right_child"]),
        }

    return {
        "feature_names": feature_names,
        "trees": [walk(t["tree_structure"]) for t in dump["tree_info"]],
    }


def score_js_equivalent(model: dict, rows: list[list[float]]) -> list[float]:
    """Reference implementation of the browser scorer, used for the parity check."""
    out = []
    for row in rows:
        total = 0.0
        for tree in model["trees"]:
            node = tree
            while "v" not in node:
                value = row[node["f"]]
                go_left = value <= node["t"] if node["d"] == "<=" else value == node["t"]
                node = node["l"] if go_left else node["r"]
            total += node["v"]
        out.append(total)
    return out


def classify_scenario(grp: pd.DataFrame) -> dict:
    """Classify a real journey into an operating-pattern scenario.

    Every label is derived from the genuine observed delays and section times.
    No manual fabrication — the rules are deterministic functions of the data.
    """
    delays = grp["current_delay"].astype(float)
    section_times = grp["actual_section_travel_time"].astype(float)
    sched_times = grp["scheduled_section_travel_time"].astype(float)
    start_delay = float(delays.iloc[0])
    final_delay = float(delays.iloc[-1])
    max_delay = float(delays.max())
    min_delay = float(delays.min())

    delay_delta = final_delay - start_delay
    section_overages = section_times - sched_times
    mean_overage = float(section_overages.mean())
    max_overage = float(section_overages.max())
    slow_sections = int((section_overages > 2.0).sum())
    total_sections = len(grp)

    label = "Irregular journey"
    if abs(delay_delta) <= 3 and max_delay <= 5:
        label = "On-time journey"
    elif delay_delta < -5 and max_delay <= 15:
        label = "Delay recovery"
    elif delay_delta > 10 and final_delay >= max_delay * 0.8:
        label = "Delay increasing"
    elif slow_sections >= total_sections * 0.5 and mean_overage > 3:
        label = "Slow section"
    elif slow_sections > 0 and max_overage > 8:
        label = "Slow section"

    affected_sections = [
        r.section_id
        for r in grp.itertuples()
        if float(r.actual_section_travel_time) - float(r.scheduled_section_travel_time) > 2.0
    ]

    return {
        "label": label,
        "train_id": str(grp["train_id"].iloc[0]),
        "train_name": str(grp["train_name"].iloc[0]),
        "date": str(grp["date"].iloc[0]),
        "source_url": str(grp["source_url"].iloc[0]),
        "journey_id": str(grp["journey_id"].iloc[0]),
        "starting_delay_minutes": round(start_delay, 1),
        "maximum_delay_minutes": round(max_delay, 1),
        "final_delay_minutes": round(final_delay, 1),
        "delay_change_minutes": round(delay_delta, 1),
        "sections_affected": affected_sections,
        "total_sections": total_sections,
        "reason": _scenario_reason(label, start_delay, max_delay, final_delay, delay_delta, slow_sections, mean_overage),
    }


def _scenario_reason(
    label: str,
    start_delay: float,
    max_delay: float,
    final_delay: float,
    delay_delta: float,
    slow_sections: int,
    mean_overage: float,
) -> str:
    if label == "On-time journey":
        return f"Started with {start_delay:.0f} min delay, peaked at {max_delay:.0f} min, ended at {final_delay:.0f} min — tightly controlled."
    if label == "Delay recovery":
        return f"Started {start_delay:.0f} min late but recovered to {final_delay:.0f} min by destination (Δ {delay_delta:.0f} min)."
    if label == "Delay increasing":
        return f"Delay grew from {start_delay:.0f} to {final_delay:.0f} min over the journey (Δ +{delay_delta:.0f} min)."
    if label == "Slow section":
        return f"{slow_sections} sections ran >2 min over schedule (mean overage {mean_overage:.1f} min)."
    return f"Started {start_delay:.0f} min, peaked at {max_delay:.0f} min, ended at {final_delay:.0f} min; {slow_sections} slow sections."


def build_scenarios(df: pd.DataFrame, max_scenarios: int = 20) -> list[dict]:
    """Build a scenario library from genuine journeys, one per scenario type."""
    journeys = []
    for jid in df["journey_id"].unique():
        grp = df[df["journey_id"] == jid].sort_values("station_sequence")
        if len(grp) < 3:
            continue
        journeys.append((jid, classify_scenario(grp)))

    by_label: dict[str, list[tuple[str, dict]]] = {}
    for jid, scen in journeys:
        by_label.setdefault(scen["label"], []).append((jid, scen))

    out: list[dict] = []
    seen_labels: set[str] = set()
    priority = ["On-time journey", "Delay recovery", "Delay increasing", "Slow section", "Long station dwell", "Irregular journey"]

    for label in priority:
        if label in seen_labels:
            continue
        seen_labels.add(label)
        candidates = by_label.get(label, [])
        if not candidates:
            continue
        candidates_sorted = sorted(candidates, key=lambda x: x[1]["journey_id"])
        for _, scen in candidates_sorted[:max_scenarios // len(by_label) or 1]:
            out.append(scen)

    return out[:max_scenarios]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    meta = json.loads((MODELS / "model_metadata.json").read_text())
    features = meta["features"]
    booster = lgb.Booster(model_file=str(MODELS / "model.txt"))
    dump = json.loads((MODELS / "model_dump.json").read_text())
    model_json = compact_trees(dump)

    df = pd.read_parquet(PROCESSED / "features.parquet")
    test = pd.read_parquet(PROCESSED / "split_test.parquet")

    # ---- historical section statistics (real data only) -------------------
    stats: dict[str, dict] = {}
    for section_id, grp in df.groupby("section_id"):
        stats[section_id] = {
            "section_id": section_id,
            "from": grp["section_from"].iloc[0],
            "from_name": grp["section_from_name"].iloc[0],
            "to": grp["section_to"].iloc[0],
            "to_name": grp["section_to_name"].iloc[0],
            "observations": int(len(grp)),
            "mean": round(float(grp["actual_section_travel_time"].mean()), 2),
            "median": round(float(grp["actual_section_travel_time"].median()), 2),
            "variance": round(float(grp["actual_section_travel_time"].var(ddof=1) or 0), 3),
            "scheduled_mean": round(float(grp["scheduled_section_travel_time"].mean()), 2),
            "distance_km": round(float(grp["section_distance_km"].median()), 2),
            "remaining_km": round(float(grp["remaining_distance_km"].median()), 2),
            "station_sequence": int(grp["station_sequence"].median()),
        }
    (PROCESSED / "section_stats.json").write_text(json.dumps(stats, indent=2))

    # ---- parity check: python booster vs browser tree walk ----------------
    sample = test[features].head(200)
    py = booster.predict(sample)
    js = score_js_equivalent(model_json, sample.to_numpy().tolist())
    max_diff = float(np.max(np.abs(np.array(py) - np.array(js)))) if len(py) else 0.0

    evaluation = json.loads((MODELS / "evaluation.json").read_text())
    evaluation["browser_scorer_parity_max_abs_diff"] = round(max_diff, 10)
    evaluation["model_metadata"] = {
        k: meta[k]
        for k in ["model", "prediction_target", "training_date", "features", "weather_used", "split", "best_iteration"]
    }
    evaluation["model_parameters"] = meta["parameters"]
    (MODELS / "evaluation.json").write_text(json.dumps(evaluation, indent=2))

    # ---- station geography from the real route payloads -------------------
    routes = json.loads((ROOT / "data" / "raw" / "train_routes.json").read_text())
    coords: dict[str, dict] = {}
    for route in routes.values():
        for stop in route.get("route") or []:
            st = stop.get("station") or {}
            code = st.get("code")
            if code and code not in coords and st.get("lat"):
                coords[code] = {"code": code, "name": st.get("name"), "lat": st["lat"], "lng": st["lng"]}

    corridor_order = (
        df.groupby("section_from")["station_sequence"].min().sort_values().index.tolist()
    )
    corridor_stations = []
    for code in corridor_order + [df.sort_values("station_sequence")["section_to"].iloc[-1]]:
        if code in coords and code not in [s["code"] for s in corridor_stations]:
            corridor_stations.append(coords[code])

    # ---- journeys for the replay / demo mode ------------------------------
    journeys = []
    recent = df.sort_values("date", ascending=False)["journey_id"].unique()[:MAX_JOURNEYS]
    for jid in recent:
        grp = df[df["journey_id"] == jid].sort_values("station_sequence")
        if len(grp) < 3:
            continue
        journeys.append(
            {
                "journey_id": jid,
                "train_id": grp["train_id"].iloc[0],
                "train_name": grp["train_name"].iloc[0],
                "date": str(grp["date"].iloc[0]),
                "source_url": grp["source_url"].iloc[0],
                "hops": [
                    {
                        "from": r.section_from,
                        "from_name": r.section_from_name,
                        "to": r.section_to,
                        "to_name": r.section_to_name,
                        "section_id": r.section_id,
                        "station_sequence": int(r.station_sequence),
                        "section_distance_km": round(float(r.section_distance_km), 2),
                        "remaining_distance_km": round(float(r.remaining_distance_km), 2),
                        "scheduled_departure": pd.Timestamp(r.scheduled_departure).isoformat(),
                        "actual_departure": pd.Timestamp(r.actual_departure).isoformat(),
                        "scheduled_arrival_next": pd.Timestamp(r.scheduled_arrival_next).isoformat(),
                        "actual_arrival_next": pd.Timestamp(r.actual_arrival_next).isoformat(),
                        "scheduled_section_travel_time": round(float(r.scheduled_section_travel_time), 2),
                        "actual_section_travel_time": round(float(r.actual_section_travel_time), 2),
                        "departure_delay_minutes": float(r.current_delay),
                        "next_arrival_delay_minutes": None
                        if pd.isna(r.next_arrival_delay_minutes)
                        else float(r.next_arrival_delay_minutes),
                        "features": {f: float(getattr(r, f)) for f in features},
                    }
                    for r in grp.itertuples()
                ],
            }
        )

    # ---- scenario library from genuine journeys ---------------------------
    scenarios = build_scenarios(df, max_scenarios=20)

    summary = json.loads((PROCESSED / "dataset_summary.json").read_text())
    cleaning = json.loads((PROCESSED / "cleaning_report.json").read_text())
    trains = (
        df.groupby(["train_id", "train_name"])
        .agg(journeys=("journey_id", "nunique"), sections=("section_id", "count"))
        .reset_index()
        .sort_values("journeys", ascending=False)
        .to_dict("records")
    )

    (OUT / "model.json").write_text(json.dumps(model_json, separators=(",", ":")))
    (OUT / "evaluation.json").write_text(json.dumps(evaluation, indent=2))
    (OUT / "journeys.json").write_text(json.dumps(journeys, separators=(",", ":")))
    (OUT / "scenarios.json").write_text(json.dumps(scenarios, separators=(",", ":")))
    (OUT / "sources.json").write_text((ROOT / "data" / "data_sources.json").read_text())
    (OUT / "dataset.json").write_text(
        json.dumps(
            {
                "summary": summary,
                "cleaning_report": cleaning,
                "trains": trains,
                "sections": list(stats.values()),
                "stations": corridor_stations,
                "feature_config": {
                    "features": features,
                    "fill_values": meta["fill_values"],
                    "train_codes": meta["train_codes"],
                    "section_codes": meta["section_codes"],
                    "weather_used": meta["weather_used"],
                },
            },
            indent=2,
            default=str,
        )
    )
    print(f"exported. browser/python parity max abs diff = {max_diff:.3e}")
    print(f"exported {len(journeys)} journeys, {len(scenarios)} scenarios")


if __name__ == "__main__":
    main()
