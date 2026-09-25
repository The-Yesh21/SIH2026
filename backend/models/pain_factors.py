from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal

RollingStockType = Literal[
    "VANDE_BHARAT",
    "SHATABDI",
    "SUPERFAST",
    "EXPRESS",
    "MEMU",
    "FREIGHT_BOXN"
]

PainFactorCategory = Literal[
    "SPEED_RESTRICTIONS",
    "SIGNALING_HEADWAY",
    "PRECEDENCE_LOOP",
    "LC_GATE_INCIDENT",
    "COMMUTER_SURGE",
    "WEATHER_ADHESION",
    "TRACTION_POWER_OHE",
    "TERMINAL_CHOKE",
    "MECHANICAL_SAFETY_WILD",
    "WATERING_SANITATION",
    "SINGLE_LINE_WORKING",
    "PRECEDING_TRAIN_IMPACT",
    "SECTOR_BOTTLENECK_HOTSPOT",
    "TIMETABLE_SLACK_RECOVERY"
]

PainFactorType = Literal[
    "UNSCHEDULED_LOOP_HOLD",
    "SIGNAL_ASPECT_DETENTION",
    "TSR_CAUTION_SLOWDOWN",
    "PSR_CURVE_GRADIENT_CAP",
    "LC_GATE_INTERLOCKING_HOLD",
    "LC_ROAD_TRAFFIC_JAM",
    "COMMUTER_DWELL_BLEED",
    "TERMINAL_THROAT_CHOKE",
    "OHE_VOLTAGE_SAG",
    "WET_RAIL_ADHESION_SLIP",
    "WILD_HOTBOX_INSPECTION",
    "WATERING_SANITATION_BLEED",
    "SINGLE_LINE_MEGABLOCK",
    "PRECEDING_TRAIN_HEADWAY_CHOKE",
    "SECTOR_RECURRENT_BOTTLENECK"
]

class EnvironmentalConditionsModel(BaseModel):
    weather: Literal["CLEAR", "FOG_MIST", "MONSOON_RAIN", "HEAVY_DOWNPOUR"] = "CLEAR"
    ambientTempCelsius: float = 28.0
    visibilityMeters: float = 5000.0
    railSurfaceCondition: Literal["DRY", "DAMP", "WET_SLIPPERY", "WATERLOGGED"] = "DRY"
    commuterSurgeMultiplier: float = 1.0
    isPeakHour: bool = False
    oheVoltageKv: float = 25.0
    wildAlarmActive: bool = False
    singleLineBlockActive: bool = False

class TrainConfigModel(BaseModel):
    id: str
    name: str
    type: RollingStockType
    priorityTier: int = Field(ge=1, le=4)
    scheduledDep: str
    scheduledArr: str
    origin: str = "MYS"
    destination: str = "SBC"
    locoType: str = "WAP-7"
    coaches: int = 16
    sectionalMpsKmph: float = 110.0
    nominalDecelerationMps2: float = 0.65
    currentLocationKm: float = 0.0
    currentSpeedKmph: float = 0.0
    initialDelayMin: float = 0.0
    scheduledStops: List[str]
    dwellMinutes: Optional[Dict[str, float]] = None

class LoopPenaltyDecompositionModel(BaseModel):
    turnoutDecelerationMin: float
    loopEntrySettlingMin: float
    stationaryHoldMin: float
    restartAccelerationMin: float
    rejoiningMainlineMin: float
    totalPenaltyMin: float

class PrecedingTrainContextModel(BaseModel):
    hasPrecedingTrain: bool = False
    leadTrainId: Optional[str] = None
    leadTrainName: Optional[str] = None
    leadTrainType: Optional[str] = None
    leadTrainLocationKm: Optional[float] = None
    headwayDistanceKm: Optional[float] = None
    headwayGapMinutes: Optional[float] = None
    leadTrainDelayDeltaMin: float = 0.0
    leadTrainLastSection: Optional[str] = None
    sectionFrictionIndex: float = 0.0
    rippleDelayPropagatedMin: float = 0.0
    headwayCompressionRisk: Literal["NOMINAL_GREEN", "CAUTION_AMBER", "HIGH_RISK_BRAKING"] = "NOMINAL_GREEN"
    operationalSummary: str = "Clear track headway ahead."

class SectionFrictionModel(BaseModel):
    sectionCode: str
    fromStation: str
    toStation: str
    startKm: float
    endKm: float
    lengthKm: float
    frictionScore: float
    degradationTier: Literal["OPTIMAL", "MODERATE_FRICTION", "HEAVY_CONGESTION", "BLOCKED_RESTRICTED"]
    sectionalMpsKmph: float
    lastTraversedTrainId: Optional[str] = None
    lastTraversedTrainName: Optional[str] = None
    delayRecordedMin: float = 0.0
    activeRestrictionReason: str

class AffectedTrainRecordModel(BaseModel):
    trainId: str
    trainName: str
    trainType: str
    avgHistoricalDelayMin: float
    maxDetentionMin: float
    historicalOccurrenceCount: int
    vulnerabilityReason: str

class SectorHotspotModel(BaseModel):
    id: str
    rank: int
    sectorName: str
    chainageKm: str
    startKm: float
    endKm: float
    totalCumulativeDelayMin: float
    delayFrequencyPct: float
    delayedTrainsCount: int
    totalObservedTrains: int = 16
    avgDelayPerTrainMin: float
    maxSingleDetentionMin: float
    primaryCause: str
    causeCategory: Literal["Terminal Throat", "Suburban Commuters", "Precedence & Loop", "Track Curvature PSR", "Level Crossing"]
    speedCapKmph: float
    affectedTrainsList: List[AffectedTrainRecordModel]
    mitigationStrategy: str
    etaPredictionRiskWeight: float

class TrainVulnerabilitySectorModel(BaseModel):
    trainId: str
    trainName: str
    primarySectorId: str
    primarySectorName: str
    chainageRangeKm: str
    startKm: float
    endKm: float
    historicalAverageDelayMin: float
    historicalOccurrenceFrequencyPct: float
    maxHistoricalDetentionMin: float
    riskLevel: Literal["CRITICAL_BOTTLENECK", "HIGH_RISK", "MODERATE_RISK", "LOW_RISK"]
    vulnerabilityReason: str
    dispatchActionAdvice: str
    etaBufferAdjustedMin: float

class IdentifiedPainIncidentModel(BaseModel):
    id: str
    stationCode: str
    stationName: str
    chainageKm: float
    type: PainFactorType
    category: PainFactorCategory
    severity: Literal["CRITICAL", "HIGH", "MODERATE", "MINOR"]
    penaltyDurationMin: float
    isUnscheduledHalt: bool
    overtakingTrainInfo: Optional[Dict[str, str | int]] = None
    loopPenaltyDecomposition: Optional[LoopPenaltyDecompositionModel] = None
    rootCauseDescription: str
    operationalImpact: str
    dispatchActionTaken: str

class ShapAttributionFactorModel(BaseModel):
    category: str
    name: str
    impactMinutes: float
    type: Literal["delay", "recovery"]
    rationale: str

class StationForecastRowModel(BaseModel):
    code: str
    name: str
    chainageFromSbcKm: float
    distanceFromMysKm: float
    isScheduledHalt: bool
    haltDwellMin: float
    bookedTime: str
    predictedTime: str
    predictedDelayMin: float
    allowedSpeedKmph: float
    signalAspect: Literal["GREEN", "DOUBLE_YELLOW", "YELLOW", "RED"]
    trackStatus: Literal["CLEARED", "CURRENT_RUNNING", "FORECASTED"]
    turnoutRoute: Literal["MAIN_LINE", "LOOP_LINE_STABLED"]

class CorridorPainSummaryModel(BaseModel):
    trainId: str
    trainName: str
    totalPainPenaltyMin: float
    unscheduledHaltsCount: int
    unscheduledHaltDurationMin: float
    speedRestrictionPenaltyMin: float
    signalDetentionMin: float
    terminalThroatPenaltyMin: float
    tractionLossPenaltyMin: float
    mechanicalSafetyPenaltyMin: float
    wateringBleedPenaltyMin: float
    incidents: List[IdentifiedPainIncidentModel]
    hotspotStationCodes: List[str]
    priorityConflictActive: bool
    precedenceSummary: str
    recoveryConfidenceTier: Literal[
        "HIGH_CONFIDENCE_RECOVERY",
        "MODERATE_RECOVERY",
        "MARGINAL_RECOVERY",
        "UNRECOVERABLE_COMPOUNDING"
    ]
    recoveryProbabilityPct: float

class ConfidenceIntervalModel(BaseModel):
    lowerEta: str
    upperEta: str
    lowerDelayMin: float
    upperDelayMin: float
    confidencePct: float = 95.0
    rmseMarginMin: float

class DynamicPredictionResponseModel(BaseModel):
    train: TrainConfigModel
    traditionalStaticEta: str
    traditionalStaticDelayMin: float
    railrakshakDynamicEta: str
    railrakshakDynamicDelayMin: float
    slackRecoveredMin: float
    bottlenecksIncurredMin: float
    speedRestrictionPenaltyMin: float
    signalHaltsPenaltyMin: float
    precedingTrainContext: Optional[PrecedingTrainContextModel] = None
    sectionFriction: Optional[List[SectionFrictionModel]] = None
    hotspotSectors: Optional[List[SectorHotspotModel]] = None
    primaryVulnerabilitySector: Optional[TrainVulnerabilitySectorModel] = None
    shapFactors: List[ShapAttributionFactorModel]
    stationBreakdown: List[StationForecastRowModel]
    painSummary: CorridorPainSummaryModel
    confidenceInterval: Optional[ConfidenceIntervalModel] = None
    modelConfidenceScore: float = 0.96
    engineVersion: str = "Python-ML-v3.0-LightGBM+SHAP"

class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float
    description: str

class ModelEvaluationMetrics(BaseModel):
    r2Score: float
    meanAbsoluteErrorMin: float
    rootMeanSquaredErrorMin: float
    sampleCount: int
    featuresCount: int
    trainedAt: str

class ModelMetadataResponseModel(BaseModel):
    modelName: str
    algorithm: str
    version: str
    status: str
    corridor: str
    evaluationMetrics: ModelEvaluationMetrics
    topFeatureImportances: List[FeatureImportanceItem]
    shapExplainerReady: bool

class RetrainResponseModel(BaseModel):
    status: str
    message: str
    trainingSamplesGenerated: int
    evaluationMetrics: ModelEvaluationMetrics

class ContinuousCorridorMonitorResponseModel(BaseModel):
    activeClockMinutes: float
    activeClockDisplay: str
    corridorHealthScorePct: float
    overallStatus: Literal["OPTIMAL_FLOW", "MODERATE_FRICTION", "SEVERE_CONGESTION"]
    activeTrainsCount: int
    sections: List[SectionFrictionModel]
    precedingTrainAlerts: List[str]
    recentCrossingsSummary: str
