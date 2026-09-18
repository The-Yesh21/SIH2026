import { SpeedRestrictionRecord, LevelCrossingGate } from "./types";

export interface EnvironmentalConditions {
  weather: "CLEAR" | "LIGHT_RAIN" | "HEAVY_MONSOON" | "DENSE_FOG";
  visibilityLimitKmph: number;
  maintenanceBlockActive: boolean;
  maintenanceChainageKm?: { from: number; to: number };
  maintenanceTsrKmph: number;
  commuterSurgeMultiplier: number; // 1.0 = normal, 2.5 = peak hour rush
  lcGateIncidentDelayMin: number;
}

export const DEFAULT_ENVIRONMENT: EnvironmentalConditions = {
  weather: "CLEAR",
  visibilityLimitKmph: 130,
  maintenanceBlockActive: false,
  maintenanceChainageKm: { from: 50.0, to: 56.0 },
  maintenanceTsrKmph: 30, // SWR Track work TSR 20-30 km/h
  commuterSurgeMultiplier: 1.0,
  lcGateIncidentDelayMin: 0,
};

/**
 * Weather speed derating rules (Compliant with SWR Fog working Chapter IX)
 */
export function getWeatherSpeedLimit(weather: EnvironmentalConditions["weather"]): number {
  switch (weather) {
    case "DENSE_FOG":
      return 30; // SWR Fog working rule: 30 km/h maximum
    case "HEAVY_MONSOON":
      return 60; // Cautionary adhesion and waterlogging speed
    case "LIGHT_RAIN":
      return 90;
    case "CLEAR":
    default:
      return 130;
  }
}

/**
 * Level Crossing Gate Delay Calculation
 */
export function calculateLcGateDelay(gate: LevelCrossingGate): number {
  if (gate.status === "LOCKED_CLOSED") return 0;
  if (gate.status === "OPEN_ROAD") {
    // Road traffic clearance variance: 60 - 180 seconds = 1.0 - 3.0 minutes
    return Math.round((gate.normalRoadClosureSec / 60 + 1.0) * 10) / 10;
  }
  // Defect / interlock failure held: 5 - 15 minutes
  return 8.5;
}
