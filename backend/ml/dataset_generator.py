import math
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple

TRAIN_TYPE_MAP = {
    "VANDE_BHARAT": 0,
    "SHATABDI": 1,
    "SUPERFAST": 2,
    "EXPRESS": 3,
    "MEMU": 4,
    "FREIGHT_BOXN": 5
}

WEATHER_MAP = {
    "CLEAR": 0,
    "FOG_MIST": 1,
    "MONSOON_RAIN": 2,
    "HEAVY_DOWNPOUR": 3
}

SURFACE_MAP = {
    "DRY": 0,
    "DAMP": 1,
    "WET_SLIPPERY": 2,
    "WATERLOGGED": 3
}

PRIORITY_SPECS = {
    "VANDE_BHARAT": {"tier": 1, "tractiveHp": 14.8, "baseSlack": 1.4, "mps": 130.0, "coaches": 16, "decel": 0.8},
    "SHATABDI": {"tier": 1, "tractiveHp": 9.6, "baseSlack": 1.1, "mps": 120.0, "coaches": 16, "decel": 0.7},
    "SUPERFAST": {"tier": 2, "tractiveHp": 7.2, "baseSlack": 0.8, "mps": 110.0, "coaches": 22, "decel": 0.65},
    "EXPRESS": {"tier": 2, "tractiveHp": 6.8, "baseSlack": 0.7, "mps": 110.0, "coaches": 20, "decel": 0.65},
    "MEMU": {"tier": 3, "tractiveHp": 8.0, "baseSlack": 0.6, "mps": 100.0, "coaches": 12, "decel": 0.85},
    "FREIGHT_BOXN": {"tier": 4, "tractiveHp": 4.5, "baseSlack": 0.3, "mps": 75.0, "coaches": 45, "decel": 0.45},
}

CORRIDOR_LENGTH_KM = 138.25

def generate_synthetic_railway_dataset(num_samples: int = 35000, random_seed: int = 42) -> pd.DataFrame:
    """
    Generates high-fidelity Indian Railways telemetry and operational journey dataset
    modeling the SWR MYS-SBC double-track corridor under various kinematic, weather,
    dispatching, preceding train behavioral influence, and corridor friction constraints.
    """
    np.random.seed(random_seed)
    
    train_types = list(TRAIN_TYPE_MAP.keys())
    type_weights = [0.15, 0.15, 0.25, 0.20, 0.15, 0.10]
    
    selected_types = np.random.choice(train_types, size=num_samples, p=type_weights)
    
    rows = []
    for i in range(num_samples):
        ttype = selected_types[i]
        spec = PRIORITY_SPECS[ttype]
        
        # Location along corridor
        current_km = float(np.random.uniform(0.0, CORRIDOR_LENGTH_KM - 2.0))
        remaining_km = float(CORRIDOR_LENGTH_KM - current_km)
        
        # Speed dynamics
        mps = spec["mps"]
        speed_ratio = np.random.uniform(0.4, 1.02)
        current_speed = float(min(mps, mps * speed_ratio))
        
        # Delays
        initial_delay = float(np.random.exponential(scale=10.0))
        initial_delay = min(120.0, initial_delay)
        injected_delay = float(np.random.choice([0.0, 5.0, 10.0, 15.0, 25.0, 45.0], p=[0.65, 0.12, 0.10, 0.07, 0.04, 0.02]))
        total_delay = initial_delay + injected_delay
        
        # Time of day & peak hours
        dep_hour = int(np.random.randint(0, 24))
        dep_minute = int(np.random.randint(0, 60))
        dep_hour_sin = float(np.sin(2 * np.pi * dep_hour / 24.0))
        dep_hour_cos = float(np.cos(2 * np.pi * dep_hour / 24.0))
        
        is_peak = 1 if ((7 <= dep_hour <= 10) or (17 <= dep_hour <= 20)) else 0
        
        # Weather & Environment
        weather_type = np.random.choice(list(WEATHER_MAP.keys()), p=[0.70, 0.12, 0.12, 0.06])
        weather_code = WEATHER_MAP[weather_type]
        
        if weather_type == "CLEAR":
            amb_temp = float(np.random.uniform(22.0, 36.0))
            vis_meters = float(np.random.uniform(4000.0, 10000.0))
            rail_surf = "DRY"
            adhesion = 1.0
        elif weather_type == "FOG_MIST":
            amb_temp = float(np.random.uniform(14.0, 22.0))
            vis_meters = float(np.random.uniform(150.0, 900.0))
            rail_surf = "DAMP"
            adhesion = 0.85
        elif weather_type == "MONSOON_RAIN":
            amb_temp = float(np.random.uniform(20.0, 28.0))
            vis_meters = float(np.random.uniform(1200.0, 3500.0))
            rail_surf = "WET_SLIPPERY"
            adhesion = 0.68
        else: # HEAVY_DOWNPOUR
            amb_temp = float(np.random.uniform(18.0, 25.0))
            vis_meters = float(np.random.uniform(300.0, 1000.0))
            rail_surf = "WATERLOGGED"
            adhesion = 0.52
            
        rail_surface_code = SURFACE_MAP[rail_surf]
        
        # OHE Voltage & Commuter Surge
        ohe_voltage = float(np.random.normal(24.8, 0.7))
        ohe_voltage = float(np.clip(ohe_voltage, 19.5, 27.5))
        voltage_drop_ratio = max(0.0, (25.0 - ohe_voltage) / 25.0)
        
        surge_mult = float(np.random.uniform(1.0, 2.8) if (is_peak and ttype in ["MEMU", "EXPRESS"]) else 1.0)
        
        # Hardware / Signal Alarms
        wild_alarm = 1 if np.random.rand() < 0.03 else 0
        single_line_block = 1 if np.random.rand() < 0.04 else 0
        
        # Downstream Infrastructure features
        frac_remaining = remaining_km / CORRIDOR_LENGTH_KM
        remaining_stops = int(np.round(frac_remaining * (8 if ttype in ["EXPRESS", "MEMU"] else 4)))
        
        downstream_tsr_count = int(np.round(frac_remaining * np.random.choice([1, 2, 3, 4], p=[0.4, 0.4, 0.15, 0.05])))
        downstream_lc_gates = int(np.round(frac_remaining * 14))
        
        # Terminal throat congestion (Kengeri-SBC approach)
        near_sbc = 1.0 if (remaining_km < 25.0) else (remaining_km / 25.0)
        throat_occupancy = float(np.clip(0.4 + (0.45 if is_peak else 0.15) * (1.0 - near_sbc) + np.random.normal(0, 0.05), 0.2, 1.0))
        
        # ----------------- Preceding Train Behavioral Features -----------------
        # Probability of having a preceding train within active corridor window
        has_lead = np.random.rand() < 0.85
        if has_lead:
            # Time headway between trains in minutes (e.g. 4 to 45 mins)
            lead_headway_min = float(np.random.exponential(scale=14.0) + 4.0)
            lead_headway_min = float(np.clip(lead_headway_min, 3.0, 60.0))
            
            # Delay delta incurred by the lead train on its recent section
            lead_delay_delta = float(np.random.normal(loc=1.5 if is_peak else 0.5, scale=3.0))
            lead_delay_delta = float(np.clip(lead_delay_delta, -4.0, 25.0))
            
            # Section friction score (0.0 clear -> 1.0 severe)
            section_friction = float(np.clip(0.1 + (0.35 if is_peak else 0.05) + (lead_delay_delta / 30.0) + np.random.uniform(0.0, 0.2), 0.0, 1.0))
            
            # Recent LC gate delay experienced by lead train
            recent_lc_delay = float(np.random.choice([0.0, 2.5, 4.0, 7.5], p=[0.7, 0.15, 0.1, 0.05]))
            
            # Commuter surge spillover from lead train dwell
            dwell_surge_spillover = float(max(0.0, (surge_mult - 1.0) * 1.8 + np.random.uniform(0, 1.0)))
        else:
            lead_headway_min = 60.0
            lead_delay_delta = 0.0
            section_friction = 0.05
            recent_lc_delay = 0.0
            dwell_surge_spillover = 0.0

        # ----------------- Physics & Dispatching Ground Truth Calculation -----------------
        # 1. Recoverable Slack calculation
        base_slack = spec["baseSlack"]
        max_slack = (remaining_km / 10.0) * base_slack * adhesion * (1.0 - voltage_drop_ratio * 0.8)
        if weather_type == "FOG_MIST":
            max_slack *= 0.70
        elif weather_type in ["MONSOON_RAIN", "HEAVY_DOWNPOUR"]:
            max_slack *= 0.55
            
        tier = spec["tier"]
        recovery_factor = 0.80 if tier == 1 else (0.65 if tier == 2 else (0.40 if tier == 3 else 0.20))
        actual_slack_recovered = float(min(total_delay * recovery_factor, max_slack))
        
        # 2. Bottlenecks and Detentions Incurred
        tsr_delay = downstream_tsr_count * 1.25 * (1.1 if ttype == "FREIGHT_BOXN" else 0.9)
        
        # Headway compression & preceding train ripple penalty
        headway_ripple_penalty = 0.0
        if lead_headway_min < 8.0:
            # Dangerous headway compression: yellow/double-yellow aspect slowing
            headway_ripple_penalty += (8.0 - lead_headway_min) * 0.85
            if lead_delay_delta > 2.0:
                headway_ripple_penalty += min(lead_delay_delta * 0.65, 8.0)
        elif lead_headway_min < 15.0 and lead_delay_delta > 4.0:
            # Cascading block hold
            headway_ripple_penalty += (lead_delay_delta - 4.0) * 0.40

        # Section friction penalty
        friction_penalty = section_friction * (remaining_km / 30.0) * 2.2

        # Loop stabling for precedence (Tier 3 & Tier 4 trains overtaken by Tier 1)
        precedence_delay = 0.0
        if tier >= 3 and remaining_km > 20.0 and np.random.rand() < 0.28:
            precedence_delay = float(np.random.uniform(8.0, 18.0))
            
        # LC gate detention
        lc_detention = (downstream_lc_gates * 0.12) + (recent_lc_delay * 0.8 if remaining_km > 15 else 0.0)
        
        # Platform dwell extension
        commuter_dwell_delay = remaining_stops * (surge_mult - 1.0) * 0.85 + (dwell_surge_spillover * 0.5)
        
        # Terminal approach choke
        throat_delay = (throat_occupancy ** 2.2) * (5.5 if remaining_km < 35.0 else 2.0)
        
        # Alarms
        alarm_delay = (14.0 if wild_alarm else 0.0) + (18.0 if single_line_block else 0.0)
        
        total_bottlenecks = (
            tsr_delay +
            headway_ripple_penalty +
            friction_penalty +
            precedence_delay +
            lc_detention +
            commuter_dwell_delay +
            throat_delay +
            alarm_delay
        )
        
        # Net dynamic delay delta
        dynamic_delay_delta = float(total_bottlenecks - actual_slack_recovered)
        
        # Final SBC terminal delay
        final_delay = float(max(0.0, total_delay + dynamic_delay_delta))
        
        rows.append({
            "train_type_code": TRAIN_TYPE_MAP[ttype],
            "priority_tier": tier,
            "coaches": spec["coaches"],
            "tractive_hp_per_ton": spec["tractiveHp"],
            "nominal_decel": spec["decel"],
            "sectional_mps": spec["mps"],
            "current_km": current_km,
            "remaining_km": remaining_km,
            "current_speed_kmph": current_speed,
            "initial_delay_min": initial_delay,
            "injected_delay_min": injected_delay,
            "total_current_delay": total_delay,
            "dep_hour": dep_hour,
            "dep_hour_sin": dep_hour_sin,
            "dep_hour_cos": dep_hour_cos,
            "is_peak_hour": is_peak,
            "weather_code": weather_code,
            "ambient_temp_celsius": amb_temp,
            "visibility_meters": vis_meters,
            "rail_surface_code": rail_surface_code,
            "adhesion_factor": adhesion,
            "commuter_surge_multiplier": surge_mult,
            "ohe_voltage_kv": ohe_voltage,
            "wild_alarm_flag": wild_alarm,
            "single_line_block_flag": single_line_block,
            "remaining_stops_count": remaining_stops,
            "downstream_tsr_count": downstream_tsr_count,
            "downstream_lc_gates_count": downstream_lc_gates,
            "terminal_throat_occupancy": throat_occupancy,
            
            # Preceding train & continuous section features
            "lead_train_headway_gap_min": lead_headway_min,
            "lead_train_delay_delta_min": lead_delay_delta,
            "section_friction_score": section_friction,
            "recent_lc_gate_detention_min": recent_lc_delay,
            "preceding_train_dwell_surge_min": dwell_surge_spillover,
            
            # Ground truth targets
            "slack_recovered_min": actual_slack_recovered,
            "bottlenecks_incurred_min": total_bottlenecks,
            "dynamic_delay_delta_min": dynamic_delay_delta,
            "final_delay_min": final_delay
        })
        
    return pd.DataFrame(rows)

FEATURE_COLUMNS = [
    "train_type_code",
    "priority_tier",
    "coaches",
    "tractive_hp_per_ton",
    "nominal_decel",
    "sectional_mps",
    "current_km",
    "remaining_km",
    "current_speed_kmph",
    "initial_delay_min",
    "injected_delay_min",
    "total_current_delay",
    "dep_hour",
    "dep_hour_sin",
    "dep_hour_cos",
    "is_peak_hour",
    "weather_code",
    "ambient_temp_celsius",
    "visibility_meters",
    "rail_surface_code",
    "adhesion_factor",
    "commuter_surge_multiplier",
    "ohe_voltage_kv",
    "wild_alarm_flag",
    "single_line_block_flag",
    "remaining_stops_count",
    "downstream_tsr_count",
    "downstream_lc_gates_count",
    "terminal_throat_occupancy",
    "lead_train_headway_gap_min",
    "lead_train_delay_delta_min",
    "section_friction_score",
    "recent_lc_gate_detention_min",
    "preceding_train_dwell_surge_min"
]
