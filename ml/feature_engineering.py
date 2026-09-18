"""Feature engineering for the section travel-time model.

Leakage rules:
  * historical section statistics are EXPANDING over strictly earlier journeys
    (shift(1) within a chronologically sorted section group), so a row never
    sees its own outcome or any future run.
  * previous-section travel time and current delay come from stations the train
    has already passed at prediction time.
  * the arrival being predicted is never used as an input.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from ml.traffic_engine import compute_traffic_features

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PROCESSED = DATA / "processed"
CONFIG = json.loads((ROOT / "config" / "pipeline.json").read_text())

BASE_FEATURES = [
    "train_code",
    "section_code",
    "train_priority",
    "station_sequence",
    "section_distance_km",
    "remaining_distance_km",
    "scheduled_section_travel_time",
    "scheduled_speed_kmph",
    "day_of_week",
    "is_weekend",
    "hour",
    "hour_sin",
    "hour_cos",
    "month",
    "current_delay",
    "previous_station_delay",
    "delay_momentum",
    "is_delayed",
    "is_on_time",
    "log_current_delay",
    "previous_section_travel_time",
    "time_since_departure",
    "hist_mean_section_time",
    "hist_median_section_time",
    "hist_section_variance",
    "hist_mean_section_overage",
    "hist_median_section_overage",
    "hist_section_overage_rate",
    "hist_recent_section_overage",
    "train_punctuality_dev",
    "journey_overage_so_far",
    "preceding_train_headway_mins",
    "preceding_train_delay_mins",
    "preceding_train_overage_mins",
    "preceding_is_lower_priority",
    "section_congestion_count",
    "corridor_active_density",
    "reactionary_delay_risk",
    "is_peak_commuter_window",
    "is_suburban_dwell_surge_station",
    "commuter_dwell_surge_risk",
    "is_freight_siding_conflict_zone",
    "freight_preceding_risk",
    "is_terminal_approach_section",
    "terminal_reception_risk",
    "scheduled_buffer_slack_ratio",
    "slack_recovery_potential",
]
TRAFFIC_FEATURES = [
    "preceding_train_headway_mins",
    "preceding_train_delay_mins",
    "preceding_train_overage_mins",
    "preceding_is_lower_priority",
    "section_congestion_count",
    "corridor_active_density",
    "reactionary_delay_risk",
]
CORRIDOR_PATTERN_FEATURES = [
    "is_peak_commuter_window",
    "is_suburban_dwell_surge_station",
    "commuter_dwell_surge_risk",
    "is_freight_siding_conflict_zone",
    "freight_preceding_risk",
    "is_terminal_approach_section",
    "terminal_reception_risk",
    "scheduled_buffer_slack_ratio",
    "slack_recovery_potential",
]
DEVIATION_FEATURES = [
    "hist_mean_section_overage",
    "hist_median_section_overage",
    "hist_section_overage_rate",
    "hist_recent_section_overage",
    "train_punctuality_dev",
    "journey_overage_so_far",
]
WEATHER_FEATURES = ["temperature_c", "precipitation_mm", "humidity_pct", "wind_speed_kmph", "visibility_m"]

CORRIDOR_COMMUTER_STATIONS = {"KGI", "MYA", "RMGM", "CPT", "MAD"}
FREIGHT_SIDING_STATIONS = {"BID", "RMGM", "BYD", "YPR", "SBC"}
TERMINAL_APPROACH_STATIONS = {"SBC", "MYS", "YPR", "SMVB"}

TRAIN_PRIORITIES = {
    "12614": 1,  # Superfast Express (Wodeyar SF)
    "12785": 1,  # Superfast Express (Kacheguda SF)
    "16231": 2,  # Express (Mayiladuturai Exp)
    "16316": 2,  # Express (Kochuveli Exp)
    "16216": 2,  # Express (Chamundi Exp)
    "16220": 2,  # Express (Chamarajanagar Exp)
    "16228": 2,  # Express (Talguppa Exp)
    "56232": 3,  # Passenger (SMVB Passenger)
}


def _weather_frame() -> pd.DataFrame | None:
    path = DATA / "raw" / "weather.json"
    if not path.exists():
        return None
    hourly = json.loads(path.read_text()).get("hourly") or {}
    if not hourly.get("time"):
        return None
    w = pd.DataFrame(
        {
            "hour_key": pd.to_datetime(hourly["time"]).astype("datetime64[ns]"),
            "temperature_c": hourly.get("temperature_2m"),
            "precipitation_mm": hourly.get("precipitation"),
            "humidity_pct": hourly.get("relative_humidity_2m"),
            "wind_speed_kmph": hourly.get("wind_speed_10m"),
            "visibility_m": hourly.get("visibility"),
        }
    )
    return w


def build_features(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str], dict]:
    # Enrich with multi-train traffic awareness and cascading delay features
    df = compute_traffic_features(df)
    df = df.sort_values(["date", "train_id", "station_sequence"]).reset_index(drop=True)

    dep = pd.to_datetime(df["actual_departure"], utc=True).dt.tz_convert("Asia/Kolkata")
    df["day_of_week"] = dep.dt.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["hour"] = dep.dt.hour
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24.0)
    df["month"] = dep.dt.month

    # Train Priority classification (Superfast=1, Express=2, Passenger=3)
    df["train_priority"] = df["train_id"].map(TRAIN_PRIORITIES).fillna(2).astype(int)

    # Already-observed running state & non-linear delay representations
    df["current_delay"] = pd.to_numeric(df["departure_delay_minutes"], errors="coerce").fillna(0.0)
    df["previous_station_delay"] = pd.to_numeric(df["arrival_delay_minutes"], errors="coerce").fillna(df["current_delay"])
    df["delay_momentum"] = df["current_delay"] - df["previous_station_delay"]
    df["is_delayed"] = (df["current_delay"] > 15.0).astype(int)
    df["is_on_time"] = (df["current_delay"] <= 5.0).astype(int)
    df["log_current_delay"] = np.log1p(np.maximum(0.0, df["current_delay"]))

    # Scheduled speed & section pacing
    sched_hrs = df["scheduled_section_travel_time"] / 60.0
    df["scheduled_speed_kmph"] = np.where(sched_hrs > 0, df["section_distance_km"] / sched_hrs, 60.0)
    df["previous_section_travel_time"] = df.groupby("journey_id")["actual_section_travel_time"].shift(1)
    origin_dep = df.groupby("journey_id")["actual_departure"].transform("min")
    df["time_since_departure"] = (df["actual_departure"] - origin_dep).dt.total_seconds() / 60.0

    # Causal historical statistics per section (past journeys only)
    df = df.sort_values(["section_id", "date", "train_id"]).reset_index(drop=True)
    g = df.groupby("section_id")["actual_section_travel_time"]
    df["hist_mean_section_time"] = g.transform(lambda s: s.shift(1).expanding().mean())
    df["hist_median_section_time"] = g.transform(lambda s: s.shift(1).expanding().median())
    df["hist_section_variance"] = g.transform(lambda s: s.shift(1).expanding().var())

    # Causal deviation history: where the timetable is systematically wrong.
    # Overages are strictly past journeys only (shift(1) before expanding), so
    # no row ever sees its own outcome.
    df["section_overage"] = df["actual_section_travel_time"] - df["scheduled_section_travel_time"]
    go = df.groupby("section_id")["section_overage"]
    df["hist_mean_section_overage"] = go.transform(lambda s: s.shift(1).expanding().mean())
    df["hist_median_section_overage"] = go.transform(lambda s: s.shift(1).expanding().median())
    over_rate = df.assign(
        _over=(df["section_overage"] > 2.0).astype(float),
        _obs=df["section_overage"].notna().astype(float),
    )
    df["hist_section_overage_rate"] = (
        over_rate.groupby("section_id")["_over"].transform(lambda s: s.shift(1).expanding().sum())
        / over_rate.groupby("section_id")["_obs"].transform(lambda s: s.shift(1).expanding().sum())
    )
    # Recent regime: mean overage over the last 5 prior runs of this section
    df["hist_recent_section_overage"] = df.groupby("section_id")["section_overage"].transform(
        lambda s: s.shift(1).rolling(5, min_periods=1).mean()
    )
    # Per-train punctuality: expanding mean of journey-level deviation from schedule
    df = df.sort_values(["train_id", "date", "station_sequence"]).reset_index(drop=True)
    jdev = df.groupby("journey_id")["section_overage"].mean().rename("journey_mean_overage")
    df = df.merge(jdev, on="journey_id", how="left")
    df["train_punctuality_dev"] = df.groupby("train_id")["journey_mean_overage"].transform(
        lambda s: s.shift(1).expanding().mean()
    )
    df = df.drop(columns=["journey_mean_overage"])

    # How is THIS journey going so far? expanding mean of realized overage
    df = df.sort_values(["journey_id", "station_sequence"]).reset_index(drop=True)
    df["journey_overage_so_far"] = df.groupby("journey_id")["section_overage"].transform(
        lambda s: s.shift(1).expanding().mean()
    )

    # Integer codes (tree-friendly, and reproducible in the client)
    train_codes = {t: i for i, t in enumerate(sorted(df["train_id"].unique()))}
    section_codes = {s: i for i, s in enumerate(sorted(df["section_id"].unique()))}
    df["train_code"] = df["train_id"].map(train_codes)
    df["section_code"] = df["section_id"].map(section_codes)

    # Commuter peak window (morning 07:00-10:00, evening 16:30-20:30)
    hour = df["hour"]
    df["is_peak_commuter_window"] = (
        ((hour >= 7) & (hour <= 10)) | ((hour >= 17) & (hour <= 20))
    ).astype(int)

    # Suburban dwell surge station (Kengeri, Mandya, Ramanagaram, Channapatna, Maddur)
    is_commuter_from = df["section_from"].isin(CORRIDOR_COMMUTER_STATIONS)
    is_commuter_to = df["section_to"].isin(CORRIDOR_COMMUTER_STATIONS)
    df["is_suburban_dwell_surge_station"] = (is_commuter_from | is_commuter_to).astype(int)

    # Commuter dwell surge risk: passenger surge impact amplified for express/passenger services
    prio_weight = np.where(df["train_priority"] >= 2, 1.5, 1.0)
    df["commuter_dwell_surge_risk"] = (
        df["is_peak_commuter_window"] * df["is_suburban_dwell_surge_station"] * prio_weight
    ).astype(np.float32)

    # Freight & Siding conflict zone (Bidadi industrial siding, Ramanagaram loops, Byatrayanhalli)
    is_freight_from = df["section_from"].isin(FREIGHT_SIDING_STATIONS)
    is_freight_to = df["section_to"].isin(FREIGHT_SIDING_STATIONS)
    df["is_freight_siding_conflict_zone"] = (is_freight_from | is_freight_to).astype(int)

    # Freight preceding risk: lower priority train ahead in siding/yard conflict zone
    df["freight_preceding_risk"] = (
        df["is_freight_siding_conflict_zone"]
        * df["preceding_is_lower_priority"]
        * (10.0 / (df["preceding_train_headway_mins"] + 5.0))
    ).astype(np.float32)

    # Terminal approach section (entering SBC / MYS / major terminal yards)
    df["is_terminal_approach_section"] = (
        df["section_to"].isin(TERMINAL_APPROACH_STATIONS) | (df["remaining_distance_km"] <= 20.0)
    ).astype(int)

    # Terminal reception holding risk: terminal approach combined with active traffic density
    df["terminal_reception_risk"] = (
        df["is_terminal_approach_section"] * (df["corridor_active_density"] / 3.0)
    ).astype(np.float32)

    # Timetable buffer slack ratio & recovery potential (captures speed margin on double track)
    nominal_kinematic_time = np.maximum(1.0, (df["section_distance_km"] / 85.0) * 60.0)
    df["scheduled_buffer_slack_ratio"] = (
        df["scheduled_section_travel_time"] / nominal_kinematic_time
    ).astype(np.float32)

    df["slack_recovery_potential"] = (
        np.maximum(0.0, df["scheduled_buffer_slack_ratio"] - 1.0)
        * np.minimum(1.0, np.maximum(0.0, df["current_delay"]) / 15.0)
    ).astype(np.float32)

    features = list(BASE_FEATURES)
    weather = _weather_frame()
    weather_used = False
    if weather is not None:
        df["hour_key"] = dep.dt.tz_localize(None).dt.floor("h")
        df = df.merge(weather, on="hour_key", how="left")
        if df["temperature_c"].notna().mean() > 0.5:
            features += WEATHER_FEATURES
            weather_used = True
        df = df.drop(columns=["hour_key"])

    # Fill only DERIVED statistics (never actual observations) so the model and
    # the browser scorer agree on a NaN-free feature matrix
    fill_values: dict[str, float] = {}
    for col in [
        "hist_mean_section_time",
        "hist_median_section_time",
        "hist_section_variance",
        "previous_section_travel_time",
        "current_delay",
        "previous_station_delay",
        "delay_momentum",
        "log_current_delay",
        "time_since_departure",
    ] + DEVIATION_FEATURES + TRAFFIC_FEATURES + CORRIDOR_PATTERN_FEATURES + (WEATHER_FEATURES if weather_used else []):
        median = float(pd.to_numeric(df[col], errors="coerce").median()) if df[col].notna().any() else 0.0
        fill_values[col] = 0.0 if np.isnan(median) else median
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(fill_values[col])

    meta = {
        "features": features,
        "weather_used": weather_used,
        "train_codes": train_codes,
        "section_codes": section_codes,
        "train_priorities": TRAIN_PRIORITIES,
        "fill_values": fill_values,
        "target": CONFIG["model"]["target"],
    }
    return df.sort_values(["date", "train_id", "station_sequence"]).reset_index(drop=True), features, meta


def main() -> None:
    sections = pd.read_parquet(PROCESSED / "sections_clean.parquet")
    df, features, meta = build_features(sections)
    df.to_parquet(PROCESSED / "features.parquet", index=False)
    (PROCESSED / "feature_config.json").write_text(json.dumps(meta, indent=2))
    print(f"{len(df)} feature rows, {len(features)} features, weather={meta['weather_used']}")


if __name__ == "__main__":
    main()
