"""Build a clean, corridor-only station-level dataset from the raw scrape.

Rules enforced here:
  * only genuine observations are kept — nothing is imputed into the actuals
  * bad records are DROPPED, never repaired with invented values
  * every row keeps the source URL it came from
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RAW = DATA / "raw"
PROCESSED = DATA / "processed"
CONFIG = json.loads((ROOT / "config" / "pipeline.json").read_text())

ORIGIN = CONFIG["corridor"]["origin_station_code"]
DESTINATION = CONFIG["corridor"]["destination_station_code"]


def _ts(value):
    if not value:
        return pd.NaT
    try:
        return pd.Timestamp(value)
    except Exception:  # noqa: BLE001
        return pd.NaT


def _corridor_slice(route: list[dict]) -> list[dict]:
    """Return the SBC -> MYS portion of a train's route, in travel order."""
    codes = [s.get("stationCode") for s in route]
    if ORIGIN not in codes or DESTINATION not in codes:
        return []
    i, j = codes.index(ORIGIN), codes.index(DESTINATION)
    if i >= j:
        return []  # wrong direction (Mysuru -> Bengaluru)
    return route[i : j + 1]


def build_station_records() -> pd.DataFrame:
    runs = json.loads((RAW / "running_history.json").read_text())
    rows: list[dict] = []
    for run in runs:
        route = _corridor_slice(run.get("route") or [])
        if not route:
            continue
        for seq, stop in enumerate(route, start=1):
            rows.append(
                {
                    "train_id": str(run.get("trainNumber")),
                    "train_name": run.get("trainName"),
                    "journey_id": f"{run.get('trainNumber')}_{run.get('startDate')}",
                    "date": run.get("startDate"),
                    "run_status": run.get("status"),
                    "station": stop.get("stationCode"),
                    "station_name": stop.get("stationName"),
                    "is_halt": bool(stop.get("isHalt")),
                    "station_sequence": seq,
                    "route_distance_km": stop.get("distance"),
                    "scheduled_arrival": _ts(stop.get("scheduledArrival")),
                    "scheduled_departure": _ts(stop.get("scheduledDeparture")),
                    "actual_arrival": _ts(stop.get("actualArrival")),
                    "actual_departure": _ts(stop.get("actualDeparture")),
                    "arrival_delay_minutes": stop.get("delayArrival"),
                    "departure_delay_minutes": stop.get("delayDeparture"),
                    "source_url": run.get("_source_url"),
                }
            )
    return pd.DataFrame(rows)


def build_sections(stations: pd.DataFrame) -> pd.DataFrame:
    """Derive section-level records from consecutive OBSERVED stations."""
    cfg = CONFIG["cleaning"]
    sections: list[dict] = []
    for journey_id, grp in stations.sort_values(["journey_id", "station_sequence"]).groupby("journey_id"):
        observed = grp.dropna(subset=["actual_departure"]).copy()
        rows = grp.to_dict("records")
        total_km = max((r["route_distance_km"] or 0) for r in rows)
        for a, b in zip(rows, rows[1:]):
            if pd.isna(a["actual_departure"]) or pd.isna(b["actual_arrival"]):
                continue
            if pd.isna(a["scheduled_departure"]) or pd.isna(b["scheduled_arrival"]):
                continue
            actual = (b["actual_arrival"] - a["actual_departure"]).total_seconds() / 60.0
            scheduled = (b["scheduled_arrival"] - a["scheduled_departure"]).total_seconds() / 60.0
            dist = (b["route_distance_km"] or 0) - (a["route_distance_km"] or 0)
            sections.append(
                {
                    "journey_id": journey_id,
                    "train_id": a["train_id"],
                    "train_name": a["train_name"],
                    "date": a["date"],
                    "section_from": a["station"],
                    "section_from_name": a["station_name"],
                    "section_to": b["station"],
                    "section_to_name": b["station_name"],
                    "section_id": f"{a['station']}-{b['station']}",
                    "station_sequence": a["station_sequence"],
                    "section_distance_km": dist,
                    "remaining_distance_km": total_km - (a["route_distance_km"] or 0),
                    "scheduled_departure": a["scheduled_departure"],
                    "actual_departure": a["actual_departure"],
                    "scheduled_arrival_next": b["scheduled_arrival"],
                    "actual_arrival_next": b["actual_arrival"],
                    "scheduled_section_travel_time": scheduled,
                    "actual_section_travel_time": actual,
                    "departure_delay_minutes": a["departure_delay_minutes"],
                    "arrival_delay_minutes": a["arrival_delay_minutes"],
                    "next_arrival_delay_minutes": b["arrival_delay_minutes"],
                    "source_url": a["source_url"],
                }
            )
        del observed
    df = pd.DataFrame(sections)
    if df.empty:
        return df

    before = len(df)
    report: dict[str, int] = {"raw_sections": before}

    df = df.drop_duplicates(subset=["journey_id", "section_id"])
    report["dropped_duplicates"] = before - len(df)

    n = len(df)
    df = df[df["actual_section_travel_time"] >= cfg["min_section_travel_minutes"]]
    report["dropped_non_positive_travel_time"] = n - len(df)

    n = len(df)
    df = df[df["actual_section_travel_time"] <= cfg["max_section_travel_minutes"]]
    report["dropped_excessive_travel_time"] = n - len(df)

    n = len(df)
    df = df[df["scheduled_section_travel_time"] > 0]
    report["dropped_invalid_schedule"] = n - len(df)

    n = len(df)
    df = df[df["section_distance_km"] > 0]
    report["dropped_invalid_distance"] = n - len(df)

    n = len(df)
    speed = df["section_distance_km"] / (df["actual_section_travel_time"] / 60.0)
    df = df[speed <= cfg["max_section_speed_kmph"]]
    report["dropped_impossible_speed"] = n - len(df)

    n = len(df)
    df = df[df["departure_delay_minutes"].abs() <= cfg["max_abs_delay_minutes"]]
    report["dropped_absurd_delay"] = n - len(df)

    report["clean_sections"] = len(df)
    PROCESSED.mkdir(parents=True, exist_ok=True)
    (PROCESSED / "cleaning_report.json").write_text(json.dumps(report, indent=2))
    return df.sort_values(["date", "train_id", "station_sequence"]).reset_index(drop=True)


def main() -> None:
    PROCESSED.mkdir(parents=True, exist_ok=True)
    stations = build_station_records()
    if stations.empty:
        raise SystemExit("no corridor station records found in raw data")
    stations.to_parquet(PROCESSED / "station_records.parquet", index=False)
    sections = build_sections(stations)
    sections.to_parquet(PROCESSED / "sections_clean.parquet", index=False)

    summary = {
        "built_at": datetime.now().astimezone().isoformat(),
        "station_records": int(len(stations)),
        "journeys": int(stations["journey_id"].nunique()),
        "unique_trains": int(stations["train_id"].nunique()),
        "date_range": [str(stations["date"].min()), str(stations["date"].max())],
        "clean_sections": int(len(sections)),
        "unique_sections": int(sections["section_id"].nunique()) if not sections.empty else 0,
        "missing_actual_arrival_pct": round(
            float(stations["actual_arrival"].isna().mean() * 100), 2
        ),
        "missing_actual_departure_pct": round(
            float(stations["actual_departure"].isna().mean() * 100), 2
        ),
    }
    (PROCESSED / "dataset_summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
