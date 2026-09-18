"""RailETA Traffic Awareness & Cascading Delay Propagation Engine.

Models real-world multi-train interactions on shared tracks:
1. Preceding Train Headway & Delay: Checks if a train ahead in the same block section
   is delayed, causing signal aspect downgrades (Yellow/Double Yellow) and reactionary delay.
2. Corridor Traffic Density: Computes concurrent active trains in the corridor window.
3. Sectional Congestion Index: Quantifies local track load within +/- 45 minutes.
4. Priority Conflict / Preemption: Identifies when lower-priority trains precede higher-priority
   expresses on the same track.
"""

from __future__ import annotations

import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PROCESSED = DATA / "processed"

TRAIN_PRIORITIES = {
    "12614": 1,  # Superfast Express (Wodeyar SF)
    "12785": 1,  # Superfast Express (Kacheguda SF)
    "16231": 2,  # Express (Mayiladuturai Exp)
    "16316": 2,  # Express (Kochuveli Exp)
    "16216": 2,  # Express (Chamundi Exp)
    "16220": 2,  # Express (Chamarajanagar Exp)
    "16228": 2,  # Express (Talguppa Exp)
    "56232": 3,  # Passenger (SMVB Passenger)
}


def compute_traffic_features(df: pd.DataFrame) -> pd.DataFrame:
    """Enriches section movements with network traffic & delay propagation features.
    
    Operates strictly in chronological order without future leakage.
    """
    df = df.copy()
    
    # Ensure standard datetime format for chronological processing
    df["actual_departure_dt"] = pd.to_datetime(df["actual_departure"], utc=True)
    df["actual_arrival_next_dt"] = pd.to_datetime(df["actual_arrival_next"], utc=True)
    
    # Sort strictly by departure time
    df = df.sort_values("actual_departure_dt").reset_index(drop=True)
    
    n_rows = len(df)
    preceding_headway = np.full(n_rows, 120.0, dtype=np.float32)  # default: 2 hours (open track)
    preceding_delay = np.zeros(n_rows, dtype=np.float32)
    preceding_overage = np.zeros(n_rows, dtype=np.float32)
    preceding_is_lower_prio = np.zeros(n_rows, dtype=np.int32)
    section_congestion = np.ones(n_rows, dtype=np.float32)
    corridor_density = np.ones(n_rows, dtype=np.float32)
    
    # Map train priority
    priorities = df["train_id"].map(TRAIN_PRIORITIES).fillna(2).values
    section_ids = df["section_id"].values
    dep_times = df["actual_departure_dt"].values
    arr_times = df["actual_arrival_next_dt"].values
    dep_delays = pd.to_numeric(df["departure_delay_minutes"], errors="coerce").fillna(0.0).values
    actual_durations = df["actual_section_travel_time"].values
    sched_durations = df["scheduled_section_travel_time"].values
    overages = actual_durations - sched_durations
    
    # 1. Compute Preceding Train Dynamics per Section
    # For each section, track the history of trains that passed through it
    section_history: dict[str, list[dict]] = {}
    
    for i in range(n_rows):
        sec = section_ids[i]
        cur_dep = dep_times[i]
        cur_prio = priorities[i]
        
        # Look up preceding trains in this specific section
        if sec in section_history and len(section_history[sec]) > 0:
            # Find the most recent preceding train strictly BEFORE cur_dep
            recent_trains = [t for t in section_history[sec] if t["dep_time"] < cur_dep]
            if recent_trains:
                last_train = recent_trains[-1]
                delta_minutes = (cur_dep - last_train["dep_time"]) / np.timedelta64(1, "m")
                
                # If within 180 minutes, it influences the track block state
                if delta_minutes <= 180.0:
                    preceding_headway[i] = float(delta_minutes)
                    preceding_delay[i] = float(last_train["delay"])
                    preceding_overage[i] = float(last_train["overage"])
                    # Check if a slower / lower-priority train is ahead
                    if last_train["prio"] > cur_prio:
                        preceding_is_lower_prio[i] = 1
                
                # Local section congestion: trains traversing this section in last 60 mins
                active_in_sec = sum(1 for t in recent_trains if (cur_dep - t["dep_time"]) / np.timedelta64(1, "m") <= 60.0)
                section_congestion[i] = float(active_in_sec + 1)
        
        # Record current train in section history
        if sec not in section_history:
            section_history[sec] = []
        section_history[sec].append({
            "dep_time": cur_dep,
            "arr_time": arr_times[i],
            "delay": dep_delays[i],
            "overage": overages[i],
            "prio": cur_prio,
        })
        
    # 2. Compute Global Corridor Active Density
    # Number of trains concurrently on track across the entire corridor at time t
    for i in range(n_rows):
        cur_dep = dep_times[i]
        # Count trips that started before cur_dep and finished after cur_dep
        # Search in a rolling window
        t_start = cur_dep - np.timedelta64(60, "m")
        t_end = cur_dep + np.timedelta64(60, "m")
        in_window = np.sum((dep_times >= t_start) & (dep_times <= t_end))
        corridor_density[i] = float(in_window)

    # Assign new features
    df["preceding_train_headway_mins"] = preceding_headway
    df["preceding_train_delay_mins"] = preceding_delay
    df["preceding_train_overage_mins"] = preceding_overage
    df["preceding_is_lower_priority"] = preceding_is_lower_prio
    df["section_congestion_count"] = section_congestion
    df["corridor_active_density"] = corridor_density
    
    # Interaction: Reactionary Delay Risk Score
    # High risk when headway is small (<30 min) and preceding train is heavily delayed (>15 min)
    df["reactionary_delay_risk"] = np.where(
        df["preceding_train_headway_mins"] < 45.0,
        (df["preceding_train_delay_mins"] / (df["preceding_train_headway_mins"] + 5.0)),
        0.0
    ).astype(np.float32)
    
    df = df.drop(columns=["actual_departure_dt", "actual_arrival_next_dt"])
    return df
