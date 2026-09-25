import {
  TrainConfig,
  PrecedingTrainContext,
  SectionFriction,
  SectorHotspot,
  TrainVulnerabilitySector,
  RollingStockType
} from "./types";
import { ALL_CORRIDOR_FLEET, parseTimeToMinutes } from "./timeResolver";
import { EnvironmentalConditions } from "./restrictions";

export const CORRIDOR_BLOCK_SECTIONS: {
  code: string;
  from: string;
  to: string;
  startKm: number;
  endKm: number;
  mps: number;
}[] = [
  { code: "SEC-MYS-PAN", from: "Mysuru (MYS)", to: "Pandavapura (PAN)", startKm: 0.0, endKm: 19.35, mps: 110.0 },
  { code: "SEC-PAN-MYA", from: "Pandavapura (PAN)", to: "Mandya (MYA)", startKm: 19.35, endKm: 45.4, mps: 110.0 },
  { code: "SEC-MYA-MAD", from: "Mandya (MYA)", to: "Maddur (MAD)", startKm: 45.4, endKm: 64.3, mps: 110.0 },
  { code: "SEC-MAD-CPT", from: "Maddur (MAD)", to: "Channapatna (CPT)", startKm: 64.3, endKm: 82.55, mps: 110.0 },
  { code: "SEC-CPT-RMGM", from: "Channapatna (CPT)", to: "Ramanagaram (RMGM)", startKm: 82.55, endKm: 93.65, mps: 110.0 },
  { code: "SEC-RMGM-BID", from: "Ramanagaram (RMGM)", to: "Bidadi (BID)", startKm: 93.65, endKm: 108.35, mps: 110.0 },
  { code: "SEC-BID-KGI", from: "Bidadi (BID)", to: "Kengeri (KGI)", startKm: 108.35, endKm: 126.1, mps: 100.0 },
  { code: "SEC-KGI-SBC", from: "Kengeri (KGI)", to: "KSR Bengaluru (SBC)", startKm: 126.1, endKm: 138.25, mps: 80.0 },
];

export const CORRIDOR_SECTOR_HOTSPOTS: SectorHotspot[] = [
  {
    id: "SECTOR-SBC-THROAT",
    rank: 1,
    sectorName: "KSR Bengaluru (SBC) Terminal Throat & Outer Interlocking",
    chainageKm: "KM 130.85 ➔ KM 138.25",
    startKm: 130.85,
    endKm: 138.25,
    totalCumulativeDelayMin: 184.5,
    delayFrequencyPct: 93.8,
    delayedTrainsCount: 15,
    totalObservedTrains: 16,
    avgDelayPerTrainMin: 8.2,
    maxSingleDetentionMin: 24.0,
    primaryCause: "Platform neck reception queue, 15-30 km/h diamond crossing PSR & outer signal holding",
    causeCategory: "Terminal Throat",
    speedCapKmph: 30.0,
    mitigationStrategy: "AI-assisted dynamic platform allocation & speed easing on Nayandahalli outer approach",
    etaPredictionRiskWeight: 1.45,
    affectedTrainsList: [
      {
        trainId: "16236", trainName: "Tuticorin Express", trainType: "EXPRESS",
        avgHistoricalDelayMin: 11.4, maxDetentionMin: 24.0, historicalOccurrenceCount: 28,
        vulnerabilityReason: "Late evening arrival slot clashing with inter-state express departures."
      },
      {
        trainId: "16022", trainName: "Kaveri Express", trainType: "EXPRESS",
        avgHistoricalDelayMin: 9.8, maxDetentionMin: 19.0, historicalOccurrenceCount: 27,
        vulnerabilityReason: "Held at outer diamond crossover for night mail platform clearing."
      },
      {
        trainId: "12613", trainName: "Wodeyar Superfast", trainType: "SUPERFAST",
        avgHistoricalDelayMin: 6.5, maxDetentionMin: 14.0, historicalOccurrenceCount: 22,
        vulnerabilityReason: "Afternoon yard shunting movement holding Route Relay Interlocking."
      },
      {
        trainId: "BOXN-58219", trainName: "Freight Coal Rake", trainType: "FREIGHT_BOXN",
        avgHistoricalDelayMin: 18.5, maxDetentionMin: 35.0, historicalOccurrenceCount: 15,
        vulnerabilityReason: "Deprioritized outside terminal yard during passenger peak reception."
      },
    ]
  },
  {
    id: "SECTOR-KGI-SUBURBAN",
    rank: 2,
    sectorName: "Kengeri Suburban Hub & Nayandahalli Urban Crossover",
    chainageKm: "KM 122.00 ➔ KM 126.10",
    startKm: 122.0,
    endKm: 126.1,
    totalCumulativeDelayMin: 142.0,
    delayFrequencyPct: 81.3,
    delayedTrainsCount: 13,
    totalObservedTrains: 16,
    avgDelayPerTrainMin: 6.8,
    maxSingleDetentionMin: 18.0,
    primaryCause: "Massive morning/evening commuter rush boarding surges & sectional MPS drop to 70 km/h",
    causeCategory: "Suburban Commuters",
    speedCapKmph: 70.0,
    mitigationStrategy: "Automatic platform boarding countdown sirens & RPF queue management",
    etaPredictionRiskWeight: 1.35,
    affectedTrainsList: [
      {
        trainId: "66552", trainName: "Mysuru - SBC MEMU", trainType: "MEMU",
        avgHistoricalDelayMin: 14.2, maxDetentionMin: 18.0, historicalOccurrenceCount: 30,
        vulnerabilityReason: "Heavy commuter crush loading; dwell exceeds timetable by 3x."
      },
      {
        trainId: "16215", trainName: "Chamundi Express", trainType: "EXPRESS",
        avgHistoricalDelayMin: 7.5, maxDetentionMin: 15.0, historicalOccurrenceCount: 25,
        vulnerabilityReason: "Daily office commuter detrainment congestion at Platform 1."
      },
      {
        trainId: "16232", trainName: "Mayiladuturai Express", trainType: "EXPRESS",
        avgHistoricalDelayMin: 5.8, maxDetentionMin: 12.0, historicalOccurrenceCount: 21,
        vulnerabilityReason: "Evening peak rush congestion & suburban curve braking."
      },
    ]
  },
  {
    id: "SECTOR-BID-PRECEDENCE",
    rank: 3,
    sectorName: "Bidadi Junction Precedence Loop Stabling Hub",
    chainageKm: "KM 106.00 ➔ KM 109.50",
    startKm: 106.0,
    endKm: 109.5,
    totalCumulativeDelayMin: 165.0,
    delayFrequencyPct: 68.8,
    delayedTrainsCount: 11,
    totalObservedTrains: 16,
    avgDelayPerTrainMin: 12.5,
    maxSingleDetentionMin: 38.0,
    primaryCause: "30 km/h turnout diversion into loop line to allow Vande Bharat & Shatabdi overtaking",
    causeCategory: "Precedence & Loop",
    speedCapKmph: 30.0,
    mitigationStrategy: "High-speed 50 km/h thick-web turnouts & dynamic moving block overtake calculations",
    etaPredictionRiskWeight: 1.40,
    affectedTrainsList: [
      {
        trainId: "BOXN-58219", trainName: "Freight Coal Rake", trainType: "FREIGHT_BOXN",
        avgHistoricalDelayMin: 32.0, maxDetentionMin: 38.0, historicalOccurrenceCount: 18,
        vulnerabilityReason: "Held on Loop Line 2 for Shatabdi 12008 & Wodeyar SF overtaking."
      },
      {
        trainId: "66552", trainName: "Mysuru - SBC MEMU", trainType: "MEMU",
        avgHistoricalDelayMin: 11.2, maxDetentionMin: 22.0, historicalOccurrenceCount: 22,
        vulnerabilityReason: "Looped for Vande Bharat 20608 high-speed mainline pass."
      },
      {
        trainId: "16586", trainName: "MRDW - SMVB Express", trainType: "EXPRESS",
        avgHistoricalDelayMin: 6.5, maxDetentionMin: 14.0, historicalOccurrenceCount: 16,
        vulnerabilityReason: "Early morning goods train crossing hold."
      },
    ]
  },
  {
    id: "SECTOR-MYA-TURNOUT",
    rank: 4,
    sectorName: "Mandya Junction Platform Neck & Loop Divergence",
    chainageKm: "KM 43.00 ➔ KM 47.50",
    startKm: 43.0,
    endKm: 47.5,
    totalCumulativeDelayMin: 115.0,
    delayFrequencyPct: 75.0,
    delayedTrainsCount: 12,
    totalObservedTrains: 16,
    avgDelayPerTrainMin: 5.5,
    maxSingleDetentionMin: 19.0,
    primaryCause: "1:12 turnout 30 km/h entry speed cap, locomotive watering hydrant overrun & passenger rush",
    causeCategory: "Track Curvature PSR",
    speedCapKmph: 30.0,
    mitigationStrategy: "Simultaneous reception signaling & electronic interlocking turnout speed upgrades",
    etaPredictionRiskWeight: 1.20,
    affectedTrainsList: [
      {
        trainId: "12613", trainName: "Wodeyar Superfast", trainType: "SUPERFAST",
        avgHistoricalDelayMin: 4.8, maxDetentionMin: 11.0, historicalOccurrenceCount: 24,
        vulnerabilityReason: "Mandya primary stop dwell overrun & turnout caution."
      },
      {
        trainId: "16215", trainName: "Chamundi Express", trainType: "EXPRESS",
        avgHistoricalDelayMin: 6.2, maxDetentionMin: 14.0, historicalOccurrenceCount: 26,
        vulnerabilityReason: "Major passenger boarding surge; platform clearing delay."
      },
    ]
  },
  {
    id: "SECTOR-RMGM-LC34",
    rank: 5,
    sectorName: "Ramanagaram LC Gate #34 & Reverse S-Curves",
    chainageKm: "KM 88.00 ➔ KM 94.50",
    startKm: 88.0,
    endKm: 94.5,
    totalCumulativeDelayMin: 98.0,
    delayFrequencyPct: 62.5,
    delayedTrainsCount: 10,
    totalObservedTrains: 16,
    avgDelayPerTrainMin: 4.9,
    maxSingleDetentionMin: 16.0,
    primaryCause: "Heavy road vehicular traffic jamming LC Gate #34 closure + 85 km/h reverse curve PSR",
    causeCategory: "Level Crossing",
    speedCapKmph: 85.0,
    mitigationStrategy: "Road Underbridge (RUB) grade separation to eliminate manual gate closure",
    etaPredictionRiskWeight: 1.18,
    affectedTrainsList: [
      {
        trainId: "16022", trainName: "Kaveri Express", trainType: "EXPRESS",
        avgHistoricalDelayMin: 5.2, maxDetentionMin: 16.0, historicalOccurrenceCount: 19,
        vulnerabilityReason: "Road traffic backlog holding LC Gate #34 interlocking."
      },
      {
        trainId: "16236", trainName: "Tuticorin Express", trainType: "EXPRESS",
        avgHistoricalDelayMin: 4.5, maxDetentionMin: 12.0, historicalOccurrenceCount: 17,
        vulnerabilityReason: "Reverse curve speed braking & gate closure wait."
      },
    ]
  },
  {
    id: "SECTOR-PAN-BRIDGE",
    rank: 6,
    sectorName: "Shrirangapatna – Cauvery River Bridge Curve",
    chainageKm: "KM 14.50 ➔ KM 19.50",
    startKm: 14.5,
    endKm: 19.5,
    totalCumulativeDelayMin: 64.0,
    delayFrequencyPct: 50.0,
    delayedTrainsCount: 8,
    totalObservedTrains: 16,
    avgDelayPerTrainMin: 3.8,
    maxSingleDetentionMin: 12.0,
    primaryCause: "Permanent Speed Restriction (PSR 45 km/h) over R-350m curve and Cauvery River Bridge",
    causeCategory: "Track Curvature PSR",
    speedCapKmph: 45.0,
    mitigationStrategy: "Track cant modification and curve transition realignment",
    etaPredictionRiskWeight: 1.10,
    affectedTrainsList: [
      {
        trainId: "BOXN-58219", trainName: "Freight Coal Rake", trainType: "FREIGHT_BOXN",
        avgHistoricalDelayMin: 8.2, maxDetentionMin: 12.0, historicalOccurrenceCount: 14,
        vulnerabilityReason: "Heavy rake forced to hard-brake before bridge approach."
      },
      {
        trainId: "16586", trainName: "MRDW - SMVB Express", trainType: "EXPRESS",
        avgHistoricalDelayMin: 3.5, maxDetentionMin: 8.0, historicalOccurrenceCount: 12,
        vulnerabilityReason: "Bridge caution slowing momentum loss."
      },
    ]
  }
];

export function getCorridorSectorHotspots(): SectorHotspot[] {
  return CORRIDOR_SECTOR_HOTSPOTS;
}

export function resolveTrainPrimaryVulnerabilitySector(
  train: TrainConfig,
  activeClockMinutes?: number
): TrainVulnerabilitySector {
  const trainId = train.id;
  const ttype = train.type;

  if (trainId === "BOXN-58219" || ttype === "FREIGHT_BOXN") {
    return {
      trainId: train.id,
      trainName: train.name,
      primarySectorId: "SECTOR-BID-PRECEDENCE",
      primarySectorName: "Bidadi Precedence & Loop Stabling Hub",
      chainageRangeKm: "KM 106.0 ➔ KM 109.5",
      startKm: 106.0,
      endKm: 109.5,
      historicalAverageDelayMin: 32.0,
      historicalOccurrenceFrequencyPct: 88.0,
      maxHistoricalDetentionMin: 38.0,
      riskLevel: "CRITICAL_BOTTLENECK",
      vulnerabilityReason: "Looped on Loop Line 2 (30 km/h turnout) to allow Vande Bharat/Shatabdi overtakes.",
      dispatchActionAdvice: "Hold until high-speed Shatabdi 12008 clears Ramanagaram section.",
      etaBufferAdjustedMin: 14.5
    };
  } else if (trainId === "66552" || ttype === "MEMU") {
    return {
      trainId: train.id,
      trainName: train.name,
      primarySectorId: "SECTOR-KGI-SUBURBAN",
      primarySectorName: "Kengeri Suburban Hub & Nayandahalli Crossover",
      chainageRangeKm: "KM 122.0 ➔ KM 126.1",
      startKm: 122.0,
      endKm: 126.1,
      historicalAverageDelayMin: 14.2,
      historicalOccurrenceFrequencyPct: 94.0,
      maxHistoricalDetentionMin: 18.0,
      riskLevel: "CRITICAL_BOTTLENECK",
      vulnerabilityReason: "Severe commuter passenger crush loading extending dwell time by 3.5x.",
      dispatchActionAdvice: "Deploy station staff for coach clearing; authorize rapid green wave to SBC.",
      etaBufferAdjustedMin: 8.2
    };
  } else if (["16236", "16022"].includes(trainId)) {
    return {
      trainId: train.id,
      trainName: train.name,
      primarySectorId: "SECTOR-SBC-THROAT",
      primarySectorName: "KSR Bengaluru (SBC) Terminal Throat",
      chainageRangeKm: "KM 130.85 ➔ KM 138.25",
      startKm: 130.85,
      endKm: 138.25,
      historicalAverageDelayMin: 11.4,
      historicalOccurrenceFrequencyPct: 92.0,
      maxHistoricalDetentionMin: 24.0,
      riskLevel: "CRITICAL_BOTTLENECK",
      vulnerabilityReason: "Late evening arrival slot clashing with inter-state express departures at SBC outer.",
      dispatchActionAdvice: "Pre-set Route Relay Interlocking route into Platform 5 early.",
      etaBufferAdjustedMin: 7.4
    };
  } else if (["12613", "16215"].includes(trainId)) {
    return {
      trainId: train.id,
      trainName: train.name,
      primarySectorId: "SECTOR-MYA-TURNOUT",
      primarySectorName: "Mandya Junction Platform Neck & Turnouts",
      chainageRangeKm: "KM 43.0 ➔ KM 47.5",
      startKm: 43.0,
      endKm: 47.5,
      historicalAverageDelayMin: 6.2,
      historicalOccurrenceFrequencyPct: 78.0,
      maxHistoricalDetentionMin: 14.0,
      riskLevel: "HIGH_RISK",
      vulnerabilityReason: "Major passenger boarding surge & 30 km/h turnout divergence onto Platform 1.",
      dispatchActionAdvice: "Prioritize main line platform route to avoid turnout speed cap.",
      etaBufferAdjustedMin: 4.5
    };
  } else {
    return {
      trainId: train.id,
      trainName: train.name,
      primarySectorId: "SECTOR-SBC-THROAT",
      primarySectorName: "KSR Bengaluru (SBC) Terminal Approach Throat",
      chainageRangeKm: "KM 130.85 ➔ KM 138.25",
      startKm: 130.85,
      endKm: 138.25,
      historicalAverageDelayMin: 3.5,
      historicalOccurrenceFrequencyPct: 55.0,
      maxHistoricalDetentionMin: 8.0,
      riskLevel: "MODERATE_RISK",
      vulnerabilityReason: "SBC yard reception diamond crossings and 15 km/h neck crossover caution.",
      dispatchActionAdvice: "Enforce automatic priority green wave at Nayandahalli Outer.",
      etaBufferAdjustedMin: 2.2
    };
  }
}

/**
 * Resolves the immediately preceding train running ahead of the target train along the corridor.
 */
export function resolveClientPrecedingTrainContext(params: {
  currentTrain: TrainConfig;
  activeClockMinutes?: number;
  injectedDelayMin?: number;
}): PrecedingTrainContext {
  const currentTrain = params.currentTrain;
  const curKm = currentTrain.currentLocationKm;
  const curDepMins = parseTimeToMinutes(currentTrain.scheduledDep);
  const clock = params.activeClockMinutes || curDepMins + (curKm / 138.25) * 120.0;

  const candidates: {
    train: TrainConfig;
    otherKm: number;
    distAheadKm: number;
    timeGapMins: number;
  }[] = [];

  ALL_CORRIDOR_FLEET.forEach((other) => {
    if (other.id === currentTrain.id) return;

    const oDep = parseTimeToMinutes(other.scheduledDep);
    let oArr = parseTimeToMinutes(other.scheduledArr);
    if (oArr < oDep) oArr += 1440;
    const dur = oArr - oDep;

    if (oDep <= clock && clock <= oArr) {
      const prog = (clock - oDep) / Math.max(1, dur);
      const otherKm = prog * 138.25;
      if (otherKm >= curKm) {
        const distAhead = otherKm - curKm;
        const timeGap = (curDepMins - oDep + 1440) % 1440;
        candidates.push({
          train: other,
          otherKm,
          distAheadKm: distAhead,
          timeGapMins: timeGap,
        });
      }
    }
  });

  if (candidates.length === 0) {
    return {
      hasPrecedingTrain: false,
      leadTrainDelayDeltaMin: 0,
      sectionFrictionIndex: 0.1,
      rippleDelayPropagatedMin: 0,
      headwayCompressionRisk: "NOMINAL_GREEN",
      operationalSummary: "Clear track headway ahead with no conflicting lead train.",
    };
  }

  candidates.sort((a, b) => a.distAheadKm - b.distAheadKm);
  const lead = candidates[0]!;

  const distKm = Math.round(lead.distAheadKm * 10) / 10;
  const gapMin = Math.round(Math.max(4, lead.timeGapMins) * 10) / 10;

  let leadDelayDelta = lead.train.type === "MEMU" || lead.train.type === "FREIGHT_BOXN" ? 4.8 : 1.5;
  if (gapMin < 12) leadDelayDelta += 2.2;

  const secFriction = Math.min(0.95, Math.max(0.1, 0.2 + leadDelayDelta / 20 + (1.0 - Math.min(1.0, distKm / 25.0)) * 0.4));

  let rippleMin = 0;
  let risk: "NOMINAL_GREEN" | "CAUTION_AMBER" | "HIGH_RISK_BRAKING" = "NOMINAL_GREEN";
  let summary = "";

  if (gapMin < 8) {
    rippleMin = Math.round(((8.0 - gapMin) * 0.75 + leadDelayDelta * 0.45) * 10) / 10;
    risk = "HIGH_RISK_BRAKING";
    summary = `Severe headway compression (${distKm} km / ${gapMin}m behind ${lead.train.name}). Caution/amber aspect signal checks active.`;
  } else if (gapMin < 15 && leadDelayDelta > 3.0) {
    rippleMin = Math.round((leadDelayDelta * 0.35) * 10) / 10;
    risk = "CAUTION_AMBER";
    summary = `Lead train ${lead.train.name} incurred +${leadDelayDelta}m detention at recent section. Deceleration risk propagated.`;
  } else {
    rippleMin = 0;
    risk = "NOMINAL_GREEN";
    summary = `Optimal safe separation (${distKm} km / ${gapMin}m behind ${lead.train.name}). Green wave clearance.`;
  }

  return {
    hasPrecedingTrain: true,
    leadTrainId: lead.train.id,
    leadTrainName: lead.train.name,
    leadTrainType: lead.train.type,
    leadTrainLocationKm: Math.round(lead.otherKm * 10) / 10,
    headwayDistanceKm: distKm,
    headwayGapMinutes: gapMin,
    leadTrainDelayDeltaMin: leadDelayDelta,
    leadTrainLastSection: `KM ${Math.round(lead.otherKm)} Block`,
    sectionFrictionIndex: Math.round(secFriction * 100) / 100,
    rippleDelayPropagatedMin: rippleMin,
    headwayCompressionRisk: risk,
    operationalSummary: summary,
  };
}

/**
 * Computes live friction and degradation state for all 8 corridor blocks.
 */
export function computeClientSectionFrictions(params?: {
  environment?: EnvironmentalConditions;
  activeClockMinutes?: number;
}): SectionFriction[] {
  const clockMins = params?.activeClockMinutes ?? 840;
  const hour = Math.floor((clockMins % 1440) / 60);
  const isPeak = (params?.environment?.commuterSurgeMultiplier ?? 1.0) > 1.2 || (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);
  const weather = params?.environment?.weather || "CLEAR";

  return CORRIDOR_BLOCK_SECTIONS.map((sec) => {
    let baseFriction = isPeak ? 0.28 : 0.12;
    if (sec.code.includes("BID-KGI") || sec.code.includes("KGI-SBC")) {
      baseFriction += isPeak ? 0.35 : 0.18;
    }
    if (weather === "HEAVY_MONSOON" || weather === "DENSE_FOG") {
      baseFriction += 0.22;
    }

    const friction = Math.min(0.98, Math.max(0.05, Math.round(baseFriction * 100) / 100));

    let tier: "OPTIMAL" | "MODERATE_FRICTION" | "HEAVY_CONGESTION" | "BLOCKED_RESTRICTED" = "OPTIMAL";
    let reason = "Nominal line flow, clear automatic block spacing.";
    let delayRecorded = 0.0;

    if (friction >= 0.75) {
      tier = "BLOCKED_RESTRICTED";
      reason = "Turnout crossover maintenance & caution speed order active.";
      delayRecorded = 9.2;
    } else if (friction >= 0.5) {
      tier = "HEAVY_CONGESTION";
      reason = "Heavy terminal neck approach queue & passenger boarding surge.";
      delayRecorded = 5.8;
    } else if (friction >= 0.25) {
      tier = "MODERATE_FRICTION";
      reason = "LC gate vehicular clearance lag & curve PSR braking.";
      delayRecorded = 2.4;
    }

    return {
      sectionCode: sec.code,
      fromStation: sec.from,
      toStation: sec.to,
      startKm: sec.startKm,
      endKm: sec.endKm,
      lengthKm: Math.round((sec.endKm - sec.startKm) * 100) / 100,
      frictionScore: friction,
      degradationTier: tier,
      sectionalMpsKmph: sec.mps,
      lastTraversedTrainId: "12613",
      lastTraversedTrainName: "Wodeyar Superfast",
      delayRecordedMin: delayRecorded,
      activeRestrictionReason: reason,
    };
  });
}
