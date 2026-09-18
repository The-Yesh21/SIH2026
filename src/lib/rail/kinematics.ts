import { RollingStockType, SpeedRestrictionRecord, SignalAspectState } from "./types";

export interface KinematicBrakingProfile {
  rollingStock: RollingStockType;
  maxSectionMpsKmph: number;
  nominalAccelerationMps2: number;
  nominalDecelerationMps2: number;
  reactionTimeSec: number;
  brakePropagationMarginMeters: number;
}

export const KINEMATIC_PROFILES: Record<RollingStockType, KinematicBrakingProfile> = {
  VANDE_BHARAT: {
    rollingStock: "VANDE_BHARAT",
    maxSectionMpsKmph: 130,
    nominalAccelerationMps2: 0.75,
    nominalDecelerationMps2: 0.90, // Modern distributed traction 0.7-1.0 m/s^2
    reactionTimeSec: 1.5,
    brakePropagationMarginMeters: 40,
  },
  SHATABDI: {
    rollingStock: "SHATABDI",
    maxSectionMpsKmph: 120,
    nominalAccelerationMps2: 0.55,
    nominalDecelerationMps2: 0.75, // LHB High-Speed rake 0.5-0.8 m/s^2
    reactionTimeSec: 2.0,
    brakePropagationMarginMeters: 80,
  },
  SUPERFAST: {
    rollingStock: "SUPERFAST",
    maxSectionMpsKmph: 110,
    nominalAccelerationMps2: 0.45,
    nominalDecelerationMps2: 0.65, // Standard LHB/ICF 0.5-0.7 m/s^2
    reactionTimeSec: 2.5,
    brakePropagationMarginMeters: 100,
  },
  EXPRESS: {
    rollingStock: "EXPRESS",
    maxSectionMpsKmph: 105,
    nominalAccelerationMps2: 0.40,
    nominalDecelerationMps2: 0.60,
    reactionTimeSec: 2.5,
    brakePropagationMarginMeters: 100,
  },
  MEMU: {
    rollingStock: "MEMU",
    maxSectionMpsKmph: 95,
    nominalAccelerationMps2: 0.70, // High suburban acceleration
    nominalDecelerationMps2: 0.70,
    reactionTimeSec: 2.0,
    brakePropagationMarginMeters: 50,
  },
  FREIGHT_BOXN: {
    rollingStock: "FREIGHT_BOXN",
    maxSectionMpsKmph: 75,
    nominalAccelerationMps2: 0.20,
    nominalDecelerationMps2: 0.30, // Loaded heavy freight 0.2-0.4 m/s^2
    reactionTimeSec: 4.0,
    brakePropagationMarginMeters: 250, // Long brake-pipe propagation
  },
};

/**
 * Velocity Boundary Equation:
 * V_allowed = min(V_section, V_rollingStock, V_route, V_PSR, V_TSR, V_signal, V_weather)
 */
export function calculateAllowedVelocity(params: {
  rollingStock: RollingStockType;
  currentKm: number;
  routeType: "MAIN_LINE" | "LOOP_LINE_STABLED";
  turnoutLimitKmph?: number;
  activePsrs: SpeedRestrictionRecord[];
  activeTsrs: SpeedRestrictionRecord[];
  signalAspect: SignalAspectState;
  weatherVisibilityLimitKmph?: number;
}): number {
  const profile = KINEMATIC_PROFILES[params.rollingStock];
  const vRollingStock = profile.maxSectionMpsKmph;
  const vSection = 110; // Sanctioned SWR sectional line speed

  // Route Turnout speed
  const vRoute = params.routeType === "LOOP_LINE_STABLED" ? (params.turnoutLimitKmph || 30) : 130;

  // Active PSR limit over this chainage
  let vPsr = 130;
  for (const psr of params.activePsrs) {
    if (psr.active && params.currentKm >= psr.fromChainageKm && params.currentKm <= psr.toChainageKm) {
      vPsr = Math.min(vPsr, psr.speedLimitKmph);
    }
  }

  // Active TSR limit over this chainage
  let vTsr = 130;
  for (const tsr of params.activeTsrs) {
    if (tsr.active && params.currentKm >= tsr.fromChainageKm && params.currentKm <= tsr.toChainageKm) {
      vTsr = Math.min(vTsr, tsr.speedLimitKmph);
    }
  }

  // Signal Aspect speed
  const vSignal = params.signalAspect.allowedSpeedKmph;

  // Weather speed restriction (e.g. SWR Fog working: 30 km/h)
  const vWeather = params.weatherVisibilityLimitKmph ?? 130;

  return Math.min(vSection, vRollingStock, vRoute, vPsr, vTsr, vSignal, vWeather);
}

/**
 * Calculates braking distance (meters) based on kinematic equation:
 * d_brake = (v^2 / (2 * a)) + v * t_reaction + d_propagation
 */
export function calculateBrakingDistanceMeters(
  speedKmph: number,
  rollingStock: RollingStockType
): number {
  const profile = KINEMATIC_PROFILES[rollingStock];
  const vMps = (speedKmph * 1000) / 3600;
  const deceleration = profile.nominalDecelerationMps2;

  const brakingDist = (vMps * vMps) / (2 * deceleration);
  const reactionDist = vMps * profile.reactionTimeSec;
  const propagationDist = profile.brakePropagationMarginMeters;

  return Math.round(brakingDist + reactionDist + propagationDist);
}
