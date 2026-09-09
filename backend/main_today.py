"""RailETA — today's scheduled timetable endpoint.

Returns the current eRail timetable for trains running SBC -> MYS today.
No API key needed (eRail public endpoint). This complements the historical
RailRadar-based model; it does NOT provide live positions or actuals.

Run:
    uvicorn backend.main:app --reload --port 8000
"""

from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[1]

app = FastAPI(title="RailETA API", version="1.0.0")

ERAIL_SOURCE_URL = (
    "https://erail.in/rail/getTrains.aspx"
    "?Station_From=SBC&Station_To=MYS&DataSource=0&Language=0&Cache=true"
)

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _today() -> date:
    return date.today()


def _load_corridor_trains() -> list[dict]:
    raw = ROOT / "data" / "raw" / "corridor_trains.json"
    if not raw.exists():
        return []
    return json.loads(raw.read_text())


class TodayTrain(BaseModel):
    train_id: str
    train_name: str
    origin_of_service: str
    terminus_of_service: str
    sched_dep_sbc: str  # HH:MM
    sched_arr_mys: str  # HH:MM
    sched_duration: str  # HH:MM
    run_days_bitmap: str
    runs_today: bool


class TodayScheduleResponse(BaseModel):
    fetched_at: str
    date: str
    weekday: str
    trains: list[TodayTrain]


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/today-schedule", response_model=TodayScheduleResponse)
def today_schedule() -> TodayScheduleResponse:
    today = _today()
    trains_raw = _load_corridor_trains()
    fetched_at = datetime.now().astimezone().isoformat()
    weekday = WEEKDAYS[today.weekday()]
    today_index = today.weekday()  # Mon=0 .. Sun=6

    def parse_hhmm(raw: str) -> str:
        try:
            h, m = raw.split(".")
            h = str(int(h or 0)).zfill(2)
            m = str(int(m or 0)).zfill(2)
            return f"{h}:{m}"
        except Exception:
            return raw

    trains: list[TodayTrain] = []
    for t in trains_raw:
        runs_today = bool(t.get("run_days_bitmap", "")[today_index] == "1")
        trains.append(
            TodayTrain(
                train_id=str(t.get("train_id", "")),
                train_name=str(t.get("train_name", "")),
                origin_of_service=str(t.get("origin_of_service", "")),
                terminus_of_service=str(t.get("terminus_of_service", "")),
                sched_dep_sbc=parse_hhmm(str(t.get("sched_dep_sbc", ""))),
                sched_arr_mys=parse_hhmm(str(t.get("sched_arr_mys", ""))),
                sched_duration=parse_hhmm(str(t.get("sched_duration", ""))),
                run_days_bitmap=str(t.get("run_days_bitmap", "")),
                runs_today=runs_today,
            )
        )

    return TodayScheduleResponse(
        fetched_at=fetched_at,
        date=today.isoformat(),
        weekday=weekday,
        trains=sorted(trains, key=lambda t: t.sched_dep_sbc),
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main_today:app", host="0.0.0.0", port=8000, reload=True)
