import { TrainConfig, RollingStockType } from "./types";
import { SWR_CORRIDOR_STATIONS, DEFAULT_PSR_LIST } from "./infrastructure";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT, getWeatherSpeedLimit } from "./restrictions";
import { PRIORITY_TIERS } from "./dispatching";

export type RecoveryConfidenceTier =
  | "HIGH_CONFIDENCE_RECOVERY"      // ≥ 75% probability of arriving on-time or ≤2m delay
  | "MODERATE_RECOVERY"             // 45% - 74% (recovers 40-70% of injected/accumulated delay)
  | "MARGINAL_RECOVERY"             // 20% - 44% (minimal recovery, limited by traction/halts)
  | "UNRECOVERABLE_COMPOUNDING";    // < 20% (low traction/frequent halts/freight; delay compounds)

export interface KinematicTractiveProfile {
  rollingStock: RollingStockType;
  displayName: string;
  nominalAccelMps2: number;        // Acceleration rate
  nominalDecelMps2: number;        // Braking rate
  sectionalMpsKmph: number;        // Maximum permissible speed
  powerToWeightHpPerTon: number;   // Specific power index
  timeToReach100KmphSec: number;   // Sprint time from standstill
  distanceToReachMpsMeters: number;// Distance to attain top speed
  slackAbsorptionRateMinPer10Km: number; // Max recovery capacity per 10km open double-track
}

export const TRACTIVE_PROFILES: Record<RollingStockType, KinematicTractiveProfile> = {
  VANDE_BHARAT: {
    rollingStock: "VANDE_BHARAT",
    displayName: "Vande Bharat Express (Trainset 18)",
    nominalAccelMps2: 0.85,
    nominalDecelMps2: 0.90,
    sectionalMpsKmph: 130,
    powerToWeightHpPerTon: 14.8,
    timeToReach100KmphSec: 52,
    distanceToReachMpsMeters: 1450,
    slackAbsorptionRateMinPer10Km: 1.4,
  },
  SHATABDI: {
    rollingStock: "SHATABDI",
    displayName: "Shatabdi Express (WAP-7 + LHB)",
    nominalAccelMps2: 0.55,
    nominalDecelMps2: 0.75,
    sectionalMpsKmph: 120,
    powerToWeightHpPerTon: 9.6,
    timeToReach100KmphSec: 85,
    distanceToReachMpsMeters: 2200,
    slackAbsorptionRateMinPer10Km: 1.1,
  },
  SUPERFAST: {
    rollingStock: "SUPERFAST",
    displayName: "Superfast Express (WAP-7 + 22 LHB)",
    nominalAccelMps2: 0.45,
    nominalDecelMps2: 0.65,
    sectionalMpsKmph: 110,
    powerToWeightHpPerTon: 7.2,
    timeToReach100KmphSec: 110,
    distanceToReachMpsMeters: 3100,
    slackAbsorptionRateMinPer10Km: 0.8,
  },
  EXPRESS: {
    rollingStock: "EXPRESS",
    displayName: "Mail / Express (WAP-7 / WDP-4D)",
    nominalAccelMps2: 0.40,
    nominalDecelMps2: 0.60,
    sectionalMpsKmph: 110,
    powerToWeightHpPerTon: 6.8,
    timeToReach100KmphSec: 125,
    distanceToReachMpsMeters: 3600,
    slackAbsorptionRateMinPer10Km: 0.7,
  },
  MEMU: {
    rollingStock: "MEMU",
    displayName: "3-Phase MEMU Commuter",
    nominalAccelMps2: 0.75,
    nominalDecelMps2: 0.70,
    sectionalMpsKmph: 95,
    powerToWeightHpPerTon: 8.5,
    timeToReach100KmphSec: 68,
    distanceToReachMpsMeters: 1800,
    slackAbsorptionRateMinPer10Km: 0.35, // Hampered by 16+ frequent stops
  },
  FREIGHT_BOXN: {
    rollingStock: "FREIGHT_BOXN",
    displayName: "Loaded BOXN Freight (Twin WAG-9HC)",
    nominalAccelMps2: 0.16,
    nominalDecelMps2: 0.30,
    sectionalMpsKmph: 75,
    powerToWeightHpPerTon: 2.1,
    timeToReach100KmphSec: 320, // Cannot exceed 75 km/h
    distanceToReachMpsMeters: 6200,
    slackAbsorptionRateMinPer10Km: 0.05, // Zero recovery capability
  },
};

export interface TrainRecoveryAssessment {
  trainId: string;
  trainName: string;
  rollingStock: RollingStockType;
  priorityTier: number;
  currentDelayMin: number;
  remainingDistanceKm: number;
  remainingScheduledStopsCount: number;
  tractiveProfile: KinematicTractiveProfile;
  totalCorridorSlackAllocatedMin: number;
  remainingSlackAvailableMin: number;
  maxKinematicRecoverableMin: number;
  netPredictedRecoveryMin: number;
  projectedTerminalDelayMin: number;
  recoveryConfidenceScore: number; // 0 - 100%
  confidenceTier: RecoveryConfidenceTier;
  recoveryVerdict: string;
  paceRegainRating: "INSTANT_SPRINT" | "STEADY_ACCELERATION" | "SLOW_HEAVY_INERTIA" | "SEVERELY_SLUGGISH";
  primaryRecoveryCorridorStretch: string;
  riskFactors: string[];
}

/**
 * Evaluates the dynamic pace capability and recovery confidence of a train
 * based on tractive physics, remaining distance, timetable slack, and corridor constraints.
 */
export function evaluateTrainRecoveryCapability(params: {
  train: TrainConfig;
  injectedDelayMin?: number;
  environment?: EnvironmentalConditions;
}): TrainRecoveryAssessment {
  const env = params.environment || DEFAULT_ENVIRONMENT;
  const currentTotalDelay = params.train.initialDelayMin + (params.injectedDelayMin || 0);
  const profile = TRACTIVE_PROFILES[params.train.type] || TRACTIVE_PROFILES.EXPRESS;
  const priority = PRIORITY_TIERS[params.train.type]?.tier || 2;

  const totalCorridorKm = 138.250;
  const currentKm = Math.min(Math.max(params.train.currentLocationKm, 0), totalCorridorKm);
  const remainingDistanceKm = Math.max(0, totalCorridorKm - currentKm);

  // Count remaining scheduled halts
  const remainingStations = SWR_CORRIDOR_STATIONS.filter(
    (s) => s.distanceFromMysKm >= currentKm && params.train.scheduledStops.includes(s.code) && s.code !== "SBC"
  );
  const remainingStopsCount = remainingStations.length;

  // SWR Corridor WTT Timetable buffer slack modeling (Total ~14m for whole corridor)
  const totalCorridorSlackAllocatedMin =
    params.train.type === "VANDE_BHARAT"
      ? 14
      : params.train.type === "SHATABDI"
      ? 12
      : params.train.type === "SUPERFAST"
      ? 10
      : params.train.type === "EXPRESS"
      ? 8
      : params.train.type === "MEMU"
      ? 4
      : 1;

  const fractionRemaining = remainingDistanceKm / totalCorridorKm;
  const remainingSlackAvailableMin = Math.round(totalCorridorSlackAllocatedMin * fractionRemaining * 10) / 10;

  // Maximum theoretical kinematic recovery over remaining distance
  const weatherSpeedCap = getWeatherSpeedLimit(env.weather);
  const weatherSpeedDegradation = Math.min(1.0, weatherSpeedCap / profile.sectionalMpsKmph);

  // Each stop incurs deceleration + dwell + acceleration penalty (~1.5 min loss per stop against high-speed cruise)
  const haltInertiaDampener = Math.max(0.2, 1.0 - remainingStopsCount * 0.05);

  const rawKinematicRecovery =
    (remainingDistanceKm / 10) *
    profile.slackAbsorptionRateMinPer10Km *
    weatherSpeedDegradation *
    haltInertiaDampener;

  const maxKinematicRecoverableMin = Math.round(Math.min(remainingSlackAvailableMin, rawKinematicRecovery) * 10) / 10;

  // Actual net predicted recovery against current delay
  const netPredictedRecoveryMin = Math.min(currentTotalDelay, maxKinematicRecoverableMin);
  const projectedTerminalDelayMin = Math.max(0, Math.round((currentTotalDelay - netPredictedRecoveryMin) * 10) / 10);

  // Confidence Score calculation (0 to 100%)
  let confidenceScore = 0;
  if (currentTotalDelay <= 0) {
    confidenceScore = 98; // Already on time
  } else {
    const recoveryRatio = maxKinematicRecoverableMin / currentTotalDelay;
    // Power-to-weight, priority clearance, and weather bonus
    const priorityBonus = priority === 1 ? 15 : priority === 2 ? 8 : 0;
    const weatherPenalty = env.weather === "DENSE_FOG" ? -40 : env.weather === "HEAVY_MONSOON" ? -25 : 0;
    const stopsPenalty = remainingStopsCount > 6 ? -15 : 0;

    const baseScore = Math.min(100, Math.round(recoveryRatio * 85));
    confidenceScore = Math.min(99, Math.max(5, baseScore + priorityBonus + weatherPenalty + stopsPenalty));
  }

  // Determine Confidence Tier
  let confidenceTier: RecoveryConfidenceTier = "MARGINAL_RECOVERY";
  if (confidenceScore >= 75) {
    confidenceTier = "HIGH_CONFIDENCE_RECOVERY";
  } else if (confidenceScore >= 45) {
    confidenceTier = "MODERATE_RECOVERY";
  } else if (confidenceScore >= 20) {
    confidenceTier = "MARGINAL_RECOVERY";
  } else {
    confidenceTier = "UNRECOVERABLE_COMPOUNDING";
  }

  // Pace Regain Classification
  let paceRegainRating: "INSTANT_SPRINT" | "STEADY_ACCELERATION" | "SLOW_HEAVY_INERTIA" | "SEVERELY_SLUGGISH" =
    "STEADY_ACCELERATION";
  if (profile.nominalAccelMps2 >= 0.80) {
    paceRegainRating = "INSTANT_SPRINT";
  } else if (profile.nominalAccelMps2 >= 0.45) {
    paceRegainRating = "STEADY_ACCELERATION";
  } else if (profile.nominalAccelMps2 >= 0.30) {
    paceRegainRating = "SLOW_HEAVY_INERTIA";
  } else {
    paceRegainRating = "SEVERELY_SLUGGISH";
  }

  // Risk factors
  const riskFactors: string[] = [];
  if (env.weather !== "CLEAR") {
    riskFactors.push(`Speed Throttled: ${env.weather} limits top speed to ${weatherSpeedCap} km/h`);
  }
  if (remainingStopsCount >= 6) {
    riskFactors.push(`Frequent Halts: ${remainingStopsCount} stops degrade high-speed cruising`);
  }
  if (env.commuterSurgeMultiplier > 1.0 && remainingStopsCount > 0) {
    riskFactors.push(`Peak Commuter Rush: Extended boarding dwells at urban halts`);
  }
  if (profile.powerToWeightHpPerTon < 5.0) {
    riskFactors.push(`High Inertia: Heavy rake takes >4.5 km to regain 65+ km/h`);
  }
  if (priority > 2) {
    riskFactors.push(`Precedence Risk: Subject to loop-line stabling if higher priority train trails`);
  }

  // Qualitative Verdict
  let recoveryVerdict = "";
  if (currentTotalDelay === 0) {
    recoveryVerdict = "Running on nominal green corridor. Schedule buffer fully intact.";
  } else if (projectedTerminalDelayMin === 0) {
    recoveryVerdict = `Full Recovery Feasible: High tractive reserve will absorb entire ${currentTotalDelay}m delay before Kengeri / SBC.`;
  } else if (netPredictedRecoveryMin >= currentTotalDelay * 0.5) {
    recoveryVerdict = `Substantial Recovery: Kinematics will shave ${netPredictedRecoveryMin}m off delay; estimated arrival +${projectedTerminalDelayMin}m at SBC.`;
  } else if (netPredictedRecoveryMin > 0) {
    recoveryVerdict = `Partial Recovery Only: Heavy train configuration or tight slack caps recovery to ${netPredictedRecoveryMin}m.`;
  } else {
    recoveryVerdict = `Delay Locked / Compounding: Low tractive power and frequent halts prevent schedule recovery. Delay will cascade.`;
  }

  return {
    trainId: params.train.id,
    trainName: params.train.name,
    rollingStock: params.train.type,
    priorityTier: priority,
    currentDelayMin: currentTotalDelay,
    remainingDistanceKm: Math.round(remainingDistanceKm * 10) / 10,
    remainingScheduledStopsCount: remainingStopsCount,
    tractiveProfile: profile,
    totalCorridorSlackAllocatedMin,
    remainingSlackAvailableMin,
    maxKinematicRecoverableMin,
    netPredictedRecoveryMin,
    projectedTerminalDelayMin,
    recoveryConfidenceScore: confidenceScore,
    confidenceTier,
    recoveryVerdict,
    paceRegainRating,
    primaryRecoveryCorridorStretch: "Bidadi (BID) ➔ Nayandahalli (NYH) [28 km Open 110-130 km/h Corridor]",
    riskFactors,
  };
}
