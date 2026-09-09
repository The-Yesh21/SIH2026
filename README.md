# RailETA

### Bengaluru → Mysuru ETA intelligence, built on real historical train-running data

> A research prototype that predicts station-by-station arrival times for the KSR Bengaluru (SBC) → Mysuru Junction (MYS) corridor. RailETA uses a LightGBM model and keeps the full data journey visible—from collection to dashboard.

| 🧭 Corridor | 🧠 Model | 🖥️ Experience | 🔎 Operating mode |
| :--- | :--- | :--- | :--- |
| SBC → MYS | LightGBM regressor | React + Vite dashboard | Historical replay |

## Why RailETA?

RailETA is designed around one simple principle: **be useful without inventing data**. It learns from publicly available completed journeys, reports data gaps honestly, and makes the model, evaluation, and source provenance visible in the web app.

```mermaid
flowchart LR
    A[Public rail data] --> B[Collect & cache]
    B --> C[Clean genuine timestamps]
    C --> D[Causal feature engineering]
    D --> E[LightGBM training]
    E --> F[Evaluate against timetable baseline]
    F --> G[Export browser-ready artifacts]
    G --> H[RailETA dashboard]

    classDef source fill:#1e3a5f,stroke:#60a5fa,color:#fff
    classDef process fill:#134e4a,stroke:#5eead4,color:#fff
    classDef output fill:#4c1d95,stroke:#c4b5fd,color:#fff
    class A source
    class B,C,D,E,F process
    class G,H output
```

## What you can explore

| View | What it answers |
| :--- | :--- |
| 🚆 **Replay dashboard** | How did a real past journey progress, and what ETA did the model produce? |
| 📊 **ML Model page** | How was the model trained, evaluated, and compared to the timetable baseline? |
| 🗂️ **Dataset & Sources** | Which sources supplied each field, when was data collected, and what are its limitations? |
| 🔌 **FastAPI service** | How can another client request an ETA, journey prediction, or model metadata? |

## Project map

```text
RailETA
├── ml/                 Data collection, feature engineering, training and evaluation
├── backend/            FastAPI prediction endpoints
├── src/                React dashboard and browser-side model artifacts
├── data/               Cached raw payloads, processed datasets and provenance
├── models/             Trained model, metrics and metadata
├── scripts/            End-to-end pipeline helpers
└── config/             Pipeline limits and collection settings
```

## Run locally

### 1. Start the dashboard

```powershell
npm install
npm run dev
```

Open the URL Vite prints—normally `http://localhost:8080`.

### 2. Start the API (optional)

Open a second PowerShell window:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --port 8000
```

The API is available at `http://localhost:8000`; interactive documentation is at `http://localhost:8000/docs`.

### 3. Reproduce the ML pipeline

You need Python 3.10+ and a RailRadar API key. Put the key in `.env.local`—it is intentionally ignored by Git.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt

# Add RAILRADAR_API_KEY=your_key_here to .env.local
bash scripts/run_all.sh
```

Individual stages are also available:

```bash
bash scripts/scrape.sh
python -m ml.preprocessing
python -m ml.feature_engineering
bash scripts/train.sh
python -m ml.export_artifacts
bash scripts/serve_api.sh
```

## API at a glance

| Endpoint | Purpose |
| :--- | :--- |
| `GET /health` | Service health check |
| `POST /predict-eta` | Estimate arrival at one station |
| `POST /predict-journey` | Predict a complete remaining journey |
| `GET /model-info` | Model metadata and evaluation context |
| `GET /dataset` | Dataset summary |
| `GET /data-sources` | Provenance and source limitations |

## Data sources & integrity

RailETA records provenance—including source URL, fields, extraction method, record count, date range, collection date, and constraints—in [`data/data_sources.json`](data/data_sources.json).

| Source | Used for | Important constraint |
| :--- | :--- | :--- |
| [RailRadar API](https://api.railradar.in/v1) | Train metadata, route geometry and completed historical runs | Free API tier is rate- and quota-limited |
| [eRail](https://erail.in) | Corridor train list | Availability depends on the upstream site |
| [Open-Meteo Archive](https://archive-api.open-meteo.com) | Optional historic weather | Enabled through `config/pipeline.json` |

The collection pipeline observes configured request caps and throttling, then caches raw payloads under `data/raw/runs/` so reruns can resume without unnecessarily consuming quota.

## Honest limitations

> **This is a historical-replay research prototype—not a live train-tracking or operational system.**

- **No fabricated journeys.** Missing, cancelled, partial, or implausible records are excluded rather than invented or imputed.
- **Small sample sizes.** Free-tier API limits constrain the amount of training data; held-out metrics are reported as measured, even where the model does not outperform the timetable baseline.
- **No legal free live-position feed.** The dashboard replays genuine completed journeys and clearly labels that mode.
- **Provider dependency.** Actual timestamps rely on NTES-derived data republished by the upstream providers and may inherit their delays or inaccuracies.
- **Not for safety-critical or commercial decisions.**

---

Built for transparent rail ETA experimentation on the Bengaluru–Mysuru corridor.
