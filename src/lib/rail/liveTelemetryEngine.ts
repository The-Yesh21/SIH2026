import { TrainConfig, RollingStockType } from "./types";
import { SWR_CORRIDOR_STATIONS, DEFAULT_PSR_LIST } from "./infrastructure";
import { CORRIDOR_SECTIONS } from "./corridorDataset";
import { calculateAllowedVelocity, KINEMATIC_PROFILES } from "./kinematics";
import { SIGNAL_ASPECTS } from "./signaling";

import { EnvironmentalConditions, getWeatherSpeedLimit } from "./restrictions";

export interface LiveTrainTelemetry {
  trainId: string;
  name: string;
  type: RollingStockType;
  currentLocationKm: number;
  currentSpeedKmph: number;
  targetSpeedKmph: number;
  initialDelayMin: number;
  liveDelayMin: number;
  currentStationCode: string;
  nextStationCode: string;
  distanceToNextKm: number;
  movementStatus:
    | "DEPARTED_MYS"
    | "CRUISING_MAIN_LINE"
    | "APPROACHING_HALT"
    | "HALTED_AT_PLATFORM"
    | "PASSING_NON_STOP"
    | "RESTRICTED_CURVE"
    | "STABLED_LOOP"
    | "ARRIVED_SBC";
  liveAspect: "GREEN" | "DOUBLE_YELLOW" | "YELLOW" | "RED";
  lastPingTime: string;
  dwellRemainingSec: number;
}

/**
 * Advanced Physics & Kinematic Tick Step for All Corridor Trains
 * @param currentFleet Current state of all active trains
 * @param deltaSeconds Elapsed simulation seconds in this tick
 * @param weather Current corridor weather
 */
export function updateFleetKinematicsTick(
  currentFleet: LiveTrainTelemetry[],
  deltaSeconds: number,
  weather: EnvironmentalConditions["weather"] = "CLEAR"
): LiveTrainTelemetry[] {
  const weatherSpeedLimit = getWeatherSpeedLimit(weather);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return currentFleet.map((train, trainIdx) => {
    // If train has completed full corridor journey at SBC (138.25 km)
    if (train.currentLocationKm >= 138.25) {
      return {
        ...train,
        currentLocationKm: 138.25,
        currentSpeedKmph: 0,
        targetSpeedKmph: 0,
        movementStatus: "ARRIVED_SBC",
        liveAspect: "RED",
        lastPingTime: timeStr,
      };
    }

    const profile = KINEMATIC_PROFILES[train.type];
    const stations = SWR_CORRIDOR_STATIONS;

    // Find current and next station
    const nextStationIdx = stations.findIndex(
      (s) => s.distanceFromMysKm > train.currentLocationKm + 0.05
    );
    const nextStation = nextStationIdx >= 0 ? stations[nextStationIdx]! : stations[stations.length - 1]!;
    const prevStation = nextStationIdx > 0 ? stations[nextStationIdx - 1]! : stations[0]!;

    const distToNextKm = Math.max(0, nextStation.distanceFromMysKm - train.currentLocationKm);

    // Check if train is currently dwelling at a scheduled halt
    let newDwellRemaining = train.dwellRemainingSec;
    let newSpeed = train.currentSpeedKmph;
    let newLocation = train.currentLocationKm;
    let movementStatus = train.movementStatus;
    let liveAspect: "GREEN" | "DOUBLE_YELLOW" | "YELLOW" | "RED" = "GREEN";

    // Loop Line Stabled Freight
    if (train.type === "FREIGHT_BOXN" && train.currentLocationKm >= 108.6 && train.currentLocationKm <= 109.0) {
      // Stabled at Bidadi Loop to allow Vande Bharat / Shatabdi precedence
      return {
        ...train,
        currentSpeedKmph: 0,
        targetSpeedKmph: 0,
        movementStatus: "STABLED_LOOP",
        liveAspect: "RED",
        lastPingTime: timeStr,
      };
    }

    // Check if currently stopped at platform
    if (newDwellRemaining > 0) {
      newDwellRemaining = Math.max(0, newDwellRemaining - deltaSeconds);
      return {
        ...train,
        currentSpeedKmph: 0,
        targetSpeedKmph: 0,
        dwellRemainingSec: newDwellRemaining,
        movementStatus: "HALTED_AT_PLATFORM",
        liveAspect: "RED",
        lastPingTime: timeStr,
      };
    }

    // Calculate maximum allowed target speed at current track location
    let targetSpeed = calculateAllowedVelocity({
      rollingStock: train.type,
      currentKm: train.currentLocationKm,
      routeType: "MAIN_LINE",
      turnoutLimitKmph: 30,
      activePsrs: DEFAULT_PSR_LIST,
      activeTsrs: [],
      signalAspect: SIGNAL_ASPECTS.GREEN,
      weatherVisibilityLimitKmph: weatherSpeedLimit,
    });

    // Check approaching scheduled halt
    const isNextStationHalt =
      train.type === "MEMU" ||
      (train.type === "EXPRESS" && ["PANP", "MYA", "MAD", "CPT", "RMGM", "BID", "KGI", "NYH", "SBC"].includes(nextStation.code)) ||
      (train.type === "SUPERFAST" && ["MYA", "RMGM", "KGI", "SBC"].includes(nextStation.code)) ||
      nextStation.code === "SBC";

    if (isNextStationHalt && distToNextKm < 1.8) {
      // Smooth deceleration curve towards station platform
      targetSpeed = Math.min(targetSpeed, Math.max(15, (distToNextKm / 1.8) * 60));
      movementStatus = "APPROACHING_HALT";
      liveAspect = distToNextKm < 0.8 ? "YELLOW" : "DOUBLE_YELLOW";

      // Arrived at platform
      if (distToNextKm < 0.08) {
        newSpeed = 0;
        newLocation = nextStation.distanceFromMysKm;
        const dwellTimeSec = nextStation.code === "MYA" ? 120 : nextStation.code === "SBC" ? 0 : 60;
        return {
          ...train,
          currentLocationKm: newLocation,
          currentSpeedKmph: 0,
          targetSpeedKmph: 0,
          dwellRemainingSec: dwellTimeSec,
          movementStatus: nextStation.code === "SBC" ? "ARRIVED_SBC" : "HALTED_AT_PLATFORM",
          liveAspect: "RED",
          currentStationCode: nextStation.code,
          distanceToNextKm: 0,
          lastPingTime: timeStr,
        };
      }
    } else {
      movementStatus = targetSpeed < 90 ? "RESTRICTED_CURVE" : "CRUISING_MAIN_LINE";
    }

    // Kinematic Acceleration / Deceleration
    const maxAccelKmphPerSec = (profile.nominalAccelerationMps2 * 3.6);
    const maxDecelKmphPerSec = (profile.nominalDecelerationMps2 * 3.6);

    if (newSpeed < targetSpeed) {
      newSpeed = Math.min(targetSpeed, newSpeed + maxAccelKmphPerSec * deltaSeconds);
    } else if (newSpeed > targetSpeed) {
      newSpeed = Math.max(targetSpeed, newSpeed - maxDecelKmphPerSec * deltaSeconds);
    }

    // Advance position (Speed in km/h -> km/sec * deltaSeconds)
    const distanceTraversedKm = (newSpeed / 3600) * deltaSeconds;
    newLocation = Math.min(138.25, newLocation + distanceTraversedKm);

    return {
      ...train,
      currentLocationKm: Math.round(newLocation * 1000) / 1000,
      currentSpeedKmph: Math.round(newSpeed * 10) / 10,
      targetSpeedKmph: Math.round(targetSpeed),
      currentStationCode: prevStation.code,
      nextStationCode: nextStation.code,
      distanceToNextKm: Math.max(0, Math.round((nextStation.distanceFromMysKm - newLocation) * 10) / 10),
      movementStatus,
      liveAspect,
      lastPingTime: timeStr,
      dwellRemainingSec: 0,
    };
  });
}

/**
 * Initialize default telemetry state from active corridor trains
 */
export function initializeFleetTelemetry(trains: TrainConfig[]): LiveTrainTelemetry[] {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return trains.map((t) => ({
    trainId: t.id,
    name: t.name,
    type: t.type,
    currentLocationKm: t.currentLocationKm,
    currentSpeedKmph: t.currentSpeedKmph,
    targetSpeedKmph: t.sectionalMpsKmph,
    initialDelayMin: t.initialDelayMin,
    liveDelayMin: t.initialDelayMin,
    currentStationCode: "MYS",
    nextStationCode: "SBC",
    distanceToNextKm: 138.25 - t.currentLocationKm,
    movementStatus: t.currentLocationKm >= 138.25 ? "ARRIVED_SBC" : "CRUISING_MAIN_LINE",
    liveAspect: "GREEN",
    lastPingTime: timeStr,
    dwellRemainingSec: 0,
  }));
}
