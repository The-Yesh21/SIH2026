"""Train the LightGBM section travel-time regressor on the real corridor data."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import lightgbm as lgb
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
MODELS = ROOT / "models"
CONFIG = json.loads((ROOT / "config" / "pipeline.json").read_text())


def chronological_split(df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """Split by date, never at random: earlier dates train, latest dates test."""
    cfg = CONFIG["split"]
    dates = sorted(df["date"].unique())
    n = len(dates)
    i = int(n * cfg["train_fraction"])
    j = int(n * (cfg["train_fraction"] + cfg["validation_fraction"]))
    train_dates, val_dates, test_dates = dates[:i], dates[i:j], dates[j:]
    return {
        "train": df[df["date"].isin(train_dates)],
        "valid": df[df["date"].isin(val_dates)],
        "test": df[df["date"].isin(test_dates)],
        "_dates": {
            "train": [train_dates[0], train_dates[-1]] if train_dates else [],
            "valid": [val_dates[0], val_dates[-1]] if val_dates else [],
            "test": [test_dates[0], test_dates[-1]] if test_dates else [],
        },
    }


def main() -> None:
    MODELS.mkdir(parents=True, exist_ok=True)
    df = pd.read_parquet(PROCESSED / "features.parquet")
    meta = json.loads((PROCESSED / "feature_config.json").read_text())
    features, target = meta["features"], meta["target"]

    parts = chronological_split(df)
    train, valid, test = parts["train"], parts["valid"], parts["test"]
    if len(train) < 50 or len(test) < 10:
        raise SystemExit(
            f"not enough real records to train responsibly (train={len(train)}, test={len(test)})"
        )

    m = CONFIG["model"]

    # Residual (deviation) target: the model learns actual − scheduled instead
    # of absolute section time. The timetable baseline is therefore the model's
    # zero point — it can only add corrections on top of the schedule, never
    # re-learn (and lose to) the schedule itself.
    for part in (train, valid, test):
        part["target_deviation"] = part[target] - part["scheduled_section_travel_time"]

    model = lgb.LGBMRegressor(
        objective=m["objective"],
        num_leaves=m["num_leaves"],
        learning_rate=m["learning_rate"],
        n_estimators=m["n_estimators"],
        min_child_samples=m["min_child_samples"],
        subsample=m["subsample"],
        subsample_freq=1,
        colsample_bytree=m["colsample_bytree"],
        reg_alpha=m.get("reg_alpha", 0.0),
        reg_lambda=m.get("reg_lambda", 0.0),
        random_state=42,
        verbose=-1,
    )
    eval_set = [(valid[features], valid["target_deviation"])] if len(valid) else None
    model.fit(
        train[features],
        train["target_deviation"],
        eval_set=eval_set,
        callbacks=[lgb.early_stopping(m["early_stopping_rounds"], verbose=False)] if eval_set else None,
    )

    model.booster_.save_model(str(MODELS / "model.txt"))
    (MODELS / "model_dump.json").write_text(json.dumps(model.booster_.dump_model()))
    (MODELS / "model_metadata.json").write_text(
        json.dumps(
            {
                "model": "LightGBM Regression",
                "prediction_target": "section travel time (minutes)",
                "training_date": datetime.now().astimezone().isoformat(),
                "dataset_version": (PROCESSED / "dataset_summary.json").exists()
                and json.loads((PROCESSED / "dataset_summary.json").read_text()).get("built_at"),
                "features": features,
                "weather_used": meta["weather_used"],
                "fill_values": meta["fill_values"],
                "train_codes": meta["train_codes"],
                "section_codes": meta["section_codes"],
                "parameters": model.get_params(),
                "best_iteration": model.best_iteration_,
                "split": {
                    "method": "chronological (by journey start date)",
                    "train_records": int(len(train)),
                    "validation_records": int(len(valid)),
                    "test_records": int(len(test)),
                    "date_ranges": parts["_dates"],
                },
            },
            indent=2,
            default=str,
        )
    )
    for name, part in (("train", train), ("valid", valid), ("test", test)):
        part.to_parquet(PROCESSED / f"split_{name}.parquet", index=False)
    print(
        f"trained on {len(train)} records; validation {len(valid)}; test {len(test)}; "
        f"best_iteration={model.best_iteration_}"
    )


if __name__ == "__main__":
    main()
