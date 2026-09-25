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
  totalIncurredDelayMin: number;
  predictedNextStationDelayMin: number;
  predictedSbcArrivalDelayMin: number;
  scheduledNextStationTime: string;
  predictedNextStationTime: string;
  scheduledSbcTime: string;
  predictedSbcTime: string;
  requiredRecoverySpeedKmph: number;
  isRecoveryFeasible: boolean;
  maxRecoverableMin: number;
  netIrrecoverableDelayMin: number;
  dispatcherActionAdvice: string;
  hazardInZone: PlantedHazard | null;
}

/**
 * Pre-built catalog of realistic SWR Mysore-Bangalore pain factors
 */
export const HAZARD_PALETTE: Omit<PlantedHazard, "id" | "chainageKm" | "locationLabel" | "active">[] = [
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
    type: "WET_RAIL_SLIP",
    name: "Wet-Rail Micro-Slip / Monsoon Hydroplaning",
    category: "WEATHER",
    delayMinutes: 6,
    speedCapKmph: 60,
    zoneLengthKm: 6.0,
    description: "Localized heavy rain reduces wheel-rail adhesion coefficient (µ=0.08), triggering traction sanding and longer braking distance.",
    icon: "🌧️",
    color: "#3B82F6",
  },
  {
    type: "SIGNAL_DANGER_HOLD",
    name: "Terminal Outer Signal Danger Hold",
    category: "SIGNALING",
    delayMinutes: 15,
    speedCapKmph: 15,
    zoneLengthKm: 2.5,
    description: "Route interlocking conflict holding home signal at Red pending cross-overs clearance into SBC platforms.",
    icon: "🛑",
    color: "#EF4444",
  },
  {
    type: "LC_GATE_JAM",
    name: "Level Crossing Gate Boom Failure / Traffic Jam",
    category: "INFRASTRUCTURE",
    delayMinutes: 12,
    speedCapKmph: 20,
    zoneLengthKm: 2.0,
    description: "Highway vehicle jammed across LC tracks. Gate locked open, requiring pilot stop-and-proceed protocol.",
    icon: "🚧",
    color: "#EC4899",
  },
  {
    type: "PRECEDING_SLOW_TRAIN",
    name: "Slow Freight / MEMU Headway Compression",
    category: "CONGESTION",
    delayMinutes: 10,
    speedCapKmph: 50,
    zoneLengthKm: 8.0,
    description: "Trailing behind a 54-wagon BOXN coal rake under Double Yellow & Yellow signal cascade.",
    icon: "🚶",
    color: "#8B5CF6",
  },
  {
    type: "PSR_TRACK_DEFECT",
    name: "15 km/h Emergency Caution Order / Track Defect",
    category: "INFRASTRUCTURE",
    delayMinutes: 9,
    speedCapKmph: 15,
    zoneLengthKm: 1.5,
    description: "Track renewal gang detected weld gap; mandatory 15 km/h crawl order issued.",
    icon: "⚠️",
    color: "#D97706",
  },
  {
    type: "LOCO_INVERTER_DERATE",
    name: "WAP-7 Traction Inverter 1 Tripped",
    category: "TRACTION",
    delayMinutes: 7,
    speedCapKmph: 75,
    zoneLengthKm: 15.0,
    description: "Bogey 1 traction motor inverter isolated. Operating on 50% power (3000 HP instead of 6000 HP).",
    icon: "🚨",
    color: "#DC2626",
  },
  {
    type: "PLATFORM_DWELL_SURGE",
    name: "Platform Passenger Dwell Surge (+5m)",
    category: "CONGESTION",
    delayMinutes: 5,
    speedCapKmph: 0,
    zoneLengthKm: 0.5,
    description: "Festival crowd overflow delays rake dispatch and coach door lock clearance.",
    icon: "🚪",
    color: "#059669",
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

  // Check if train is inside an active hazard zone
  let hazardInZone: PlantedHazard | null = null;
  let speedCap = train.sectionalMpsKmph || 110;

  const activeHazards = plantedHazards.filter((h) => h.active);

  for (const h of activeHazards) {
    const zoneStart = h.chainageKm;
    const zoneEnd = h.chainageKm + h.zoneLengthKm;
    if (boundedKm >= zoneStart && boundedKm <= zoneEnd) {
      hazardInZone = h;
      speedCap = Math.min(speedCap, h.speedCapKmph);
    }
  }

  // Calculate current running speed
  let runningSpeed = speedCap;
  // If approaching a scheduled stop within 1.5 km, smoothly decelerate
  if (train.scheduledStops.includes(nextStation.code) && distanceToNextStationKm < 1.5 && distanceToNextStationKm > 0) {
    runningSpeed = Math.min(runningSpeed, Math.max(20, (distanceToNextStationKm / 1.5) * speedCap));
  } else if (distanceRemainingKm < 1.0) {
    runningSpeed = 0; // Terminated at SBC
  }

  // Calculate total cumulative delay added by hazards encountered or ahead
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

  // Next station scheduled and predicted times
  const nextStationScheduledMins =
    baseScheduledDepMins + (nextStation.distanceFromMysKm / totalLengthKm) * nominalCorridorDurationMins;
  const nextStationPredictedMins = nextStationScheduledMins + nextStationHazardDelayMinutes;

  // Final SBC arrival dynamic prediction
  const finalSbcScheduledMins = baseScheduledArrMins;
  const finalSbcPredictedMins = finalSbcScheduledMins + totalHazardDelayMinutes;

  // Kinematic Recovery Calculation
  // Nominal time needed at normal speed vs compressed time needed to make up delay
  const normalRemainingTimeHours = distanceRemainingKm > 0 ? distanceRemainingKm / (train.sectionalMpsKmph || 110) : 0;
  const normalRemainingTimeMins = normalRemainingTimeHours * 60;

  // Target time if we want to arrive on time
  const targetRemainingTimeMins = Math.max(1, normalRemainingTimeMins - totalHazardDelayMinutes);
  const targetRemainingTimeHours = targetRemainingTimeMins / 60;

  const requiredRecoverySpeedKmph =
    distanceRemainingKm > 0 && targetRemainingTimeHours > 0
      ? Math.round(distanceRemainingKm / targetRemainingTimeHours)
      : Math.round(train.sectionalMpsKmph || 110);

  // Maximum allowed locomotive speed for recovery (110 km/h for SF/Express, 130 km/h for VB)
  const maxLocoSpeed = train.priorityTier === 1 ? 130 : 110;
  const maxSpeedAdvantage = maxLocoSpeed - 85; // Average running velocity is ~85 km/h
  const maxRecoverableMins = Math.max(
    0,
    Math.round((distanceRemainingKm / 85 - distanceRemainingKm / maxLocoSpeed) * 60)
  );

  const isRecoveryFeasible = totalHazardDelayMinutes <= maxRecoverableMins && distanceRemainingKm > 15;
  const netIrrecoverableDelayMin = Math.max(0, totalHazardDelayMinutes - maxRecoverableMins);

  let dispatcherAdvice = "Normal corridor pacing. Nominal timetable headway maintained.";
  if (hazardInZone) {
    dispatcherAdvice = `🚨 ACTIVE HAZARD: Restricted to ${hazardInZone.speedCapKmph} km/h due to ${hazardInZone.name}. Delay accumulating: +${hazardInZone.delayMinutes}m.`;
  } else if (totalHazardDelayMinutes > 0 && isRecoveryFeasible) {
    dispatcherAdvice = `⚡ RECOVERY ADVISORY: Increase throttle to ${Math.min(maxLocoSpeed, requiredRecoverySpeedKmph)} km/h across next ${Math.round(distanceRemainingKm)} km to recover ${maxRecoverableMins} min delay before SBC.`;
  } else if (totalHazardDelayMinutes > 0 && !isRecoveryFeasible) {
    dispatcherAdvice = `⚠️ DELAY CRITICAL: Accumulated +${totalHazardDelayMinutes}m delay exceeds sectional slack (${maxRecoverableMins}m max recovery). Expected arrival at SBC: +${netIrrecoverableDelayMin}m late.`;
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
    totalIncurredDelayMin: totalHazardDelayMinutes,
    predictedNextStationDelayMin: nextStationHazardDelayMinutes,
    predictedSbcArrivalDelayMin: totalHazardDelayMinutes,
    scheduledNextStationTime: formatClockDisplay(nextStationScheduledMins),
    predictedNextStationTime: formatClockDisplay(nextStationPredictedMins),
    scheduledSbcTime: formatClockDisplay(finalSbcScheduledMins),
    predictedSbcTime: formatClockDisplay(finalSbcPredictedMins),
    requiredRecoverySpeedKmph,
    isRecoveryFeasible,
    maxRecoverableMin: maxRecoverableMins,
    netIrrecoverableDelayMin,
    dispatcherActionAdvice: dispatcherAdvice,
    hazardInZone,
  };
}
