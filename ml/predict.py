"""Prediction helpers shared by the FastAPI backend and the export step.

Loads the trained LightGBM booster and turns a running-state snapshot into a
predicted section travel time and a recursive downstream ETA chain.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"
PROCESSED = ROOT / "data" / "processed"


@lru_cache(maxsize=1)
def load_model():
    booster = lgb.Booster(model_file=str(MODELS / "model.txt"))
    meta = json.loads((MODELS / "model_metadata.json").read_text())
    return booster, meta


@lru_cache(maxsize=1)
def section_stats() -> dict:
    """Historical section statistics computed from the real cleaned dataset."""
    return json.loads((PROCESSED / "section_stats.json").read_text())


def build_row(payload: dict, meta: dict) -> pd.DataFrame:
    fills = meta["fill_values"]
    section_id = f"{payload['current_station']}-{payload['next_station']}"
    stats = section_stats().get(section_id, {})
    when = payload.get("timestamp")
    ts = pd.Timestamp(when) if when else pd.Timestamp.now(tz="Asia/Kolkata")
    train_id = str(payload.get("train_id", ""))
    priorities = meta.get("train_priorities", {})

    curr_delay = float(payload.get("current_delay", 0.0))
    prev_delay = float(payload.get("previous_station_delay", curr_delay))
    sched_time = float(
        payload.get(
            "scheduled_section_travel_time", stats.get("scheduled_mean", fills.get("hist_mean_section_time", 10.0))
        )
    )
    dist = float(payload.get("section_distance_km", stats.get("distance_km", 10.0)))
    sched_hrs = sched_time / 60.0
    sched_speed = dist / sched_hrs if sched_hrs > 0 else 60.0

    hour = payload.get("hour", ts.hour)

    row = {
        "train_code": meta["train_codes"].get(train_id, -1),
        "section_code": meta["section_codes"].get(section_id, -1),
        "train_priority": priorities.get(train_id, 2),
        "station_sequence": payload.get("station_sequence", stats.get("station_sequence", 1)),
        "section_distance_km": dist,
        "remaining_distance_km": float(payload.get("remaining_distance_km", stats.get("remaining_km", 0.0))),
        "scheduled_section_travel_time": sched_time,
        "scheduled_speed_kmph": sched_speed,
        "day_of_week": payload.get("day_of_week", ts.dayofweek),
        "is_weekend": int(payload.get("day_of_week", ts.dayofweek) >= 5),
        "hour": hour,
        "hour_sin": np.sin(2 * np.pi * hour / 24.0),
        "hour_cos": np.cos(2 * np.pi * hour / 24.0),
        "month": payload.get("month", ts.month),
        "current_delay": curr_delay,
        "previous_station_delay": prev_delay,
        "delay_momentum": curr_delay - prev_delay,
        "is_delayed": int(curr_delay > 15.0),
        "is_on_time": int(curr_delay <= 5.0),
        "log_current_delay": float(np.log1p(max(0.0, curr_delay))),
        "previous_section_travel_time": float(
            payload.get("previous_section_travel_time", fills.get("previous_section_travel_time", 0.0))
        ),
        "time_since_departure": float(
            payload.get("time_since_departure", fills.get("time_since_departure", 0.0))
        ),
        "hist_mean_section_time": float(
            payload.get("historical_section_time", stats.get("mean", fills.get("hist_mean_section_time", 0.0)))
        ),
        "hist_median_section_time": float(stats.get("median", fills.get("hist_median_section_time", 0.0))),
        "hist_section_variance": float(stats.get("variance", fills.get("hist_section_variance", 0.0))),
        "hist_mean_section_overage": float(stats.get("mean_overage", fills.get("hist_mean_section_overage", 0.0))),
        "hist_median_section_overage": float(stats.get("median_overage", fills.get("hist_median_section_overage", 0.0))),
        "hist_section_overage_rate": float(stats.get("overage_rate", fills.get("hist_section_overage_rate", 0.0))),
        "hist_recent_section_overage": float(fills.get("hist_recent_section_overage", 0.0)),
        "train_punctuality_dev": float(fills.get("train_punctuality_dev", 0.0)),
        "journey_overage_so_far": float(payload.get("journey_overage_so_far", fills.get("journey_overage_so_far", 0.0))),
    }
    for wf in ["temperature_c", "precipitation_mm", "humidity_pct", "wind_speed_kmph", "visibility_m"]:
        if wf in meta["features"]:
            row[wf] = float(payload.get(wf, fills.get(wf, 0.0)))
    return pd.DataFrame([{f: row.get(f, fills.get(f, 0.0)) for f in meta["features"]}])


def predict_section(payload: dict) -> dict:
    booster, meta = load_model()
    frame = build_row(payload, meta)
    scheduled = float(payload.get("scheduled_section_travel_time") or 0.0)
    dev = float(booster.predict(frame)[0])
    minutes = max(0.5, scheduled + dev)
    now = pd.Timestamp(payload["timestamp"]) if payload.get("timestamp") else pd.Timestamp.now(tz="Asia/Kolkata")
    eta = now + timedelta(minutes=minutes)
    predicted_delay = (
        payload.get("current_delay", 0) + (minutes - scheduled) if scheduled > 0 else None
    )
    return {
        "predicted_section_travel_time": round(minutes, 2),
        "predicted_deviation": round(dev, 2),
        "predicted_eta": eta.isoformat(),
        "predicted_delay": round(predicted_delay, 2) if predicted_delay is not None else None,
        "model": "LightGBM",
    }


def predict_chain(train_id: str, stations: list[dict], start_time: str, current_delay: float) -> list[dict]:
    """Recursively chain section predictions to every downstream station."""
    booster, meta = load_model()
    cursor = pd.Timestamp(start_time)
    delay = current_delay
    previous_section_time = None
    overages: list[float] = []
    out: list[dict] = []
    origin_time = cursor

    for hop in stations:
        prev = previous_section_time if previous_section_time is not None else meta["fill_values"].get("previous_section_travel_time", 0.0)
        sched = float(hop.get("scheduled_section_travel_time") or 0.0)
        j_overage = sum(overages) / len(overages) if overages else 0.0
        elapsed = (cursor - origin_time).total_seconds() / 60.0

        payload = {
            "train_id": train_id,
            "current_station": hop["from"],
            "next_station": hop["to"],
            "current_delay": float(delay),
            "previous_station_delay": float(delay),
            "previous_section_travel_time": float(prev),
            "scheduled_section_travel_time": sched,
            "section_distance_km": float(hop.get("section_distance_km") or 0.0),
            "remaining_distance_km": float(hop.get("remaining_distance_km") or 0.0),
            "station_sequence": int(hop.get("station_sequence") or 0),
            "time_since_departure": elapsed,
            "journey_overage_so_far": j_overage,
            "timestamp": cursor.isoformat(),
        }
        frame = build_row(payload, meta)
        dev = float(booster.predict(frame)[0])
        minutes = max(0.5, sched + dev)
        cursor = cursor + timedelta(minutes=minutes)
        if hop.get("scheduled_arrival"):
            delay = (cursor - pd.Timestamp(hop["scheduled_arrival"])).total_seconds() / 60.0
        previous_section_time = minutes
        overages.append(minutes - sched)
        out.append(
            {
                "station": hop["to"],
                "predicted_section_travel_time": round(minutes, 2),
                "predicted_deviation": round(dev, 2),
                "predicted_arrival": cursor.isoformat(),
                "predicted_delay": round(delay, 2),
            }
        )
    return out


if __name__ == "__main__":
    print(json.dumps(load_model()[1]["features"], indent=2))
