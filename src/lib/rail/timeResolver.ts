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

export const ALL_CORRIDOR_FLEET: TrainConfig[] = CORRIDOR_ACTIVE_TRAINS;

/**
 * High-Precision Authentic SWR Working Time Table (WTT) / "Where Is My Train"
 * Official Station Timing Checkpoints for Mysuru ➔ Bengaluru Services
 */
interface StationTimingCheckpoint {
  code: string;
  km: number;
  timeStr: string;
}

const OFFICIAL_WTT_CHECKPOINTS: Record<string, StationTimingCheckpoint[]> = {
  // 16022 Kaveri Express (Dep 21:00, Arr 23:45)
  "16022": [
    { code: "MYS", km: 0.0, timeStr: "21:00" },
    { code: "PANP", km: 19.5, timeStr: "21:19" },
    { code: "MYA", km: 45.4, timeStr: "21:44" },
    { code: "MAD", km: 63.8, timeStr: "22:04" },
    { code: "CPT", km: 82.2, timeStr: "22:19" },
    { code: "RMGM", km: 93.3, timeStr: "22:31" }, // Exactly Ramanagaram at 22:31!
    { code: "BID", km: 108.0, timeStr: "22:46" },
    { code: "KGI", km: 126.0, timeStr: "23:09" },
    { code: "NYH", km: 130.8, timeStr: "23:20" },
    { code: "SBC", km: 138.25, timeStr: "23:45" },
  ],
  // 16586 MRDW - SMVB Express (Dep 03:45, Arr 06:25)
  "16586": [
    { code: "MYS", km: 0.0, timeStr: "03:45" },
    { code: "PANP", km: 19.5, timeStr: "04:05" },
    { code: "MYA", km: 45.4, timeStr: "04:30" },
    { code: "MAD", km: 63.8, timeStr: "04:50" },
    { code: "RMGM", km: 93.3, timeStr: "05:15" },
    { code: "BID", km: 108.0, timeStr: "05:32" },
    { code: "KGI", km: 126.0, timeStr: "05:52" },
    { code: "SBC", km: 138.25, timeStr: "06:25" },
  ],
  // 16215 Chamundi Express (Dep 06:45, Arr 09:35)
  "16215": [
    { code: "MYS", km: 0.0, timeStr: "06:45" },
    { code: "PANP", km: 19.5, timeStr: "07:05" },
    { code: "MYA", km: 45.4, timeStr: "07:30" },
    { code: "MAD", km: 63.8, timeStr: "07:50" },
    { code: "CPT", km: 82.2, timeStr: "08:08" },
    { code: "RMGM", km: 93.3, timeStr: "08:21" },
    { code: "BID", km: 108.0, timeStr: "08:38" },
    { code: "KGI", km: 126.0, timeStr: "08:58" },
    { code: "NYH", km: 130.8, timeStr: "09:08" },
    { code: "SBC", km: 138.25, timeStr: "09:35" },
  ],
  // 12613 Wodeyar Superfast (Dep 11:30, Arr 14:00)
  "12613": [
    { code: "MYS", km: 0.0, timeStr: "11:30" },
    { code: "MYA", km: 45.4, timeStr: "12:10" },
    { code: "RMGM", km: 93.3, timeStr: "12:54" },
    { code: "KGI", km: 126.0, timeStr: "13:28" },
    { code: "SBC", km: 138.25, timeStr: "14:00" },
  ],
  // 20608 Vande Bharat (Dep 13:05, Arr 14:45)
  "20608": [
    { code: "MYS", km: 0.0, timeStr: "13:05" },
    { code: "MYA", km: 45.4, timeStr: "13:35" },
    { code: "RMGM", km: 93.3, timeStr: "14:02" },
    { code: "BID", km: 108.0, timeStr: "14:12" },
    { code: "KGI", km: 126.0, timeStr: "14:24" },
    { code: "SBC", km: 138.25, timeStr: "14:45" },
  ],
  // 66552 MEMU Commuter (Dep 13:45, Arr 17:20)
  "66552": [
    { code: "MYS", km: 0.0, timeStr: "13:45" },
    { code: "PANP", km: 19.5, timeStr: "14:08" },
    { code: "MYA", km: 45.4, timeStr: "14:38" },
    { code: "MAD", km: 63.8, timeStr: "15:00" },
    { code: "CPT", km: 82.2, timeStr: "15:22" },
    { code: "RMGM", km: 93.3, timeStr: "15:38" },
    { code: "BID", km: 108.0, timeStr: "16:00" },
    { code: "KGI", km: 126.0, timeStr: "16:28" },
    { code: "NYH", km: 130.8, timeStr: "16:40" },
    { code: "SBC", km: 138.25, timeStr: "17:20" },
  ],
  // 12008 Shatabdi Express (Dep 14:15, Arr 16:05)
  "12008": [
    { code: "MYS", km: 0.0, timeStr: "14:15" },
    { code: "MYA", km: 45.4, timeStr: "14:48" },
    { code: "RMGM", km: 93.3, timeStr: "15:18" },
    { code: "KGI", km: 126.0, timeStr: "15:42" },
    { code: "SBC", km: 138.25, timeStr: "16:05" },
  ],
  // 16232 Mayiladuturai Express (Dep 16:15, Arr 18:50)
  "16232": [
    { code: "MYS", km: 0.0, timeStr: "16:15" },
    { code: "MYA", km: 45.4, timeStr: "16:58" },
    { code: "MAD", km: 63.8, timeStr: "17:18" },
    { code: "KGI", km: 126.0, timeStr: "18:10" },
    { code: "SBC", km: 138.25, timeStr: "18:50" },
  ],
  // 16236 Tuticorin Express (Dep 18:20, Arr 20:50)
  "16236": [
    { code: "MYS", km: 0.0, timeStr: "18:20" },
    { code: "PANP", km: 19.5, timeStr: "18:38" },
    { code: "MYA", km: 45.4, timeStr: "19:02" },
    { code: "MAD", km: 63.8, timeStr: "19:22" },
    { code: "CPT", km: 82.2, timeStr: "19:38" },
    { code: "RMGM", km: 93.3, timeStr: "19:50" },
    { code: "BID", km: 108.0, timeStr: "20:06" },
    { code: "KGI", km: 126.0, timeStr: "20:25" },
    { code: "SBC", km: 138.25, timeStr: "20:50" },
  ],
  // BOXN Freight (Dep 01:00, Arr 04:30)
  "BOXN-58219": [
    { code: "MYS", km: 0.0, timeStr: "01:00" },
    { code: "PANP", km: 19.5, timeStr: "01:30" },
    { code: "MYA", km: 45.4, timeStr: "02:15" },
    { code: "MAD", km: 63.8, timeStr: "02:50" },
    { code: "RMGM", km: 93.3, timeStr: "03:30" },
    { code: "BID", km: 108.0, timeStr: "03:55" },
    { code: "KGI", km: 126.0, timeStr: "04:15" },
    { code: "SBC", km: 138.25, timeStr: "04:30" },
  ],
};

/**
 * Accurately compute train's exact chainage location based on station timetable interpolation
 */
function interpolateTrainLocationKm(
  train: TrainConfig,
  currentClockMinutes: number,
  depMins: number,
  arrMins: number
): number {
  const checkpoints = OFFICIAL_WTT_CHECKPOINTS[train.id];
  if (!checkpoints || checkpoints.length < 2) {
    const totalDuration = arrMins - depMins;
    const elapsed = currentClockMinutes >= depMins ? currentClockMinutes - depMins : currentClockMinutes + 1440 - depMins;
    const fraction = Math.min(1.0, Math.max(0.0, elapsed / Math.max(1, totalDuration)));
    return Number((fraction * 138.25).toFixed(3));
  }

  // Normalize checkpoint minutes relative to journey start
  const normCurrent = currentClockMinutes >= depMins ? currentClockMinutes : currentClockMinutes + 1440;

  for (let i = 0; i < checkpoints.length - 1; i++) {
    const cpA = checkpoints[i]!;
    const cpB = checkpoints[i + 1]!;

    let tAMins = parseTimeToMinutes(cpA.timeStr);
    let tBMins = parseTimeToMinutes(cpB.timeStr);

    if (tAMins < depMins) tAMins += 1440;
    if (tBMins < depMins) tBMins += 1440;

    if (normCurrent >= tAMins && normCurrent <= tBMins) {
      const segSpan = tBMins - tAMins;
      const segElapsed = normCurrent - tAMins;
      const segFrac = segSpan > 0 ? segElapsed / segSpan : 0;
      const locKm = cpA.km + segFrac * (cpB.km - cpA.km);
      return Number(locKm.toFixed(3));
    }
  }

  if (normCurrent >= parseTimeToMinutes(checkpoints[checkpoints.length - 1]!.timeStr)) {
    return 138.25;
  }
  return 0.0;
}

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
    // Overnight service
    if (currentClockMinutes >= depMins) {
      operatingState = "RUNNING_ON_TRACK";
      elapsedMinutes = currentClockMinutes - depMins;
    } else if (currentClockMinutes < rawArrMins) {
      operatingState = "RUNNING_ON_TRACK";
      elapsedMinutes = currentClockMinutes + 1440 - depMins;
    } else if (currentClockMinutes >= rawArrMins && currentClockMinutes < rawArrMins + 180) {
      operatingState = "TRIP_COMPLETED";
    } else {
      operatingState = "NOT_STARTED_YET";
    }
  } else {
    // Same-day service
    if (currentClockMinutes < depMins) {
      operatingState = "NOT_STARTED_YET";
    } else if (currentClockMinutes >= depMins && currentClockMinutes < arrMins) {
      operatingState = "RUNNING_ON_TRACK";
      elapsedMinutes = currentClockMinutes - depMins;
    } else {
      operatingState = "TRIP_COMPLETED";
    }
  }

  // 1. Train has not started its journey yet today
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

  // 2. Train has finished its scheduled trip today
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

  // 3. Train is actively RUNNING ON TRACK right now!
  // High-precision station timetable interpolation matching Where Is My Train app
  const locationKm = interpolateTrainLocationKm(train, currentClockMinutes, depMins, arrMins);
  const progressPercent = Math.min(100, Math.round((locationKm / 138.25) * 100));

  const stations = SWR_CORRIDOR_STATIONS;
  const nextStnIdx = stations.findIndex((s) => s.distanceFromMysKm > locationKm + 0.05);
  const nextStn = nextStnIdx >= 0 ? stations[nextStnIdx]! : stations[stations.length - 1]!;
  const prevStn = nextStnIdx > 0 ? stations[nextStnIdx - 1]! : stations[0]!;
  const distToNext = Number((Math.max(0, nextStn.distanceFromMysKm - locationKm)).toFixed(1));

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

  // Authentic Indian Railways block/section summary formatting
  const sectionTag = `${prevStn.code}–${nextStn.code} Section`;
  const locationDesc = distToNext <= 1.5 
    ? `At / Approaching ${nextStn.name} (${nextStn.code})`
    : `In ${sectionTag} (KM ${locationKm.toFixed(1)}) • Next: ${nextStn.name} in ${distToNext} km`;

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
    liveSummary: `🟢 Live on Track: ${locationDesc} • Speed: ${speedKmph} km/h`,
  };
}
