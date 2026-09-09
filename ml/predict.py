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

    row = {
        "train_code": meta["train_codes"].get(str(payload["train_id"]), -1),
        "section_code": meta["section_codes"].get(section_id, -1),
        "station_sequence": payload.get("station_sequence", stats.get("station_sequence", 1)),
        "section_distance_km": payload.get("section_distance_km", stats.get("distance_km", 0)),
        "remaining_distance_km": payload.get("remaining_distance_km", stats.get("remaining_km", 0)),
        "scheduled_section_travel_time": payload.get(
            "scheduled_section_travel_time", stats.get("scheduled_mean", fills.get("hist_mean_section_time", 0))
        ),
        "day_of_week": payload.get("day_of_week", ts.dayofweek),
        "is_weekend": int(payload.get("day_of_week", ts.dayofweek) >= 5),
        "hour": payload.get("hour", ts.hour),
        "month": payload.get("month", ts.month),
        "current_delay": payload.get("current_delay", 0),
        "previous_station_delay": payload.get("previous_station_delay", payload.get("current_delay", 0)),
        "previous_section_travel_time": payload.get(
            "previous_section_travel_time", fills.get("previous_section_travel_time", 0)
        ),
        "time_since_departure": payload.get("time_since_departure", fills.get("time_since_departure", 0)),
        "hist_mean_section_time": payload.get(
            "historical_section_time", stats.get("mean", fills.get("hist_mean_section_time", 0))
        ),
        "hist_median_section_time": stats.get("median", fills.get("hist_median_section_time", 0)),
        "hist_section_variance": stats.get("variance", fills.get("hist_section_variance", 0)),
    }
    for wf in ["temperature_c", "precipitation_mm", "humidity_pct", "wind_speed_kmph", "visibility_m"]:
        if wf in meta["features"]:
            row[wf] = payload.get(wf, fills.get(wf, 0))
    return pd.DataFrame([{f: row[f] for f in meta["features"]}])


def predict_section(payload: dict) -> dict:
    booster, meta = load_model()
    frame = build_row(payload, meta)
    minutes = float(booster.predict(frame)[0])
    now = pd.Timestamp(payload["timestamp"]) if payload.get("timestamp") else pd.Timestamp.now(tz="Asia/Kolkata")
    eta = now + timedelta(minutes=minutes)
    scheduled = payload.get("scheduled_section_travel_time")
    predicted_delay = (
        payload.get("current_delay", 0) + (minutes - scheduled) if scheduled is not None else None
    )
    return {
        "predicted_section_travel_time": round(minutes, 2),
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
    out: list[dict] = []
    for hop in stations:
        prev = previous_section_time if previous_section_time is not None else meta["fill_values"].get("previous_section_travel_time", 0.0)
        payload = {
            "train_id": train_id,
            "current_station": hop["from"],
            "next_station": hop["to"],
            "current_delay": float(delay),
            "previous_section_travel_time": float(prev),
            "scheduled_section_travel_time": float(hop.get("scheduled_section_travel_time") or 0.0),
            "section_distance_km": float(hop.get("section_distance_km") or 0.0),
            "remaining_distance_km": float(hop.get("remaining_distance_km") or 0.0),
            "station_sequence": int(hop.get("station_sequence") or 0),
            "timestamp": cursor.isoformat(),
        }
        frame = build_row(payload, meta)
        minutes = float(booster.predict(frame)[0])
        cursor = cursor + timedelta(minutes=minutes)
        if hop.get("scheduled_arrival"):
            delay = (cursor - pd.Timestamp(hop["scheduled_arrival"])).total_seconds() / 60.0
        previous_section_time = minutes
        out.append(
            {
                "station": hop["to"],
                "predicted_section_travel_time": round(minutes, 2),
                "predicted_arrival": cursor.isoformat(),
                "predicted_delay": round(delay, 2),
            }
        )
    return out


if __name__ == "__main__":
    print(json.dumps(load_model()[1]["features"], indent=2))
