"""RailETA data loader.

Collects REAL, publicly accessible data for the Bengaluru -> Mysuru corridor.

Sources
-------
1. erail.in  "trains between stations" endpoint  -> list of trains SBC -> MYS
2. railradar.in public web API  -> per-train route (with coordinates + distance)
   and per-date running history with NTES-sourced actual arrival/departure
   timestamps.
3. Open-Meteo historical archive -> real hourly weather for the corridor.

NOTHING in this module invents data. Every record written to data/raw is the
verbatim payload returned by the public source, with the request URL kept
alongside it for provenance.
"""

from __future__ import annotations

import json
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RAW = DATA / "raw"
RUN_CACHE = RAW / "runs"
CONFIG = json.loads((ROOT / "config" / "pipeline.json").read_text())


def _api_key() -> str | None:
    key = os.environ.get("RAILRADAR_API_KEY")
    if key:
        return key.strip()
    env_file = ROOT / ".env.local"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("RAILRADAR_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"')
    return None


API_KEY = _api_key()

UA = {
    "User-Agent": "RailETA/1.0 (research pipeline; Bengaluru-Mysuru corridor)",
    "Accept": "application/json, text/plain, */*",
}
if API_KEY:
    UA["Authorization"] = f"Bearer {API_KEY}"

ERAIL_TRAINS_URL = (
    "https://erail.in/rail/getTrains.aspx"
    "?Station_From={src}&Station_To={dst}&DataSource=0&Language=0&Cache=true"
)
# Official, key-authenticated RailRadar API (https://railradar.in/docs).
RAILRADAR_BASE = "https://api.railradar.in/v1"
RAILRADAR_TRAIN_URL = RAILRADAR_BASE + "/trains/{train}"
RAILRADAR_RUN_URL = RAILRADAR_BASE + "/trains/{train}/live?date={date}"
OPEN_METEO_URL = (
    "https://archive-api.open-meteo.com/v1/archive"
    "?latitude={lat}&longitude={lon}&start_date={start}&end_date={end}"
    "&hourly=temperature_2m,precipitation,relative_humidity_2m,wind_speed_10m,visibility"
    "&timezone=Asia%2FKolkata"
)

SOURCES: list[dict] = []


def _record_source(**kwargs) -> None:
    SOURCES.append({"collection_date": datetime.now().astimezone().isoformat(), **kwargs})


_RATE_LOCK = threading.Lock()
_LAST_CALL = [0.0]


def _throttle() -> None:
    """Stay inside the API provider's published rate limit."""
    gap = CONFIG["scrape"].get("min_seconds_between_requests", 0)
    if not gap:
        return
    with _RATE_LOCK:
        wait = gap - (time.monotonic() - _LAST_CALL[0])
        if wait > 0:
            time.sleep(wait)
        _LAST_CALL[0] = time.monotonic()


def _get(url: str, timeout: int | None = None, retries: int | None = None):
    timeout = timeout or CONFIG["scrape"]["request_timeout_seconds"]
    retries = CONFIG["scrape"]["retries"] if retries is None else retries
    last: Exception | None = None
    for attempt in range(retries + 1):
        try:
            if "railradar" in url:
                _throttle()
            resp = requests.get(url, headers=UA, timeout=timeout)
            if resp.status_code == 200:
                return resp
            if resp.status_code in (401, 403):
                # Auth / block problems never recover on retry.
                raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:160]}")
            if resp.status_code == 429:
                time.sleep(float(resp.headers.get("Retry-After", 5)) + 2 * attempt)
            last = RuntimeError(f"HTTP {resp.status_code}")
        except RuntimeError:
            raise
        except Exception as exc:  # noqa: BLE001 - network errors are expected
            last = exc
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"failed to fetch {url}: {last}")



# --------------------------------------------------------------------------
# 1. Train list for the corridor
# --------------------------------------------------------------------------
def fetch_corridor_trains() -> list[dict]:
    src = CONFIG["corridor"]["origin_station_code"]
    dst = CONFIG["corridor"]["destination_station_code"]
    url = ERAIL_TRAINS_URL.format(src=src, dst=dst)
    text = _get(url).text
    trains: list[dict] = []
    for row in text.split("^")[1:]:
        f = row.split("~")
        if len(f) < 14 or not f[0].strip().isdigit():
            continue
        trains.append(
            {
                "train_id": f[0].strip(),
                "train_name": f[1].strip(),
                "origin_of_service": f[2].strip(),
                "terminus_of_service": f[4].strip(),
                "boarding_station": f[6].strip(),
                "boarding_code": f[7].strip(),
                "alighting_station": f[8].strip(),
                "alighting_code": f[9].strip(),
                "sched_dep_sbc": f[10].strip(),
                "sched_arr_mys": f[11].strip(),
                "sched_duration": f[12].strip(),
                "run_days_bitmap": f[13].strip(),
            }
        )
    _record_source(
        source_name="eRail — Trains between stations (SBC → MYS)",
        source_url=url,
        data_description=(
            "Public list of scheduled trains operating from KSR Bengaluru (SBC) to "
            "Mysuru Jn (MYS), with scheduled departure/arrival and running days."
        ),
        data_type="Timetable / schedule",
        historical_or_current="Current timetable",
        date_range="Timetable valid at collection date",
        fields_available=sorted(trains[0].keys()) if trains else [],
        extraction_method="HTTP GET of eRail's public getTrains endpoint, tilde/caret delimited parse",
        record_count=len(trains),
        limitations="Third-party aggregator of Indian Railways timetables; not an official IR endpoint.",
    )
    return trains


# --------------------------------------------------------------------------
# 2. Route (with real coordinates + distances)
# --------------------------------------------------------------------------
def fetch_train_route(train_id: str) -> dict | None:
    url = RAILRADAR_TRAIN_URL.format(train=train_id)
    try:
        payload = _get(url).json()
    except Exception:
        return None
    if not payload.get("success"):
        return None
    return {"_source_url": url, **payload["data"]}


# --------------------------------------------------------------------------
# 3. Historical running records
# --------------------------------------------------------------------------
def fetch_run(train_id: str, run_date: str) -> dict | None:
    """Fetch one (train, date) journey. Cached on disk so re-runs are resumable.

    An empty cache file records "the source returned no usable actuals for this
    journey" — that gap is preserved rather than filled with anything invented.
    """
    RUN_CACHE.mkdir(parents=True, exist_ok=True)
    cached = RUN_CACHE / f"{train_id}_{run_date}.json"
    if cached.exists():
        text = cached.read_text()
        return json.loads(text) if text.strip() else None

    url = RAILRADAR_RUN_URL.format(train=train_id, date=run_date)
    payload = _get(url, retries=1).json()
    data = payload.get("data")
    route = (data or {}).get("route") or []
    if (
        not payload.get("success")
        or not data
        or not any(s.get("actualArrival") or s.get("actualDeparture") for s in route)
    ):
        cached.write_text("")
        return None
    data["_source_url"] = url
    data["_requested_date"] = run_date
    cached.write_text(json.dumps(data))
    return data



def collect(days_back: int | None = None, train_limit: int | None = None) -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    days_back = days_back or CONFIG["scrape"]["days_back"]

    print("[1/4] fetching corridor train list from eRail ...", flush=True)
    trains = fetch_corridor_trains()
    if CONFIG["scrape"].get("daily_trains_only"):
        daily = [t for t in trains if t["run_days_bitmap"].count("1") == 7]
        if daily:
            trains = daily
    trains = trains[: (train_limit or CONFIG["scrape"].get("max_trains") or len(trains))]
    (RAW / "corridor_trains.json").write_text(json.dumps(trains, indent=2))
    print(f"      {len(trains)} trains listed SBC -> MYS", flush=True)

    print("[2/4] fetching real route geometry / distances ...", flush=True)
    routes: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=CONFIG["scrape"]["max_workers"]) as pool:
        futs = {pool.submit(fetch_train_route, t["train_id"]): t["train_id"] for t in trains}
        for fut in as_completed(futs):
            route = fut.result()
            if route:
                routes[futs[fut]] = route
    (RAW / "train_routes.json").write_text(json.dumps(routes, indent=2))
    print(f"      {len(routes)} routes retrieved", flush=True)
    _record_source(
        source_name="RailRadar — train route API",
        source_url=RAILRADAR_TRAIN_URL.format(train="{train_number}"),
        data_description=(
            "Station-by-station route for each corridor train: sequence, station code/name, "
            "latitude, longitude, cumulative distance from origin, halt flag, scheduled times."
        ),
        data_type="Route / geography / schedule",
        historical_or_current="Current",
        date_range="As of collection date",
        fields_available=["sequence", "station.code", "station.name", "station.lat", "station.lng", "distance", "isHalt", "arrival", "departure"],
        extraction_method="HTTP GET of RailRadar's public JSON web API",
        record_count=sum(len(r.get("route") or []) for r in routes.values()),
        limitations="Community/third-party aggregator; coordinates are approximate station points.",
    )

    print(f"[3/4] fetching historical running records for {days_back} days ...", flush=True)
    today = date.today()
    dates = [(today - timedelta(days=d)).isoformat() for d in range(2, days_back + 2)]
    jobs = [(t["train_id"], d) for t in trains for d in dates]
    budget = CONFIG["scrape"].get("max_history_requests")
    if budget:
        uncached = [j for j in jobs if not (RUN_CACHE / f"{j[0]}_{j[1]}.json").exists()]
        if len(uncached) > budget:
            keep = set(j for j in uncached[:budget])
            jobs = [j for j in jobs if (RUN_CACHE / f"{j[0]}_{j[1]}.json").exists() or j in keep]
            print(f"      request budget {budget} applied ({len(jobs)} journeys in scope)", flush=True)
    runs: list[dict] = []
    done = 0
    errors = 0
    fatal: str | None = None
    with ThreadPoolExecutor(max_workers=CONFIG["scrape"]["max_workers"]) as pool:
        futs = [pool.submit(fetch_run, tid, d) for tid, d in jobs]
        for fut in as_completed(futs):
            done += 1
            try:
                res = fut.result()
            except Exception as exc:  # noqa: BLE001
                errors += 1
                message = str(exc)
                if ("401" in message or "403" in message) and fatal is None:
                    fatal = message
                res = None
            if res:
                runs.append(res)
            if done % 250 == 0:
                print(
                    f"      {done}/{len(jobs)} requests, {len(runs)} runs with actuals, {errors} errors",
                    flush=True,
                )
    if fatal:
        print(f"      WARNING: source rejected requests ({fatal[:120]}); collection is partial", flush=True)
    (RAW / "running_history.json").write_text(json.dumps(runs))
    print(f"      {len(runs)} genuine historical journeys stored ({errors} failed requests)", flush=True)

    print(f"      {len(runs)} genuine historical journeys stored", flush=True)
    _record_source(
        source_name="RailRadar — train running history API (NTES-sourced)",
        source_url=RAILRADAR_RUN_URL.format(train="{train_number}", date="{YYYY-MM-DD}"),
        data_description=(
            "Per-journey, per-station actual arrival and departure timestamps with delay "
            "in minutes, for a specific train number and start date. Provider field on the "
            "payload reports NTES (National Train Enquiry System) as upstream for completed runs."
        ),
        data_type="Historical running / actual arrival & departure records",
        historical_or_current="Historical",
        date_range=f"{dates[-1]} to {dates[0]}",
        fields_available=[
            "trainNumber", "trainName", "startDate", "status", "delayMinutes",
            "route[].sequence", "route[].stationCode", "route[].stationName",
            "route[].scheduledArrival", "route[].scheduledDeparture",
            "route[].actualArrival", "route[].actualDeparture",
            "route[].delayArrival", "route[].delayDeparture", "route[].distance",
        ],
        extraction_method="HTTP GET per (train, date) against RailRadar's public JSON web API",
        record_count=len(runs),
        limitations=(
            "Coverage is uneven: cancelled runs and dates where the upstream feed retained no "
            "actuals return nothing, and some journeys carry actuals for only part of the route. "
            "Those gaps are left as gaps."
        ),
    )

    print("[4/4] fetching real historical weather (Open-Meteo archive) ...", flush=True)
    weather = None
    if CONFIG["weather"]["enabled"] and dates:
        wurl = OPEN_METEO_URL.format(
            lat=CONFIG["weather"]["latitude"],
            lon=CONFIG["weather"]["longitude"],
            start=dates[-1],
            end=dates[0],
        )
        try:
            weather = _get(wurl).json()
            (RAW / "weather.json").write_text(json.dumps(weather))
            _record_source(
                source_name="Open-Meteo Historical Weather Archive",
                source_url=wurl,
                data_description=(
                    "Hourly reanalysis weather for the mid-corridor point between Bengaluru and "
                    "Mysuru: temperature, precipitation, humidity, wind speed, visibility."
                ),
                data_type="Weather",
                historical_or_current="Historical",
                date_range=f"{dates[-1]} to {dates[0]}",
                fields_available=["time", "temperature_2m", "precipitation", "relative_humidity_2m", "wind_speed_10m", "visibility"],
                extraction_method="HTTP GET of Open-Meteo archive API (free, no key)",
                record_count=len((weather.get("hourly") or {}).get("time") or []),
                limitations="Single corridor midpoint, hourly resolution; reanalysis rather than station observation.",
            )
            print("      weather archive stored", flush=True)
        except Exception as exc:  # noqa: BLE001
            print(f"      weather unavailable ({exc}); weather features will be excluded", flush=True)

    (DATA / "data_sources.json").write_text(json.dumps(SOURCES, indent=2))
    print("done. raw data in data/raw, provenance in data/data_sources.json", flush=True)


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=None)
    ap.add_argument("--trains", type=int, default=None)
    args = ap.parse_args()
    collect(days_back=args.days, train_limit=args.trains)
