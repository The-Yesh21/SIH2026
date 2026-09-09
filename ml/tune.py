"""Validation-scored hyperparameter search for the deviation model.

Scores every candidate exactly the way evaluate.py scores the final model:
predicted deviation + scheduled time vs actual section time, on the
chronological validation split. The winner is printed as the block to paste
into config/pipeline.json.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
CONFIG = json.loads((ROOT / "config" / "pipeline.json").read_text())


def metrics(y: np.ndarray, pred: np.ndarray) -> float:
    return float(np.mean(np.abs(pred - y)))


def main() -> None:
    df = pd.read_parquet(PROCESSED / "features.parquet")
    meta = json.loads((PROCESSED / "feature_config.json").read_text())
    features, target = meta["features"], meta["target"]

    # Identical chronological split to train.py.
    dates = sorted(df["date"].unique())
    n = len(dates)
    i = int(n * CONFIG["split"]["train_fraction"])
    j = int(n * (CONFIG["split"]["train_fraction"] + CONFIG["split"]["validation_fraction"]))
    train = df[df["date"].isin(dates[:i])].copy()
    valid = df[df["date"].isin(dates[i:j])].copy()

    train["target_deviation"] = train[target] - train["scheduled_section_travel_time"]
    valid["target_deviation"] = valid[target] - valid["scheduled_section_travel_time"]

    y_valid = valid[target].to_numpy()
    sched_valid = valid["scheduled_section_travel_time"].to_numpy()
    baseline_mae = metrics(y_valid, sched_valid)

    grid = {
        "num_leaves": [7, 15, 31],
        "min_child_samples": [20, 40, 60],
        "learning_rate": [0.03, 0.05],
        "reg_alpha": [0.0, 0.5, 1.0],
        "reg_lambda": [0.0, 1.0, 5.0],
    }
    combos = list(itertools.product(*grid.values()))
    print(f"searching {len(combos)} candidates (baseline val MAE {baseline_mae:.4f}) ...", flush=True)

    results = []
    for k, (num_leaves, mcs, lr, alpha, lam) in enumerate(combos, 1):
        model = lgb.LGBMRegressor(
            objective="regression_l1",
            num_leaves=num_leaves,
            learning_rate=lr,
            n_estimators=800,
            min_child_samples=mcs,
            subsample=0.9,
            subsample_freq=1,
            colsample_bytree=0.9,
            reg_alpha=alpha,
            reg_lambda=lam,
            random_state=42,
            verbose=-1,
        )
        model.fit(
            train[features],
            train["target_deviation"],
            eval_set=[(valid[features], valid["target_deviation"])],
            callbacks=[lgb.early_stopping(50, verbose=False)],
        )
        pred = model.predict(valid[features]) + sched_valid
        results.append(
            {
                "num_leaves": num_leaves,
                "min_child_samples": mcs,
                "learning_rate": lr,
                "reg_alpha": alpha,
                "reg_lambda": lam,
                "val_mae": round(metrics(y_valid, pred), 4),
                "best_iteration": int(model.best_iteration_ or 0),
            }
        )
        if k % 18 == 0:
            print(f"  {k}/{len(combos)} done (best so far {min(r['val_mae'] for r in results):.4f})", flush=True)

    results.sort(key=lambda r: r["val_mae"])
    print("\ntop 10 candidates:")
    print(json.dumps(results[:10], indent=2))
    print(f"\nbaseline (schedule only) validation MAE: {baseline_mae:.4f}")

    best = results[0]
    print('\nPaste into config/pipeline.json -> "model":')
    print(
        json.dumps(
            {
                "objective": "regression_l1",
                "target": target,
                "num_leaves": best["num_leaves"],
                "learning_rate": best["learning_rate"],
                "n_estimators": 800,
                "min_child_samples": best["min_child_samples"],
                "subsample": 0.9,
                "colsample_bytree": 0.9,
                "reg_alpha": best["reg_alpha"],
                "reg_lambda": best["reg_lambda"],
                "early_stopping_rounds": 50,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
