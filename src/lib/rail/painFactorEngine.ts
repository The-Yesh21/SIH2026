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
  | "COMMUTER_DWELL_BLEED"      // Overcrowded platform passenger boarding dwell surge
  | "TERMINAL_THROAT_CHOKE"     // SBC Outer / yard platform reception congestion
  | "PSR_CURVE_GRADIENT_CAP";   // Permanent speed restriction over curve/bridge

export interface IdentifiedPainIncident {
  id: string;
  stationCode: string;
  stationName: string;
  chainageKm: number;
  type: PainFactorType;
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
  incidents: IdentifiedPainIncident[];
  hotspotStationCodes: string[];
  priorityConflictActive: boolean;
  precedenceSummary: string;
}

/**
 * Performs deep corridor inspection to identify all pain factors,
 * unscheduled loop stabling, signal halts, and bottleneck slowdowns along the route.
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
  let unscheduledCount = 0;

  // 1. Scan all 16 stations for unscheduled loop stabling & precedence conflicts
  // A train is looped when a higher priority train (e.g. Vande Bharat / Shatabdi) is trailing closely
  const trailingPremiumTrain = ALL_CORRIDOR_FLEET.find(
    (other) =>
      other.id !== params.train.id &&
      PRIORITY_TIERS[other.type].tier < priority
  );

  SWR_CORRIDOR_STATIONS.forEach((station) => {
    const isScheduledHalt = params.train.scheduledStops.includes(station.code);
    const isTerminus = station.code === "MYS" || station.code === "SBC";

    // (A) Check for UNSCHEDULED LOOP HOLD FOR PRECEDENCE
    // Lower tier trains (Tier 2/3/4) with loop-equipped stations (e.g. Mandya, Maddur, Ramanagaram, Bidadi)
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
        severity: dwellSurge > 2.0 ? "HIGH" : "MODERATE",
        penaltyDurationMin: dwellSurge,
        isUnscheduledHalt: false,
        rootCauseDescription: `Suburban Boarding Congestion: Heavy peak-hour commuter boarding surge on Platform #1/2 exceeded booked dwell.`,
        operationalImpact: `Scheduled 2-min stop extended to ${(2 + dwellSurge).toFixed(1)} mins due to unreserved coach doorway congestion.`,
        dispatchActionTaken: `Guard whistle and station master dispatch delayed until platform passenger clearance confirmation.`,
      });
    }

    // (C) Check for LEVEL CROSSING INTERLOCKING GATE
    const nearbyGate = DEFAULT_LC_GATES.find(
      (g) => Math.abs(g.chainageKm - station.distanceFromMysKm) < 3.0 && g.status !== "LOCKED_CLOSED"
    );
    if (nearbyGate) {
      const lcLoss = calculateLcGateDelay(nearbyGate);
      totalSignalMins += lcLoss;
      incidents.push({
        id: `PAIN-LC-${nearbyGate.id}`,
        stationCode: station.code,
        stationName: `${station.name} Outer (${nearbyGate.id})`,
        chainageKm: nearbyGate.chainageKm,
        type: "LC_GATE_INTERLOCKING_HOLD",
        severity: "HIGH",
        penaltyDurationMin: lcLoss,
        isUnscheduledHalt: true,
        rootCauseDescription: `LC Gate Interlocking Delay: ${nearbyGate.id} road traffic clearance held up signal key interlock transmission.`,
        operationalImpact: `Home signal dropped to RED; train brought to complete standstill at km ${nearbyGate.chainageKm.toFixed(1)}.`,
        dispatchActionTaken: `Section controller coordinated with Gateman to enforce road boom closure and reset electric interlock.`,
      });
    }
  });

  // 2. Track Maintenance & TSR Caution Order Stretch
  if (env.maintenanceBlockActive && env.maintenanceChainageKm) {
    const tsrPenalty = 2.5;
    totalSpeedRestrMins += tsrPenalty;
    incidents.push({
      id: "PAIN-TSR-MAINTENANCE",
      stationCode: "RMGM",
      stationName: "Ramanagaram - Bidadi Section",
      chainageKm: (env.maintenanceChainageKm.from + env.maintenanceChainageKm.to) / 2,
      type: "TSR_CAUTION_SLOWDOWN",
      severity: "HIGH",
      penaltyDurationMin: tsrPenalty,
      isUnscheduledHalt: false,
      rootCauseDescription: `Engineering Caution Order TSR ${env.maintenanceTsrKmph} km/h between km ${env.maintenanceChainageKm.from} - ${env.maintenanceChainageKm.to} (Deep Ballast Screening & Track Relaying).`,
      operationalImpact: `Sectional speed throttled from 110 km/h down to ${env.maintenanceTsrKmph} km/h. High tractive deceleration & re-acceleration cycle incurred.`,
      dispatchActionTaken: `Caution order issued to Loco Pilot at origin; automatic speed supervision active in section.`,
    });
  }

  // 3. Permanent Speed Restrictions (PSR) over sharp curves / Bridges
  DEFAULT_PSR_LIST.slice(0, 1).forEach((psr) => {
    const psrPenalty = 1.2;
    totalSpeedRestrMins += psrPenalty;
    incidents.push({
      id: `PAIN-PSR-${psr.id}`,
      stationCode: "PANP",
      stationName: "Pandavapura Curve",
      chainageKm: (psr.fromChainageKm + psr.toChainageKm) / 2,
      type: "PSR_CURVE_GRADIENT_CAP",
      severity: "MINOR",
      penaltyDurationMin: psrPenalty,
      isUnscheduledHalt: false,
      rootCauseDescription: `Permanent Speed Restriction (PSR ${psr.speedLimitKmph} km/h): Sharp 2.8° track curvature and bridge transition.`,
      operationalImpact: `Speed capped at ${psr.speedLimitKmph} km/h for ${((psr.toChainageKm - psr.fromChainageKm)).toFixed(1)} km span.`,
      dispatchActionTaken: `Permanent WTT sectional speed restriction enforced.`,
    });
  });

  // 4. Terminal Reception Throat Choke at SBC Outer
  const terminalDelay = currentTotalDelay > 8 ? 3.5 : 1.2;
  totalThroatMins += terminalDelay;
  incidents.push({
    id: "PAIN-SBC-THROAT",
    stationCode: "SBC",
    stationName: "KSR Bengaluru (SBC) Outer Throat",
    chainageKm: 137.5,
    type: "TERMINAL_THROAT_CHOKE",
    severity: currentTotalDelay > 8 ? "HIGH" : "MODERATE",
    penaltyDurationMin: terminalDelay,
    isUnscheduledHalt: currentTotalDelay > 8,
    rootCauseDescription: `Terminal Reception Conflict: Platform #1-#5 interlocking occupancy and route locking choke at SBC yard entrance.`,
    operationalImpact: `Train queued at Home Signal outer for ${terminalDelay}m awaiting platform track route clearance.`,
    dispatchActionTaken: `Yard master queuing incoming rake on SBC Outer home signal line until SMVB/MAS departure clears platform 4.`,
  });

  const totalPainPenaltyMin = Math.round(
    (totalUnscheduledMins + totalSpeedRestrMins + totalSignalMins + totalThroatMins) * 10
  ) / 10;

  const hotspotStationCodes = Array.from(new Set(incidents.map((i) => i.stationCode)));

  let precedenceSummary = "";
  if (priority === 1) {
    precedenceSummary = `Premium Priority (Tier 1): Enjoys absolute mainline clearance. Lower tier rakes are stabled on loop lines to maintain green corridor.`;
  } else if (priority === 2) {
    precedenceSummary = `Standard Express (Tier 2): Balanced priority. Subject to loop line stabling if trailing Vande Bharat/Shatabdi enters 12-min headway zone.`;
  } else if (priority === 3) {
    precedenceSummary = `Suburban MEMU (Tier 3): High stop density. Frequently looped at Ramanagaram / Bidadi for express overtakes.`;
  } else {
    precedenceSummary = `Freight Cargo (Tier 4): Lowest precedence. Subject to extended siding holds (10-30m) to clear high-speed passenger paths.`;
  }

  return {
    train: params.train,
    totalPainPenaltyMin,
    unscheduledHaltsCount: unscheduledCount,
    unscheduledHaltDurationMin: Math.round(totalUnscheduledMins * 10) / 10,
    speedRestrictionPenaltyMin: Math.round(totalSpeedRestrMins * 10) / 10,
    signalDetentionMin: Math.round(totalSignalMins * 10) / 10,
    terminalThroatPenaltyMin: Math.round(totalThroatMins * 10) / 10,
    incidents,
    hotspotStationCodes,
    priorityConflictActive: unscheduledCount > 0 || priority >= 3,
    precedenceSummary,
  };
}
