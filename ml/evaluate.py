"""Evaluate the trained LightGBM model against the traditional baseline.

Baseline (traditional ETA): the section is assumed to take exactly its
scheduled time, so the arrival estimate is "scheduled arrival + current delay".
Both models are scored on the SAME held-out, most-recent test dates.
"""

from __future__ import annotations

import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
MODELS = ROOT / "models"


def metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    err = y_pred - y_true
    ss_res = float(np.sum(err**2))
    ss_tot = float(np.sum((y_true - y_true.mean()) ** 2))
    return {
        "mae": round(float(np.mean(np.abs(err))), 3),
        "rmse": round(float(np.sqrt(np.mean(err**2))), 3),
        "r2": round(1 - ss_res / ss_tot, 4) if ss_tot > 0 else None,
        "median_abs_error": round(float(np.median(np.abs(err))), 3),
        "bias": round(float(np.mean(err)), 3),
    }


def main() -> None:
    meta = json.loads((MODELS / "model_metadata.json").read_text())
    features = meta["features"]
    booster = lgb.Booster(model_file=str(MODELS / "model.txt"))
    test = pd.read_parquet(PROCESSED / "split_test.parquet")

    y = test["actual_section_travel_time"].to_numpy()
    baseline = test["scheduled_section_travel_time"].to_numpy()
    # The model predicts the DEVIATION from schedule; add the schedule back to
    # score it on the same absolute scale as the baseline.
    pred = booster.predict(test[features]) + baseline

    lgbm_m = metrics(y, pred)
    base_m = metrics(y, baseline)

    # arrival-delay error: how wrong is the predicted arrival delay at the next
    # station, in minutes, for each approach
    delay_true = test["next_arrival_delay_minutes"].astype(float).to_numpy()
    delay_lgbm = test["current_delay"].to_numpy() + (pred - baseline)
    delay_base = test["current_delay"].to_numpy()
    valid = ~np.isnan(delay_true)

    improvement = (
        round((base_m["mae"] - lgbm_m["mae"]) / base_m["mae"] * 100, 2) if base_m["mae"] else None
    )

    importance = sorted(
        [
            {"feature": f, "gain": round(float(g), 2)}
            for f, g in zip(features, booster.feature_importance("gain"))
        ],
        key=lambda r: -r["gain"],
    )

    shap_summary = None
    try:
        import shap  # noqa: PLC0415

        sample = test[features].sample(min(400, len(test)), random_state=0)
        values = shap.TreeExplainer(booster).shap_values(sample)
        shap_summary = sorted(
            [
                {"feature": f, "mean_abs_shap": round(float(v), 4)}
                for f, v in zip(features, np.abs(values).mean(axis=0))
            ],
            key=lambda r: -r["mean_abs_shap"],
        )
    except Exception as exc:  # noqa: BLE001
        print(f"SHAP unavailable: {exc}")

    # Validation-window metrics, reported with the same reconstruction rule
    # (predicted deviation + schedule) for transparency across both windows.
    valid_df = pd.read_parquet(PROCESSED / "split_valid.parquet")
    vy = valid_df["actual_section_travel_time"].to_numpy()
    vsched = valid_df["scheduled_section_travel_time"].to_numpy()
    vpred = booster.predict(valid_df[features]) + vsched
    valid_metrics = metrics(vy, vpred)
    valid_base = metrics(vy, vsched)

    results = {
        "evaluated_on": "chronologically held-out most recent test dates",
        "test_records": int(len(test)),
        "test_date_range": meta["split"]["date_ranges"]["test"],
        "lightgbm": lgbm_m,
        "baseline_scheduled_plus_delay": base_m,
        "improvement_pct_mae": improvement,
        "validation_window": {
            "records": int(len(valid)),
            "date_range": meta["split"]["date_ranges"]["valid"],
            "lightgbm": valid_metrics,
            "baseline_scheduled_plus_delay": valid_base,
            "improvement_pct_mae": round(
                (valid_base["mae"] - valid_metrics["mae"]) / valid_base["mae"] * 100, 2
            )
            if valid_base["mae"]
            else None,
            "note": (
                "Model corrects systematic timetable error well when the schedule is "
                "the weak point; where the timetable is already near the noise floor "
                "the schedule-only baseline is hard to beat."
            ),
        },
        "mean_absolute_delay_prediction_error": {
            "lightgbm": round(float(np.mean(np.abs(delay_lgbm[valid] - delay_true[valid]))), 3)
            if valid.any()
            else None,
            "baseline": round(float(np.mean(np.abs(delay_base[valid] - delay_true[valid]))), 3)
            if valid.any()
            else None,
            "records": int(valid.sum()),
        },
        "feature_importance_gain": importance,
        "shap_mean_abs": shap_summary,
    }
    (MODELS / "evaluation.json").write_text(json.dumps(results, indent=2))
    print(json.dumps({k: v for k, v in results.items() if k not in ("feature_importance_gain", "shap_mean_abs")}, indent=2))


if __name__ == "__main__":
    main()
