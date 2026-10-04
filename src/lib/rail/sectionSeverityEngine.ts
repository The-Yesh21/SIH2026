import { SWR_CORRIDOR_STATIONS } from "./infrastructure";
import { ALL_CORRIDOR_FLEET, resolveTrainAtClockTime } from "./timeResolver";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT } from "./restrictions";

export type SeverityTier = "NORMAL" | "MODERATE" | "HIGH_FRICTION" | "SEVERE_CONGESTION";

export interface SectionSeverityData {
  id: string;
  fromStationCode: string;
  fromStationName: string;
  toStationCode: string;
  toStationName: string;
  startKm: number;
  endKm: number;
  lengthKm: number;
  // Breakdown factors (scaled to contribute to 100 max)
  congestionScore: number;         // 0 - 20 (train density in section)
  signalFrictionScore: number;     // 0 - 15 (approach signal aspect / yellow heads)
  speedRestrictionScore: number;   // 0 - 15 (PSR / curvature / TSRs)
  precedingInterferenceScore: number; // 0 - 15 (headway compression by leading rake)
  stationDwellScore: number;       // 0 - 15 (passenger surge / platform turnaround)
  historicalImpactScore: number;   // 0 - 10 (historical recurring delay rate)
  currentOccupancyScore: number;   // 0 - 10 (trains physically active on section)
  // Total normalized score
  totalSeverityScore: number;      // 0 - 100
  severityTier: SeverityTier;
  colorHex: string;                // Green / Yellow / Orange / Red
  badgeClass: string;
  primaryCause: string;
  activeTrainsCount: number;
  activeTrainNames: string[];
  headwayMinutes: number;
  recommendedSpeedKmph: number;
}

/**
 * Computes live Network-Wide Traffic Severity for all 16 SWR corridor sections.
 * Normalizes scores from 0 to 100 with dynamic time-of-day, weather, and active train resolution.
 */
export function computeNetworkTrafficSeverity(
  clockMinutes: number,
  environment: EnvironmentalConditions = DEFAULT_ENVIRONMENT,
  injectedDelay: number = 0
): SectionSeverityData[] {
  // Resolve where all 10 corridor trains are at this clock minute
  const activeFleet = ALL_CORRIDOR_FLEET.map((train) => {
    const resolved = resolveTrainAtClockTime(train, clockMinutes);
    return {
      train,
      resolved,
      currentKm: resolved.currentLocationKm,
      delay: resolved.delayMinutes + injectedDelay,
      isRunning: resolved.operatingState === "RUNNING_ON_TRACK",
    };
  });

  const sections: SectionSeverityData[] = [];

  for (let i = 0; i < SWR_CORRIDOR_STATIONS.length - 1; i++) {
    const fromSt = SWR_CORRIDOR_STATIONS[i]!;
    const toSt = SWR_CORRIDOR_STATIONS[i + 1]!;
    const startKm = fromSt.distanceFromMysKm;
    const endKm = toSt.distanceFromMysKm;
    const lengthKm = endKm - startKm;

    // 1. Current Occupancy & Active Trains in this block
    const isLastSection = i === SWR_CORRIDOR_STATIONS.length - 2;
    const trainsInSection = activeFleet.filter(
      (t) => t.isRunning && t.currentKm >= startKm && (isLastSection ? t.currentKm <= endKm : t.currentKm < endKm)
    );
    const trainCount = trainsInSection.length;
    const trainNames = trainsInSection.map((t) => `#${t.train.id} ${t.train.name.split(" ")[0]}`);

    // Occupancy score (0 - 10)
    const occupancyScore = Math.min(10, trainCount * 5);

    // 2. Congestion score based on local density & corridor rush hour (0 - 20)
    const isPeakHour = (clockMinutes >= 420 && clockMinutes <= 600) || (clockMinutes >= 1020 && clockMinutes <= 1200);
    let baseCongestion = trainCount >= 2 ? 16 : trainCount === 1 ? 8 : 2;
    if (isPeakHour) baseCongestion += 4;
    // Throat bottlenecks (KGI - SBC, CGU - MYA) have higher natural density
    if (toSt.code === "SBC" || toSt.code === "MYA") baseCongestion += 5;
    const congestionScore = Math.min(20, Math.max(0, baseCongestion));

    // 3. Signal Friction & Headway (0 - 15)
    let signalFriction = 3;
    if (trainCount >= 2) signalFriction += 8;
    if (environment.weather === "DENSE_FOG") signalFriction += 4;
    const signalFrictionScore = Math.min(15, signalFriction);

    // 4. Permanent Speed Restrictions (PSR) & Curvature (0 - 15)
    let speedRes = 2;
    if (fromSt.code === "RMGM" || toSt.code === "RMGM") speedRes += 8; // Ramanagaram curves PSR 90 km/h
    if (toSt.code === "SBC") speedRes += 10; // SBC yard throat limit 15 km/h
    if (environment.weather === "HEAVY_MONSOON") speedRes += 4;
    const speedRestrictionScore = Math.min(15, speedRes);

    // 5. Preceding Train Interference (0 - 15)
    let precedingInterference = 0;
    const delayedTrain = trainsInSection.find((t) => t.delay > 10);
    if (delayedTrain) {
      precedingInterference = Math.min(15, Math.round(delayedTrain.delay * 0.4));
    } else if (trainCount >= 1 && (toSt.code === "KGI" || toSt.code === "SBC")) {
      precedingInterference = 8;
    }
    const precedingInterferenceScore = Math.min(15, precedingInterference);

    // 6. Station Dwell & Turnaround Delay (0 - 15)
    let dwell = 2;
    if (fromSt.code === "MYA" || toSt.code === "MYA") dwell += 8; // Mandya passenger surges
    if (fromSt.code === "CPT" || toSt.code === "CPT") dwell += 5; // Channapatna dwells
    if (isPeakHour) dwell += 4;
    const stationDwellScore = Math.min(15, dwell);

    // 7. Historical Impact Rate (0 - 10)
    let historical = 2;
    if (toSt.code === "SBC" || toSt.code === "MYA") historical = 8;
    else if (fromSt.code === "MAD" || fromSt.code === "RMGM") historical = 5;
    const historicalImpactScore = Math.min(10, historical);

    // Sum Total Normalized Score (0 - 100)
    const rawTotal =
      congestionScore +
      signalFrictionScore +
      speedRestrictionScore +
      precedingInterferenceScore +
      stationDwellScore +
      historicalImpactScore +
      occupancyScore;

    const totalSeverityScore = Math.min(100, Math.max(5, rawTotal));

    // Determine Tier & Color
    let severityTier: SeverityTier = "NORMAL";
    let colorHex = "#22C55E"; // Green
    let badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    let primaryCause = "Optimal Line Velocity · Clear Signal Aspect";
    let recommendedSpeedKmph = 110;

    if (totalSeverityScore >= 75) {
      severityTier = "SEVERE_CONGESTION";
      colorHex = "#EF4444"; // Red
      badgeClass = "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse";
      primaryCause = toSt.code === "SBC"
        ? "Terminal Throat Interlocking & Headway Compression"
        : "Precedence Loop-Line Hold & Heavy Passenger Surge";
      recommendedSpeedKmph = 35;
    } else if (totalSeverityScore >= 50) {
      severityTier = "HIGH_FRICTION";
      colorHex = "#F97316"; // Orange
      badgeClass = "bg-amber-500/20 text-amber-400 border-amber-500/40";
      primaryCause = "Preceding Train Headway Compression & Yellow Aspects";
      recommendedSpeedKmph = 65;
    } else if (totalSeverityScore >= 25) {
      severityTier = "MODERATE";
      colorHex = "#EAB308"; // Yellow
      badgeClass = "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
      primaryCause = "Moderate Suburban Headway & Station Dwell Absorption";
      recommendedSpeedKmph = 85;
    }

    sections.push({
      id: `${fromSt.code}-${toSt.code}`,
      fromStationCode: fromSt.code,
      fromStationName: fromSt.name,
      toStationCode: toSt.code,
      toStationName: toSt.name,
      startKm,
      endKm,
      lengthKm: Number(lengthKm.toFixed(2)),
      congestionScore,
      signalFrictionScore,
      speedRestrictionScore,
      precedingInterferenceScore,
      stationDwellScore,
      historicalImpactScore,
      currentOccupancyScore: occupancyScore,
      totalSeverityScore,
      severityTier,
      colorHex,
      badgeClass,
      primaryCause,
      activeTrainsCount: trainCount,
      activeTrainNames: trainNames,
      headwayMinutes: trainCount > 1 ? 4.5 : trainCount === 1 ? 9.0 : 18.0,
      recommendedSpeedKmph,
    });
  }

  return sections;
}
