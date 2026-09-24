export type RollingStockType =
  | "VANDE_BHARAT"
  | "SHATABDI"
  | "SUPERFAST"
  | "EXPRESS"
  | "MEMU"
  | "FREIGHT_BOXN";

export interface StationNode {
  code: string;
  name: string;
  chainageFromSbcKm: number; // Official SWR reference (SBC = 0.000)
  distanceFromMysKm: number;  // Reversed distance (MYS = 0.000, SBC = 138.250)
  isMajorJunction: boolean;
  hasPassengerHalts: boolean;
  platformCount: number;
  hasLoopLine: boolean;
  loopSpeedKmph: number;      // 15 or 30 km/h (1:8.5 vs 1:12 turnouts)
  commuterSurgeProne?: boolean;
}

export interface SpeedRestrictionRecord {
  id: string;
  type: "PSR" | "TSR";
  fromChainageKm: number;
  toChainageKm: number;
  speedLimitKmph: number;
  direction: "UP" | "DOWN" | "BOTH";
  cause: string;
  authority: string;
  active: boolean;
}

export interface LevelCrossingGate {
  id: string;
  chainageKm: number;
  section: string;
  isInterlocked: boolean;
  normalRoadClosureSec: number;
  status: "LOCKED_CLOSED" | "OPEN_ROAD" | "DEFECT_HELD";
  signalDetentionMin: number;
}

export interface SignalAspectState {
  aspect: "GREEN" | "DOUBLE_YELLOW" | "YELLOW" | "RED";
  meaning: "Proceed" | "Attention" | "Caution" | "Danger / Stop";
  allowedSpeedKmph: number;
  blockLengthMeters: number;
  overlapMeters: number; // SWR 120m signal overlap
}

export interface TrainConfig {
  id: string;
  name: string;
  type: RollingStockType;
  priorityTier: 1 | 2 | 3 | 4; // 1 = Vande Bharat/Shatabdi, 2 = SF/Exp, 3 = MEMU, 4 = Freight
  scheduledDep: string;
  scheduledArr: string;
  origin: string;
  destination: string;
  locoType: string;
  coaches: number;
  sectionalMpsKmph: number;
  nominalDecelerationMps2: number; // 0.2 - 1.0 m/s^2
  currentLocationKm: number;       // Distance from MYS (0 to 138.250)
  currentSpeedKmph: number;
  initialDelayMin: number;
  scheduledStops: string[];        // Array of station codes where this train halts
  dwellMinutes?: Record<string, number>; // Specific halt dwell durations (e.g. { "MYA": 2 })
}

export interface DynamicPredictionResult {
  train: TrainConfig;
  traditionalStaticEta: string;     // Booked + Live Delay (Naive)
  traditionalStaticDelayMin: number;
  railrakshakDynamicEta: string;    // Dual-Core Kinematic + ML
  railrakshakDynamicDelayMin: number;
  slackRecoveredMin: number;
  bottlenecksIncurredMin: number;
  speedRestrictionPenaltyMin: number;
  signalHaltsPenaltyMin: number;
  shapFactors: ShapAttributionFactor[];
  stationBreakdown: StationForecastRow[];
  confidenceInterval?: {
    lowerEta: string;
    upperEta: string;
    lowerDelayMin: number;
    upperDelayMin: number;
    confidencePct: number;
    rmseMarginMin: number;
  };
  modelConfidenceScore?: number;
  engineVersion?: string;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
  description: string;
}

export interface ModelMetadata {
  modelName: string;
  algorithm: string;
  version: string;
  status: string;
  corridor: string;
  evaluationMetrics: {
    r2Score: number;
    meanAbsoluteErrorMin: number;
    rootMeanSquaredErrorMin: number;
    sampleCount: number;
    featuresCount: number;
    trainedAt: string;
  };
  topFeatureImportances: FeatureImportanceItem[];
  shapExplainerReady: boolean;
}

export interface ShapAttributionFactor {
  category:
    | "Speed Restrictions"
    | "Signaling & Headway"
    | "Precedence & Loop"
    | "LC Gate & Incident"
    | "Commuter Surge"
    | "Weather & Visibility"
    | "Traction & OHE Power"
    | "Terminal Outer Choke"
    | "Mechanical & WILD Safety"
    | "Watering & Sanitation"
    | "Timetable Buffer Slack";
  name: string;
  impactMinutes: number; // Positive = Delay increase, Negative = Recovery
  type: "delay" | "recovery";
  rationale: string;
}

export interface StationForecastRow {
  code: string;
  name: string;
  chainageFromSbcKm: number;
  distanceFromMysKm: number;
  isScheduledHalt: boolean;
  haltDwellMin: number;
  bookedTime: string;
  predictedTime: string;
  predictedDelayMin: number;
  allowedSpeedKmph: number;
  signalAspect: "GREEN" | "DOUBLE_YELLOW" | "YELLOW" | "RED";
  trackStatus: "CLEARED" | "CURRENT_RUNNING" | "FORECASTED";
  turnoutRoute: "MAIN_LINE" | "LOOP_LINE_STABLED";
}
