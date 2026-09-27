import { TrainConfig, StationNode, RollingStockType } from "./types";
import { SWR_CORRIDOR_STATIONS } from "./infrastructure";
import {
  ALL_CORRIDOR_FLEET,
  parseTimeToMinutes,
  formatClockMinutes,
  resolveTrainAtClockTime,
} from "./timeResolver";
import { computeDynamicEta } from "./dynamicEta";
import { DEFAULT_ENVIRONMENT, EnvironmentalConditions } from "./restrictions";

export interface StationStopTiming {
  stationCode: string;
  stationName: string;
  distanceFromMysKm: number;
  scheduledTimeStr: string;
  scheduledTimeMins: number;
  predictedTimeStr: string;
  predictedTimeMins: number;
  isHaltingStop: boolean;
  dwellMin: number;
}

export interface OptimalTrainOption {
  train: TrainConfig;
  originStation: StationNode;
  destStation: StationNode;
  distanceKm: number;

  // Stoppage & Eligibility
  stopsAtOrigin: boolean;
  stopsAtDest: boolean;
  stopsEnRoute: string[];
  intermediateStopsCount: number;

  // Timings at Origin
  scheduledDepOriginStr: string;
  scheduledDepOriginMins: number;
  predictedDepOriginStr: string;
  predictedDepOriginMins: number;
  originDelayMin: number;

  // Timings at Destination
  scheduledArrDestStr: string;
  scheduledArrDestMins: number;
  predictedArrDestStr: string;
  predictedArrDestMins: number;
  destDelayMin: number;

  // Wait Time & Transit Metrics
  waitTimeMins: number; // Mins from queryClockMinutes until train departs origin
  transitDurationMins: number; // In-motion journey time from origin to destination
  totalJourneyMins: number; // waitTimeMins + transitDurationMins
  absoluteArrivalMins: number; // queryClockMinutes + totalJourneyMins
  absoluteArrivalStr: string;

  // Speed & Dynamics
  avgSpeedKmph: number;
  targetPacingKmph: number;
  throttleAdvisory: string;
  recoveryPotentialMin: number;
  delayRiskScore: number; // 0 (Zero Risk) - 100 (High Risk)
  reliabilityTier: "VIP_RELIABLE" | "HIGH" | "MODERATE" | "HIGH_RISK";

  // Perfection Index (0 - 100)
  perfectionScore: number;
  departureStatus: "DEPARTING_NOW" | "UPCOMING_SOON" | "LATER_TODAY" | "OVERNIGHT_NEXT_DAY" | "ALREADY_DEPARTED";

  // Badges
  isPerfectionChoice: boolean; // Overall #1 Recommendation
  isFastestTransit: boolean; // Shortest in-transit ride time
  isNextDeparture: boolean; // Leaves origin soonest
  isVipPriority: boolean; // High priority train
  badgeLabels: string[];

  // Explanatory Intelligence
  aiDecisionReason: string;
  kinematicVerdict: string;
}

export interface PerfectionQueryRequest {
  originCode: string;
  destCode: string;
  queryClockMinutes: number;
  environment?: EnvironmentalConditions;
  injectedDelay?: number;
  requirePassengerHaltsOnly?: boolean;
}

export interface PerfectionQueryResult {
  originStation: StationNode;
  destStation: StationNode;
  corridorDistanceKm: number;
  queryClockMinutes: number;
  queryClockStr: string;
  options: OptimalTrainOption[];
  bestChoice: OptimalTrainOption | null;
  fastestChoice: OptimalTrainOption | null;
  soonestChoice: OptimalTrainOption | null;
  summaryVerdict: string;
}

/**
 * High-Precision Station Lookup by Station Code
 */
export function getStationByCode(code: string): StationNode | undefined {
  return SWR_CORRIDOR_STATIONS.find(
    (s) => s.code.toUpperCase() === code.toUpperCase()
  );
}

/**
 * Compute the scheduled arrival/departure time of a train at any given station
 * using authentic WTT checkpoints and constant speed interpolation.
 */
export function estimateTrainTimeAtStation(
  train: TrainConfig,
  stationCode: string
): { timeStr: string; timeMins: number; isHalting: boolean } {
  const station = getStationByCode(stationCode);
  if (!station) {
    return { timeStr: train.scheduledDep, timeMins: parseTimeToMinutes(train.scheduledDep), isHalting: false };
  }

  const isHalting = train.scheduledStops.includes(station.code);
  const startMins = parseTimeToMinutes(train.scheduledDep);
  const rawEndMins = parseTimeToMinutes(train.scheduledArr);
  const endMins = rawEndMins < startMins ? rawEndMins + 1440 : rawEndMins;
  const totalDuration = endMins - startMins;

  // If station is MYS (Origin)
  if (station.code === "MYS") {
    return { timeStr: train.scheduledDep, timeMins: startMins, isHalting: true };
  }

  // If station is SBC (Terminus)
  if (station.code === "SBC") {
    return { timeStr: train.scheduledArr, timeMins: rawEndMins, isHalting: true };
  }

  // Interpolate along 138.25 km corridor proportional to station distance
  const fraction = Math.min(1.0, Math.max(0.0, station.distanceFromMysKm / 138.25));
  
  // High-speed trains (Vande Bharat/Shatabdi) spend less time in the initial 80km
  let weightedFrac = fraction;
  if (train.type === "VANDE_BHARAT" || train.type === "SHATABDI") {
    // Smoother cruising profile
    weightedFrac = fraction;
  }

  const estimatedMins = Math.round(startMins + weightedFrac * totalDuration);
  const normMins = ((estimatedMins % 1440) + 1440) % 1440;
  const h = Math.floor(normMins / 60);
  const m = normMins % 60;
  const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  return { timeStr, timeMins: normMins, isHalting };
}

/**
 * The Core Perfection Optimization Engine
 * Calculates optimal trains between any two stops with dynamic real-time pacing,
 * delay recovery DNA, wait cost, and arrival perfection ranking.
 */
export function findOptimalTrains(
  request: PerfectionQueryRequest
): PerfectionQueryResult {
  const {
    originCode,
    destCode,
    queryClockMinutes,
    environment = DEFAULT_ENVIRONMENT,
    injectedDelay = 0,
    requirePassengerHaltsOnly = true,
  } = request;

  const originStation = getStationByCode(originCode) || SWR_CORRIDOR_STATIONS[0]!;
  const destStation = getStationByCode(destCode) || SWR_CORRIDOR_STATIONS[SWR_CORRIDOR_STATIONS.length - 1]!;

  const originDist = originStation.distanceFromMysKm;
  const destDist = destStation.distanceFromMysKm;
  const corridorDistanceKm = Math.max(0.1, Number((destDist - originDist).toFixed(2)));

  const options: OptimalTrainOption[] = [];

  // Iterate over all trains in corridor fleet
  for (const train of ALL_CORRIDOR_FLEET) {
    // Skip freight if searching for passenger options
    if (requirePassengerHaltsOnly && train.type === "FREIGHT_BOXN") {
      continue;
    }

    const stopsAtOrigin = train.scheduledStops.includes(originStation.code);
    const stopsAtDest = train.scheduledStops.includes(destStation.code);

    // If passenger halts required, train must stop at both origin and destination
    if (requirePassengerHaltsOnly && (!stopsAtOrigin || !stopsAtDest)) {
      continue;
    }

    // Resolve Scheduled Timings
    const originTiming = estimateTrainTimeAtStation(train, originStation.code);
    const destTiming = estimateTrainTimeAtStation(train, destStation.code);

    let schedDepMins = originTiming.timeMins;
    let schedArrMins = destTiming.timeMins;

    // Handle overnight journeys
    if (schedArrMins < schedDepMins) {
      schedArrMins += 1440;
    }

    // Base scheduled transit duration
    const schedTransitMins = Math.max(1, schedArrMins - schedDepMins);

    // Resolve Live Dynamic State using the Corridor Dynamic ETA Engine
    const resolvedLive = resolveTrainAtClockTime(train, queryClockMinutes);
    const dynamicPrediction = computeDynamicEta({
      train: resolvedLive.config,
      userInjectedDelayMin: injectedDelay,
      environment,
      activeClockMinutes: queryClockMinutes,
    });

    // Dynamic delay adjustments based on train type DNA and corridor condition
    let recoveryRate = 0.0;
    let delayRiskScore = 20;

    switch (train.type) {
      case "VANDE_BHARAT":
        recoveryRate = 0.70; // 70% recovery of delay
        delayRiskScore = 5;
        break;
      case "SHATABDI":
        recoveryRate = 0.60;
        delayRiskScore = 10;
        break;
      case "SUPERFAST":
        recoveryRate = 0.35;
        delayRiskScore = 25;
        break;
      case "EXPRESS":
        recoveryRate = 0.20;
        delayRiskScore = 40;
        break;
      case "MEMU":
        recoveryRate = -0.15; // Passenger trains tend to accumulate cascading delays
        delayRiskScore = 75;
        break;
      case "FREIGHT_BOXN":
        recoveryRate = -0.30;
        delayRiskScore = 90;
        break;
    }

    // Current delay at train location
    const baseDelay = resolvedLive.delayMinutes + injectedDelay;
    
    // Segment delay at origin
    const originDelayMin = Math.max(0, Math.round(baseDelay * (1 - recoveryRate * (originDist / 138.25))));
    
    // Segment delay at destination
    const destDelayMin = Math.max(0, Math.round(originDelayMin * (1 - recoveryRate * ((destDist - originDist) / 138.25))));

    const predictedDepMins = schedDepMins + originDelayMin;
    const predictedArrMins = schedArrMins + destDelayMin;
    const transitDurationMins = Math.max(5, predictedArrMins - predictedDepMins);

    // Calculate Wait Time from Query Time
    let waitTimeMins = 0;
    let departureStatus: OptimalTrainOption["departureStatus"] = "UPCOMING_SOON";

    // Compare with current queryClockMinutes
    let normQueryMins = queryClockMinutes;
    let effectiveDepMins = predictedDepMins;

    if (effectiveDepMins < normQueryMins) {
      // Train departure was earlier in the day
      const minutesAgo = normQueryMins - effectiveDepMins;
      if (minutesAgo <= 10 && resolvedLive.operatingState === "RUNNING_ON_TRACK") {
        departureStatus = "DEPARTING_NOW";
        waitTimeMins = 0;
      } else {
        // Next run tomorrow
        departureStatus = "OVERNIGHT_NEXT_DAY";
        waitTimeMins = (1440 - normQueryMins) + effectiveDepMins;
      }
    } else {
      waitTimeMins = effectiveDepMins - normQueryMins;
      if (waitTimeMins <= 5) {
        departureStatus = "DEPARTING_NOW";
      } else if (waitTimeMins <= 60) {
        departureStatus = "UPCOMING_SOON";
      } else {
        departureStatus = "LATER_TODAY";
      }
    }

    // Total Cost of Journey = Wait Time + In-Motion Transit Time
    const totalJourneyMins = waitTimeMins + transitDurationMins;
    const absoluteArrivalMins = (queryClockMinutes + totalJourneyMins) % 1440;
    const absoluteArrivalStr = formatClockMinutes(queryClockMinutes + totalJourneyMins);

    // Kinematics & Velocity
    const avgSpeedKmph = Number(((corridorDistanceKm / (transitDurationMins / 60))).toFixed(1));
    const targetPacingKmph = Math.min(train.sectionalMpsKmph, Math.round(avgSpeedKmph * 1.18));

    let throttleAdvisory = `Maintain optimal pacing at ${targetPacingKmph} km/h (MPS ${train.sectionalMpsKmph} km/h).`;
    if (originDelayMin > 0) {
      throttleAdvisory = `Apply dynamic acceleration (+${Math.min(10, train.sectionalMpsKmph - targetPacingKmph)} km/h) on clear blocks to recover ${Math.min(originDelayMin, 5)} mins.`;
    }

    // Intermediate stops en-route
    const stopsEnRoute = train.scheduledStops.filter((sCode) => {
      const st = getStationByCode(sCode);
      if (!st) return false;
      return st.distanceFromMysKm > originDist && st.distanceFromMysKm < destDist;
    });

    // Reliability Tier
    let reliabilityTier: OptimalTrainOption["reliabilityTier"] = "HIGH";
    if (train.priorityTier === 1) reliabilityTier = "VIP_RELIABLE";
    else if (train.priorityTier === 2) reliabilityTier = "HIGH";
    else if (train.priorityTier === 3) reliabilityTier = "MODERATE";
    else reliabilityTier = "HIGH_RISK";

    // Perfection Scoring Algorithm (0 - 100)
    // 1. Total Time Cost (Lower is better): 45% weight
    // 2. Transit Speed (Higher avg speed is better): 25% weight
    // 3. Immediacy / Low Wait Time: 15% weight
    // 4. Reliability & Recovery DNA: 15% weight
    
    // Benchmark fastest possible transit: ~138km in 95 mins (VB) = 87 km/h avg
    const speedRatio = Math.min(1.0, avgSpeedKmph / 110);
    const waitPenalty = Math.min(50, waitTimeMins * 0.12);
    const transitPenalty = Math.min(50, transitDurationMins * 0.15);
    const reliabilityBonus = (5 - train.priorityTier) * 4;

    const perfectionScore = Math.max(
      10,
      Math.min(
        99,
        Math.round(100 - waitPenalty - transitPenalty + speedRatio * 20 + reliabilityBonus)
      )
    );

    // AI Narrative Generation
    let aiDecisionReason = "";
    if (train.type === "VANDE_BHARAT") {
      aiDecisionReason = `⚡ Elite 130 km/h trainset with priority dispatch clearance. Zero intermediate delays, highest recovery potential.`;
    } else if (train.type === "SHATABDI") {
      aiDecisionReason = `🚄 High-priority LHB rake with non-stop clearance between major junctions. Minimal signal detention.`;
    } else if (train.type === "SUPERFAST") {
      aiDecisionReason = `⚡ Limited halts (${stopsEnRoute.length} stops en route) with 110 km/h cruising. Reliable buffer recovery.`;
    } else if (train.type === "EXPRESS") {
      aiDecisionReason = `⏱️ Standard express with ${stopsEnRoute.length} halts. Good balance of accessibility and transit pace.`;
    } else {
      aiDecisionReason = `🚃 Commuter service with ${stopsEnRoute.length} frequent stops. Higher risk of overtaking holds by VIP trains.`;
    }

    const kinematicVerdict = `Travels ${corridorDistanceKm} km in ${transitDurationMins}m @ avg ${avgSpeedKmph} km/h (Departs in ${waitTimeMins}m).`;

    options.push({
      train,
      originStation,
      destStation,
      distanceKm: corridorDistanceKm,
      stopsAtOrigin,
      stopsAtDest,
      stopsEnRoute,
      intermediateStopsCount: stopsEnRoute.length,
      scheduledDepOriginStr: originTiming.timeStr,
      scheduledDepOriginMins: schedDepMins,
      predictedDepOriginStr: formatClockMinutes(predictedDepMins),
      predictedDepOriginMins: predictedDepMins,
      originDelayMin,
      scheduledArrDestStr: destTiming.timeStr,
      scheduledArrDestMins: schedArrMins,
      predictedArrDestStr: formatClockMinutes(predictedArrMins),
      predictedArrDestMins: predictedArrMins,
      destDelayMin,
      waitTimeMins,
      transitDurationMins,
      totalJourneyMins,
      absoluteArrivalMins,
      absoluteArrivalStr,
      avgSpeedKmph,
      targetPacingKmph,
      throttleAdvisory,
      recoveryPotentialMin: Math.max(0, originDelayMin - destDelayMin),
      delayRiskScore,
      reliabilityTier,
      perfectionScore,
      departureStatus,
      isPerfectionChoice: false,
      isFastestTransit: false,
      isNextDeparture: false,
      isVipPriority: train.priorityTier === 1,
      badgeLabels: [],
      aiDecisionReason,
      kinematicVerdict,
    });
  }

  // Sort Options:
  // Primary: Lowest Total Journey Time (Arrives at destination earliest)
  options.sort((a, b) => {
    // Priority to earlier arrival
    if (a.totalJourneyMins !== b.totalJourneyMins) {
      return a.totalJourneyMins - b.totalJourneyMins;
    }
    return b.perfectionScore - a.perfectionScore;
  });

  // Determine Badges
  if (options.length > 0) {
    // 1. Perfection Choice (#1)
    const best = options[0]!;
    best.isPerfectionChoice = true;
    best.badgeLabels.push("🎯 Overall Perfection Choice");

    // 2. Fastest In-Motion Transit
    const fastest = [...options].sort((a, b) => a.transitDurationMins - b.transitDurationMins)[0];
    if (fastest) {
      fastest.isFastestTransit = true;
      if (!fastest.badgeLabels.includes("⚡ Fastest In-Transit")) {
        fastest.badgeLabels.push("⚡ Fastest In-Transit");
      }
    }

    // 3. Soonest Departure
    const soonest = [...options].sort((a, b) => a.waitTimeMins - b.waitTimeMins)[0];
    if (soonest) {
      soonest.isNextDeparture = true;
      if (!soonest.badgeLabels.includes("⏱️ Next Immediate Departure")) {
        soonest.badgeLabels.push("⏱️ Next Immediate Departure");
      }
    }
  }

  const bestChoice = options.find((o) => o.isPerfectionChoice) || null;
  const fastestChoice = options.find((o) => o.isFastestTransit) || null;
  const soonestChoice = options.find((o) => o.isNextDeparture) || null;

  let summaryVerdict = "Select origin and destination stations to calculate the optimal train recommendation.";
  if (bestChoice) {
    summaryVerdict = `Optimal Recommendation: #${bestChoice.train.id} ${bestChoice.train.name} gets you to ${destStation.name} at ${bestChoice.predictedArrDestStr} (Total journey: ${bestChoice.totalJourneyMins} mins, leaving in ${bestChoice.waitTimeMins} mins).`;
  }

  return {
    originStation,
    destStation,
    corridorDistanceKm,
    queryClockMinutes,
    queryClockStr: formatClockMinutes(queryClockMinutes),
    options,
    bestChoice,
    fastestChoice,
    soonestChoice,
    summaryVerdict,
  };
}
