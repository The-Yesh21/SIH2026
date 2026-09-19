import { TrainConfig, RollingStockType } from "./types";
import { SWR_CORRIDOR_STATIONS, DEFAULT_PSR_LIST } from "./infrastructure";
import { calculateAllowedVelocity } from "./kinematics";
import { SIGNAL_ASPECTS } from "./signaling";
import { CORRIDOR_ACTIVE_TRAINS } from "./trains";

export type TrainOperatingState = "NOT_STARTED_YET" | "RUNNING_ON_TRACK" | "TRIP_COMPLETED";

export interface ResolvedLiveTrain {
  config: TrainConfig;
  operatingState: TrainOperatingState;
  stateLabel: string;
  badgeClass: string;
  currentLocationKm: number;
  currentSpeedKmph: number;
  progressPercent: number;
  currentStationCode: string;
  currentStationName: string;
  nextStationCode: string;
  nextStationName: string;
  distanceToNextKm: number;
  delayMinutes: number;
  liveSummary: string;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatClockMinutes(totalMinutes: number): string {
  const normMins = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normMins / 60);
  const m = normMins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * 24-Hour Complete Fleet Catalog for Mysuru - KSR Bengaluru Corridor (Single Source of Truth)
 */
export const ALL_CORRIDOR_FLEET: TrainConfig[] = CORRIDOR_ACTIVE_TRAINS;

/**
 * Dynamically Resolve Exact Live Train Status based on ANY Clock Time
 * @param train Base train configuration
 * @param currentClockMinutes Time of day in minutes (0 - 1440)
 */
export function resolveTrainAtClockTime(
  train: TrainConfig,
  currentClockMinutes: number
): ResolvedLiveTrain {
  const depMins = parseTimeToMinutes(train.scheduledDep);
  const rawArrMins = parseTimeToMinutes(train.scheduledArr);
  const isOvernight = rawArrMins < depMins;
  const arrMins = isOvernight ? rawArrMins + 1440 : rawArrMins;
  const totalTripDuration = arrMins - depMins;

  let operatingState: TrainOperatingState = "NOT_STARTED_YET";
  let elapsedMinutes = 0;

  if (isOvernight) {
    // Overnight run (e.g., 23:55 ➔ 02:05 or 01:00 ➔ 04:30)
    if (currentClockMinutes >= depMins) {
      // Midnight portion of departure (23:55 to 23:59)
      operatingState = "RUNNING_ON_TRACK";
      elapsedMinutes = currentClockMinutes - depMins;
    } else if (currentClockMinutes < rawArrMins) {
      // Early morning portion before arrival (00:00 to 02:05)
      operatingState = "RUNNING_ON_TRACK";
      elapsedMinutes = currentClockMinutes + 1440 - depMins;
    } else if (currentClockMinutes >= rawArrMins && currentClockMinutes < rawArrMins + 240) {
      // Post-arrival stabled at destination (02:05 to 06:05)
      operatingState = "TRIP_COMPLETED";
    } else {
      // Upcoming service for later tonight
      operatingState = "NOT_STARTED_YET";
    }
  } else {
    // Same-day service (e.g., 06:45 ➔ 09:35, 11:30 ➔ 14:00, 16:15 ➔ 18:50)
    if (currentClockMinutes < depMins) {
      operatingState = "NOT_STARTED_YET";
    } else if (currentClockMinutes >= depMins && currentClockMinutes < arrMins) {
      operatingState = "RUNNING_ON_TRACK";
      elapsedMinutes = currentClockMinutes - depMins;
    } else {
      operatingState = "TRIP_COMPLETED";
    }
  }

  // Handle specific state projections
  if (operatingState === "NOT_STARTED_YET") {
    let diffMins = depMins - currentClockMinutes;
    if (diffMins < 0) diffMins += 1440;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const timeUntilStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;

    const nextStopCode = train.scheduledStops[1] || "SBC";
    const nextStnObj = SWR_CORRIDOR_STATIONS.find((s) => s.code === nextStopCode) || SWR_CORRIDOR_STATIONS[1]!;

    return {
      config: {
        ...train,
        currentLocationKm: 0.0,
        currentSpeedKmph: 0.0,
      },
      operatingState,
      stateLabel: "Upcoming Today (At Mysuru)",
      badgeClass: "bg-indigo-950/80 text-indigo-300 border-indigo-500/40",
      currentLocationKm: 0.0,
      currentSpeedKmph: 0.0,
      progressPercent: 0,
      currentStationCode: "MYS",
      currentStationName: "Mysuru Junction",
      nextStationCode: nextStnObj.code,
      nextStationName: nextStnObj.name,
      distanceToNextKm: nextStnObj.distanceFromMysKm,
      delayMinutes: 0,
      liveSummary: `Stationed at Mysuru Junction (MYS) Yard/Platform • Scheduled to depart at ${formatClockMinutes(depMins)} (in ${timeUntilStr})`,
    };
  }

  if (operatingState === "TRIP_COMPLETED") {
    return {
      config: {
        ...train,
        currentLocationKm: 138.25,
        currentSpeedKmph: 0.0,
      },
      operatingState,
      stateLabel: "Trip Completed (At KSR Bengaluru)",
      badgeClass: "bg-slate-900/90 text-slate-400 border-slate-700 font-medium",
      currentLocationKm: 138.25,
      currentSpeedKmph: 0.0,
      progressPercent: 100,
      currentStationCode: "SBC",
      currentStationName: "KSR Bengaluru City",
      nextStationCode: "SBC",
      nextStationName: "Terminus Reached",
      distanceToNextKm: 0.0,
      delayMinutes: train.initialDelayMin,
      liveSummary: `Arrived & Terminated at KSR Bengaluru (SBC) • Trip completed for today (${formatClockMinutes(rawArrMins)})`,
    };
  }

  // Train is actively RUNNING ON TRACK right now!
  const progressFraction = Math.min(0.99, Math.max(0.01, elapsedMinutes / Math.max(1, totalTripDuration)));
  const locationKm = Number((progressFraction * 138.25).toFixed(3));
  const progressPercent = Math.round(progressFraction * 100);

  const stations = SWR_CORRIDOR_STATIONS;
  const nextStnIdx = stations.findIndex((s) => s.distanceFromMysKm > locationKm);
  const nextStn = nextStnIdx >= 0 ? stations[nextStnIdx]! : stations[stations.length - 1]!;
  const prevStn = nextStnIdx > 0 ? stations[nextStnIdx - 1]! : stations[0]!;
  const distToNext = Number((nextStn.distanceFromMysKm - locationKm).toFixed(1));

  // Dynamic speed based on location and sectional limits
  const allowedSpeed = calculateAllowedVelocity({
    rollingStock: train.type,
    currentKm: locationKm,
    routeType: "MAIN_LINE",
    turnoutLimitKmph: 30,
    activePsrs: DEFAULT_PSR_LIST,
    activeTsrs: [],
    signalAspect: SIGNAL_ASPECTS.GREEN,
    weatherVisibilityLimitKmph: 130,
  });

  const speedKmph = allowedSpeed > 100 ? allowedSpeed - 5 : allowedSpeed;

  return {
    config: {
      ...train,
      currentLocationKm: locationKm,
      currentSpeedKmph: speedKmph,
    },
    operatingState,
    stateLabel: "🟢 Live on Track (Running Now)",
    badgeClass: "bg-cyan-950/90 text-cyan-300 border-cyan-400 font-bold shadow-md shadow-cyan-500/20",
    currentLocationKm: locationKm,
    currentSpeedKmph: speedKmph,
    progressPercent,
    currentStationCode: prevStn.code,
    currentStationName: prevStn.name,
    nextStationCode: nextStn.code,
    nextStationName: nextStn.name,
    distanceToNextKm: distToNext,
    delayMinutes: train.initialDelayMin,
    liveSummary: `🟢 Live on Track at KM ${locationKm.toFixed(1)} (near ${prevStn.name}) • Speed: ${speedKmph} km/h • Next Station: ${nextStn.name} in ${distToNext} km`,
  };
}
