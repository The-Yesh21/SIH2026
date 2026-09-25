import math
import numpy as np
from typing import List, Tuple
from models.pain_factors import (
    TrainConfigModel,
    EnvironmentalConditionsModel,
    DynamicPredictionResponseModel,
    ShapAttributionFactorModel,
    StationForecastRowModel,
    CorridorPainSummaryModel,
    ConfidenceIntervalModel,
    PrecedingTrainContextModel,
    SectionFrictionModel,
    SectorHotspotModel,
    TrainVulnerabilitySectorModel
)
from ml.pain_analyzer import (
    analyze_all_pain_factors,
    resolve_lead_train_context,
    compute_all_section_frictions,
    get_corridor_sector_hotspots,
    resolve_train_primary_vulnerability_sector,
    SWR_STATIONS_DATA,
    PRIORITY_SPECS
)
from ml.model_pipeline import ml_pipeline

OFFICIAL_WTT_CHECKPOINTS = {
    "16022": [
        {"code": "MYS", "km": 0.0, "timeStr": "21:00"},
        {"code": "PAN", "km": 19.35, "timeStr": "21:19"},
        {"code": "MYA", "km": 45.4, "timeStr": "21:44"},
        {"code": "MAD", "km": 64.3, "timeStr": "22:04"},
        {"code": "CPT", "km": 82.55, "timeStr": "22:19"},
        {"code": "RMGM", "km": 93.65, "timeStr": "22:31"},
        {"code": "BID", "km": 108.35, "timeStr": "22:46"},
        {"code": "KGI", "km": 126.1, "timeStr": "23:09"},
        {"code": "SBC", "km": 138.25, "timeStr": "23:45"},
    ],
    "16586": [
        {"code": "MYS", "km": 0.0, "timeStr": "03:45"},
        {"code": "PAN", "km": 19.35, "timeStr": "04:05"},
        {"code": "MYA", "km": 45.4, "timeStr": "04:30"},
        {"code": "MAD", "km": 64.3, "timeStr": "04:50"},
        {"code": "RMGM", "km": 93.65, "timeStr": "05:15"},
        {"code": "BID", "km": 108.35, "timeStr": "05:32"},
        {"code": "KGI", "km": 126.1, "timeStr": "05:52"},
        {"code": "SBC", "km": 138.25, "timeStr": "06:25"},
    ],
    "16215": [
        {"code": "MYS", "km": 0.0, "timeStr": "06:45"},
        {"code": "PAN", "km": 19.35, "timeStr": "07:05"},
        {"code": "MYA", "km": 45.4, "timeStr": "07:30"},
        {"code": "MAD", "km": 64.3, "timeStr": "07:50"},
        {"code": "CPT", "km": 82.55, "timeStr": "08:08"},
        {"code": "RMGM", "km": 93.65, "timeStr": "08:21"},
        {"code": "BID", "km": 108.35, "timeStr": "08:38"},
        {"code": "KGI", "km": 126.1, "timeStr": "08:58"},
        {"code": "SBC", "km": 138.25, "timeStr": "09:35"},
    ],
    "12613": [
        {"code": "MYS", "km": 0.0, "timeStr": "11:30"},
        {"code": "MYA", "km": 45.4, "timeStr": "12:10"},
        {"code": "RMGM", "km": 93.65, "timeStr": "12:54"},
        {"code": "KGI", "km": 126.1, "timeStr": "13:28"},
        {"code": "SBC", "km": 138.25, "timeStr": "14:00"},
    ],
    "20608": [
        {"code": "MYS", "km": 0.0, "timeStr": "13:05"},
        {"code": "MYA", "km": 45.4, "timeStr": "13:35"},
        {"code": "RMGM", "km": 93.65, "timeStr": "14:02"},
        {"code": "BID", "km": 108.35, "timeStr": "14:12"},
        {"code": "KGI", "km": 126.1, "timeStr": "14:24"},
        {"code": "SBC", "km": 138.25, "timeStr": "14:45"},
    ],
    "66552": [
        {"code": "MYS", "km": 0.0, "timeStr": "13:45"},
        {"code": "PAN", "km": 19.35, "timeStr": "14:08"},
        {"code": "MYA", "km": 45.4, "timeStr": "14:38"},
        {"code": "MAD", "km": 64.3, "timeStr": "15:00"},
        {"code": "CPT", "km": 82.55, "timeStr": "15:22"},
        {"code": "RMGM", "km": 93.65, "timeStr": "15:38"},
        {"code": "BID", "km": 108.35, "timeStr": "16:00"},
        {"code": "KGI", "km": 126.1, "timeStr": "16:28"},
        {"code": "SBC", "km": 138.25, "timeStr": "17:20"},
    ],
    "12008": [
        {"code": "MYS", "km": 0.0, "timeStr": "14:15"},
        {"code": "MYA", "km": 45.4, "timeStr": "14:48"},
        {"code": "RMGM", "km": 93.65, "timeStr": "15:18"},
        {"code": "KGI", "km": 126.1, "timeStr": "15:42"},
        {"code": "SBC", "km": 138.25, "timeStr": "16:05"},
    ],
    "16232": [
        {"code": "MYS", "km": 0.0, "timeStr": "16:15"},
        {"code": "MYA", "km": 45.4, "timeStr": "16:58"},
        {"code": "MAD", "km": 64.3, "timeStr": "17:18"},
        {"code": "KGI", "km": 126.1, "timeStr": "18:10"},
        {"code": "SBC", "km": 138.25, "timeStr": "18:50"},
    ],
    "16236": [
        {"code": "MYS", "km": 0.0, "timeStr": "18:20"},
        {"code": "PAN", "km": 19.35, "timeStr": "18:38"},
        {"code": "MYA", "km": 45.4, "timeStr": "19:02"},
        {"code": "MAD", "km": 64.3, "timeStr": "19:22"},
        {"code": "CPT", "km": 82.55, "timeStr": "19:38"},
        {"code": "RMGM", "km": 93.65, "timeStr": "19:50"},
        {"code": "BID", "km": 108.35, "timeStr": "20:06"},
        {"code": "KGI", "km": 126.1, "timeStr": "20:25"},
        {"code": "SBC", "km": 138.25, "timeStr": "20:50"},
    ],
    "BOXN-58219": [
        {"code": "MYS", "km": 0.0, "timeStr": "01:00"},
        {"code": "PAN", "km": 19.35, "timeStr": "01:30"},
        {"code": "MYA", "km": 45.4, "timeStr": "02:15"},
        {"code": "MAD", "km": 64.3, "timeStr": "02:50"},
        {"code": "RMGM", "km": 93.65, "timeStr": "03:30"},
        {"code": "BID", "km": 108.35, "timeStr": "03:55"},
        {"code": "KGI", "km": 126.1, "timeStr": "04:15"},
        {"code": "SBC", "km": 138.25, "timeStr": "04:30"},
    ],
}

def format_clock_display(total_minutes: float) -> str:
    norm_mins = ((int(round(total_minutes)) % 1440) + 1440) % 1440
    h = norm_mins // 60
    m = norm_mins % 60
    ampm = "PM" if h >= 12 else "AM"
    h12 = 12 if (h % 12 == 0) else (h % 12)
    return f"{h12:02d}:{m:02d} {ampm}"

def parse_time_to_minutes(time_str: str) -> float:
    try:
        parts = time_str.split(":")
        h = int(parts[0])
        m = int(parts[1].split()[0])
        return h * 60.0 + m
    except Exception:
        return 480.0

def get_booked_station_mins(
    train: TrainConfigModel,
    station_code: str,
    station_km: float,
    dep_mins: float,
    sched_dur_mins: float
) -> float:
    checkpoints = OFFICIAL_WTT_CHECKPOINTS.get(train.id)
    if checkpoints:
        for cp in checkpoints:
            if cp["code"] == station_code:
                t = parse_time_to_minutes(cp["timeStr"])
                if t < dep_mins:
                    t += 1440.0
                return t
        for i in range(len(checkpoints) - 1):
            cA = checkpoints[i]
            cB = checkpoints[i + 1]
            if station_km >= cA["km"] and station_km <= cB["km"]:
                tA = parse_time_to_minutes(cA["timeStr"])
                tB = parse_time_to_minutes(cB["timeStr"])
                if tA < dep_mins:
                    tA += 1440.0
                if tB < dep_mins:
                    tB += 1440.0
                frac = (station_km - cA["km"]) / max(0.1, (cB["km"] - cA["km"]))
                return tA + frac * (tB - tA)

    frac = station_km / 138.25
    return dep_mins + frac * sched_dur_mins

def predict_dynamic_eta_ml(
    train: TrainConfigModel,
    env: EnvironmentalConditionsModel,
    user_injected_delay_min: float = 0.0,
    active_clock_mins: float = 0.0
) -> DynamicPredictionResponseModel:
    total_live_delay = train.initialDelayMin + user_injected_delay_min
    dep_mins = parse_time_to_minutes(train.scheduledDep)
    raw_arr_mins = parse_time_to_minutes(train.scheduledArr)
    arr_mins = raw_arr_mins if raw_arr_mins >= dep_mins else raw_arr_mins + 1440.0
    scheduled_duration_mins = arr_mins - dep_mins

    # 1. Resolve Preceding Train Behavioral Context, Section Frictions & Hotspot Sectors
    lead_ctx = resolve_lead_train_context(train, active_clock_mins, user_injected_delay_min)
    sections_friction = compute_all_section_frictions(active_clock_mins, env)
    hotspot_sectors = get_corridor_sector_hotspots()
    primary_vuln = resolve_train_primary_vulnerability_sector(train, active_clock_mins)

    # 2. Traditional Naive Static ETA
    traditional_eta_mins = arr_mins + total_live_delay
    traditional_static_eta = format_clock_display(traditional_eta_mins)

    # 3. Pain Analysis
    pain_summary: CorridorPainSummaryModel = analyze_all_pain_factors(
        train=train,
        env=env,
        injected_delay_min=user_injected_delay_min,
        active_clock_mins=active_clock_mins
    )

    # 4. Machine Learning Inference & SHAP Extraction via LightGBM Pipeline
    ml_output = ml_pipeline.predict_with_shap(
        train=train,
        env=env,
        injected_delay_min=user_injected_delay_min,
        preceding_ctx=lead_ctx
    )

    # Adjust dynamic delay if train has not yet cleared its primary high-risk sector
    dynamic_delay_min = ml_output["predictedFinalDelayMin"]
    if train.currentLocationKm < primary_vuln.endKm and primary_vuln.etaBufferAdjustedMin > 2.0:
        # Blend sector vulnerability risk buffer
        dynamic_delay_min = max(dynamic_delay_min, total_live_delay + primary_vuln.etaBufferAdjustedMin * 0.7)

    slack_recovered = ml_output["slackRecoveredMin"]
    bottlenecks_incurred = ml_output["bottlenecksIncurredMin"]
    confidence_margin = ml_output["confidenceMarginMin"]

    dynamic_eta_mins = arr_mins + dynamic_delay_min
    dynamic_eta_str = format_clock_display(dynamic_eta_mins)

    # Confidence Interval Bounds
    lower_delay = max(0.0, dynamic_delay_min - confidence_margin)
    upper_delay = dynamic_delay_min + confidence_margin
    lower_eta_str = format_clock_display(arr_mins + lower_delay)
    upper_eta_str = format_clock_display(arr_mins + upper_delay)

    confidence_model = ConfidenceIntervalModel(
        lowerEta=lower_eta_str,
        upperEta=upper_eta_str,
        lowerDelayMin=round(lower_delay, 1),
        upperDelayMin=round(upper_delay, 1),
        confidencePct=95.0,
        rmseMarginMin=round(confidence_margin, 1)
    )

    # 5. Construct SHAP Attribution Factors for Frontend Waterfall
    shap_factors: List[ShapAttributionFactorModel] = []
    
    # Primary vulnerability sector factor
    if train.currentLocationKm < primary_vuln.endKm:
        shap_factors.append(ShapAttributionFactorModel(
            category="Corridor Bottleneck Sector",
            name=f"Sector Risk ({primary_vuln.primarySectorName})",
            impactMinutes=round(primary_vuln.etaBufferAdjustedMin, 1),
            type="delay",
            rationale=f"{primary_vuln.historicalOccurrenceFrequencyPct}% historical delay recurrence for this service in {primary_vuln.chainageRangeKm} (avg +{primary_vuln.historicalAverageDelayMin}m)."
        ))

    # Add top ML SHAP attributions
    for shap_item in ml_output["shapAttributions"][:6]:
        if not any(f.name == shap_item["name"] for f in shap_factors):
            shap_factors.append(ShapAttributionFactorModel(
                category=shap_item["category"],
                name=shap_item["name"],
                impactMinutes=shap_item["impactMinutes"],
                type=shap_item["type"],
                rationale=shap_item["rationale"]
            ))

    # Also augment with any active physical hotspot incidents from pain analysis
    for inc in pain_summary.incidents:
        if not any(f.name.startswith(inc.stationName) for f in shap_factors):
            shap_factors.append(ShapAttributionFactorModel(
                category=inc.category.replace("_", " ").title(),
                name=f"{inc.stationName} ({inc.type.replace('_', ' ').title()})",
                impactMinutes=round(inc.penaltyDurationMin, 1),
                type="delay",
                rationale=inc.rootCauseDescription
            ))

    # 6. Station-by-Station Forecast Breakdown (17 SWR Stations)
    station_breakdown: List[StationForecastRowModel] = []

    for i, st in enumerate(SWR_STATIONS_DATA):
        is_halt = st["code"] in train.scheduledStops
        halt_dwell = train.dwellMinutes.get(st["code"], 2.0) if (train.dwellMinutes and is_halt) else (2.0 if is_halt and st["code"] not in ["MYS", "SBC"] else 0.0)

        booked_station_mins = get_booked_station_mins(
            train=train,
            station_code=st["code"],
            station_km=st["km"],
            dep_mins=dep_mins,
            sched_dur_mins=scheduled_duration_mins
        )

        is_passed = train.currentLocationKm > st["km"] + 1.2
        is_at_station = abs(train.currentLocationKm - st["km"]) <= 1.2

        if is_passed:
            track_status = "CLEARED"
            applied_delay = train.initialDelayMin
        elif is_at_station:
            track_status = "CURRENT_RUNNING"
            applied_delay = total_live_delay
        else:
            track_status = "FORECASTED"
            frac_done = min(1.0, max(0.0, (st["km"] - train.currentLocationKm) / max(1.0, (138.25 - train.currentLocationKm))))
            applied_delay = total_live_delay + frac_done * (dynamic_delay_min - total_live_delay)

        signal_aspect = "GREEN"
        if st["code"] in pain_summary.hotspotStationCodes:
            signal_aspect = "YELLOW"
        elif any(inc.stationCode == st["code"] and inc.severity == "CRITICAL" for inc in pain_summary.incidents):
            signal_aspect = "RED"

        station_breakdown.append(StationForecastRowModel(
            code=st["code"],
            name=st["name"],
            chainageFromSbcKm=round(138.25 - st["km"], 2),
            distanceFromMysKm=st["km"],
            isScheduledHalt=is_halt,
            haltDwellMin=halt_dwell,
            bookedTime=format_clock_display(booked_station_mins),
            predictedTime=format_clock_display(booked_station_mins + applied_delay),
            predictedDelayMin=round(applied_delay, 1),
            allowedSpeedKmph=st["loopSpeed"] if signal_aspect in ["YELLOW", "RED"] else train.sectionalMpsKmph,
            signalAspect=signal_aspect,
            trackStatus=track_status,
            turnoutRoute="LOOP_LINE_STABLED" if st["code"] in pain_summary.hotspotStationCodes else "MAIN_LINE"
        ))

    return DynamicPredictionResponseModel(
        train=train,
        traditionalStaticEta=traditional_static_eta,
        traditionalStaticDelayMin=round(total_live_delay, 1),
        railrakshakDynamicEta=dynamic_eta_str,
        railrakshakDynamicDelayMin=round(dynamic_delay_min, 1),
        slackRecoveredMin=round(slack_recovered, 1),
        bottlenecksIncurredMin=round(bottlenecks_incurred, 1),
        speedRestrictionPenaltyMin=round(pain_summary.speedRestrictionPenaltyMin, 1),
        signalHaltsPenaltyMin=round(pain_summary.signalDetentionMin, 1),
        precedingTrainContext=lead_ctx,
        sectionFriction=sections_friction,
        hotspotSectors=hotspot_sectors,
        primaryVulnerabilitySector=primary_vuln,
        shapFactors=shap_factors,
        stationBreakdown=station_breakdown,
        painSummary=pain_summary,
        confidenceInterval=confidence_model,
        modelConfidenceScore=0.965,
        engineVersion="Python-ML-v3.0-LightGBM+SHAP"
    )
