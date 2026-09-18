"""Historical Delay & Traffic Pattern Analyzer for Indian Railways Corridor.

Analyzes 90+ days of real train runs to uncover:
1. Sectional Bottlenecks & Chronic Delay Hotspots.
2. Reactionary Delay Propagation Factor (Impact of Preceding Train Delays).
3. Temporal Delay Distribution by Hour of Day & Day of Week.
4. Train-by-Train Punctuality & Recovery Profiles.
"""

from __future__ import annotations

import json
from pathlib import Path
import numpy as np
import pandas as pd
from ml.traffic_engine import compute_traffic_features

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PROCESSED = DATA / "processed"


def analyze_historical_traffic() -> dict:
    sections_path = PROCESSED / "sections_clean.parquet"
    if not sections_path.exists():
        raise FileNotFoundError(f"Missing {sections_path}")
        
    df = pd.read_parquet(sections_path)
    df = compute_traffic_features(df)
    
    df["dep_hour"] = pd.to_datetime(df["actual_departure"], utc=True).dt.tz_convert("Asia/Kolkata").dt.hour
    df["day_name"] = pd.to_datetime(df["actual_departure"], utc=True).dt.tz_convert("Asia/Kolkata").dt.day_name()
    df["section_overage"] = df["actual_section_travel_time"] - df["scheduled_section_travel_time"]
    
    # 1. Section Bottleneck Analysis
    sec_summary = df.groupby("section_id").agg(
        total_runs=("journey_id", "count"),
        avg_scheduled_time=("scheduled_section_travel_time", "mean"),
        avg_actual_time=("actual_section_travel_time", "mean"),
        avg_overage_minutes=("section_overage", "mean"),
        median_overage_minutes=("section_overage", "median"),
        overage_rate=("section_overage", lambda s: float((s > 2.0).mean() * 100)),
        avg_dep_delay=("departure_delay_minutes", "mean"),
    ).round(2).reset_index()
    
    # 2. Delay Propagation Analysis (Reactionary Delay Impact)
    # Compare train performance when preceding train is on-time vs delayed
    df["preceding_status"] = np.where(
        df["preceding_train_headway_mins"] > 60.0,
        "Clear Track (>60m headway)",
        np.where(
            df["preceding_train_delay_mins"] > 15.0,
            "Close Headway + Preceding Delayed (>15m)",
            "Close Headway + Preceding On-Time"
        )
    )
    
    prop_summary = df.groupby("preceding_status").agg(
        sample_count=("journey_id", "count"),
        avg_section_overage=("section_overage", "mean"),
        delay_occurrence_rate=("section_overage", lambda s: float((s > 2.0).mean() * 100)),
    ).round(2).reset_index()
    
    # 3. Hourly Congestion & Delay Profile
    hourly_summary = df.groupby("dep_hour").agg(
        active_movements=("journey_id", "count"),
        avg_departure_delay=("departure_delay_minutes", "mean"),
        avg_section_overage=("section_overage", "mean"),
        avg_corridor_density=("corridor_active_density", "mean")
    ).round(2).reset_index()
    
    # 4. Train Reliability Breakdown
    train_summary = df.groupby(["train_id", "train_name"]).agg(
        total_runs=("journey_id", "nunique"),
        avg_initial_delay=("departure_delay_minutes", "mean"),
        avg_overage=("section_overage", "mean"),
    ).round(2).reset_index()
    
    report = {
        "summary": {
            "total_observed_sections": len(df),
            "unique_journeys": int(df["journey_id"].nunique()),
            "date_range": [str(df["date"].min()), str(df["date"].max())],
        },
        "section_bottlenecks": sec_summary.to_dict(orient="records"),
        "delay_propagation_dynamics": prop_summary.to_dict(orient="records"),
        "hourly_traffic_profile": hourly_summary.to_dict(orient="records"),
        "train_reliability": train_summary.to_dict(orient="records")
    }
    
    out_file = PROCESSED / "traffic_delay_analysis.json"
    out_file.write_text(json.dumps(report, indent=2))
    print(f"Historical traffic and delay analysis written to {out_file}")
    return report


if __name__ == "__main__":
    rep = analyze_historical_traffic()
    print("\n--- SECTION BOTTLENECKS ---")
    for sec in rep["section_bottlenecks"]:
        print(f"Section {sec['section_id']}: Avg Overage = {sec['avg_overage_minutes']}m | Delay Rate = {sec['overage_rate']}%")
        
    print("\n--- DELAY PROPAGATION DYNAMICS ---")
    for p in rep["delay_propagation_dynamics"]:
        print(f"Traffic State: {p['preceding_status']} -> Avg Section Overage: {p['avg_section_overage']}m (Delay Rate: {p['delay_occurrence_rate']}%)")
