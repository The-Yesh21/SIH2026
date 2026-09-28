import { TrainConfig, RollingStockType, StationNode } from "./types";
import { SWR_CORRIDOR_STATIONS, DEFAULT_PSR_LIST, DEFAULT_LC_GATES } from "./infrastructure";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT, getWeatherSpeedLimit, calculateLcGateDelay } from "./restrictions";
import { PRIORITY_TIERS, calculateLoopLinePenalty, LoopLinePenaltyBreakdown } from "./dispatching";
import { ALL_CORRIDOR_FLEET } from "./timeResolver";

export type PainFactorType =
  | "UNSCHEDULED_LOOP_HOLD"     // Station with no stop, but diverted to loop for precedence
  | "SIGNAL_ASPECT_DETENTION"   // Double Yellow / Yellow / Red signal stop behind leading train
  | "TSR_CAUTION_SLOWDOWN"      // Temporary Speed Restriction (e.g. 30 km/h maintenance track)
  | "LC_GATE_INTERLOCKING_HOLD" // Road gate held open / non-interlocked clearance
  | "LC_ROAD_TRAFFIC_JAM"       // Road vehicular traffic obstruction holding gate
  | "COMMUTER_DWELL_BLEED"      // Overcrowded platform passenger boarding dwell surge
  | "TERMINAL_THROAT_CHOKE"     // SBC Outer / yard platform reception congestion
  | "PSR_CURVE_GRADIENT_CAP"    // Permanent speed restriction over curve/bridge
  | "OHE_VOLTAGE_SAG"           // Catenary power voltage drop & neutral section gliding
  | "WET_RAIL_ADHESION_SLIP"    // Low railhead adhesion wheel slip tractive derating
  | "WILD_HOTBOX_INSPECTION"    // Wheel Impact Load Detector alarm rolling inspection
  | "WATERING_SANITATION_BLEED";// Coach en-route watering & sanitation hydrant overrun

export interface IdentifiedPainIncident {
  id: string;
  stationCode: string;
  stationName: string;
  chainageKm: number;
  type: PainFactorType;
  categoryName?: string;
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "MINOR";
  penaltyDurationMin: number;
  isUnscheduledHalt: boolean;
  overtakingTrainInfo?: {
    trainId: string;
    name: string;
    priorityTier: number;
  };
  loopPenaltyDecomposition?: LoopLinePenaltyBreakdown;
  rootCauseDescription: string;
  operationalImpact: string;
  dispatchActionTaken: string;
}

export interface CorridorPainSummary {
  train: TrainConfig;
  totalPainPenaltyMin: number;
  unscheduledHaltsCount: number;
  unscheduledHaltDurationMin: number;
  speedRestrictionPenaltyMin: number;
  signalDetentionMin: number;
  terminalThroatPenaltyMin: number;
  tractionLossPenaltyMin: number;
  mechanicalSafetyPenaltyMin: number;
  wateringBleedPenaltyMin: number;
  incidents: IdentifiedPainIncident[];
  hotspotStationCodes: string[];
  priorityConflictActive: boolean;
  precedenceSummary: string;
}

/**
 * Performs deep corridor inspection to identify all pain factors,
 * unscheduled loop stabling, signal halts, traction sags, and bottleneck slowdowns.
 */
export function analyzeCorridorPainFactors(params: {
  train: TrainConfig;
  injectedDelayMin?: number;
  environment?: EnvironmentalConditions;
  activeClockMinutes?: number;
}): CorridorPainSummary {
  const env = params.environment || DEFAULT_ENVIRONMENT;
  const currentTotalDelay = params.train.initialDelayMin + (params.injectedDelayMin || 0);
  const priority = PRIORITY_TIERS[params.train.type]?.tier || 2;
  const incidents: IdentifiedPainIncident[] = [];

  let totalUnscheduledMins = 0;
  let totalSpeedRestrMins = 0;
  let totalSignalMins = 0;
  let totalThroatMins = 0;
  let totalTractionLossMins = 0;
  let totalMechSafetyMins = 0;
  let totalWateringMins = 0;
  let unscheduledCount = 0;

  // 1. Scan all 16 stations for unscheduled loop stabling & precedence conflicts
  const trailingPremiumTrain = ALL_CORRIDOR_FLEET.find(
    (other) =>
      other.id !== params.train.id &&
      PRIORITY_TIERS[other.type].tier < priority
  );

  SWR_CORRIDOR_STATIONS.forEach((station) => {
    const isScheduledHalt = params.train.scheduledStops.includes(station.code);
    const isTerminus = station.code === "MYS" || station.code === "SBC";

    // (A) Check for UNSCHEDULED LOOP HOLD FOR PRECEDENCE
    const isLikelyLoopStation = ["MYA", "MAD", "RMGM", "BID", "KGI"].includes(station.code);
    const shouldSimulatePrecedenceLoop =
      !isScheduledHalt &&
      !isTerminus &&
      isLikelyLoopStation &&
      priority >= 2 &&
      (currentTotalDelay > 6 || trailingPremiumTrain !== undefined);

    if (shouldSimulatePrecedenceLoop && incidents.filter((i) => i.type === "UNSCHEDULED_LOOP_HOLD").length < 2) {
      const loopBreakdown = calculateLoopLinePenalty(
        params.train.type,
        params.train.type === "FREIGHT_BOXN" ? 6.0 : 4.0
      );
      const penalty = loopBreakdown.totalPenaltyMin;

      unscheduledCount++;
      totalUnscheduledMins += penalty;

      incidents.push({
        id: `PAIN-LOOP-${station.code}`,
        stationCode: station.code,
        stationName: station.name,
        chainageKm: station.distanceFromMysKm,
        type: "UNSCHEDULED_LOOP_HOLD",
        categoryName: "Precedence & Loop Siding",
        severity: "CRITICAL",
        penaltyDurationMin: penalty,
        isUnscheduledHalt: true,
        overtakingTrainInfo: trailingPremiumTrain
          ? {
              trainId: trailingPremiumTrain.id,
              name: trailingPremiumTrain.name,
              priorityTier: PRIORITY_TIERS[trailingPremiumTrain.type].tier,
            }
          : {
              trainId: "20608",
              name: "Vande Bharat Express",
              priorityTier: 1,
            },
        loopPenaltyDecomposition: loopBreakdown,
        rootCauseDescription: `Unscheduled Siding Hold: Diverted to Loop Line #3 (${station.loopSpeedKmph} km/h turnout) to yield mainline precedence to higher-priority rake.`,
        operationalImpact: `Rake halted for ${loopBreakdown.stationaryHoldMin}m in siding. Incurs ${loopBreakdown.restartAccelerationMin}m re-acceleration penalty to clear block section.`,
        dispatchActionTaken: `Dispatcher granted line-clear to Priority 1 train; locked loop signals until rear block overlap cleared.`,
      });
    }

    // (B) Check for COMMUTER DWELL BLEED
    if (isScheduledHalt && station.commuterSurgeProne && env.commuterSurgeMultiplier > 1.0) {
      const dwellSurge = Math.round((env.commuterSurgeMultiplier - 1.0) * 2.5 * 10) / 10;
      incidents.push({
        id: `PAIN-DWELL-${station.code}`,
        stationCode: station.code,
        stationName: station.name,
        chainageKm: station.distanceFromMysKm,
        type: "COMMUTER_DWELL_BLEED",
        categoryName: "Commuter Surge",
        severity: dwellSurge > 2.0 ? "HIGH" : "MODERATE",
        penaltyDurationMin: dwellSurge,
        isUnscheduledHalt: false,
        rootCauseDescription: `High Footfall Dwell Extension: Morning/evening suburban commuter rush prolonged passenger entrainment/detrainment.`,
        operationalImpact: `Platform dwell exceeded booked margin by +${dwellSurge}m. Starter signal clearance delayed by guard.`,
        dispatchActionTaken: `Station Master deployed additional RPF platform marshals for rapid rake clearance.`,
      });
    }

    // (C) Check for WATERING & SANITATION BLEED (Mandya Junction / Mysuru)
    if (station.code === "MYA" && isScheduledHalt && params.train.coaches >= 16) {
      const waterDelay = 2.5;
      totalWateringMins += waterDelay;
      incidents.push({
        id: `PAIN-WATER-${station.code}`,
        stationCode: station.code,
        stationName: station.name,
        chainageKm: station.distanceFromMysKm,
        type: "WATERING_SANITATION_BLEED",
        categoryName: "Watering & Sanitation",
        severity: "MODERATE",
        penaltyDurationMin: waterDelay,
        isUnscheduledHalt: false,
        rootCauseDescription: `En-Route Coach Watering Dwell Overrun: Platform hydrant hose coupling latency on 16+ coach rake.`,
        operationalImpact: `Scheduled 2m halt extended by +${waterDelay}m for mechanical water replenishment.`,
        dispatchActionTaken: `TXR mechanical wing clearance issued before starter signal green.`,
      });
    }
  });

  // 2. Catenary OHE Voltage Sag & Neutral Section
  if (params.train.currentSpeedKmph > 50) {
    const oheSagMin = 1.2;
    totalTractionLossMins += oheSagMin;
    incidents.push({
      id: "PAIN-OHE-SAG",
      stationCode: "RMGM",
      stationName: "Ramanagaram–Bidadi Substation",
      chainageKm: 98.5,
      type: "OHE_VOLTAGE_SAG",
      categoryName: "Traction & OHE Power",
      severity: "MODERATE",
      penaltyDurationMin: oheSagMin,
      isUnscheduledHalt: false,
      rootCauseDescription: `25kV Catenary Voltage Sag & Neutral Section: Phase break crossing requires opening circuit breaker on uphill gradient.`,
      operationalImpact: `Momentary loss of tractive effort derates acceleration, incurring +${oheSagMin}m lag across 1:150 gradient.`,
      dispatchActionTaken: `Traction Power Controller (TPC) monitored grid substation tap changers.`,
    });
  }

  // 3. Wet Railhead Adhesion Slip (Monsoon / Mist)
  if (env.weather === "HEAVY_MONSOON" || env.weather === "LIGHT_RAIN" || env.weather === "DENSE_FOG") {
    const adhesionLossMin = 1.8;
    totalTractionLossMins += adhesionLossMin;
    incidents.push({
      id: "PAIN-WET-RAIL",
      stationCode: "MAD",
      stationName: "Maddur–Channapatna Incline",
      chainageKm: 72.0,
      type: "WET_RAIL_ADHESION_SLIP",
      categoryName: "Weather & Visibility",
      severity: "HIGH",
      penaltyDurationMin: adhesionLossMin,
      isUnscheduledHalt: false,
      rootCauseDescription: `Low Railhead Adhesion Index (μ < 0.20): Wet track surface inducing micro-slippage during WAP-7 notch progression.`,
      operationalImpact: `Loco pilot throttled tractive motor current to suppress wheel spin, losing +${adhesionLossMin}m uphill momentum.`,
      dispatchActionTaken: `Automatic loco sanding gear deployed on lead wheelsets.`,
    });
  }

  // 4. Trackside Speed Restrictions (PSRs/TSRs)
  DEFAULT_PSR_LIST.forEach((psr) => {
    if (psr.active && params.train.currentLocationKm <= psr.toChainageKm) {
      const penalty = psr.speedLimitKmph <= 45 ? 2.5 : 1.2;
      totalSpeedRestrMins += penalty;
      incidents.push({
        id: `PAIN-PSR-${psr.id}`,
        stationCode: "PSR",
        stationName: `KM ${psr.fromChainageKm} - ${psr.toChainageKm}`,
        chainageKm: psr.fromChainageKm,
        type: "PSR_CURVE_GRADIENT_CAP",
        categoryName: "Speed Restrictions",
        severity: psr.speedLimitKmph <= 45 ? "HIGH" : "MODERATE",
        penaltyDurationMin: penalty,
        isUnscheduledHalt: false,
        rootCauseDescription: `Speed Restriction (${psr.speedLimitKmph} km/h): ${psr.cause} (${psr.authority}).`,
        operationalImpact: `Requires service braking from MPS to ${psr.speedLimitKmph} km/h over ${psr.toChainageKm - psr.fromChainageKm} km track.`,
        dispatchActionTaken: `Loco pilot observed caution order; automated braking curve monitored.`,
      });
    }
  });

  // 5. Level Crossing (LC) Highway Congestion Hold
  DEFAULT_LC_GATES.forEach((gate) => {
    if (gate.status === "OPEN_ROAD" || gate.status === "DEFECT_HELD") {
      const lcPenalty = calculateLcGateDelay(gate);
      if (lcPenalty > 0.5) {
        incidents.push({
          id: `PAIN-LC-${gate.id}`,
          stationCode: "LC",
          stationName: `LC Gate ${gate.id} (${gate.section})`,
          chainageKm: gate.chainageKm,
          type: "LC_ROAD_TRAFFIC_JAM",
          categoryName: "LC Gate & Incident",
          severity: lcPenalty > 2.0 ? "HIGH" : "MODERATE",
          penaltyDurationMin: lcPenalty,
          isUnscheduledHalt: false,
          rootCauseDescription: `State Highway Heavy Road Congestion: Road traffic obstructed interlocked boom closure.`,
          operationalImpact: `Gate approach signal held at Caution / Red, enforcing deceleration.`,
          dispatchActionTaken: `Gateman engaged siren and emergency boom locking; signals restored.`,
        });
      }
    }
  });

  // 6. SBC Bengaluru City Terminal Throat Reception Choke
  const sbcThroatPenalty = currentTotalDelay > 8 || priority > 2 ? 3.5 : 1.8;
  totalThroatMins += sbcThroatPenalty;
  incidents.push({
    id: "PAIN-SBC-THROAT",
    stationCode: "SBC",
    stationName: "KSR Bengaluru City Outer Throat",
    chainageKm: 136.5,
    type: "TERMINAL_THROAT_CHOKE",
    categoryName: "Terminal Outer Choke",
    severity: sbcThroatPenalty > 3.0 ? "HIGH" : "MODERATE",
    penaltyDurationMin: sbcThroatPenalty,
    isUnscheduledHalt: false,
    rootCauseDescription: `Terminal Reception Yard Choke: Diamond crossover locked for departing outbound trains and shunting rake movement.`,
    operationalImpact: `Approaching rake held at Kengeri Outer / SBC Home Signal for +${sbcThroatPenalty}m before platform berthing.`,
    dispatchActionTaken: `Yard Master cleared route-relay interlocking to Platform #7.`,
  });

  // Calculate Aggregated Metrics
  const totalPain = Math.round(
    (totalUnscheduledMins +
      totalSpeedRestrMins +
      totalSignalMins +
      totalThroatMins +
      totalTractionLossMins +
      totalMechSafetyMins +
      totalWateringMins) *
      10
  ) / 10;

  const hotspotCodes = Array.from(new Set(incidents.map((i) => i.stationCode).filter((c) => c !== "PSR" && c !== "LC")));

  return {
    train: params.train,
    totalPainPenaltyMin: totalPain,
    unscheduledHaltsCount: unscheduledCount,
    unscheduledHaltDurationMin: Math.round(totalUnscheduledMins * 10) / 10,
    speedRestrictionPenaltyMin: Math.round(totalSpeedRestrMins * 10) / 10,
    signalDetentionMin: Math.round(totalSignalMins * 10) / 10,
    terminalThroatPenaltyMin: Math.round(totalThroatMins * 10) / 10,
    tractionLossPenaltyMin: Math.round(totalTractionLossMins * 10) / 10,
    mechanicalSafetyPenaltyMin: Math.round(totalMechSafetyMins * 10) / 10,
    wateringBleedPenaltyMin: Math.round(totalWateringMins * 10) / 10,
    incidents,
    hotspotStationCodes: hotspotCodes,
    priorityConflictActive: unscheduledCount > 0,
    precedenceSummary:
      unscheduledCount > 0
        ? `Precedence Conflict: Yielding mainline to higher-priority rakes at ${hotspotCodes.join(", ")}`
        : `Normal Corridor Flow: No active siding holds required`,
  };
}
