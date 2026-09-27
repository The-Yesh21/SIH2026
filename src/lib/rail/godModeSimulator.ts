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
  totalIncurredDelayMin: number;
  predictedNextStationDelayMin: number;
  predictedSbcArrivalDelayMin: number;
  scheduledNextStationTime: string;
  predictedNextStationTime: string;
  scheduledSbcTime: string;
  predictedSbcTime: string;
  requiredRecoverySpeedKmph: number;
  requiredNextStationRecoverySpeedKmph: number;
  isRecoveryFeasible: boolean;
  maxRecoverableMin: number;
  optimalDelayMin: number;
  netIrrecoverableDelayMin: number;
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
 * Compute real-time simulator state based on train location, progress, and planted hazards
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

  // Check if train is inside an active hazard zone, and track encountered hazards
  let hazardInZone: PlantedHazard | null = null;
  let speedCap = train.sectionalMpsKmph || 110;

  const activeHazards = plantedHazards.filter((h) => h.active);
  const encounteredHazardsList: PlantedHazard[] = [];

  for (const h of activeHazards) {
    const zoneStart = h.chainageKm;
    const zoneEnd = h.chainageKm + h.zoneLengthKm;
    
    // Check if currently inside zone
    if (boundedKm >= zoneStart && boundedKm <= zoneEnd) {
      hazardInZone = h;
      speedCap = Math.min(speedCap, h.speedCapKmph);
    }
    
    // Check if train has reached or passed this hazard
    if (boundedKm >= zoneStart) {
      encounteredHazardsList.push(h);
    }
  }

  // Calculate current running speed
  let runningSpeed = speedCap;
  // If approaching a scheduled stop within 1.5 km, smoothly decelerate
  if (train.scheduledStops.includes(nextStation.code) && distanceToNextStationKm < 1.5 && distanceToNextStationKm > 0) {
    runningSpeed = Math.min(runningSpeed, Math.max(20, (distanceToNextStationKm / 1.5) * speedCap));
  } else if (distanceRemainingKm < 0.5) {
    runningSpeed = 0; // Terminated at SBC
  }

  // Calculate cumulative delay from hazards encountered so far + hazards ahead
  let totalHazardDelayMinutes = 0;
  let nextStationHazardDelayMinutes = 0;

  for (const h of activeHazards) {
    totalHazardDelayMinutes += h.delayMinutes;
    // If hazard is before or at the next station
    if (h.chainageKm <= nextStation.distanceFromMysKm) {
      nextStationHazardDelayMinutes += h.delayMinutes;
    }
  }

  const baseScheduledDepMins = parseTimeToMinutes(train.scheduledDep);
  const baseScheduledArrMins = parseTimeToMinutes(train.scheduledArr);
  const nominalCorridorDurationMins = baseScheduledArrMins - baseScheduledDepMins;

  // Calculate elapsed travelling time from origin to current KM
  // Nominal time to current KM = (boundedKm / totalLengthKm) * nominalDuration + delay incurred so far
  const nominalElapsedMins = (boundedKm / totalLengthKm) * nominalCorridorDurationMins;
  let delayIncurredSoFar = 0;
  for (const h of encounteredHazardsList) {
    delayIncurredSoFar += h.delayMinutes;
  }
  const travelledTimeMinutes = Math.max(0, nominalElapsedMins + delayIncurredSoFar);
  const travelledTimeFormatted = formatDurationMinutes(travelledTimeMinutes);

  // Next station scheduled and predicted times
  const nextStationScheduledMins =
    baseScheduledDepMins + (nextStation.distanceFromMysKm / totalLengthKm) * nominalCorridorDurationMins;
  const nextStationPredictedMins = nextStationScheduledMins + nextStationHazardDelayMinutes;

  // Final SBC arrival dynamic prediction
  const finalSbcScheduledMins = baseScheduledArrMins;
  const finalSbcPredictedMins = finalSbcScheduledMins + totalHazardDelayMinutes;

  // Kinematic Recovery Calculation for Destination (SBC)
  const maxLocoSpeed = train.priorityTier === 1 ? 130 : 110;
  const normalRemainingTimeHours = distanceRemainingKm > 0 ? distanceRemainingKm / (train.sectionalMpsKmph || 110) : 0;
  const normalRemainingTimeMins = normalRemainingTimeHours * 60;

  // Target remaining time to arrive strictly on scheduled booked time at SBC
  const targetRemainingTimeMins = Math.max(1, normalRemainingTimeMins - totalHazardDelayMinutes);
  const targetRemainingTimeHours = targetRemainingTimeMins / 60;

  const requiredRecoverySpeedKmph =
    distanceRemainingKm > 0 && targetRemainingTimeHours > 0
      ? Math.min(220, Math.round(distanceRemainingKm / targetRemainingTimeHours))
      : Math.round(train.sectionalMpsKmph || 110);

  // Speed required to recover delay before NEXT STATION
  const nominalToNextStationHours = distanceToNextStationKm > 0 ? distanceToNextStationKm / (train.sectionalMpsKmph || 110) : 0;
  const nominalToNextStationMins = nominalToNextStationHours * 60;
  const targetToNextStationMins = Math.max(0.5, nominalToNextStationMins - nextStationHazardDelayMinutes);
  const targetToNextStationHours = targetToNextStationMins / 60;
  const requiredNextStationRecoverySpeedKmph =
    distanceToNextStationKm > 0 && targetToNextStationHours > 0
      ? Math.min(220, Math.round(distanceToNextStationKm / targetToNextStationHours))
      : Math.round(train.sectionalMpsKmph || 110);

  // Maximum recovery via slack by running at max permissible speed (MPS)
  const maxRecoverableMins = Math.max(
    0,
    Math.round((distanceRemainingKm / 85 - distanceRemainingKm / maxLocoSpeed) * 60)
  );

  const isRecoveryFeasible = totalHazardDelayMinutes <= maxRecoverableMins && distanceRemainingKm > 10;
  const optimalDelayMin = Math.max(0, totalHazardDelayMinutes - maxRecoverableMins);
  const netIrrecoverableDelayMin = Math.max(0, totalHazardDelayMinutes - maxRecoverableMins);

  let dispatcherAdvice = "Normal corridor pacing. Timetable headway within standard green aspect tolerances.";
  if (hazardInZone) {
    dispatcherAdvice = `🚨 ACTIVE RESTRICTION: Running inside ${hazardInZone.name}. Speed capped at ${hazardInZone.speedCapKmph} km/h (+${hazardInZone.delayMinutes}m delay added). Dynamic ETA recalculated.`;
  } else if (totalHazardDelayMinutes > 0 && isRecoveryFeasible) {
    dispatcherAdvice = `⚡ RECOVERY ADVISORY: Target throttle ${Math.min(maxLocoSpeed, requiredRecoverySpeedKmph)} km/h across next ${Math.round(distanceRemainingKm)} km to recover ${maxRecoverableMins}m delay before SBC.`;
  } else if (totalHazardDelayMinutes > 0 && !isRecoveryFeasible) {
    dispatcherAdvice = `⚠️ DELAY CRITICAL: Accumulated +${totalHazardDelayMinutes}m delay exceeds corridor slack (${maxRecoverableMins}m max recovery at ${maxLocoSpeed} km/h). Optimal achievable delay is +${optimalDelayMin}m at SBC.`;
  }

  return {
    currentKm: Number(boundedKm.toFixed(2)),
    currentSpeedKmph: Math.round(runningSpeed),
    maxCorridorMpsKmph: train.sectionalMpsKmph || 110,
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
    totalIncurredDelayMin: totalHazardDelayMinutes,
    predictedNextStationDelayMin: nextStationHazardDelayMinutes,
    predictedSbcArrivalDelayMin: totalHazardDelayMinutes,
    scheduledNextStationTime: formatClockDisplay(nextStationScheduledMins),
    predictedNextStationTime: formatClockDisplay(nextStationPredictedMins),
    scheduledSbcTime: formatClockDisplay(finalSbcScheduledMins),
    predictedSbcTime: formatClockDisplay(finalSbcPredictedMins),
    requiredRecoverySpeedKmph,
    requiredNextStationRecoverySpeedKmph,
    isRecoveryFeasible,
    maxRecoverableMin: maxRecoverableMins,
    optimalDelayMin,
    netIrrecoverableDelayMin,
    dispatcherActionAdvice: dispatcherAdvice,
    hazardInZone,
    hasEncounteredPainFactors: encounteredHazardsList.length > 0 || hazardInZone !== null,
    encounteredHazardsList,
  };
}
