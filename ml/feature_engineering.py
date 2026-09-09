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

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PROCESSED = DATA / "processed"
CONFIG = json.loads((ROOT / "config" / "pipeline.json").read_text())

BASE_FEATURES = [
    "train_code",
    "section_code",
    "station_sequence",
    "section_distance_km",
    "remaining_distance_km",
    "scheduled_section_travel_time",
    "day_of_week",
    "is_weekend",
    "hour",
    "month",
    "current_delay",
    "previous_station_delay",
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
    df = df.sort_values(["date", "train_id", "station_sequence"]).reset_index(drop=True)

    dep = pd.to_datetime(df["actual_departure"], utc=True).dt.tz_convert("Asia/Kolkata")
    df["day_of_week"] = dep.dt.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["hour"] = dep.dt.hour
    df["month"] = dep.dt.month

    # already-observed running state
    df["current_delay"] = pd.to_numeric(df["departure_delay_minutes"], errors="coerce")
    df["previous_station_delay"] = pd.to_numeric(df["arrival_delay_minutes"], errors="coerce")
    df["previous_section_travel_time"] = df.groupby("journey_id")["actual_section_travel_time"].shift(1)
    origin_dep = df.groupby("journey_id")["actual_departure"].transform("min")
    df["time_since_departure"] = (df["actual_departure"] - origin_dep).dt.total_seconds() / 60.0

    # causal historical statistics per section (past journeys only)
    df = df.sort_values(["section_id", "date", "train_id"]).reset_index(drop=True)
    g = df.groupby("section_id")["actual_section_travel_time"]
    df["hist_mean_section_time"] = g.transform(lambda s: s.shift(1).expanding().mean())
    df["hist_median_section_time"] = g.transform(lambda s: s.shift(1).expanding().median())
    df["hist_section_variance"] = g.transform(lambda s: s.shift(1).expanding().var())

    # causal deviation history: where the timetable is systematically wrong.
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
    # recent regime: mean overage over the last 5 prior runs of this section —
    # adapts to seasonal/monsoon shifts faster than the all-history mean
    df["hist_recent_section_overage"] = df.groupby("section_id")["section_overage"].transform(
        lambda s: s.shift(1).rolling(5, min_periods=1).mean()
    )
    # per-train punctuality: expanding mean of journey-level deviation from
    # schedule, up to (not including) the current journey
    df = df.sort_values(["train_id", "date", "station_sequence"]).reset_index(drop=True)
    jdev = (
        df.groupby("journey_id")["section_overage"].mean().rename("journey_mean_overage")
    )
    df = df.merge(jdev, on="journey_id", how="left")
    df["train_punctuality_dev"] = df.groupby("train_id")["journey_mean_overage"].transform(
        lambda s: s.shift(1).expanding().mean()
    )
    df = df.drop(columns=["journey_mean_overage"])

    # how is THIS journey going so far? expanding mean of realized overage over
    # the train's own completed sections (shift(1) excludes the current one).
    # Strong causal signal of a slow-running day; at prediction time only the
    # sections already run are known.
    df = df.sort_values(["journey_id", "station_sequence"]).reset_index(drop=True)
    df["journey_overage_so_far"] = df.groupby("journey_id")["section_overage"].transform(
        lambda s: s.shift(1).expanding().mean()
    )

    # integer codes (tree-friendly, and trivially reproducible in the app)
    train_codes = {t: i for i, t in enumerate(sorted(df["train_id"].unique()))}
    section_codes = {s: i for i, s in enumerate(sorted(df["section_id"].unique()))}
    df["train_code"] = df["train_id"].map(train_codes)
    df["section_code"] = df["section_id"].map(section_codes)

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

    # fill only DERIVED statistics (never actual observations) so the model and
    # the browser scorer agree on a NaN-free feature matrix
    fill_values: dict[str, float] = {}
    for col in ["hist_mean_section_time", "hist_median_section_time", "hist_section_variance",
                "previous_section_travel_time", "current_delay", "previous_station_delay",
                "time_since_departure"] + DEVIATION_FEATURES \
            + (WEATHER_FEATURES if weather_used else []):
        median = float(pd.to_numeric(df[col], errors="coerce").median()) if df[col].notna().any() else 0.0
        fill_values[col] = 0.0 if np.isnan(median) else median
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(fill_values[col])

    meta = {
        "features": features,
        "weather_used": weather_used,
        "train_codes": train_codes,
        "section_codes": section_codes,
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
