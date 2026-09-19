import { TrainConfig, RollingStockType } from "./types";
import { SWR_CORRIDOR_STATIONS, DEFAULT_PSR_LIST } from "./infrastructure";
import { calculateAllowedVelocity } from "./kinematics";
import { SIGNAL_ASPECTS } from "./signaling";

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
 * 24-Hour Complete Fleet Catalog for Mysuru - KSR Bengaluru Corridor
 */
export const ALL_CORRIDOR_FLEET: TrainConfig[] = [
  {
    id: "16232",
    name: "Mailaduthurai Express (Night Run)",
    type: "EXPRESS",
    priorityTier: 2,
    scheduledDep: "23:55",
    scheduledArr: "02:30",
    origin: "MYS (Mysuru Jn)",
    destination: "SBC (KSR Bengaluru)",
    locoType: "WAP-7 #30412 (LHB Rake)",
    coaches: 22,
    sectionalMpsKmph: 110,
    nominalDecelerationMps2: 0.60,
    currentLocationKm: 0.0,
    currentSpeedKmph: 0.0,
    initialDelayMin: 2,
    scheduledStops: ["MYS", "PANP", "MYA", "MAD", "CPT", "RMGM", "BID", "KGI", "SBC"],
    dwellMinutes: { MYS: 0, PANP: 1, MYA: 2, MAD: 2, CPT: 1, RMGM: 2, BID: 1, KGI: 2, SBC: 0 },
  },
  {
    id: "BOXN-58219",
    name: "Automobile Cargo Goods Rake (Night Freight)",
    type: "FREIGHT_BOXN",
    priorityTier: 4,
    scheduledDep: "00:30",
    scheduledArr: "03:30",
    origin: "MYS Goods Yard",
    destination: "Whitefield Goods Terminal",
    locoType: "Twin WAG-9HC #31890",
    coaches: 45,
    sectionalMpsKmph: 75,
    nominalDecelerationMps2: 0.30,
    currentLocationKm: 0.0,
    currentSpeedKmph: 0.0,
    initialDelayMin: 15,
    scheduledStops: ["MYS", "SBC"],
    dwellMinutes: { MYS: 0, SBC: 0 },
  },
  {
    id: "16586",
    name: "MRDW-SMVB Express (Early Morning)",
    type: "EXPRESS",
    priorityTier: 2,
    scheduledDep: "03:45",
    scheduledArr: "06:35",
    origin: "MYS (Mysuru Jn)",
    destination: "SBC (KSR Bengaluru)",
    locoType: "WDP-4D #40182",
    coaches: 18,
    sectionalMpsKmph: 110,
    nominalDecelerationMps2: 0.60,
    currentLocationKm: 0.0,
    currentSpeedKmph: 0.0,
    initialDelayMin: 0,
    scheduledStops: ["MYS", "PANP", "MYA", "MAD", "CPT", "RMGM", "BID", "KGI", "SBC"],
    dwellMinutes: { MYS: 0, PANP: 1, MYA: 2, MAD: 2, CPT: 1, RMGM: 2, BID: 1, KGI: 2, SBC: 0 },
  },
  {
    id: "16215",
    name: "Chamundi Express (Morning Commuter)",
    type: "EXPRESS",
    priorityTier: 2,
    scheduledDep: "06:45",
    scheduledArr: "09:35",
    origin: "MYS (Mysuru Jn)",
    destination: "SBC (KSR Bengaluru)",
    locoType: "WAP-7 #30482 (RTIS-NavIC)",
    coaches: 21,
    sectionalMpsKmph: 110,
    nominalDecelerationMps2: 0.60,
    currentLocationKm: 0.0,
    currentSpeedKmph: 0.0,
    initialDelayMin: 5,
    scheduledStops: ["MYS", "PANP", "MYA", "MAD", "CPT", "RMGM", "BID", "KGI", "NYH", "SBC"],
    dwellMinutes: { MYS: 0, PANP: 1, MYA: 2, MAD: 2, CPT: 1, RMGM: 2, BID: 1, KGI: 2, NYH: 1, SBC: 0 },
  },
  {
    id: "12613",
    name: "Wodeyar Superfast Express (Midday)",
    type: "SUPERFAST",
    priorityTier: 2,
    scheduledDep: "11:30",
    scheduledArr: "14:00",
    origin: "MYS (Mysuru Jn)",
    destination: "SBC (KSR Bengaluru)",
    locoType: "WAP-7 #30510 (LHB Rake)",
    coaches: 22,
    sectionalMpsKmph: 110,
    nominalDecelerationMps2: 0.65,
    currentLocationKm: 0.0,
    currentSpeedKmph: 0.0,
    initialDelayMin: 2,
    scheduledStops: ["MYS", "MYA", "RMGM", "KGI", "SBC"],
    dwellMinutes: { MYS: 0, MYA: 1, RMGM: 1, KGI: 1, SBC: 0 },
  },
  {
    id: "20608",
    name: "Vande Bharat Express (MYS-MAS)",
    type: "VANDE_BHARAT",
    priorityTier: 1,
    scheduledDep: "13:05",
    scheduledArr: "14:45",
    origin: "MYS (Mysuru Jn)",
    destination: "SBC (KSR Bengaluru)",
    locoType: "Trainset #20608 (Distributed Traction)",
    coaches: 8,
    sectionalMpsKmph: 130,
    nominalDecelerationMps2: 0.90,
    currentLocationKm: 0.0,
    currentSpeedKmph: 0.0,
    initialDelayMin: 0,
    scheduledStops: ["MYS", "SBC"],
    dwellMinutes: { MYS: 0, SBC: 0 },
  },
  {
    id: "66552",
    name: "Mysuru - SBC MEMU Commuter (Afternoon)",
    type: "MEMU",
    priorityTier: 3,
    scheduledDep: "13:45",
    scheduledArr: "17:20",
    origin: "MYS (Mysuru Jn)",
    destination: "SBC (KSR Bengaluru)",
    locoType: "3-Phase MEMU #1104",
    coaches: 12,
    sectionalMpsKmph: 95,
    nominalDecelerationMps2: 0.70,
    currentLocationKm: 0.0,
    currentSpeedKmph: 0.0,
    initialDelayMin: 0,
    scheduledStops: ["MYS", "NHY", "S", "PANP", "BDRL", "CGKR", "MYA", "HNK", "MAD", "SET", "CPT", "RMGM", "BID", "HJL", "KGI", "NYH", "SBC"],
    dwellMinutes: { MYS: 0, NHY: 1, S: 1, PANP: 1, BDRL: 1, CGKR: 1, MYA: 2, HNK: 1, MAD: 2, SET: 1, CPT: 1, RMGM: 2, BID: 1, HJL: 1, KGI: 2, NYH: 1, SBC: 0 },
  },
  {
    id: "12008",
    name: "Shatabdi Express (MYS-MAS)",
    type: "SHATABDI",
    priorityTier: 1,
    scheduledDep: "14:15",
    scheduledArr: "16:05",
    origin: "MYS (Mysuru Jn)",
    destination: "SBC (KSR Bengaluru)",
    locoType: "WAP-7 #37012 (LHB Rake)",
    coaches: 14,
    sectionalMpsKmph: 120,
    nominalDecelerationMps2: 0.75,
    currentLocationKm: 0.0,
    currentSpeedKmph: 0.0,
    initialDelayMin: 0,
    scheduledStops: ["MYS", "SBC"],
    dwellMinutes: { MYS: 0, SBC: 0 },
  },
  {
    id: "16591",
    name: "Hampi Express (Evening/Night)",
    type: "EXPRESS",
    priorityTier: 2,
    scheduledDep: "18:50",
    scheduledArr: "21:50",
    origin: "MYS (Mysuru Jn)",
    destination: "SBC (KSR Bengaluru)",
    locoType: "WAP-7 #30490 (LHB Rake)",
    coaches: 22,
    sectionalMpsKmph: 110,
    nominalDecelerationMps2: 0.60,
    currentLocationKm: 0.0,
    currentSpeedKmph: 0.0,
    initialDelayMin: 3,
    scheduledStops: ["MYS", "PANP", "MYA", "MAD", "CPT", "RMGM", "BID", "KGI", "SBC"],
    dwellMinutes: { MYS: 0, PANP: 1, MYA: 2, MAD: 2, CPT: 1, RMGM: 2, BID: 1, KGI: 2, SBC: 0 },
  },
];

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
  let arrMins = parseTimeToMinutes(train.scheduledArr);
  
  // Handle overnight crossings (e.g. 23:55 to 02:30 or 00:30 to 03:30)
  if (arrMins < depMins) {
    arrMins += 1440;
  }

  let clock = currentClockMinutes;
  // If overnight train and clock is early morning (00:00 - 05:00), adjust relative clock
  if (arrMins > 1440 && clock < 300) {
    clock += 1440;
  }

  let operatingState: TrainOperatingState = "NOT_STARTED_YET";
  let locationKm = 0.0;
  let speedKmph = 0.0;
  let progressPercent = 0;
  let delayMinutes = train.initialDelayMin;

  const totalTripDuration = arrMins - depMins;

  if (clock < depMins) {
    // Train has not started its journey yet today
    operatingState = "NOT_STARTED_YET";
    locationKm = 0.0;
    speedKmph = 0.0;
    progressPercent = 0;
    const diffMins = depMins - clock;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const timeUntilStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;
    
    return {
      config: {
        ...train,
        currentLocationKm: 0.0,
        currentSpeedKmph: 0.0,
      },
      operatingState,
      stateLabel: "Upcoming Service (At Mysuru)",
      badgeClass: "bg-indigo-950/80 text-indigo-300 border-indigo-500/40",
      currentLocationKm: 0.0,
      currentSpeedKmph: 0.0,
      progressPercent: 0,
      currentStationCode: "MYS",
      currentStationName: "Mysuru Junction",
      nextStationCode: train.scheduledStops[1] || "SBC",
      nextStationName: "Next Scheduled Halt",
      distanceToNextKm: 138.25,
      delayMinutes: 0,
      liveSummary: `Stationed at Mysuru Junction (MYS) Platform 1 • Scheduled to depart at ${formatClockMinutes(depMins)} (in ${timeUntilStr})`,
    };
  } else if (clock >= arrMins) {
    // Train has completed its journey and stopped at destination
    operatingState = "TRIP_COMPLETED";
    locationKm = 138.25;
    speedKmph = 0.0;
    progressPercent = 100;

    return {
      config: {
        ...train,
        currentLocationKm: 138.25,
        currentSpeedKmph: 0.0,
      },
      operatingState,
      stateLabel: "Trip Completed (At KSR Bengaluru)",
      badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
      currentLocationKm: 138.25,
      currentSpeedKmph: 0.0,
      progressPercent: 100,
      currentStationCode: "SBC",
      currentStationName: "KSR Bengaluru City",
      nextStationCode: "SBC",
      nextStationName: "Terminus Reached",
      distanceToNextKm: 0.0,
      delayMinutes: train.initialDelayMin,
      liveSummary: `Arrived & Stopped at KSR Bengaluru (SBC) Platform 5 • Trip completed for today (${formatClockMinutes(arrMins)})`,
    };
  } else {
    // Train is actively RUNNING ON TRACK right now!
    operatingState = "RUNNING_ON_TRACK";
    const elapsedMins = clock - depMins;
    const progressFraction = Math.min(0.99, Math.max(0.01, elapsedMins / totalTripDuration));
    locationKm = Number((progressFraction * 138.25).toFixed(3));
    progressPercent = Math.round(progressFraction * 100);

    const stations = SWR_CORRIDOR_STATIONS;
    const nextStnIdx = stations.findIndex((s) => s.distanceFromMysKm > locationKm);
    const nextStn = nextStnIdx >= 0 ? stations[nextStnIdx]! : stations[stations.length - 1]!;
    const prevStn = nextStnIdx > 0 ? stations[nextStnIdx - 1]! : stations[0]!;
    const distToNext = Number((nextStn.distanceFromMysKm - locationKm).toFixed(1));

    // Dynamic speed based on location
    let allowedSpeed = calculateAllowedVelocity({
      rollingStock: train.type,
      currentKm: locationKm,
      routeType: "MAIN_LINE",
      turnoutLimitKmph: 30,
      activePsrs: DEFAULT_PSR_LIST,
      activeTsrs: [],
      signalAspect: SIGNAL_ASPECTS.GREEN,
      weatherVisibilityLimitKmph: 130,
    });

    speedKmph = allowedSpeed > 100 ? allowedSpeed - 5 : allowedSpeed;

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
      delayMinutes: delayMinutes,
      liveSummary: `🟢 Live on Track at KM ${locationKm.toFixed(1)} (near ${prevStn.name}) • Speed: ${speedKmph} km/h • Next Station: ${nextStn.name} in ${distToNext} km`,
    };
  }
}
