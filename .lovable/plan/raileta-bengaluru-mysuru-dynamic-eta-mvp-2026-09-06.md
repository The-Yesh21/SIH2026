# RailETA — Bengaluru → Mysuru Dynamic ETA MVP

A small, genuine, reproducible MVP: real public railway data → cleaning → feature engineering → LightGBM section travel-time model → ETA calculation → control-room dashboard. No fabricated rows, ever.

## How the two halves fit together

The Lovable app runs on a JavaScript server, so Python cannot run inside it. So:

- The **real pipeline** (scraping, cleaning, LightGBM training, evaluation, SHAP) runs in Python and is committed to the repo so you can rerun it end to end.
- The **trained model is exported** to a portable form, and the live dashboard scores predictions with that exact same trained model — not a stand-in formula.
- A **FastAPI service** ships in `/backend` with the `POST /predict-eta` endpoint for local/standalone use, loading the same saved model file.

## Step 1 — Find real data (before anything else)

Search public sources for Bengaluru → Mysuru corridor running data: open railway APIs, GitHub, Kaggle, open-data portals, railway info sites, research supplements. For each source I record name, URL, data type, date range, fields, date coverage, historical vs current, and limitations into `data/data_sources.json`.

Also check for a free live running-status API. If one exists and works without a paid key, the dashboard gets a live mode; if it needs a key you'd have to supply, I'll say so and ship demonstration mode. Same rule for historical weather (Open-Meteo archive is free and covers this corridor) — real values only, matched by date/time/section, otherwise weather is excluded from the model.

**Honest expectation:** journey-by-journey actual arrival times for this specific corridor are scarce publicly; much of what exists is aggregate per-station delay statistics. I will collect whatever genuine records exist, and if the usable sample is small the dashboard will say so in plain numbers rather than pad it.

## Step 2 — Dataset

Filter strictly to the Bengaluru → Mysuru corridor, using the official station names and the actual intermediate stations from the source (KSR Bengaluru, Kengeri, Ramanagaram, Channapatna, Maddur, Mandya, Mysuru and any others the source lists). Build station-level records with scheduled/actual arrival and departure, delays, and section fields; derive section travel times only from genuine sequential observations.

Cleaning removes duplicates, impossible/negative travel times, broken timestamps, inconsistent station names and outliers. Removed records stay removed — nothing is regenerated.

## Step 3 — Features and model

Features only where the underlying data genuinely exists: train id, day of week, hour, month, weekend, current delay, previous station delay, previous section travel time, historical mean/median section time, section variance, section id, distance, station sequence, remaining distance, plus weather if obtained.

Target: **section travel time**. Split **chronologically** (earliest → train, middle → validation, latest → test), documented in the UI. No future arrival information is ever an input for the arrival being predicted.

Evaluate MAE, RMSE, R², mean absolute delay error on the real test set, against a baseline of *scheduled time + current delay*. Improvement is reported only if it is actually measured — including if it is negative.

Saved to `/models`: model file, feature list, preprocessing config, parameters, training date, dataset version, metrics.

## Step 4 — App

- **Dashboard** — current train, current/next station, delay, journey progress, scheduled vs dynamic ETA, predicted delay, upcoming-station table with scheduled/predicted/difference, corridor route view (map only if genuine coordinates are available), and charts: scheduled vs predicted ETA, delay progression by station, historical vs predicted section time.
- **Journey replay** — pick a real historical journey and a point along it; the model predicts forward using only information available at that moment. Labelled "Historical Prediction / Demonstration Mode" unless a live feed is genuinely wired up.
- **Prediction explanation** — top contributing factors from real feature importance / SHAP values.
- **Dataset & Sources** — record count, unique trains, journeys, date range, sections, missing-data percentage, and the full source table with URLs and collection dates.
- **ML Model** — model type, target, train/test sizes, feature list, MAE, RMSE, R², baseline vs LightGBM.

Every figure on screen is tagged as observed data, calculated feature, or model prediction.

Visual direction: dark operations-console aesthetic — deep slate surfaces, signal amber/green status accents, condensed technical type, dense data tables. Not a generic SaaS dashboard.

## Step 5 — Repro

`/scripts` gets one command per stage plus a single `run_all` that goes scrape → clean → build dataset → features → train → evaluate → export. README documents every command, the data limitations, and how to start FastAPI and the frontend.

## Technical notes

- Layout: `/frontend` is the existing Lovable app (`src/`), plus `/backend` (FastAPI), `/ml` (`data_loader`, `preprocessing`, `feature_engineering`, `train`, `evaluate`, `predict`), `/data` (raw + processed + `data_sources.json`), `/models`, `/scripts`, `/config`.
- LightGBM trains in Python; the model is exported as `model.txt` (native text dump) and a JSON tree structure. The app's server route implements LightGBM's tree traversal over that JSON, so predictions are the trained model's, verified to match Python output on the test set.
- App prediction endpoint: `POST /api/predict-eta`, mirroring the FastAPI contract, plus recursive downstream ETA chaining.
- Dataset artifacts are committed as static JSON the app reads directly — no database needed for this MVP.

## Limitations reported up front

If real records are few, the ML Model page states the sample size, the split sizes, and that metrics from a small test set are indicative rather than production-grade. No claim of official Indian Railways provenance unless a source actually is official.
