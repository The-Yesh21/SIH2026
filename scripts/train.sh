#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python ml/preprocessing.py && python ml/feature_engineering.py && python ml/train.py && python ml/evaluate.py && python ml/export_artifacts.py
