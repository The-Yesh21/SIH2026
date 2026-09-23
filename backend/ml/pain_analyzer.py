from typing import List, Dict, Tuple
from models.pain_factors import (
    TrainConfigModel,
    EnvironmentalConditionsModel,
    CorridorPainSummaryModel,
    IdentifiedPainIncidentModel,
    LoopPenaltyDecompositionModel
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

PRIORITY_SPECS = {
    "VANDE_BHARAT": {"tier": 1, "margin": 12, "tractiveHp": 14.8, "baseSlack": 1.4},
    "SHATABDI": {"tier": 1, "margin": 10, "tractiveHp": 9.6, "baseSlack": 1.1},
    "SUPERFAST": {"tier": 2, "margin": 7, "tractiveHp": 7.2, "baseSlack": 0.8},
    "EXPRESS": {"tier": 2, "margin": 6, "tractiveHp": 6.8, "baseSlack": 0.7},
    "MEMU": {"tier": 3, "margin": 4, "tractiveHp": 8.0, "baseSlack": 0.6},
    "FREIGHT_BOXN": {"tier": 4, "margin": 2, "tractiveHp": 4.5, "baseSlack": 0.3},
}

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

    # 1. SCAN STATIONS FOR PRECEDENCE LOOP STABLING
    loop_candidate_stations = ["MYA", "MAD", "RMGM", "BID", "KGI"]
    for st in SWR_STATIONS_DATA:
        code = st["code"]
        is_scheduled = code in train.scheduledStops
        is_terminus = code in ["MYS", "SBC"]

        # Loop Precedence
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
                        severity="CRITICAL",
                        penaltyDurationMin=penalty,
                        isUnscheduledHalt=True,
                        overtakingTrainInfo={
                            "trainId": "20608",
                            "name": "Vande Bharat Express (MAS VBE)",
                            "priorityTier": 1
                        },
                        loopPenaltyDecomposition=breakdown,
                        rootCauseDescription=f"Unscheduled Loop Siding Hold: Diverted to Loop Line #{2 if code == 'RMGM' else 3} ({st['loopSpeed']} km/h 1:12 turnout) to clear mainline for Priority 1 Vande Bharat.",
                        operationalImpact=f"Stationary for {breakdown.stationaryHoldMin}m in siding. Incurs {breakdown.restartAccelerationMin}m re-acceleration penalty.",
                        dispatchActionTaken="Section Controller locked loop signals; granted green aspect line-clear to overtaking train."
                    ))

        # Commuter Dwell Surge
        if is_scheduled and st["surge"] and env.commuterSurgeMultiplier > 1.0:
            dwell_surge = round((env.commuterSurgeMultiplier - 1.0) * 2.2 * 10) / 10
            if dwell_surge > 0.4:
                incidents.append(IdentifiedPainIncidentModel(
                    id=f"PAIN-SURGE-{code}",
                    stationCode=code,
                    stationName=st["name"],
                    chainageKm=st["km"],
                    type="COMMUTER_DWELL_BLEED",
                    category="COMMUTER_SURGE",
                    severity="HIGH" if dwell_surge > 2.0 else "MODERATE",
                    penaltyDurationMin=dwell_surge,
                    isUnscheduledHalt=False,
                    rootCauseDescription=f"Suburban Passenger Boarding Surge: High footfall congestion exceeding booked {train.dwellMinutes.get(code, 2) if train.dwellMinutes else 2}m dwell.",
                    operationalImpact=f"Platform dwell extended by +{dwell_surge}m. Door clearance delayed.",
                    dispatchActionTaken="Guard whistle delay; platform master coordinated rapid rake clearance."
                ))

        # Watering / Sanitation Dwell Overrun at Major Junctions (Mandya / Mysuru)
        if code == "MYA" and is_scheduled and train.coaches >= 16:
            watering_delay = 2.5
            total_watering_mins += watering_delay
            incidents.append(IdentifiedPainIncidentModel(
                id=f"PAIN-WATER-{code}",
                stationCode=code,
                stationName=st["name"],
                chainageKm=st["km"],
                type="WATERING_SANITATION_BLEED",
                category="WATERING_SANITATION",
                severity="MODERATE",
                penaltyDurationMin=watering_delay,
                isUnscheduledHalt=False,
                rootCauseDescription="En-Route Coach Watering Dwell Overrun: Platform hydrant hose connection and booster pressure latency.",
                operationalImpact=f"Scheduled 2m halt delayed to {2 + watering_delay}m for 16-coach rake water replenishment.",
                dispatchActionTaken="TXR mechanical wing clearance required prior to starter signal green."
            ))

    # 2. TRACTION POWER & OHE VOLTAGE SAG
    if env.oheVoltageKv < 23.5:
        ohe_loss = round((25.0 - env.oheVoltageKv) * 1.2 * 10) / 10
        total_traction_loss_mins += ohe_loss
        incidents.append(IdentifiedPainIncidentModel(
            id="PAIN-OHE-SAG",
            stationCode="RMGM",
            stationName="Ramanagaram–Bidadi Substation",
            chainageKm=98.5,
            type="OHE_VOLTAGE_SAG",
            category="TRACTION_POWER_OHE",
            severity="HIGH" if ohe_loss > 2.0 else "MODERATE",
            penaltyDurationMin=ohe_loss,
            isUnscheduledHalt=False,
            rootCauseDescription=f"Catenary 25kV Traction Voltage Sag ({env.oheVoltageKv:.1f} kV): Peak grid load near Bidadi substation reducing available motor tractive effort.",
            operationalImpact=f"WAP-7 acceleration gradient derated by {int((25.0 - env.oheVoltageKv) * 8)}%, compounding transit times uphill.",
            dispatchActionTaken="Traction Power Controller (TPC) alerted for grid tap-changer boost."
        ))

    # 3. WET RAIL ADHESION WHEEL SLIP
    if env.railSurfaceCondition in ["WET_SLIPPERY", "WATERLOGGED"] or env.weather in ["MONSOON_RAIN", "HEAVY_DOWNPOUR"]:
        slip_penalty = 2.8 if train.type == "FREIGHT_BOXN" else 1.6
        total_traction_loss_mins += slip_penalty
        incidents.append(IdentifiedPainIncidentModel(
            id="PAIN-ADHESION-SLIP",
            stationCode="MAD",
            stationName="Maddur–Channapatna Incline",
            chainageKm=72.0,
            type="WET_RAIL_ADHESION_SLIP",
            category="WEATHER_ADHESION",
            severity="HIGH",
            penaltyDurationMin=slip_penalty,
            isUnscheduledHalt=False,
            rootCauseDescription=f"Low Adhesion Railhead Slippage (μ < 0.20): Wet track condition triggering locomotive anti-slip brake sanding.",
            operationalImpact=f"Loco pilot forced to limit tractive current to avoid wheel spin, incurring +{slip_penalty}m transit delay.",
            dispatchActionTaken="Sanding gear active; automatic tractive limiter engaged."
        ))

    # 4. TRACKSIDE WILD / HOT-BOX SENSOR ALARM
    if env.wildAlarmActive:
        wild_penalty = 8.5
        total_mech_safety_mins += wild_penalty
        hotspot_codes.append("BID")
        incidents.append(IdentifiedPainIncidentModel(
            id="PAIN-WILD-ALARM",
            stationCode="BID",
            stationName="Bidadi Yard Outer",
            chainageKm=108.35,
            type="WILD_HOTBOX_INSPECTION",
            category="MECHANICAL_SAFETY_WILD",
            severity="CRITICAL",
            penaltyDurationMin=wild_penalty,
            isUnscheduledHalt=True,
            rootCauseDescription="WILD Trackside Acoustic Axle Detector Alarm: Abnormal impact load detected on coach axle #7.",
            operationalImpact=f"Mandatory cautionary halt for {wild_penalty}m at Bidadi loop line for rolling-in guard/C&W visual examination.",
            dispatchActionTaken="Station Master issued emergency red aspect; rolling-in inspection cleared track."
        ))

    # 5. TERMINAL THROAT CHOKE AT SBC (BENGALURU CITY OUTER)
    throat_penalty = 3.5 if (total_live_delay > 8.0 or env.isPeakHour) else 1.8
    total_throat_mins += throat_penalty
    hotspot_codes.append("SBC")
    incidents.append(IdentifiedPainIncidentModel(
        id="PAIN-SBC-THROAT",
        stationCode="SBC",
        stationName="KSR Bengaluru City Outer Throat",
        chainageKm=136.5,
        type="TERMINAL_THROAT_CHOKE",
        category="TERMINAL_CHOKE",
        severity="HIGH" if throat_penalty > 3.0 else "MODERATE",
        penaltyDurationMin=throat_penalty,
        isUnscheduledHalt=False,
        rootCauseDescription="SBC Terminal Reception Throat Congestion: Platforms 1–6 occupied by shunting movements and outgoing departures.",
        operationalImpact=f"Train held at SBC Home Signal / Kengeri Outer for +{throat_penalty}m awaiting route-relay interlocking clearance.",
        dispatchActionTaken="SBC Yard Master prioritized platform reception slot."
    ))

    # 6. PERMANENT & TEMPORARY SPEED RESTRICTIONS (PSRs)
    total_speed_restr_mins = 2.4
    incidents.append(IdentifiedPainIncidentModel(
        id="PAIN-PSR-SHRIRANGA",
        stationCode="S",
        stationName="Shrirangapatna Cauvery Bridge PSR",
        chainageKm=14.75,
        type="PSR_CURVE_GRADIENT_CAP",
        category="SPEED_RESTRICTIONS",
        severity="MODERATE",
        penaltyDurationMin=1.2,
        isUnscheduledHalt=False,
        rootCauseDescription="Curvature & River Bridge PSR: Strict 80 km/h speed limit across Cauvery Bridge and 2.5° reverse curve.",
        operationalImpact="High-speed train must decelerate from 110/130 km/h to 80 km/h, losing kinetic momentum.",
        dispatchActionTaken="Loco pilot observed permanent caution indicator board."
    ))

    # 7. LC GATE ROAD TRAFFIC HOLD
    incidents.append(IdentifiedPainIncidentModel(
        id="PAIN-LC-CPT",
        stationCode="CPT",
        stationName="Channapatna LC-42 Highway Gate",
        chainageKm=82.55,
        type="LC_ROAD_TRAFFIC_JAM",
        category="LC_GATE_INCIDENT",
        severity="MODERATE",
        penaltyDurationMin=1.5,
        isUnscheduledHalt=False,
        rootCauseDescription="State Highway LC Gate Traffic Clearance: Road vehicular congestion delayed interlocked boom closure.",
        operationalImpact="Approaching distant signal remained at Double Yellow, forcing cautionary braking.",
        dispatchActionTaken="Gateman completed emergency boom locking; signals returned to Green."
    ))

    # Calculate Total Pain Penalties
    total_pain = round((
        total_unscheduled_mins +
        total_speed_restr_mins +
        total_signal_mins +
        total_throat_mins +
        total_traction_loss_mins +
        total_mech_safety_mins +
        total_watering_mins
    ) * 10) / 10

    # Recovery Confidence Calculation
    rem_km = max(5.0, 138.25 - train.currentLocationKm)
    total_stops = len(train.scheduledStops)
    base_recovery_potential = (rem_km / 10.0) * p_spec["baseSlack"]

    if total_live_delay <= 2.0:
        tier_str = "HIGH_CONFIDENCE_RECOVERY"
        prob_pct = 94.0
    elif tier == 1 and total_live_delay <= base_recovery_potential * 1.5:
        tier_str = "HIGH_CONFIDENCE_RECOVERY"
        prob_pct = min(92.0, 75.0 + (p_spec["tractiveHp"] * 1.2))
    elif tier <= 2 and total_live_delay <= base_recovery_potential * 2.0:
        tier_str = "MODERATE_RECOVERY"
        prob_pct = 62.0
    elif total_stops > 8 or tier >= 4:
        tier_str = "UNRECOVERABLE_COMPOUNDING"
        prob_pct = 16.0
    else:
        tier_str = "MARGINAL_RECOVERY"
        prob_pct = 38.0

    return CorridorPainSummaryModel(
        trainId=train.id,
        trainName=train.name,
        totalPainPenaltyMin=total_pain,
        unscheduledHaltsCount=unscheduled_count,
        unscheduledHaltDurationMin=total_unscheduled_mins,
        speedRestrictionPenaltyMin=total_speed_restr_mins,
        signalDetentionMin=total_signal_mins,
        terminalThroatPenaltyMin=total_throat_mins,
        tractionLossPenaltyMin=total_traction_loss_mins,
        mechanicalSafetyPenaltyMin=total_mech_safety_mins,
        wateringBleedPenaltyMin=total_watering_mins,
        incidents=incidents,
        hotspotStationCodes=list(set(hotspot_codes)),
        priorityConflictActive=unscheduled_count > 0,
        precedenceSummary=f"Priority Tier {tier} ({train.type}) · {unscheduled_count} siding holds scheduled",
        recoveryConfidenceTier=tier_str,
        recoveryProbabilityPct=round(prob_pct, 1)
    )
