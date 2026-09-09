# RailETA — Bengaluru → Mysuru train ETA prediction

RailETA predicts station-by-station arrival times for trains on the KSR Bengaluru (SBC) →
Mysuru Jn (MYS) corridor, using a LightGBM model trained on **real, publicly published
historical running data**. No records are fabricated, duplicated, or synthetically modified
anywhere in this project. Where the upstream sources have no data, the gap stays a gap and is
reported as such.

## What is in the box

| Part | Path | What it does |
| --- | --- | --- |
| Data collection | `ml/data_loader.py` | Fetches corridor train list, route geometry, and historical running records; caches every raw payload with its source URL |
| Cleaning | `ml/preprocessing.py` | Parses genuine scheduled/actual timestamps, drops cancelled/partial/implausible records, writes a cleaning report |
| Features | `ml/feature_engineering.py` | Builds causal, non-leaking features (historical section stats use strictly earlier journeys only) |
| Training | `ml/train.py` | LightGBM regressor on section travel time, chronological train/valid/test split |
| Evaluation | `ml/evaluate.py` | Test metrics vs. a scheduled-time + current-delay baseline, feature importance, SHAP |
| Export | `ml/export_artifacts.py` | Exports the trained trees and real data into `src/data/` for the web app, with Python↔browser parity check |
| API | `backend/main.py` | FastAPI: `/health`, `/predict-eta`, `/predict-journey`, `/model-info`, `/dataset`, `/data-sources` |
| Web app | `src/` | Dashboard (historical replay), Dataset & Sources page, ML Model page |

## Data sources

All sources are public. Full per-source provenance — URL, fields, extraction method, record
count, date range, collection date, and limitations — is written to `data/data_sources.json`
and rendered on the **Dataset & Sources** page.

- **RailRadar API** (`https://api.railradar.in/v1`) — train metadata, route geometry with real
  distances, and completed historical journeys with scheduled and actual station timestamps.
  Requires a free API key (Bearer auth). Free tier: 10 requests/minute, 1,000/month, which is
  the binding constraint on dataset size.
- **eRail** (`https://erail.in`) — the list of trains actually running the SBC → MYS corridor.
- **Open-Meteo Archive** (`https://archive-api.open-meteo.com`) — optional real historical
  weather for the corridor; enabled via `config/pipeline.json`.

There is **no free, legal, public live-position feed** for Indian Railways. The dashboard
therefore runs in **historical replay mode** over genuine completed journeys, and says so on
screen. It never simulates live movement.

## Reproduce it

```bash
# 1. Python environment
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt

# 2. API key (never commit this)
echo 'RAILRADAR_API_KEY=your_key_here' > .env.local

# 3. Full pipeline: collect -> clean -> features -> train -> evaluate -> export
bash scripts/run_all.sh
```

Individual stages:

```bash
bash scripts/scrape.sh     # python -m ml.data_loader
python -m ml.preprocessing
python -m ml.feature_engineering
bash scripts/train.sh      # python -m ml.train && python -m ml.evaluate
python -m ml.export_artifacts
bash scripts/serve_api.sh  # uvicorn backend.main:app --reload --port 8000
```

Web app:

```bash
bun install
bun run dev     # http://localhost:8080
```

Collection respects the provider's published quota: `config/pipeline.json` caps requests
(`max_history_requests`), throttles them (`min_request_interval_seconds`), and caches every
journey under `data/raw/runs/`, so a re-run resumes instead of re-spending quota.

## Honest limitations

- **Small sample.** The free API quota limits the dataset to a few hundred real journeys across
  a handful of daily corridor trains. Metrics on the held-out test set are reported exactly as
  measured, including cases where the model does not beat the timetable baseline.
- **Gaps stay gaps.** Cancelled runs, partial journeys, and missing actual timestamps are
  dropped, not imputed. Their counts appear in the cleaning report.
- **Replay, not live.** ETAs on the dashboard are computed from a chosen point in a real past
  journey, using only information available at that point.
- **Provider dependency.** All actual-timestamp data ultimately traces to NTES-derived feeds
  republished by the source APIs, and inherits their reporting delays and errors.
- **Not operational.** This is a research prototype and must not be used for operational,
  commercial, or safety-critical decisions.
