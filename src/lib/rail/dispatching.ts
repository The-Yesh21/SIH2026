import { RollingStockType } from "./types";

/**
 * Indian Railways Train Precedence & Priority Hierarchy
 */
export const PRIORITY_TIERS: Record<RollingStockType, { tier: number; name: string; protectedMarginMin: number }> = {
  VANDE_BHARAT: { tier: 1, name: "Premium High-Speed", protectedMarginMin: 12 },
  SHATABDI: { tier: 1, name: "Premium Intercity", protectedMarginMin: 10 },
  SUPERFAST: { tier: 2, name: "Superfast Express", protectedMarginMin: 7 },
  EXPRESS: { tier: 2, name: "Mail / Express", protectedMarginMin: 6 },
  MEMU: { tier: 3, name: "Suburban Commuter", protectedMarginMin: 4 },
  FREIGHT_BOXN: { tier: 4, name: "Freight Cargo Rake", protectedMarginMin: 2 },
};

/**
 * Loop-Line Penalty Decomposition (Total: 3 - 10 minutes)
 * When a lower-priority train is routed into a loop line for an overtake.
 */
export interface LoopLinePenaltyBreakdown {
  turnoutDecelerationMin: number; // 0.5 - 1.5 min
  loopEntrySettlingMin: number;    // 0.5 - 1.5 min
  stationaryHoldMin: number;       // 1.0 - 5.0 min (waiting for overtake)
  restartAccelerationMin: number;  // 1.0 - 3.0 min
  rejoiningMainlineMin: number;    // 0.5 - 2.0 min
  totalPenaltyMin: number;
}

export function calculateLoopLinePenalty(
  rollingStock: RollingStockType,
  requiredHoldTimeMin: number = 3.0
): LoopLinePenaltyBreakdown {
  const isFreight = rollingStock === "FREIGHT_BOXN";
  const isVandeOrEmu = rollingStock === "VANDE_BHARAT" || rollingStock === "MEMU";

  const turnoutDecel = isFreight ? 1.4 : isVandeOrEmu ? 0.6 : 1.0;
  const loopEntry = isFreight ? 1.5 : 0.8;
  const hold = Math.max(1.0, requiredHoldTimeMin);
  const restartAccel = isFreight ? 3.0 : isVandeOrEmu ? 1.0 : 2.0;
  const rejoining = isFreight ? 1.8 : 0.8;

  const total = turnoutDecel + loopEntry + hold + restartAccel + rejoining;

  return {
    turnoutDecelerationMin: turnoutDecel,
    loopEntrySettlingMin: loopEntry,
    stationaryHoldMin: hold,
    restartAccelerationMin: restartAccel,
    rejoiningMainlineMin: rejoining,
    totalPenaltyMin: Math.round(total * 10) / 10,
  };
}

/**
 * SWR Overtake Decision Criterion:
 * Overtake permitted only if:
 * T_lower,clear + M_route < T_higher,arrival - M_priority
 */
export function shouldOvertakeOnLoop(params: {
  lowerPriorityTrainType: RollingStockType;
  higherPriorityTrainType: RollingStockType;
  predictedLowerClearTimeMins: number;
  predictedHigherArrivalTimeMins: number;
}): { shouldOvertake: boolean; loopPenalty: LoopLinePenaltyBreakdown; rationale: string } {
  const lowerTier = PRIORITY_TIERS[params.lowerPriorityTrainType];
  const higherTier = PRIORITY_TIERS[params.higherPriorityTrainType];

  const mRoute = 3.5; // Route locking and clearance buffer in minutes
  const mPriority = higherTier.protectedMarginMin;

  const leftHandSide = params.predictedLowerClearTimeMins + mRoute;
  const rightHandSide = params.predictedHigherArrivalTimeMins - mPriority;

  const loopPenalty = calculateLoopLinePenalty(params.lowerPriorityTrainType, 4.0);

  if (higherTier.tier < lowerTier.tier && leftHandSide > rightHandSide) {
    return {
      shouldOvertake: true,
      loopPenalty,
      rationale: `Priority Conflict: ${higherTier.name} overtaking ${lowerTier.name}. Stabling on loop line avoids high-speed headway blockage.`,
    };
  }

  return {
    shouldOvertake: false,
    loopPenalty,
    rationale: `Sufficient headway separation: ${lowerTier.name} can clear block without holding on loop.`,
  };
}
