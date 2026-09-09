#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python ml/data_loader.py "$@"
