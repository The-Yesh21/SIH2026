import { TrainConfig } from "./types";
import { SWR_CORRIDOR_STATIONS } from "./infrastructure";
import { formatClockDisplay, parseTimeToMinutes } from "./dynamicEta";

export interface PlantedHazard {
  id: string;
  type:
    | "OHE_VOLTAGE_SAG"
    | "WET_RAIL_SLIP"
    | "SIGNAL_DANGER_HOLD"
    | "LC_GATE_JAM"
    | "PRECEDING_SLOW_TRAIN"
    | "PSR_TRACK_DEFECT"
    | "PLATFORM_DWELL_SURGE"
    | "LOCO_INVERTER_DERATE";
  name: string;
  category: "SIGNALING" | "INFRASTRUCTURE" | "TRACTION" | "WEATHER" | "CONGESTION";
  chainageKm: number;
  locationLabel: string;
  delayMinutes: number;
  speedCapKmph: number;
  zoneLengthKm: number;
  description: string;
  active: boolean;
  icon: string;
  color: string;
}

export interface TrainRecoveryDNA {
  trainId: string;
  trainName: string;
  trainType: string;
  historicalRecoveryRate: number; // 0.0 to 1.0 (e.g. 0.85 = recovers 85% of potential slack)
  tractiveRating: "ULTRA_HIGH_EMU" | "HIGH_WAP7_LHB" | "MODERATE_WAP7_ICF" | "COMMUTER_HEAVY_HALT" | "HEAVY_FREIGHT";
  tractiveLabel: string;
  accelerationMps2: number;
  nominalCruiseKmph: number;
  tractiveDescription: string;
  dispatchPriorityTier: number;
}

export interface SimulationStateResult {
  currentKm: number;
  currentSpeedKmph: number;
  maxCorridorMpsKmph: number;
  currentStationCode: string;
  currentStationName: string;
  nextStationCode: string;
  nextStationName: string;
  distanceToNextStationKm: number;
  distanceRemainingKm: number;
  traversalProgressPct: number;
  activeHazardsCount: number;
  travelledTimeMinutes: number;
  travelledTimeFormatted: string;
  
  // Static Naive vs Intelligent Dynamic Predictions
  staticNaiveDelayMin: number;
  staticNaiveSbcTime: string;
  predictedSbcArrivalDelayMin: number;
  predictedSbcTime: string;
  scheduledSbcTime: string;
  
  // Next Stop Predictions
  predictedNextStationDelayMin: number;
  scheduledNextStationTime: string;
  predictedNextStationTime: string;
  
  // Physical & Kinematic Metrics
  estimatedPhysicalTransitTimeMin: number;
  remainingClearDistanceKm: number;
  remainingRestrictedDistanceKm: number;
  slackMinutesRecovered: number;
  recommendedPaceKmph: number;
  requiredRecoverySpeedKmph: number;
  requiredNextStationRecoverySpeedKmph: number;
  isRecoveryFeasible: boolean;
  maxRecoverableMin: number;
  optimalDelayMin: number;
  
  // Train Historical Profile & Intelligence
  trainDNA: TrainRecoveryDNA;
  dispatcherActionAdvice: string;
  hazardInZone: PlantedHazard | null;
  hasEncounteredPainFactors: boolean;
  encounteredHazardsList: PlantedHazard[];
}

/**
 * Pre-built catalog of realistic SWR Mysore-Bangalore pain factors
 */
export const HAZARD_PALETTE: Omit<PlantedHazard, "id" | "chainageKm" | "locationLabel" | "active">[] = [
  {
    type: "SIGNAL_DANGER_HOLD",
    name: "Signal Danger (Red / Yellow Aspect)",
    category: "SIGNALING",
    delayMinutes: 12,
    speedCapKmph: 15,
    zoneLengthKm: 2.5,
    description: "Route interlocking conflict holding home signal at Red pending cross-overs clearance.",
    icon: "🛑",
    color: "#EF4444",
  },
  {
    type: "LC_GATE_JAM",
    name: "LC Gate Open / Road Traffic Jam",
    category: "INFRASTRUCTURE",
    delayMinutes: 10,
    speedCapKmph: 20,
    zoneLengthKm: 2.0,
    description: "Highway vehicle jammed across LC tracks. Gate locked open, requiring pilot stop-and-proceed.",
    icon: "🚧",
    color: "#EC4899",
  },
  {
    type: "WET_RAIL_SLIP",
    name: "Wet-Rail Micro-Slip / Monsoon Hydroplaning",
    category: "WEATHER",
    delayMinutes: 6,
    speedCapKmph: 60,
    zoneLengthKm: 6.0,
    description: "Localized heavy rain reduces wheel-rail adhesion coefficient (µ=0.08), lengthening braking curve.",
    icon: "🌧️",
    color: "#3B82F6",
  },
  {
    type: "OHE_VOLTAGE_SAG",
    name: "OHE 25kV Voltage Sag / Tripping",
    category: "TRACTION",
    delayMinutes: 8,
    speedCapKmph: 45,
    zoneLengthKm: 4.5,
    description: "Substation feeder overload drops catenary voltage from 25kV to 17kV, halving acceleration torque.",
    icon: "⚡",
    color: "#F59E0B",
  },
  {
    type: "PRECEDING_SLOW_TRAIN",
    name: "Slow Freight / Preceding Train Headway",
    category: "CONGESTION",
    delayMinutes: 14,
    speedCapKmph: 50,
    zoneLengthKm: 8.0,
    description: "Trailing behind a 54-wagon BOXN coal rake under Double Yellow & Yellow signal cascade.",
    icon: "🚶",
    color: "#8B5CF6",
  },
  {
    type: "PSR_TRACK_DEFECT",
    name: "15 km/h Emergency Caution Order / TSR",
    category: "INFRASTRUCTURE",
    delayMinutes: 9,
    speedCapKmph: 15,
    zoneLengthKm: 1.5,
    description: "Track renewal gang detected weld gap; mandatory 15 km/h crawl order issued.",
    icon: "⚠️",
    color: "#D97706",
  },
  {
    type: "PLATFORM_DWELL_SURGE",
    name: "Platform Passenger Dwell Surge",
    category: "CONGESTION",
    delayMinutes: 5,
    speedCapKmph: 0,
    zoneLengthKm: 0.5,
    description: "Festival commuter surge delays passenger boarding and guard clearance token exchange.",
    icon: "🚪",
    color: "#059669",
  },
  {
    type: "LOCO_INVERTER_DERATE",
    name: "Loco Traction Inverter Derate (50% Power)",
    category: "TRACTION",
    delayMinutes: 7,
    speedCapKmph: 75,
    zoneLengthKm: 15.0,
    description: "Bogey 1 traction motor inverter isolated. Operating on 50% power (3000 HP instead of 6000 HP).",
    icon: "🚨",
    color: "#DC2626",
  },
];

/**
 * Resolves the historical recovery DNA and tractive aggressiveness profile for a train
 */
export function getTrainHistoricalRecoveryDNA(train: TrainConfig): TrainRecoveryDNA {
  const typeUpper = (train.type || "").toUpperCase();
  const idStr = String(train.id || "");

  if (typeUpper.includes("VANDE") || idStr.includes("20608")) {
    return {
      trainId: train.id,
      trainName: train.name,
      trainType: "VANDE_BHARAT",
      historicalRecoveryRate: 0.88, // 88% historical recovery exploitation
      tractiveRating: "ULTRA_HIGH_EMU",
      tractiveLabel: "Ultra-High Pick-up (EMU Distributed 130 km/h)",
      accelerationMps2: 0.85,
      nominalCruiseKmph: 115,
      tractiveDescription: "Trainset with distributed traction & regenerative braking. Rapidly accelerates out of speed caps and recovers ~88% of sectional slack.",
      dispatchPriorityTier: 1,
    };
  }

  if (typeUpper.includes("SHATABDI") || idStr.includes("12008")) {
    return {
      trainId: train.id,
      trainName: train.name,
      trainType: "SHATABDI",
      historicalRecoveryRate: 0.78,
      tractiveRating: "HIGH_WAP7_LHB",
      tractiveLabel: "High Pick-up (WAP-7 + 14 LHB Coaches)",
      accelerationMps2: 0.70,
      nominalCruiseKmph: 105,
      tractiveDescription: "High power-to-weight ratio with non-stop corridor run. Recovers ~78% of slack when running on clear sections.",
      dispatchPriorityTier: 1,
    };
  }

  if (typeUpper.includes("SUPERFAST") || idStr.includes("12613")) {
    return {
      trainId: train.id,
      trainName: train.name,
      trainType: "SUPERFAST",
      historicalRecoveryRate: 0.65,
      tractiveRating: "HIGH_WAP7_LHB",
      tractiveLabel: "Aggressive Superfast Pacing (WAP-7 + 22 LHB)",
      accelerationMps2: 0.60,
      nominalCruiseKmph: 98,
      tractiveDescription: "High line priority with limited halts (Mandya, Ramanagaram, Kengeri). Drivers aggressively notch up to 110 km/h to reclaim 65% of delay.",
      dispatchPriorityTier: 2,
    };
  }

  if (typeUpper.includes("EXPRESS") || idStr.includes("16022") || idStr.includes("16215") || idStr.includes("16586")) {
    return {
      trainId: train.id,
      trainName: train.name,
      trainType: "EXPRESS",
      historicalRecoveryRate: 0.45,
      tractiveRating: "MODERATE_WAP7_ICF",
      tractiveLabel: "Moderate Recovery (8-10 Halts + Commuters)",
      accelerationMps2: 0.45,
      nominalCruiseKmph: 88,
      tractiveDescription: "Frequent commuter stops introduce dwell variance. Moderate recovery capacity (45%) due to intermediate station acceleration cycles.",
      dispatchPriorityTier: 2,
    };
  }

  if (typeUpper.includes("MEMU") || idStr.includes("66552")) {
    return {
      trainId: train.id,
      trainName: train.name,
      trainType: "MEMU",
      historicalRecoveryRate: 0.22,
      tractiveRating: "COMMUTER_HEAVY_HALT",
      tractiveLabel: "Low Recovery (17 All-Stop Commuter Pattern)",
      accelerationMps2: 0.55,
      nominalCruiseKmph: 75,
      tractiveDescription: "High motor acceleration but 17 scheduled halts limit top-speed cruising. Recovers only ~22% of delay due to platform congestion.",
      dispatchPriorityTier: 3,
    };
  }

  // Freight Default
  return {
    trainId: train.id,
    trainName: train.name,
    trainType: "FREIGHT",
    historicalRecoveryRate: 0.08,
    tractiveRating: "HEAVY_FREIGHT",
    tractiveLabel: "Minimal Recovery (Heavy 45-Wagon Trailing Rake)",
    accelerationMps2: 0.18,
    nominalCruiseKmph: 60,
    tractiveDescription: "Heavy 4,000+ tonne trailing load with low tractive acceleration. Frequently stabled on loop lines for passenger precedence.",
    dispatchPriorityTier: 4,
  };
}

/**
 * Find closest station by KM
 */
export function getClosestStationName(km: number): string {
  let closest = SWR_CORRIDOR_STATIONS[0];
  let minDiff = Math.abs(closest.distanceFromMysKm - km);

  for (const st of SWR_CORRIDOR_STATIONS) {
    const diff = Math.abs(st.distanceFromMysKm - km);
    if (diff < minDiff) {
      minDiff = diff;
      closest = st;
    }
  }
  return `${closest.name} (${closest.code}) · KM ${closest.distanceFromMysKm.toFixed(1)}`;
}

/**
 * Format minutes into readable elapsed string (e.g. "42m" or "1h 15m")
 */
export function formatDurationMinutes(mins: number): string {
  const rounded = Math.max(0, Math.round(mins));
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
}

/**
 * Compute real-time simulator state based on train location, progress, active hazards,
 * remaining distance physics, and train historical pick-up/recovery capability.
 */
export function calculateSimulatorKinematics(params: {
  train: TrainConfig;
  currentKm: number;
  activeClockMinutes: number;
  plantedHazards: PlantedHazard[];
}): SimulationStateResult {
  const { train, currentKm, activeClockMinutes, plantedHazards } = params;
  const totalLengthKm = 138.25;

  const boundedKm = Math.max(0, Math.min(totalLengthKm, currentKm));
  const progressPct = (boundedKm / totalLengthKm) * 100;
  const distanceRemainingKm = Math.max(0, totalLengthKm - boundedKm);

  // Train Historical Recovery Profile
  const trainDNA = getTrainHistoricalRecoveryDNA(train);

  // Determine current & next stations
  let currentStation = SWR_CORRIDOR_STATIONS[0];
  let nextStation = SWR_CORRIDOR_STATIONS[1];

  for (let i = 0; i < SWR_CORRIDOR_STATIONS.length; i++) {
    if (SWR_CORRIDOR_STATIONS[i].distanceFromMysKm <= boundedKm) {
      currentStation = SWR_CORRIDOR_STATIONS[i];
      nextStation = SWR_CORRIDOR_STATIONS[Math.min(SWR_CORRIDOR_STATIONS.length - 1, i + 1)];
    }
  }

  const distanceToNextStationKm = Math.max(0, nextStation.distanceFromMysKm - boundedKm);

  // Check if train is inside an active hazard zone, and separate hazards ahead vs passed
  let hazardInZone: PlantedHazard | null = null;
  let currentInstantSpeedCap = train.sectionalMpsKmph || 110;

  const activeHazards = plantedHazards.filter((h) => h.active);
  const encounteredHazardsList: PlantedHazard[] = [];
  const upcomingHazardsList: PlantedHazard[] = [];

  let restrictedRemainingKm = 0;
  let upcomingHazardDelayMinutes = 0;
  let nextStationUpcomingHazardDelayMin = 0;

  for (const h of activeHazards) {
    const zoneStart = h.chainageKm;
    const zoneEnd = h.chainageKm + h.zoneLengthKm;
    
    // Check if currently inside zone
    if (boundedKm >= zoneStart && boundedKm <= zoneEnd) {
      hazardInZone = h;
      currentInstantSpeedCap = Math.min(currentInstantSpeedCap, h.speedCapKmph);
    }
    
    // Check if train has reached or passed this hazard
    if (boundedKm >= zoneStart) {
      encounteredHazardsList.push(h);
    } else {
      // Hazard is ahead on the remaining track
      upcomingHazardsList.push(h);
      restrictedRemainingKm += Math.min(h.zoneLengthKm, Math.max(0, totalLengthKm - zoneStart));
      upcomingHazardDelayMinutes += h.delayMinutes;
      if (zoneStart <= nextStation.distanceFromMysKm) {
        nextStationUpcomingHazardDelayMin += h.delayMinutes;
      }
    }
  }

  // Calculate current instantaneous running speed
  let runningSpeed = currentInstantSpeedCap;
  if (train.scheduledStops.includes(nextStation.code) && distanceToNextStationKm < 1.5 && distanceToNextStationKm > 0) {
    runningSpeed = Math.min(runningSpeed, Math.max(20, (distanceToNextStationKm / 1.5) * currentInstantSpeedCap));
  } else if (distanceRemainingKm < 0.5) {
    runningSpeed = 0; // Terminated at SBC
  }

  // Base Scheduled Timetable
  const baseScheduledDepMins = parseTimeToMinutes(train.scheduledDep);
  const baseScheduledArrMins = parseTimeToMinutes(train.scheduledArr);
  const isOvernightJourney = baseScheduledArrMins < baseScheduledDepMins;
  const nominalCorridorDurationMins = isOvernightJourney
    ? baseScheduledArrMins + 1440 - baseScheduledDepMins
    : baseScheduledArrMins - baseScheduledDepMins;

  // 1. Calculate Elapsed Travelling Time so far
  let delayIncurredSoFar = 0;
  for (const h of encounteredHazardsList) {
    delayIncurredSoFar += h.delayMinutes;
  }
  const nominalElapsedMins = (boundedKm / totalLengthKm) * nominalCorridorDurationMins;
  const travelledTimeMinutes = Math.max(0, nominalElapsedMins + delayIncurredSoFar);
  const travelledTimeFormatted = formatDurationMinutes(travelledTimeMinutes);

  // 2. Static Naive Calculation (Traditional sum: Base Schedule + all hazard delays)
  const totalAllHazardDelayMinutes = activeHazards.reduce((acc, h) => acc + h.delayMinutes, 0);
  const staticNaiveDelayMin = train.initialDelayMin + totalAllHazardDelayMinutes;
  const staticNaiveSbcTime = formatClockDisplay(baseScheduledArrMins + staticNaiveDelayMin);

  // 3. True Physical & Kinematic Remaining Transit Time Model
  const remainingClearDistanceKm = Math.max(0, distanceRemainingKm - restrictedRemainingKm);
  const nominalCruiseSpeed = trainDNA.nominalCruiseKmph;
  const maxLocoSpeed = train.priorityTier === 1 ? (trainDNA.trainType === "VANDE_BHARAT" ? 130 : 120) : (train.sectionalMpsKmph || 110);

  // Time to traverse remaining clear track at nominal cruise (minutes)
  const timeClearTrackMins = remainingClearDistanceKm > 0 ? (remainingClearDistanceKm / nominalCruiseSpeed) * 60 : 0;

  // Time to traverse remaining hazard zones with speed caps (minutes)
  let timeRestrictedZonesMins = 0;
  for (const h of upcomingHazardsList) {
    const cappedSpeed = Math.max(15, Math.min(nominalCruiseSpeed, h.speedCapKmph));
    timeRestrictedZonesMins += (h.zoneLengthKm / cappedSpeed) * 60 + h.delayMinutes;
  }

  // Acceleration and deceleration transition curve penalties (1.5 min per upcoming hazard)
  const transitionLossMinutes = upcomingHazardsList.length * 1.5;

  // Upcoming scheduled halt dwell minutes
  let remainingDwellsMin = 0;
  for (const st of SWR_CORRIDOR_STATIONS) {
    if (st.distanceFromMysKm > boundedKm && train.scheduledStops.includes(st.code)) {
      remainingDwellsMin += train.dwellMinutes?.[st.code] ?? 2;
    }
  }

  // Estimated physical transit time remaining to SBC (minutes)
  const estimatedPhysicalTransitTimeMin = timeClearTrackMins + timeRestrictedZonesMins + transitionLossMinutes + remainingDwellsMin;

  // Expected Physical Arrival vs Scheduled Booking
  const simulatedClockMinutes = baseScheduledDepMins + travelledTimeMinutes;
  const rawExpectedPhysicalArrivalMins = simulatedClockMinutes + estimatedPhysicalTransitTimeMin;
  const grossDelayMin = Math.max(0, rawExpectedPhysicalArrivalMins - baseScheduledArrMins);

  // 4. Intelligence Engine: Historical Train Slack Recovery & Pace Exploitation
  // How much time can the locomotive physically recover on the remaining clear distance by notching to maxLocoSpeed?
  const maxKinematicSlackRecoveryMinutes = remainingClearDistanceKm > 0
    ? Math.max(0, (remainingClearDistanceKm / nominalCruiseSpeed - remainingClearDistanceKm / maxLocoSpeed) * 60)
    : 0;

  // Apply the train's unique Historical Recovery DNA (e.g., 88% for VB, 65% for Superfast, 22% for MEMU)
  const slackMinutesRecovered = Math.min(
    grossDelayMin,
    Math.round(maxKinematicSlackRecoveryMinutes * trainDNA.historicalRecoveryRate)
  );

  // Final Intelligent Dynamic Predicted Arrival Delay & Clock ETA
  const predictedSbcArrivalDelayMin = Math.max(0, grossDelayMin - slackMinutesRecovered);
  const predictedSbcMins = baseScheduledArrMins + predictedSbcArrivalDelayMin;
  const predictedSbcTime = formatClockDisplay(predictedSbcMins);
  const scheduledSbcTime = formatClockDisplay(baseScheduledArrMins);

  // 5. Immediate Next Station Dynamic ETA Forecast
  const nextStationFraction = nextStation.distanceFromMysKm / totalLengthKm;
  const nextStationScheduledMins = baseScheduledDepMins + nextStationFraction * nominalCorridorDurationMins;
  
  // Next stop physical transit calculation
  const nextStopClearKm = Math.max(0, distanceToNextStationKm - (hazardInZone ? hazardInZone.zoneLengthKm : 0));
  const nextStopTransitMin = (nextStopClearKm / nominalCruiseSpeed) * 60 + nextStationUpcomingHazardDelayMin + (hazardInZone ? 3 : 0);
  const nextStationPhysicalArrivalMins = simulatedClockMinutes + nextStopTransitMin;
  const predictedNextStationDelayMin = Math.max(0, Math.round(nextStationPhysicalArrivalMins - nextStationScheduledMins));
  const predictedNextStationTime = formatClockDisplay(nextStationScheduledMins + predictedNextStationDelayMin);
  const scheduledNextStationTime = formatClockDisplay(nextStationScheduledMins);

  // 6. Recommended Pace & Target Velocity Engine (What pace is needed to recover?)
  const targetRemainingTimeMins = Math.max(1, (baseScheduledArrMins - simulatedClockMinutes) - (timeRestrictedZonesMins + transitionLossMinutes + remainingDwellsMin));
  const targetRemainingTimeHours = targetRemainingTimeMins / 60;

  const recommendedPaceKmph = remainingClearDistanceKm > 0 && targetRemainingTimeHours > 0
    ? Math.min(220, Math.round(remainingClearDistanceKm / targetRemainingTimeHours))
    : nominalCruiseSpeed;

  const requiredRecoverySpeedKmph = distanceRemainingKm > 0 && targetRemainingTimeHours > 0
    ? Math.min(220, Math.round(distanceRemainingKm / targetRemainingTimeHours))
    : maxLocoSpeed;

  // Next stop recovery velocity
  const nextStopTargetTimeHours = Math.max(0.05, (nextStationScheduledMins - simulatedClockMinutes) / 60);
  const requiredNextStationRecoverySpeedKmph = distanceToNextStationKm > 0
    ? Math.min(220, Math.round(distanceToNextStationKm / nextStopTargetTimeHours))
    : nominalCruiseSpeed;

  const isRecoveryFeasible = predictedSbcArrivalDelayMin === 0 && distanceRemainingKm > 10;
  const optimalDelayMin = Math.max(0, grossDelayMin - Math.round(maxKinematicSlackRecoveryMinutes));

  // Actionable Dispatcher Recommendation
  let dispatcherAdvice = "Normal corridor pacing. Timetable headway within standard green aspect tolerances.";
  if (hazardInZone) {
    dispatcherAdvice = `🚨 ACTIVE HAZARD: Speed capped at ${hazardInZone.speedCapKmph} km/h inside ${hazardInZone.name}. Physical delay accumulating: +${hazardInZone.delayMinutes}m. Train recovery engine recalculating target pace.`;
  } else if (grossDelayMin > 0 && isRecoveryFeasible) {
    dispatcherAdvice = `⚡ RECOVERY ADVISORY (${trainDNA.tractiveLabel}): Increase throttle to ${Math.min(maxLocoSpeed, recommendedPaceKmph)} km/h across next ${Math.round(remainingClearDistanceKm)} km. Historical DNA confirms train will recover ${slackMinutesRecovered} min slack before SBC.`;
  } else if (grossDelayMin > 0 && !isRecoveryFeasible) {
    dispatcherAdvice = `⚠️ DELAY CRITICAL: Gross delay (+${grossDelayMin}m) exceeds physical corridor slack (${maxKinematicSlackRecoveryMinutes.toFixed(0)}m max at ${maxLocoSpeed} km/h). Based on ${trainDNA.tractiveLabel}, optimal achievable arrival is +${predictedSbcArrivalDelayMin}m late (Static was +${staticNaiveDelayMin}m).`;
  }

  return {
    currentKm: Number(boundedKm.toFixed(2)),
    currentSpeedKmph: Math.round(runningSpeed),
    maxCorridorMpsKmph: maxLocoSpeed,
    currentStationCode: currentStation.code,
    currentStationName: currentStation.name,
    nextStationCode: nextStation.code,
    nextStationName: nextStation.name,
    distanceToNextStationKm: Number(distanceToNextStationKm.toFixed(2)),
    distanceRemainingKm: Number(distanceRemainingKm.toFixed(2)),
    traversalProgressPct: Number(progressPct.toFixed(1)),
    activeHazardsCount: activeHazards.length,
    travelledTimeMinutes: Number(travelledTimeMinutes.toFixed(1)),
    travelledTimeFormatted,
    
    // Predictions
    staticNaiveDelayMin,
    staticNaiveSbcTime,
    predictedSbcArrivalDelayMin,
    predictedSbcTime,
    scheduledSbcTime,
    
    predictedNextStationDelayMin,
    scheduledNextStationTime,
    predictedNextStationTime,
    
    // Kinematics
    estimatedPhysicalTransitTimeMin: Math.round(estimatedPhysicalTransitTimeMin),
    remainingClearDistanceKm: Number(remainingClearDistanceKm.toFixed(1)),
    remainingRestrictedDistanceKm: Number(restrictedRemainingKm.toFixed(1)),
    slackMinutesRecovered,
    recommendedPaceKmph,
    requiredRecoverySpeedKmph,
    requiredNextStationRecoverySpeedKmph,
    isRecoveryFeasible,
    maxRecoverableMin: Math.round(maxKinematicSlackRecoveryMinutes),
    optimalDelayMin,
    
    trainDNA,
    dispatcherActionAdvice: dispatcherAdvice,
    hazardInZone,
    hasEncounteredPainFactors: encounteredHazardsList.length > 0 || hazardInZone !== null,
    encounteredHazardsList,
  };
}
