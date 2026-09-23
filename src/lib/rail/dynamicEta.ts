import {
  TrainConfig,
  DynamicPredictionResult,
  ShapAttributionFactor,
  StationForecastRow,
  SpeedRestrictionRecord,
  LevelCrossingGate,
} from "./types";
import { SWR_CORRIDOR_STATIONS, DEFAULT_PSR_LIST, DEFAULT_LC_GATES } from "./infrastructure";
import { calculateAllowedVelocity, KINEMATIC_PROFILES } from "./kinematics";
import { SIGNAL_ASPECTS, determineSignalAspectByHeadway } from "./signaling";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT, getWeatherSpeedLimit, calculateLcGateDelay } from "./restrictions";
import { PRIORITY_TIERS } from "./dispatching";

/**
 * 12-Hour AM/PM and 24-hour clock formatting helper
 */
export function formatClockDisplay(totalMinutes: number): string {
  const normMins = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normMins / 60);
  const m = normMins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Official SWR Working Time Table (WTT) Checkpoints
 */
const OFFICIAL_WTT_CHECKPOINTS: Record<string, { code: string; km: number; timeStr: string }[]> = {
  "16022": [
    { code: "MYS", km: 0.0, timeStr: "21:00" },
    { code: "PANP", km: 19.5, timeStr: "21:19" },
    { code: "MYA", km: 45.4, timeStr: "21:44" },
    { code: "MAD", km: 63.8, timeStr: "22:04" },
    { code: "CPT", km: 82.2, timeStr: "22:19" },
    { code: "RMGM", km: 93.3, timeStr: "22:31" },
    { code: "BID", km: 108.0, timeStr: "22:46" },
    { code: "KGI", km: 126.0, timeStr: "23:09" },
    { code: "NYH", km: 130.8, timeStr: "23:20" },
    { code: "SBC", km: 138.25, timeStr: "23:45" },
  ],
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
  "12613": [
    { code: "MYS", km: 0.0, timeStr: "11:30" },
    { code: "MYA", km: 45.4, timeStr: "12:10" },
    { code: "RMGM", km: 93.3, timeStr: "12:54" },
    { code: "KGI", km: 126.0, timeStr: "13:28" },
    { code: "SBC", km: 138.25, timeStr: "14:00" },
  ],
  "20608": [
    { code: "MYS", km: 0.0, timeStr: "13:05" },
    { code: "MYA", km: 45.4, timeStr: "13:35" },
    { code: "RMGM", km: 93.3, timeStr: "14:02" },
    { code: "BID", km: 108.0, timeStr: "14:12" },
    { code: "KGI", km: 126.0, timeStr: "14:24" },
    { code: "SBC", km: 138.25, timeStr: "14:45" },
  ],
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
  "12008": [
    { code: "MYS", km: 0.0, timeStr: "14:15" },
    { code: "MYA", km: 45.4, timeStr: "14:48" },
    { code: "RMGM", km: 93.3, timeStr: "15:18" },
    { code: "KGI", km: 126.0, timeStr: "15:42" },
    { code: "SBC", km: 138.25, timeStr: "16:05" },
  ],
  "16232": [
    { code: "MYS", km: 0.0, timeStr: "16:15" },
    { code: "MYA", km: 45.4, timeStr: "16:58" },
    { code: "MAD", km: 63.8, timeStr: "17:18" },
    { code: "KGI", km: 126.0, timeStr: "18:10" },
    { code: "SBC", km: 138.25, timeStr: "18:50" },
  ],
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

function getBookedStationMinutes(
  train: TrainConfig,
  stationCode: string,
  stationKm: number,
  depMins: number,
  scheduledDurationMins: number
): number {
  const checkpoints = OFFICIAL_WTT_CHECKPOINTS[train.id];
  if (checkpoints) {
    const cp = checkpoints.find((c) => c.code === stationCode);
    if (cp) {
      let t = parseTimeToMinutes(cp.timeStr);
      if (t < depMins) t += 1440;
      return t;
    }

    for (let i = 0; i < checkpoints.length - 1; i++) {
      const cA = checkpoints[i]!;
      const cB = checkpoints[i + 1]!;
      if (stationKm >= cA.km && stationKm <= cB.km) {
        let tA = parseTimeToMinutes(cA.timeStr);
        let tB = parseTimeToMinutes(cB.timeStr);
        if (tA < depMins) tA += 1440;
        if (tB < depMins) tB += 1440;
        const frac = (stationKm - cA.km) / Math.max(0.1, cB.km - cA.km);
        return tA + frac * (tB - tA);
      }
    }
  }

  const fraction = stationKm / 138.25;
  return depMins + fraction * scheduledDurationMins;
}

/**
 * Dual-Core Railway Traffic & Dynamic ETA Engine
 */
export function computeDynamicEta(params: {
  train: TrainConfig;
  userInjectedDelayMin?: number;
  environment?: EnvironmentalConditions;
  activeTsrs?: SpeedRestrictionRecord[];
  activeLcGates?: LevelCrossingGate[];
  trailingTrainAheadSeparationMeters?: number;
}): DynamicPredictionResult {
  const env = params.environment || DEFAULT_ENVIRONMENT;
  const tsrs = params.activeTsrs || [];
  const lcGates = params.activeLcGates || DEFAULT_LC_GATES;
  const injectedDelay = params.userInjectedDelayMin || 0;
  const totalLiveDelay = params.train.initialDelayMin + injectedDelay;

  const depMins = parseTimeToMinutes(params.train.scheduledDep);
  const rawArrMins = parseTimeToMinutes(params.train.scheduledArr);
  const arrMins = rawArrMins >= depMins ? rawArrMins : rawArrMins + 1440;
  const scheduledDurationMins = arrMins - depMins;

  // 1. Traditional Static ETA (Naive linear addition)
  const traditionalEtaMins = arrMins + totalLiveDelay;
  const traditionalStaticEta = formatClockDisplay(traditionalEtaMins);

  // 2. Kinematic Velocity & Corridor Station Simulator
  let runningDynamicDelay = totalLiveDelay;
  let slackRecoveredMin = 0;
  let speedRestrictionPenaltyMin = 0;
  let signalHaltsPenaltyMin = 0;
  let bottlenecksIncurredMin = 0;

  const weatherSpeedLimit = getWeatherSpeedLimit(env.weather);
  const stationForecasts: StationForecastRow[] = [];
  const shapFactors: ShapAttributionFactor[] = [];

  const trainLocKm = params.train.currentLocationKm;

  // Simulate section-by-section downstream propagation
  SWR_CORRIDOR_STATIONS.forEach((station, idx) => {
    const isPast = station.distanceFromMysKm < trainLocKm - 1.2;
    const isAtStation = Math.abs(trainLocKm - station.distanceFromMysKm) <= 1.2;
    const isFuture = station.distanceFromMysKm > trainLocKm + 1.2;

    const bookedStationMins = getBookedStationMinutes(
      params.train,
      station.code,
      station.distanceFromMysKm,
      depMins,
      scheduledDurationMins
    );

    const isScheduledHalt = params.train.scheduledStops.includes(station.code);
    const haltDwell = params.train.dwellMinutes?.[station.code] ?? (isScheduledHalt && station.code !== "MYS" && station.code !== "SBC" ? 1 : 0);

    let sectionAllowedSpeed = calculateAllowedVelocity({
      rollingStock: params.train.type,
      currentKm: station.distanceFromMysKm,
      routeType: "MAIN_LINE",
      turnoutLimitKmph: station.loopSpeedKmph,
      activePsrs: DEFAULT_PSR_LIST,
      activeTsrs: tsrs,
      signalAspect: SIGNAL_ASPECTS.GREEN,
      weatherVisibilityLimitKmph: weatherSpeedLimit,
    });

    let currentAspect = SIGNAL_ASPECTS.GREEN.aspect;

    if (isFuture) {
      // (a) Weather Impact
      if (weatherSpeedLimit < 110) {
        const weatherLoss = (110 - weatherSpeedLimit) * 0.03;
        runningDynamicDelay += weatherLoss;
        bottlenecksIncurredMin += weatherLoss;
      }

      // (b) Active TSR / Maintenance Blocks
      if (env.maintenanceBlockActive && env.maintenanceChainageKm) {
        if (
          station.distanceFromMysKm >= env.maintenanceChainageKm.from &&
          station.distanceFromMysKm <= env.maintenanceChainageKm.to
        ) {
          sectionAllowedSpeed = Math.min(sectionAllowedSpeed, env.maintenanceTsrKmph);
          const tsrLoss = 2.5;
          runningDynamicDelay += tsrLoss;
          speedRestrictionPenaltyMin += tsrLoss;
        }
      }

      // (c) Level Crossing Gates
      const activeGate = lcGates.find((g) => Math.abs(g.chainageKm - station.distanceFromMysKm) < 5.0);
      if (activeGate && activeGate.status !== "LOCKED_CLOSED") {
        const lcLoss = calculateLcGateDelay(activeGate);
        runningDynamicDelay += lcLoss;
        bottlenecksIncurredMin += lcLoss;
        currentAspect = "RED";
      }

      // (d) Peak Hour Commuter Surge Dwell
      if (station.commuterSurgeProne && isScheduledHalt) {
        const surgeExtraDwell = (env.commuterSurgeMultiplier - 1.0) * (haltDwell + 1.2);
        if (surgeExtraDwell > 0) {
          runningDynamicDelay += surgeExtraDwell;
          bottlenecksIncurredMin += surgeExtraDwell;
          currentAspect = "YELLOW";
        }
      }

      // (e) High-Speed Double Track Kinematic Slack Recovery
      if (station.code === "BID" && runningDynamicDelay > 2.0 && weatherSpeedLimit >= 90) {
        const recovery = Math.min(runningDynamicDelay * 0.4, 3.5);
        runningDynamicDelay -= recovery;
        slackRecoveredMin += recovery;
      } else if (station.code === "NYH" && runningDynamicDelay > 1.5 && weatherSpeedLimit >= 90) {
        const recovery = Math.min(runningDynamicDelay * 0.3, 2.0);
        runningDynamicDelay -= recovery;
        slackRecoveredMin += recovery;
      }

      // (f) Terminal Reception Holding at SBC Outer
      if (station.code === "SBC") {
        const terminalQueue = runningDynamicDelay > 10 ? 2.5 : 0.8;
        runningDynamicDelay += terminalQueue;
        bottlenecksIncurredMin += terminalQueue;
      }
    }

    // Applied delay: For passed stations, reflect actual initial delay; for future stations, reflect dynamic propagation
    const appliedDelay = isPast
      ? params.train.initialDelayMin
      : isAtStation
      ? totalLiveDelay
      : runningDynamicDelay;

    const predictedStationMins = bookedStationMins + appliedDelay;

    stationForecasts.push({
      code: station.code,
      name: station.name,
      chainageFromSbcKm: station.chainageFromSbcKm,
      distanceFromMysKm: station.distanceFromMysKm,
      isScheduledHalt,
      haltDwellMin: haltDwell,
      bookedTime: formatClockDisplay(bookedStationMins),
      predictedTime: formatClockDisplay(predictedStationMins),
      predictedDelayMin: Math.max(0, Math.round(appliedDelay)),
      allowedSpeedKmph: Math.round(sectionAllowedSpeed),
      signalAspect: currentAspect,
      trackStatus: isPast ? "CLEARED" : isAtStation ? "CURRENT_RUNNING" : "FORECASTED",
      turnoutRoute: "MAIN_LINE",
    });
  });

  // Final RailRakshak Dynamic ETA calculation at SBC Terminus
  const finalDynamicDelayMin = Math.max(0, Math.round(runningDynamicDelay));
  const finalDynamicEtaMins = arrMins + finalDynamicDelayMin;
  const railrakshakDynamicEta = formatClockDisplay(finalDynamicEtaMins);

  // 3. SHAP Factor Attribution Waterfall Generator
  if (slackRecoveredMin > 0.5) {
    shapFactors.push({
      category: "Timetable Buffer Slack",
      name: "Tractive Speed Recovery Slack Absorption",
      impactMinutes: -Math.round(slackRecoveredMin * 10) / 10,
      type: "recovery",
      rationale: `Double-electrified double-track allows recovering up to ${slackRecoveredMin.toFixed(1)} mins against booked timetable.`,
    });
  }

  if (speedRestrictionPenaltyMin > 0.5) {
    shapFactors.push({
      category: "Speed Restrictions",
      name: "Track Engineering Caution Orders (TSR)",
      impactMinutes: Math.round(speedRestrictionPenaltyMin * 10) / 10,
      type: "delay",
      rationale: "Maintenance block speed drop to 30 km/h enforces kinetic braking and deceleration time.",
    });
  }

  if (signalHaltsPenaltyMin > 0.5) {
    shapFactors.push({
      category: "Signaling & Headway",
      name: "Automatic Block Signaling Detention",
      impactMinutes: Math.round(signalHaltsPenaltyMin * 10) / 10,
      type: "delay",
      rationale: "Caution aspect deceleration behind leading corridor train.",
    });
  }

  return {
    train: params.train,
    traditionalStaticEta,
    traditionalStaticDelayMin: Math.round(totalLiveDelay),
    railrakshakDynamicEta,
    railrakshakDynamicDelayMin: finalDynamicDelayMin,
    slackRecoveredMin: Math.round(slackRecoveredMin * 10) / 10,
    bottlenecksIncurredMin: Math.round(bottlenecksIncurredMin * 10) / 10,
    speedRestrictionPenaltyMin: Math.round(speedRestrictionPenaltyMin * 10) / 10,
    signalHaltsPenaltyMin: Math.round(signalHaltsPenaltyMin * 10) / 10,
    shapFactors,
    stationBreakdown: stationForecasts,
  };
}
