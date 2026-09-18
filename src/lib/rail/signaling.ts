import { SignalAspectState } from "./types";

/**
 * Multiple Aspect Colour Light Signalling (MACLS) 4-Aspect State Machine
 * Compliant with Indian Railways General Rules & SWR Chapter IX (Automatic Block System)
 */
export const SIGNAL_ASPECTS: Record<"GREEN" | "DOUBLE_YELLOW" | "YELLOW" | "RED", SignalAspectState> = {
  GREEN: {
    aspect: "GREEN",
    meaning: "Proceed",
    allowedSpeedKmph: 130,
    blockLengthMeters: 1000,
    overlapMeters: 120, // SWR Signal Overlap standard
  },
  DOUBLE_YELLOW: {
    aspect: "DOUBLE_YELLOW",
    meaning: "Attention",
    allowedSpeedKmph: 75, // Decelerate, next signal is Yellow
    blockLengthMeters: 1000,
    overlapMeters: 120,
  },
  YELLOW: {
    aspect: "YELLOW",
    meaning: "Caution",
    allowedSpeedKmph: 30, // Prepare to stop at next stop signal
    blockLengthMeters: 1000,
    overlapMeters: 120,
  },
  RED: {
    aspect: "RED",
    meaning: "Danger / Stop",
    allowedSpeedKmph: 0,
    blockLengthMeters: 1000,
    overlapMeters: 180, // Block Overlap standard
  },
};

/**
 * SWR Degraded Working Rules for Passing Automatic Signal with "A" Marker at ON (Red)
 */
export const SWR_AUTOMATIC_SIGNAL_ON_RULES = {
  dayWaitMinutes: 1.0,
  nightWaitMinutes: 2.0,
  maxSpeedAfterPassingOnKmph: 15,
  poorVisibilitySpeedKmph: 10,
  denseFogSpeedKmph: 8,
  minFollowingSeparationLocoHauledMeters: 150, // 2 OHE masts
  minFollowingSeparationEmuMeters: 75,         // 1 OHE mast
};

/**
 * Determines signal aspect based on train separation distance ahead
 */
export function determineSignalAspectByHeadway(headwayMeters: number): SignalAspectState {
  if (headwayMeters > 3000) {
    return SIGNAL_ASPECTS.GREEN;
  } else if (headwayMeters > 2000) {
    return SIGNAL_ASPECTS.DOUBLE_YELLOW;
  } else if (headwayMeters > 1000) {
    return SIGNAL_ASPECTS.YELLOW;
  } else {
    return SIGNAL_ASPECTS.RED;
  }
}
