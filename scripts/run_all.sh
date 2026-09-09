#!/usr/bin/env bash
# Full RailETA pipeline: real scrape -> clean -> features -> train -> evaluate -> export
set -euo pipefail
cd "$(dirname "$0")/.."
python ml/data_loader.py "$@"          # 1. collect real public data
python ml/preprocessing.py             # 2. clean + build corridor dataset
python ml/feature_engineering.py       # 3. engineer leak-free features
python ml/train.py                     # 4. train LightGBM
python ml/evaluate.py                  # 5. evaluate vs baseline (+ SHAP)
python ml/export_artifacts.py          # 6. export model + data into the web app
echo "pipeline complete"
