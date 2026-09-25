import math
from typing import List, Dict, Tuple, Optional
from models.pain_factors import (
    TrainConfigModel,
    EnvironmentalConditionsModel,
    CorridorPainSummaryModel,
    IdentifiedPainIncidentModel,
    LoopPenaltyDecompositionModel,
    PrecedingTrainContextModel,
    SectionFrictionModel,
    SectorHotspotModel,
    TrainVulnerabilitySectorModel,
    AffectedTrainRecordModel,
    ContinuousCorridorMonitorResponseModel
)

SWR_STATIONS_DATA = [
    {"code": "MYS", "name": "Mysuru Junction", "km": 0.0, "platforms": 6, "loop": True, "loopSpeed": 30, "surge": False},
    {"code": "NHY", "name": "Naganahalli", "km": 8.55, "platforms": 2, "loop": True, "loopSpeed": 30, "surge": False},
    {"code": "S", "name": "Shrirangapatna", "km": 14.75, "platforms": 2, "loop": False, "loopSpeed": 15, "surge": False},
    {"code": "PAN", "name": "Pandavapura", "km": 19.35, "platforms": 2, "loop": True, "loopSpeed": 30, "surge": False},
    {"code": "CGKR", "name": "Chandagiri Koppal", "km": 23.35, "platforms": 2, "loop": False, "loopSpeed": 15, "surge": False},
    {"code": "BDRL", "name": "Byadarahalli", "km": 28.75, "platforms": 2, "loop": True, "loopSpeed": 30, "surge": False},
    {"code": "Y", "name": "Yeliyur", "km": 37.65, "platforms": 2, "loop": True, "loopSpeed": 30, "surge": False},
    {"code": "MYA", "name": "Mandya", "km": 45.40, "platforms": 3, "loop": True, "loopSpeed": 30, "surge": True},
    {"code": "HNK", "name": "Hanakere", "km": 55.45, "platforms": 2, "loop": True, "loopSpeed": 30, "surge": False},
    {"code": "MAD", "name": "Maddur", "km": 64.30, "platforms": 3, "loop": True, "loopSpeed": 30, "surge": True},
    {"code": "NZV", "name": "Nidasale Halt", "km": 70.80, "platforms": 1, "loop": False, "loopSpeed": 15, "surge": False},
    {"code": "SET", "name": "Settihalli", "km": 76.00, "platforms": 2, "loop": True, "loopSpeed": 30, "surge": False},
    {"code": "CPT", "name": "Channapatna", "km": 82.55, "platforms": 3, "loop": True, "loopSpeed": 30, "surge": True},
    {"code": "RMGM", "name": "Ramanagaram", "km": 93.65, "platforms": 3, "loop": True, "loopSpeed": 30, "surge": True},
    {"code": "BID", "name": "Bidadi", "km": 108.35, "platforms": 3, "loop": True, "loopSpeed": 30, "surge": True},
    {"code": "KGI", "name": "Kengeri", "km": 126.10, "platforms": 4, "loop": True, "loopSpeed": 30, "surge": True},
    {"code": "SBC", "name": "KSR Bengaluru City", "km": 138.25, "platforms": 10, "loop": True, "loopSpeed": 30, "surge": True},
]

CORRIDOR_BLOCK_SECTIONS = [
    {"code": "SEC-MYS-PAN", "from": "Mysuru (MYS)", "to": "Pandavapura (PAN)", "startKm": 0.0, "endKm": 19.35, "mps": 110.0},
    {"code": "SEC-PAN-MYA", "from": "Pandavapura (PAN)", "to": "Mandya (MYA)", "startKm": 19.35, "endKm": 45.4, "mps": 110.0},
    {"code": "SEC-MYA-MAD", "from": "Mandya (MYA)", "to": "Maddur (MAD)", "startKm": 45.4, "endKm": 64.3, "mps": 110.0},
    {"code": "SEC-MAD-CPT", "from": "Maddur (MAD)", "to": "Channapatna (CPT)", "startKm": 64.3, "endKm": 82.55, "mps": 110.0},
    {"code": "SEC-CPT-RMGM", "from": "Channapatna (CPT)", "to": "Ramanagaram (RMGM)", "startKm": 82.55, "endKm": 93.65, "mps": 110.0},
    {"code": "SEC-RMGM-BID", "from": "Ramanagaram (RMGM)", "to": "Bidadi (BID)", "startKm": 93.65, "endKm": 108.35, "mps": 110.0},
    {"code": "SEC-BID-KGI", "from": "Bidadi (BID)", "to": "Kengeri (KGI)", "startKm": 108.35, "endKm": 126.1, "mps": 100.0},
    {"code": "SEC-KGI-SBC", "from": "Kengeri (KGI)", "to": "KSR Bengaluru (SBC)", "startKm": 126.1, "endKm": 138.25, "mps": 80.0},
]

PRIORITY_SPECS = {
    "VANDE_BHARAT": {"tier": 1, "margin": 12, "tractiveHp": 14.8, "baseSlack": 1.4},
    "SHATABDI": {"tier": 1, "margin": 10, "tractiveHp": 9.6, "baseSlack": 1.1},
    "SUPERFAST": {"tier": 2, "margin": 7, "tractiveHp": 7.2, "baseSlack": 0.8},
    "EXPRESS": {"tier": 2, "margin": 6, "tractiveHp": 6.8, "baseSlack": 0.7},
    "MEMU": {"tier": 3, "margin": 4, "tractiveHp": 8.0, "baseSlack": 0.6},
    "FREIGHT_BOXN": {"tier": 4, "margin": 2, "tractiveHp": 4.5, "baseSlack": 0.3},
}

CORRIDOR_SCHEDULED_FLEET = [
    {"id": "16586", "name": "MRDW - SMVB Express", "type": "EXPRESS", "dep": "03:45", "arr": "06:25", "tier": 2},
    {"id": "16215", "name": "Chamundi Express", "type": "EXPRESS", "dep": "06:45", "arr": "09:35", "tier": 2},
    {"id": "12613", "name": "Wodeyar Superfast", "type": "SUPERFAST", "dep": "11:30", "arr": "14:00", "tier": 2},
    {"id": "20608", "name": "Vande Bharat Express", "type": "VANDE_BHARAT", "dep": "13:05", "arr": "14:45", "tier": 1},
    {"id": "66552", "name": "Mysuru - SBC MEMU", "type": "MEMU", "dep": "13:45", "arr": "17:20", "tier": 3},
    {"id": "12008", "name": "Shatabdi Express", "type": "SHATABDI", "dep": "14:15", "arr": "16:05", "tier": 1},
    {"id": "16232", "name": "Mayiladuturai Express", "type": "EXPRESS", "dep": "16:15", "arr": "18:50", "tier": 2},
    {"id": "16236", "name": "Tuticorin Express", "type": "EXPRESS", "dep": "18:20", "arr": "20:50", "tier": 2},
    {"id": "16022", "name": "Kaveri Express", "type": "EXPRESS", "dep": "21:00", "arr": "23:45", "tier": 2},
    {"id": "BOXN-58219", "name": "Freight Coal Rake", "type": "FREIGHT_BOXN", "dep": "01:00", "arr": "04:30", "tier": 4},
]

# Comprehensive Corridor Bottleneck Sectors (Ranked by Longest Total Duration & Highest Frequency)
CORRIDOR_SECTOR_PAIN_HOTSPOTS: List[SectorHotspotModel] = [
    SectorHotspotModel(
        id="SECTOR-SBC-THROAT",
        rank=1,
        sectorName="KSR Bengaluru (SBC) Terminal Throat & Outer Interlocking",
        chainageKm="KM 130.85 ➔ KM 138.25",
        startKm=130.85,
        endKm=138.25,
        totalCumulativeDelayMin=184.5,
        delayFrequencyPct=93.8,  # 15/16 trains delayed
        delayedTrainsCount=15,
        totalObservedTrains=16,
        avgDelayPerTrainMin=8.2,
        maxSingleDetentionMin=24.0,
        primaryCause="Platform neck reception queue, 15-30 km/h diamond crossing PSR & outer signal holding",
        causeCategory="Terminal Throat",
        speedCapKmph=30.0,
        mitigationStrategy="AI-assisted dynamic platform allocation & speed easing on Nayandahalli outer approach",
        etaPredictionRiskWeight=1.45,
        affectedTrainsList=[
            AffectedTrainRecordModel(
                trainId="16236", trainName="Tuticorin Express", trainType="EXPRESS",
                avgHistoricalDelayMin=11.4, maxDetentionMin=24.0, historicalOccurrenceCount=28,
                vulnerabilityReason="Late evening arrival slot clashing with inter-state express departures."
            ),
            AffectedTrainRecordModel(
                trainId="16022", trainName="Kaveri Express", trainType="EXPRESS",
                avgHistoricalDelayMin=9.8, maxDetentionMin=19.0, historicalOccurrenceCount=27,
                vulnerabilityReason="Held at outer diamond crossover for night mail platform clearing."
            ),
            AffectedTrainRecordModel(
                trainId="12613", trainName="Wodeyar Superfast", trainType="SUPERFAST",
                avgHistoricalDelayMin=6.5, maxDetentionMin=14.0, historicalOccurrenceCount=22,
                vulnerabilityReason="Afternoon yard shunting movement holding Route Relay Interlocking."
            ),
            AffectedTrainRecordModel(
                trainId="BOXN-58219", trainName="Freight Coal Rake", trainType="FREIGHT_BOXN",
                avgHistoricalDelayMin=18.5, maxDetentionMin=35.0, historicalOccurrenceCount=15,
                vulnerabilityReason="Deprioritized outside terminal yard during passenger peak reception."
            ),
        ]
    ),
    SectorHotspotModel(
        id="SECTOR-KGI-SUBURBAN",
        rank=2,
        sectorName="Kengeri Suburban Hub & Nayandahalli Urban Crossover",
        chainageKm="KM 122.00 ➔ KM 126.10",
        startKm=122.0,
        endKm=126.1,
        totalCumulativeDelayMin=142.0,
        delayFrequencyPct=81.3,  # 13/16 trains delayed
        delayedTrainsCount=13,
        totalObservedTrains=16,
        avgDelayPerTrainMin=6.8,
        maxSingleDetentionMin=18.0,
        primaryCause="Massive morning/evening commuter rush boarding surges & sectional MPS drop to 70 km/h",
        causeCategory="Suburban Commuters",
        speedCapKmph=70.0,
        mitigationStrategy="Automatic platform boarding countdown sirens & RPF queue management",
        etaPredictionRiskWeight=1.35,
        affectedTrainsList=[
            AffectedTrainRecordModel(
                trainId="66552", trainName="Mysuru - SBC MEMU", trainType="MEMU",
                avgHistoricalDelayMin=14.2, maxDetentionMin=18.0, historicalOccurrenceCount=30,
                vulnerabilityReason="Heavy commuter crush loading; dwell exceeds timetable by 3x."
            ),
            AffectedTrainRecordModel(
                trainId="16215", trainName="Chamundi Express", trainType="EXPRESS",
                avgHistoricalDelayMin=7.5, maxDetentionMin=15.0, historicalOccurrenceCount=25,
                vulnerabilityReason="Daily office commuter detrainment congestion at Platform 1."
            ),
            AffectedTrainRecordModel(
                trainId="16232", trainName="Mayiladuturai Express", trainType="EXPRESS",
                avgHistoricalDelayMin=5.8, maxDetentionMin=12.0, historicalOccurrenceCount=21,
                vulnerabilityReason="Evening peak rush congestion & suburban curve braking."
            ),
        ]
    ),
    SectorHotspotModel(
        id="SECTOR-BID-PRECEDENCE",
        rank=3,
        sectorName="Bidadi Junction Precedence Loop Stabling Hub",
        chainageKm="KM 106.00 ➔ KM 109.50",
        startKm=106.0,
        endKm=109.5,
        totalCumulativeDelayMin=165.0,
        delayFrequencyPct=68.8,  # 11/16 trains delayed
        delayedTrainsCount=11,
        totalObservedTrains=16,
        avgDelayPerTrainMin=12.5,
        maxSingleDetentionMin=38.0,
        primaryCause="30 km/h turnout diversion into loop line to allow Vande Bharat & Shatabdi overtaking",
        causeCategory="Precedence & Loop",
        speedCapKmph=30.0,
        mitigationStrategy="High-speed 50 km/h thick-web turnouts & dynamic moving block overtake calculations",
        etaPredictionRiskWeight=1.40,
        affectedTrainsList=[
            AffectedTrainRecordModel(
                trainId="BOXN-58219", trainName="Freight Coal Rake", trainType="FREIGHT_BOXN",
                avgHistoricalDelayMin=32.0, maxDetentionMin=38.0, historicalOccurrenceCount=18,
                vulnerabilityReason="Held on Loop Line 2 for Shatabdi 12008 & Wodeyar SF overtaking."
            ),
            AffectedTrainRecordModel(
                trainId="66552", trainName="Mysuru - SBC MEMU", trainType="MEMU",
                avgHistoricalDelayMin=11.2, maxDetentionMin=22.0, historicalOccurrenceCount=22,
                vulnerabilityReason="Looped for Vande Bharat 20608 high-speed mainline pass."
            ),
            AffectedTrainRecordModel(
                trainId="16586", trainName="MRDW - SMVB Express", trainType="EXPRESS",
                avgHistoricalDelayMin=6.5, maxDetentionMin=14.0, historicalOccurrenceCount=16,
                vulnerabilityReason="Early morning goods train crossing hold."
            ),
        ]
    ),
    SectorHotspotModel(
        id="SECTOR-MYA-TURNOUT",
        rank=4,
        sectorName="Mandya Junction Platform Neck & Loop Divergence",
        chainageKm="KM 43.00 ➔ KM 47.50",
        startKm=43.0,
        endKm=47.5,
        totalCumulativeDelayMin=115.0,
        delayFrequencyPct=75.0,  # 12/16 trains delayed
        delayedTrainsCount=12,
        totalObservedTrains=16,
        avgDelayPerTrainMin=5.5,
        maxSingleDetentionMin=19.0,
        primaryCause="1:12 turnout 30 km/h entry speed cap, locomotive watering hydrant overrun & passenger rush",
        causeCategory="Track Curvature PSR",
        speedCapKmph=30.0,
        mitigationStrategy="Simultaneous reception signaling & electronic interlocking turnout speed upgrades",
        etaPredictionRiskWeight=1.20,
        affectedTrainsList=[
            AffectedTrainRecordModel(
                trainId="12613", trainName="Wodeyar Superfast", trainType="SUPERFAST",
                avgHistoricalDelayMin=4.8, maxDetentionMin=11.0, historicalOccurrenceCount=24,
                vulnerabilityReason="Mandya primary stop dwell overrun & turnout caution."
            ),
            AffectedTrainRecordModel(
                trainId="16215", trainName="Chamundi Express", trainType="EXPRESS",
                avgHistoricalDelayMin=6.2, maxDetentionMin=14.0, historicalOccurrenceCount=26,
                vulnerabilityReason="Major passenger boarding surge; platform clearing delay."
            ),
        ]
    ),
    SectorHotspotModel(
        id="SECTOR-RMGM-LC34",
        rank=5,
        sectorName="Ramanagaram LC Gate #34 & Reverse S-Curves",
        chainageKm="KM 88.00 ➔ KM 94.50",
        startKm=88.0,
        endKm=94.5,
        totalCumulativeDelayMin=98.0,
        delayFrequencyPct=62.5,  # 10/16 trains delayed
        delayedTrainsCount=10,
        totalObservedTrains=16,
        avgDelayPerTrainMin=4.9,
        maxSingleDetentionMin=16.0,
        primaryCause="Heavy road vehicular traffic jamming LC Gate #34 closure + 85 km/h reverse curve PSR",
        causeCategory="Level Crossing",
        speedCapKmph=85.0,
        mitigationStrategy="Road Underbridge (RUB) grade separation to eliminate manual gate closure",
        etaPredictionRiskWeight=1.18,
        affectedTrainsList=[
            AffectedTrainRecordModel(
                trainId="16022", trainName="Kaveri Express", trainType="EXPRESS",
                avgHistoricalDelayMin=5.2, maxDetentionMin=16.0, historicalOccurrenceCount=19,
                vulnerabilityReason="Road traffic backlog holding LC Gate #34 interlocking."
            ),
            AffectedTrainRecordModel(
                trainId="16236", trainName="Tuticorin Express", trainType="EXPRESS",
                avgHistoricalDelayMin=4.5, maxDetentionMin=12.0, historicalOccurrenceCount=17,
                vulnerabilityReason="Reverse curve speed braking & gate closure wait."
            ),
        ]
    ),
    SectorHotspotModel(
        id="SECTOR-PAN-BRIDGE",
        rank=6,
        sectorName="Shrirangapatna – Cauvery River Bridge Curve",
        chainageKm="KM 14.50 ➔ KM 19.50",
        startKm=14.5,
        endKm=19.5,
        totalCumulativeDelayMin=64.0,
        delayFrequencyPct=50.0,  # 8/16 trains delayed
        delayedTrainsCount=8,
        totalObservedTrains=16,
        avgDelayPerTrainMin=3.8,
        maxSingleDetentionMin=12.0,
        primaryCause="Permanent Speed Restriction (PSR 45 km/h) over R-350m curve and Cauvery River Bridge",
        causeCategory="Track Curvature PSR",
        speedCapKmph=45.0,
        mitigationStrategy="Track cant modification and curve transition realignment",
        etaPredictionRiskWeight=1.10,
        affectedTrainsList=[
            AffectedTrainRecordModel(
                trainId="BOXN-58219", trainName="Freight Coal Rake", trainType="FREIGHT_BOXN",
                avgHistoricalDelayMin=8.2, maxDetentionMin=12.0, historicalOccurrenceCount=14,
                vulnerabilityReason="Heavy rake forced to hard-brake before bridge approach."
            ),
            AffectedTrainRecordModel(
                trainId="16586", trainName="MRDW - SMVB Express", trainType="EXPRESS",
                avgHistoricalDelayMin=3.5, maxDetentionMin=8.0, historicalOccurrenceCount=12,
                vulnerabilityReason="Bridge caution slowing momentum loss."
            ),
        ]
    )
]

def get_corridor_sector_hotspots() -> List[SectorHotspotModel]:
    return CORRIDOR_SECTOR_PAIN_HOTSPOTS

def resolve_train_primary_vulnerability_sector(
    train: TrainConfigModel,
    active_clock_mins: float = 0.0
) -> TrainVulnerabilitySectorModel:
    """
    Identifies the primary bottleneck sector where this specific train historically
    suffers the longest delays and highest recurrence.
    """
    train_id = train.id
    ttype = train.type
    
    # Check specific mappings based on historical telemetry
    if train_id == "BOXN-58219" or ttype == "FREIGHT_BOXN":
        return TrainVulnerabilitySectorModel(
            trainId=train.id,
            trainName=train.name,
            primarySectorId="SECTOR-BID-PRECEDENCE",
            primarySectorName="Bidadi Precedence & Loop Stabling Hub",
            chainageRangeKm="KM 106.0 ➔ KM 109.5",
            startKm=106.0,
            endKm=109.5,
            historicalAverageDelayMin=32.0,
            historicalOccurrenceFrequencyPct=88.0,
            maxHistoricalDetentionMin=38.0,
            riskLevel="CRITICAL_BOTTLENECK",
            vulnerabilityReason="Looped on Loop Line 2 (30 km/h turnout) to allow Vande Bharat/Shatabdi overtakes.",
            dispatchActionAdvice="Hold until high-speed Shatabdi 12008 clears Ramanagaram section.",
            etaBufferAdjustedMin=14.5
        )
    elif train_id == "66552" or ttype == "MEMU":
        return TrainVulnerabilitySectorModel(
            trainId=train.id,
            trainName=train.name,
            primarySectorId="SECTOR-KGI-SUBURBAN",
            primarySectorName="Kengeri Suburban Hub & Nayandahalli Crossover",
            chainageRangeKm="KM 122.0 ➔ KM 126.1",
            startKm=122.0,
            endKm=126.1,
            historicalAverageDelayMin=14.2,
            historicalOccurrenceFrequencyPct=94.0,
            maxHistoricalDetentionMin=18.0,
            riskLevel="CRITICAL_BOTTLENECK",
            vulnerabilityReason="Severe commuter passenger crush loading extending dwell time by 3.5x.",
            dispatchActionAdvice="Deploy station staff for coach clearing; authorize rapid green wave to SBC.",
            etaBufferAdjustedMin=8.2
        )
    elif train_id in ["16236", "16022"]:
        return TrainVulnerabilitySectorModel(
            trainId=train.id,
            trainName=train.name,
            primarySectorId="SECTOR-SBC-THROAT",
            primarySectorName="KSR Bengaluru (SBC) Terminal Throat",
            chainageRangeKm="KM 130.85 ➔ KM 138.25",
            startKm=130.85,
            endKm=138.25,
            historicalAverageDelayMin=11.4,
            historicalOccurrenceFrequencyPct=92.0,
            maxHistoricalDetentionMin=24.0,
            riskLevel="CRITICAL_BOTTLENECK",
            vulnerabilityReason="Late evening arrival slot clashing with inter-state express departures at SBC outer.",
            dispatchActionAdvice="Pre-set Route Relay Interlocking route into Platform 5 early.",
            etaBufferAdjustedMin=7.4
        )
    elif train_id in ["12613", "16215"]:
        return TrainVulnerabilitySectorModel(
            trainId=train.id,
            trainName=train.name,
            primarySectorId="SECTOR-MYA-TURNOUT",
            primarySectorName="Mandya Junction Platform Neck & Turnouts",
            chainageRangeKm="KM 43.0 ➔ KM 47.5",
            startKm=43.0,
            endKm=47.5,
            historicalAverageDelayMin=6.2,
            historicalOccurrenceFrequencyPct=78.0,
            maxHistoricalDetentionMin=14.0,
            riskLevel="HIGH_RISK",
            vulnerabilityReason="Major passenger boarding surge & 30 km/h turnout divergence onto Platform 1.",
            dispatchActionAdvice="Prioritize main line platform route to avoid turnout speed cap.",
            etaBufferAdjustedMin=4.5
        )
    else: # Premium trains (Vande Bharat, Shatabdi)
        return TrainVulnerabilitySectorModel(
            trainId=train.id,
            trainName=train.name,
            primarySectorId="SECTOR-SBC-THROAT",
            primarySectorName="KSR Bengaluru (SBC) Terminal Approach Throat",
            chainageRangeKm="KM 130.85 ➔ KM 138.25",
            startKm=130.85,
            endKm=138.25,
            historicalAverageDelayMin=3.5,
            historicalOccurrenceFrequencyPct=55.0,
            maxHistoricalDetentionMin=8.0,
            riskLevel="MODERATE_RISK",
            vulnerabilityReason="SBC yard reception diamond crossings and 15 km/h neck crossover caution.",
            dispatchActionAdvice="Enforce automatic priority green wave at Nayandahalli Outer.",
            etaBufferAdjustedMin=2.2
        )

def parse_time_str(time_str: str) -> float:
    try:
        p = time_str.split(":")
        return int(p[0]) * 60.0 + int(p[1])
    except Exception:
        return 0.0

def resolve_lead_train_context(
    current_train: TrainConfigModel,
    active_clock_mins: float = 0.0,
    injected_delay_min: float = 0.0
) -> PrecedingTrainContextModel:
    cur_km = current_train.currentLocationKm
    cur_dep_mins = parse_time_str(current_train.scheduledDep)
    
    candidates = []
    for other in CORRIDOR_SCHEDULED_FLEET:
        if other["id"] == current_train.id:
            continue
        
        other_dep_mins = parse_time_str(other["dep"])
        other_arr_mins = parse_time_str(other["arr"])
        if other_arr_mins < other_dep_mins:
            other_arr_mins += 1440.0
            
        dur = other_arr_mins - other_dep_mins
        clock = active_clock_mins if active_clock_mins > 0 else (cur_dep_mins + (cur_km / 138.25) * 120.0)
        
        if other_dep_mins <= clock <= other_arr_mins:
            prog = (clock - other_dep_mins) / max(1.0, dur)
            other_km = prog * 138.25
            if other_km >= cur_km:
                dist_ahead_km = other_km - cur_km
                time_gap_mins = (cur_dep_mins - other_dep_mins) % 1440.0
                candidates.append({
                    "id": other["id"],
                    "name": other["name"],
                    "type": other["type"],
                    "locationKm": other_km,
                    "distAheadKm": dist_ahead_km,
                    "timeGapMins": time_gap_mins,
                    "tier": other["tier"]
                })
                
    if not candidates:
        return PrecedingTrainContextModel(
            hasPrecedingTrain=False,
            operationalSummary="Clear mainline track ahead with no conflicting lead train within corridor block."
        )
        
    candidates.sort(key=lambda x: x["distAheadKm"])
    lead = candidates[0]
    
    dist_km = round(lead["distAheadKm"], 1)
    gap_min = round(max(4.0, lead["timeGapMins"]), 1)
    
    lead_delay_delta = 4.8 if lead["type"] in ["MEMU", "FREIGHT_BOXN"] else 1.2
    if gap_min < 12.0:
        lead_delay_delta += 2.5
        
    sec_friction = min(0.95, max(0.1, 0.2 + (lead_delay_delta / 20.0) + (1.0 - min(1.0, dist_km / 25.0)) * 0.4))
    
    ripple_min = 0.0
    if gap_min < 8.0:
        ripple_min = round((8.0 - gap_min) * 0.75 + lead_delay_delta * 0.45, 1)
        risk = "HIGH_RISK_BRAKING"
        summary = f"Severe headway compression ({dist_km} km / {gap_min}m behind {lead['name']}). Yellow/amber signal checks active."
    elif gap_min < 15.0 and lead_delay_delta > 3.0:
        ripple_min = round(lead_delay_delta * 0.35, 1)
        risk = "CAUTION_AMBER"
        summary = f"Lead train {lead['name']} experienced +{lead_delay_delta}m detention at recent section. Caution deceleration advised."
    else:
        ripple_min = 0.0
        risk = "NOMINAL_GREEN"
        summary = f"Safe nominal spacing ({dist_km} km / {gap_min}m behind {lead['name']}). Green aspect clear wave."

    return PrecedingTrainContextModel(
        hasPrecedingTrain=True,
        leadTrainId=lead["id"],
        leadTrainName=lead["name"],
        leadTrainType=lead["type"],
        leadTrainLocationKm=round(lead["locationKm"], 1),
        headwayDistanceKm=dist_km,
        headwayGapMinutes=gap_min,
        leadTrainDelayDeltaMin=round(lead_delay_delta, 1),
        leadTrainLastSection=f"KM {lead['locationKm']:.0f} Approaching",
        sectionFrictionIndex=round(sec_friction, 2),
        rippleDelayPropagatedMin=ripple_min,
        headwayCompressionRisk=risk,
        operationalSummary=summary
    )

def compute_all_section_frictions(
    active_clock_mins: float = 0.0,
    env: Optional[EnvironmentalConditionsModel] = None
) -> List[SectionFrictionModel]:
    sections = []
    is_peak = env.isPeakHour if env else False
    weather = env.weather if env else "CLEAR"
    
    for sec in CORRIDOR_BLOCK_SECTIONS:
        length = sec["endKm"] - sec["startKm"]
        code = sec["code"]
        
        base_f = 0.12 if not is_peak else 0.28
        if "BID-KGI" in code or "KGI-SBC" in code:
            base_f += 0.25 if is_peak else 0.15
        if weather in ["MONSOON_RAIN", "HEAVY_DOWNPOUR"]:
            base_f += 0.20
        elif weather == "FOG_MIST":
            base_f += 0.15
            
        friction = round(min(0.98, max(0.05, base_f)), 2)
        
        if friction < 0.25:
            tier = "OPTIMAL"
            reason = "Free running, full permissible speed authorized."
            delay_rec = 0.0
        elif friction < 0.50:
            tier = "MODERATE_FRICTION"
            reason = "Suburban commuter platform dwell surge & curve PSR restrictions."
            delay_rec = 2.4
        elif friction < 0.75:
            tier = "HEAVY_CONGESTION"
            reason = "Heavy headway compression, LC gate road clearing & terminal approach queue."
            delay_rec = 5.8
        else:
            tier = "BLOCKED_RESTRICTED"
            reason = "Mega-block / Turnout speed restriction caution slowing."
            delay_rec = 9.2
            
        sections.append(SectionFrictionModel(
            sectionCode=sec["code"],
            fromStation=sec["from"],
            toStation=sec["to"],
            startKm=sec["startKm"],
            endKm=sec["endKm"],
            lengthKm=round(length, 2),
            frictionScore=friction,
            degradationTier=tier,
            sectionalMpsKmph=sec["mps"],
            lastTraversedTrainId="12613",
            lastTraversedTrainName="Wodeyar Superfast",
            delayRecordedMin=delay_rec,
            activeRestrictionReason=reason
        ))
        
    return sections

def calculate_loop_breakdown(train_type: str, hold_time_min: float = 3.5) -> LoopPenaltyDecompositionModel:
    is_freight = train_type == "FREIGHT_BOXN"
    is_emu = train_type in ["VANDE_BHARAT", "MEMU"]

    turnout_decel = 1.4 if is_freight else (0.6 if is_emu else 1.0)
    loop_entry = 1.5 if is_freight else 0.8
    hold = max(1.0, hold_time_min)
    restart_accel = 3.0 if is_freight else (1.0 if is_emu else 2.0)
    rejoin = 1.8 if is_freight else 0.8
    total = round((turnout_decel + loop_entry + hold + restart_accel + rejoin) * 10) / 10

    return LoopPenaltyDecompositionModel(
        turnoutDecelerationMin=turnout_decel,
        loopEntrySettlingMin=loop_entry,
        stationaryHoldMin=hold,
        restartAccelerationMin=restart_accel,
        rejoiningMainlineMin=rejoin,
        totalPenaltyMin=total
    )

def analyze_all_pain_factors(
    train: TrainConfigModel,
    env: EnvironmentalConditionsModel,
    injected_delay_min: float = 0.0,
    active_clock_mins: float = 0.0
) -> CorridorPainSummaryModel:
    total_live_delay = train.initialDelayMin + injected_delay_min
    p_spec = PRIORITY_SPECS.get(train.type, PRIORITY_SPECS["EXPRESS"])
    tier = p_spec["tier"]

    incidents: List[IdentifiedPainIncidentModel] = []
    hotspot_codes: List[str] = []

    total_unscheduled_mins = 0.0
    total_speed_restr_mins = 0.0
    total_signal_mins = 0.0
    total_throat_mins = 0.0
    total_traction_loss_mins = 0.0
    total_mech_safety_mins = 0.0
    total_watering_mins = 0.0
    unscheduled_count = 0

    # 1. Check Primary Sector Vulnerability Risk
    vuln = resolve_train_primary_vulnerability_sector(train, active_clock_mins)
    if train.currentLocationKm < vuln.endKm:
        hotspot_codes.append(vuln.primarySectorId.split("-")[1])
        incidents.append(IdentifiedPainIncidentModel(
            id=f"PAIN-RECURRENT-{vuln.primarySectorId}",
            stationCode=vuln.primarySectorId.split("-")[1],
            stationName=vuln.primarySectorName,
            chainageKm=vuln.startKm,
            type="SECTOR_RECURRENT_BOTTLENECK",
            category="SECTOR_BOTTLENECK_HOTSPOT",
            severity="CRITICAL" if vuln.riskLevel == "CRITICAL_BOTTLENECK" else "HIGH",
            penaltyDurationMin=round(vuln.etaBufferAdjustedMin, 1),
            isUnscheduledHalt=False,
            rootCauseDescription=f"Sector historical delay recurrence ({vuln.historicalOccurrenceFrequencyPct}% of runs, avg +{vuln.historicalAverageDelayMin}m): {vuln.vulnerabilityReason}",
            operationalImpact=f"Applies +{vuln.etaBufferAdjustedMin}m dynamic buffer to downstream arrival ETA.",
            dispatchActionTaken=vuln.dispatchActionAdvice
        ))

    # 2. Check Preceding Train Ripple
    lead_ctx = resolve_lead_train_context(train, active_clock_mins, injected_delay_min)
    if lead_ctx.hasPrecedingTrain and lead_ctx.rippleDelayPropagatedMin > 0.5:
        total_signal_mins += lead_ctx.rippleDelayPropagatedMin
        incidents.append(IdentifiedPainIncidentModel(
            id="PAIN-PRECEDING-HEADWAY",
            stationCode="BID",
            stationName="Bidadi–Kengeri Block",
            chainageKm=112.0,
            type="PRECEDING_TRAIN_HEADWAY_CHOKE",
            category="PRECEDING_TRAIN_IMPACT",
            severity="HIGH" if lead_ctx.rippleDelayPropagatedMin >= 3.0 else "MODERATE",
            penaltyDurationMin=lead_ctx.rippleDelayPropagatedMin,
            isUnscheduledHalt=False,
            overtakingTrainInfo={"trainId": lead_ctx.leadTrainId or "", "name": lead_ctx.leadTrainName or "", "priorityTier": 3},
            rootCauseDescription=f"Preceding train {lead_ctx.leadTrainName} ({lead_ctx.headwayDistanceKm} km ahead) suffered section detention.",
            operationalImpact=f"Forces caution signal aspects and intermediate coasting, adding {lead_ctx.rippleDelayPropagatedMin}m delay.",
            dispatchActionTaken="Dynamic headway spacing alert broadcast to Section Controller."
        ))

    # 3. SCAN STATIONS FOR PRECEDENCE LOOP STABLING
    loop_candidate_stations = ["MYA", "MAD", "RMGM", "BID", "KGI"]
    for st in SWR_STATIONS_DATA:
        code = st["code"]
        is_scheduled = code in train.scheduledStops
        is_terminus = code in ["MYS", "SBC"]

        if not is_scheduled and not is_terminus and code in loop_candidate_stations:
            if tier >= 2 and (total_live_delay > 5.0 or tier >= 3):
                if len([i for i in incidents if i.type == "UNSCHEDULED_LOOP_HOLD"]) < 2:
                    breakdown = calculate_loop_breakdown(train.type, 4.5 if tier == 4 else 3.0)
                    penalty = breakdown.totalPenaltyMin
                    unscheduled_count += 1
                    total_unscheduled_mins += penalty
                    hotspot_codes.append(code)

                    incidents.append(IdentifiedPainIncidentModel(
                        id=f"PAIN-LOOP-{code}",
                        stationCode=code,
                        stationName=st["name"],
                        chainageKm=st["km"],
                        type="UNSCHEDULED_LOOP_HOLD",
                        category="PRECEDENCE_LOOP",
                        severity="CRITICAL" if tier == 4 else "HIGH",
                        penaltyDurationMin=penalty,
                        isUnscheduledHalt=True,
                        overtakingTrainInfo={"trainId": "20608", "name": "Vande Bharat Express", "priorityTier": 1},
                        loopPenaltyDecomposition=breakdown,
                        rootCauseDescription=f"Dispatched into Station Loop Line (Speed capped at {st['loopSpeed']} km/h) for Tier 1 Vande Bharat precedence.",
                        operationalImpact=f"Incurs total penalty of {penalty}m (turnout decel + loop settling + hold + restart acceleration).",
                        dispatchActionTaken="Controller initiated loop entry route locking via Electronic Interlocking."
                    ))

    # 4. SPEED RESTRICTIONS & CURVES (PSR / TSR)
    if train.currentLocationKm < 64.3:
        total_speed_restr_mins += 3.2
        incidents.append(IdentifiedPainIncidentModel(
            id="PAIN-PSR-SHRIRANGAPATNA",
            stationCode="S",
            stationName="Shrirangapatna - Pandavapura River Bridge",
            chainageKm=16.8,
            type="PSR_CURVE_GRADIENT_CAP",
            category="SPEED_RESTRICTIONS",
            severity="MODERATE",
            penaltyDurationMin=3.2,
            isUnscheduledHalt=False,
            rootCauseDescription="Cauvery River Bridge & R-350m Reverse Curve permanent speed restriction (PSR 45 km/h).",
            operationalImpact="Heavy freight and high-speed rakes forced to scrub momentum before bridge approach.",
            dispatchActionTaken="Track warning caution boards verified by Permanent Way Inspector (PWI)."
        ))

    # 5. LEVEL CROSSING GATES
    if train.currentLocationKm < 108.35:
        lc_penalty = 2.8
        total_signal_mins += lc_penalty
        incidents.append(IdentifiedPainIncidentModel(
            id="PAIN-LC-GATE-34",
            stationCode="RMGM",
            stationName="Ramanagaram LC Gate #34",
            chainageKm=96.4,
            type="LC_ROAD_TRAFFIC_JAM",
            category="LC_GATE_INCIDENT",
            severity="HIGH",
            penaltyDurationMin=lc_penalty,
            isUnscheduledHalt=False,
            rootCauseDescription="Heavy vehicular road traffic backlog delayed gate closure interlocking sequence.",
            operationalImpact="Home signal held at Caution (Double Yellow) causing speed drop to 30 km/h.",
            dispatchActionTaken="Gatekeeper notified Section Controller; Interlocking route released."
        ))

    # 6. COMMUTER DWELL SURGE
    if (env.isPeakHour or env.commuterSurgeMultiplier > 1.2) and train.type in ["MEMU", "EXPRESS"] and train.currentLocationKm < 126.1:
        dwell_penalty = round(2.5 * env.commuterSurgeMultiplier, 1)
        total_signal_mins += dwell_penalty
        incidents.append(IdentifiedPainIncidentModel(
            id="PAIN-COMMUTER-KGI",
            stationCode="KGI",
            stationName="Kengeri Suburban Hub",
            chainageKm=126.1,
            type="COMMUTER_DWELL_BLEED",
            category="COMMUTER_SURGE",
            severity="HIGH",
            penaltyDurationMin=dwell_penalty,
            isUnscheduledHalt=False,
            rootCauseDescription=f"Morning/Evening commuter peak crowd surge ({env.commuterSurgeMultiplier:.1f}x density) extended coach boarding time.",
            operationalImpact=f"Platform dwell exceeded Working Time Table (WTT) booked halt by +{dwell_penalty} min.",
            dispatchActionTaken="Station Master deployed RPF personnel for expeditious coach clearance."
        ))

    # 7. SBC TERMINAL APPROACH THROAT CHOKE
    if train.currentLocationKm < 138.25:
        throat_penalty = 3.5 if env.isPeakHour else 1.8
        total_throat_mins += throat_penalty
        incidents.append(IdentifiedPainIncidentModel(
            id="PAIN-THROAT-SBC",
            stationCode="SBC",
            stationName="KSR Bengaluru City Throat",
            chainageKm=136.5,
            type="TERMINAL_THROAT_CHOKE",
            category="TERMINAL_CHOKE",
            severity="HIGH",
            penaltyDurationMin=throat_penalty,
            isUnscheduledHalt=False,
            rootCauseDescription="SBC Terminal yard reception diamond crossings and platform neck congestion.",
            operationalImpact="Signal spacing compression imposes 15 km/h route caution over turnout crossovers.",
            dispatchActionTaken="Route Relay Interlocking (RRI) cabin queued platform reception."
        ))

    total_pain = round(
        total_unscheduled_mins +
        total_speed_restr_mins +
        total_signal_mins +
        total_throat_mins +
        total_traction_loss_mins +
        total_mech_safety_mins +
        total_watering_mins,
        1
    )

    recovery_prob = max(10.0, min(95.0, 92.0 - (total_pain * 2.8) + (p_spec["tractiveHp"] * 2.0)))
    if recovery_prob > 75.0:
        rec_tier = "HIGH_CONFIDENCE_RECOVERY"
    elif recovery_prob > 50.0:
        rec_tier = "MODERATE_RECOVERY"
    elif recovery_prob > 25.0:
        rec_tier = "MARGINAL_RECOVERY"
    else:
        rec_tier = "UNRECOVERABLE_COMPOUNDING"

    return CorridorPainSummaryModel(
        trainId=train.id,
        trainName=train.name,
        totalPainPenaltyMin=total_pain,
        unscheduledHaltsCount=unscheduled_count,
        unscheduledHaltDurationMin=round(total_unscheduled_mins, 1),
        speedRestrictionPenaltyMin=round(total_speed_restr_mins, 1),
        signalDetentionMin=round(total_signal_mins, 1),
        terminalThroatPenaltyMin=round(total_throat_mins, 1),
        tractionLossPenaltyMin=round(total_traction_loss_mins, 1),
        mechanicalSafetyPenaltyMin=round(total_mech_safety_mins, 1),
        wateringBleedPenaltyMin=round(total_watering_mins, 1),
        incidents=incidents,
        hotspotStationCodes=list(set(hotspot_codes)),
        priorityConflictActive=unscheduled_count > 0,
        precedenceSummary=f"Priority Tier {tier} dispatching {'with active mainline green wave' if tier == 1 else 'subject to loop holding and headway checks.'}",
        recoveryConfidenceTier=rec_tier,
        recoveryProbabilityPct=round(recovery_prob, 1)
    )
