"""RailETA FastAPI backend.

Serves predictions from the ACTUAL trained LightGBM model in /models, plus
dataset and model-information endpoints.

Run:
    python -m pip install -r backend/requirements.txt
    uvicorn backend.main:app --reload --port 8000
"""

from __future__ import annotations

import json
import sys
from datetime import date, datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ml import predict as predictor  # noqa: E402

MODELS = ROOT / "models"
PROCESSED = ROOT / "data" / "processed"

app = FastAPI(
    title="RailETA API",
    description="Dynamic ETA prediction for the Bengaluru → Mysuru railway corridor",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    train_id: str
    current_station: str
    next_station: str
    current_delay: float = 0
    previous_section_travel_time: float | None = None
    historical_section_time: float | None = None
    scheduled_section_travel_time: float | None = None
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    hour: int | None = Field(default=None, ge=0, le=23)
    timestamp: str | None = None


class ChainHop(BaseModel):
    from_station: str = Field(alias="from")
    to_station: str = Field(alias="to")
    scheduled_section_travel_time: float | None = None
    section_distance_km: float | None = None
    remaining_distance_km: float | None = None
    station_sequence: int | None = None
    scheduled_arrival: str | None = None

    model_config = {"populate_by_name": True}


class ChainRequest(BaseModel):
    train_id: str
    start_time: str
    current_delay: float = 0
    hops: list[ChainHop]


class TodayTrain(BaseModel):
    train_id: str
    train_name: str
    origin_of_service: str
    terminus_of_service: str
    sched_dep_sbc: str
    sched_arr_mys: str
    sched_duration: str
    run_days_bitmap: str
    runs_today: bool


class TodayScheduleResponse(BaseModel):
    fetched_at: str
    date: str
    weekday: str
    trains: list[TodayTrain]


WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _parse_hhmm(raw: str) -> str:
    try:
        h, m = raw.split(".")
        h = str(int(h or 0)).zfill(2)
        m = str(int(m or 0)).zfill(2)
        return f"{h}:{m}"
    except Exception:
        return raw


def _load_corridor_trains() -> list[dict]:
    raw = ROOT / "data" / "raw" / "corridor_trains.json"
    if not raw.exists():
        return []
    return json.loads(raw.read_text())


def _today_schedule() -> TodayScheduleResponse:
    today = date.today()
    trains_raw = _load_corridor_trains()
    today_index = today.weekday()
    weekday = WEEKDAYS[today_index]
    fetched_at = datetime.now().astimezone().isoformat()

    trains: list[TodayTrain] = []
    for t in sorted(trains_raw, key=lambda x: x.get("sched_dep_sbc", "99.99")):
        runs_today = bool(t.get("run_days_bitmap", "")[today_index] == "1")
        trains.append(
            TodayTrain(
                train_id=str(t.get("train_id", "")),
                train_name=str(t.get("train_name", "")),
                origin_of_service=str(t.get("origin_of_service", "")),
                terminus_of_service=str(t.get("terminus_of_service", "")),
                sched_dep_sbc=_parse_hhmm(str(t.get("sched_dep_sbc", ""))),
                sched_arr_mys=_parse_hhmm(str(t.get("sched_arr_mys", ""))),
                sched_duration=_parse_hhmm(str(t.get("sched_duration", ""))),
                run_days_bitmap=str(t.get("run_days_bitmap", "")),
                runs_today=runs_today,
            )
        )

    return TodayScheduleResponse(
        fetched_at=fetched_at,
        date=today.isoformat(),
        weekday=weekday,
        trains=trains,
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_present": (MODELS / "model.txt").exists()}


@app.get("/today-schedule")
def today_schedule() -> TodayScheduleResponse:
    return _today_schedule()


@app.post("/predict-eta")
def predict_eta(req: PredictRequest) -> dict:
    if not (MODELS / "model.txt").exists():
        raise HTTPException(503, "model not trained yet — run scripts/run_all.sh")
    try:
        return predictor.predict_section(req.model_dump())
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, str(exc)) from exc


@app.post("/predict-journey")
def predict_journey(req: ChainRequest) -> dict:
    hops = [
        {
            "from": h.from_station,
            "to": h.to_station,
            "scheduled_section_travel_time": h.scheduled_section_travel_time,
            "section_distance_km": h.section_distance_km,
            "remaining_distance_km": h.remaining_distance_km,
            "station_sequence": h.station_sequence,
            "scheduled_arrival": h.scheduled_arrival,
        }
        for h in req.hops
    ]
    return {
        "model": "LightGBM",
        "stations": predictor.predict_chain(req.train_id, hops, req.start_time, req.current_delay),
    }


@app.get("/model-info")
def model_info() -> dict:
    if not (MODELS / "model_metadata.json").exists():
        raise HTTPException(503, "model not trained yet")
    return {
        "metadata": json.loads((MODELS / "model_metadata.json").read_text()),
        "evaluation": json.loads((MODELS / "evaluation.json").read_text())
        if (MODELS / "evaluation.json").exists()
        else None,
    }


@app.get("/dataset")
def dataset() -> dict:
    return {
        "summary": json.loads((PROCESSED / "dataset_summary.json").read_text()),
        "cleaning_report": json.loads((PROCESSED / "cleaning_report.json").read_text()),
        "sections": json.loads((PROCESSED / "section_stats.json").read_text()),
    }


@app.get("/data-sources")
def data_sources() -> list:
    return json.loads((ROOT / "data" / "data_sources.json").read_text())
