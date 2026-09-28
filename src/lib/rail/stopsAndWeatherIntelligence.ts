import { SWR_CORRIDOR_STATIONS } from "./infrastructure";
import { EnvironmentalConditions, getWeatherSpeedLimit } from "./restrictions";
import { TrainConfig } from "./types";

export interface WeatherZoneTelemetry {
  zoneId: string;
  zoneName: string;
  chainageKm: string;
  stationsCovered: string[];
  ambientTempC: number;
  railTempC: number;
  humidityPercent: number;
  visibilityMeters: number;
  windSpeedKmph: number;
  windDirection: string;
  precipitationMmPerHour: number;
  weatherCondition: "CLEAR" | "LIGHT_RAIN" | "HEAVY_MONSOON" | "DENSE_FOG" | "HEAT_EXPANSION";
  activeCautionOrder: string | null;
  speedCeilingKmph: number;
  brakingDistanceMultiplier: number;
  adhesionCoefficient: number;
}

export interface OperationalStopRecord {
  stationCode: string;
  stationName: string;
  chainageFromMysKm: number;
  stopType: "COMMERCIAL_HALT" | "OPERATIONAL_LOOP_STABLING" | "OUTER_SIGNAL_DETENTION" | "TECHNICAL_CAUTION_HALT";
  isScheduledCommercial: boolean;
  historicalDetentionLikelihoodPercent: number;
  averageHistoricalDetentionMin: number;
  primaryDelayFactor: string;
  secondaryTrigger: string;
  infrastructureAsset: string;
  riskTier: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  weatherSensitivity: "HIGH" | "MEDIUM" | "LOW";
  mitigationProtocol: string;
}

export interface TrainUnscheduledStopPrediction {
  stationCode: string;
  stationName: string;
  chainageKm: number;
  predictedStopReason: string;
  probabilityPercent: number;
  estimatedDelayIncurredMin: number;
  delayFactorCategory: "HEADWAY_OVERTAKE" | "TERMINAL_CONGESTION" | "DWELL_OVERRUN" | "WEATHER_RESTRICTION" | "PSR_DRAG";
  recommendedDispatcherAction: string;
}

/**
 * 5 Real-Time Corridor Micro-Climate Weather Zones (MYS ➔ SBC)
 */
export function getCorridorWeatherZones(globalWeather: EnvironmentalConditions["weather"]): WeatherZoneTelemetry[] {
  let isMonsoon = globalWeather === "HEAVY_MONSOON";
  let isFog = globalWeather === "DENSE_FOG";
  let isRain = globalWeather === "LIGHT_RAIN";

  return [
    {
      zoneId: "ZONE-01",
      zoneName: "Mysuru - Srirangapatna Cauvery Basin",
      chainageKm: "0.0 - 20.0 km",
      stationsCovered: ["MYS", "NHY", "S", "PANP"],
      ambientTempC: isMonsoon ? 21.5 : isFog ? 18.2 : 23.8,
      railTempC: isMonsoon ? 22.0 : isFog ? 17.5 : 28.4,
      humidityPercent: isMonsoon ? 95 : isFog ? 98 : 78,
      visibilityMeters: isFog ? 150 : isMonsoon ? 1200 : 9000,
      windSpeedKmph: isMonsoon ? 28 : 8,
      windDirection: "NW",
      precipitationMmPerHour: isMonsoon ? 32.5 : isRain ? 6.0 : 0.0,
      weatherCondition: globalWeather === "CLEAR" ? "CLEAR" : (globalWeather as any),
      activeCautionOrder: isMonsoon
        ? "Caution Order: Cauvery Bridge pier water level threshold - MPS derated to 45 km/h"
        : isFog
        ? "Fog Working Rules in effect: Fog PASS acoustic signals active - MPS derated to 30 km/h"
        : null,
      speedCeilingKmph: isFog ? 30 : isMonsoon ? 60 : isRain ? 90 : 130,
      brakingDistanceMultiplier: isMonsoon ? 1.48 : isFog ? 1.35 : isRain ? 1.20 : 1.0,
      adhesionCoefficient: isMonsoon ? 0.18 : isFog ? 0.22 : isRain ? 0.28 : 0.35,
    },
    {
      zoneId: "ZONE-02",
      zoneName: "Mandya - Maddur Sugarcane Plains",
      chainageKm: "20.0 - 65.0 km",
      stationsCovered: ["BDRL", "CGKR", "MYA", "HNK", "MAD"],
      ambientTempC: isMonsoon ? 22.8 : isFog ? 19.5 : 26.2,
      railTempC: isMonsoon ? 23.5 : isFog ? 19.0 : 32.0,
      humidityPercent: isMonsoon ? 90 : isFog ? 92 : 68,
      visibilityMeters: isFog ? 220 : isMonsoon ? 1800 : 10000,
      windSpeedKmph: isMonsoon ? 34 : 12,
      windDirection: "W",
      precipitationMmPerHour: isMonsoon ? 28.0 : isRain ? 4.5 : 0.0,
      weatherCondition: globalWeather === "CLEAR" ? "CLEAR" : (globalWeather as any),
      activeCautionOrder: isMonsoon ? "Crosswind gusts on open embankments: Pantograph sway vigilance" : null,
      speedCeilingKmph: isFog ? 30 : isMonsoon ? 60 : isRain ? 90 : 130,
      brakingDistanceMultiplier: isMonsoon ? 1.42 : isFog ? 1.30 : isRain ? 1.18 : 1.0,
      adhesionCoefficient: isMonsoon ? 0.20 : isFog ? 0.24 : isRain ? 0.30 : 0.35,
    },
    {
      zoneId: "ZONE-03",
      zoneName: "Settihalli - Ramanagaram Granite Cuttings",
      chainageKm: "65.0 - 95.0 km",
      stationsCovered: ["SET", "CPT", "RMGM"],
      ambientTempC: isMonsoon ? 23.2 : isFog ? 20.0 : 27.5,
      railTempC: isMonsoon ? 24.0 : isFog ? 19.8 : 35.8,
      humidityPercent: isMonsoon ? 88 : isFog ? 90 : 64,
      visibilityMeters: isFog ? 180 : isMonsoon ? 1500 : 9500,
      windSpeedKmph: isMonsoon ? 30 : 10,
      windDirection: "WNW",
      precipitationMmPerHour: isMonsoon ? 35.0 : isRain ? 5.0 : 0.0,
      weatherCondition: globalWeather === "CLEAR" ? "CLEAR" : (globalWeather as any),
      activeCautionOrder: "Permanent TSR: 80 km/h rock cutting curve #14 & 1:150 gradient adhesion zone",
      speedCeilingKmph: isFog ? 30 : isMonsoon ? 60 : isRain ? 80 : 110,
      brakingDistanceMultiplier: isMonsoon ? 1.55 : isFog ? 1.40 : isRain ? 1.25 : 1.05,
      adhesionCoefficient: isMonsoon ? 0.17 : isFog ? 0.21 : isRain ? 0.27 : 0.34,
    },
    {
      zoneId: "ZONE-04",
      zoneName: "Bidadi - Hejjala Industrial Loop Corridor",
      chainageKm: "95.0 - 118.0 km",
      stationsCovered: ["BID", "HJL"],
      ambientTempC: isMonsoon ? 22.0 : isFog ? 18.8 : 25.4,
      railTempC: isMonsoon ? 22.8 : isFog ? 18.2 : 30.5,
      humidityPercent: isMonsoon ? 92 : isFog ? 94 : 72,
      visibilityMeters: isFog ? 200 : isMonsoon ? 1600 : 8500,
      windSpeedKmph: isMonsoon ? 22 : 9,
      windDirection: "W",
      precipitationMmPerHour: isMonsoon ? 26.0 : isRain ? 4.0 : 0.0,
      weatherCondition: globalWeather === "CLEAR" ? "CLEAR" : (globalWeather as any),
      activeCautionOrder: null,
      speedCeilingKmph: isFog ? 30 : isMonsoon ? 60 : isRain ? 90 : 130,
      brakingDistanceMultiplier: isMonsoon ? 1.40 : isFog ? 1.30 : isRain ? 1.15 : 1.0,
      adhesionCoefficient: isMonsoon ? 0.21 : isFog ? 0.25 : isRain ? 0.31 : 0.36,
    },
    {
      zoneId: "ZONE-05",
      zoneName: "Kengeri - SBC Bengaluru Urban Terminal",
      chainageKm: "118.0 - 138.25 km",
      stationsCovered: ["KGI", "NYH", "SBC"],
      ambientTempC: isMonsoon ? 20.8 : isFog ? 17.5 : 24.2,
      railTempC: isMonsoon ? 21.5 : isFog ? 17.0 : 28.0,
      humidityPercent: isMonsoon ? 96 : isFog ? 99 : 80,
      visibilityMeters: isFog ? 100 : isMonsoon ? 1000 : 7000,
      windSpeedKmph: isMonsoon ? 20 : 7,
      windDirection: "SW",
      precipitationMmPerHour: isMonsoon ? 40.0 : isRain ? 8.0 : 0.0,
      weatherCondition: globalWeather === "CLEAR" ? "CLEAR" : (globalWeather as any),
      activeCautionOrder: isFog
        ? "Dense Terminal Smog/Fog: Automatic Block Signal spacing distance increased to 2 blocks"
        : "Terminal Throat PSR: 15 km/h over Yard crossovers into Platforms 1-10",
      speedCeilingKmph: isFog ? 30 : isMonsoon ? 50 : isRain ? 75 : 110,
      brakingDistanceMultiplier: isMonsoon ? 1.60 : isFog ? 1.45 : isRain ? 1.25 : 1.0,
      adhesionCoefficient: isMonsoon ? 0.16 : isFog ? 0.20 : isRain ? 0.26 : 0.33,
    },
  ];
}

/**
 * Master List of All Corridor Potential Stops (Scheduled Commercial & Unscheduled Operational Detentions)
 */
export const CORRIDOR_POTENTIAL_STOPS: OperationalStopRecord[] = [
  {
    stationCode: "MYS",
    stationName: "Mysuru Junction",
    chainageFromMysKm: 0.0,
    stopType: "COMMERCIAL_HALT",
    isScheduledCommercial: true,
    historicalDetentionLikelihoodPercent: 18,
    averageHistoricalDetentionMin: 4.2,
    primaryDelayFactor: "Yard rake placement & pneumatic air pressure brake certificate clearance",
    secondaryTrigger: "Connecting passenger train transfer buffer delay",
    infrastructureAsset: "Platforms 1-6 & MYS Coach Care Yard",
    riskTier: "LOW",
    weatherSensitivity: "LOW",
    mitigationProtocol: "Mandate rake shunting to platform 30m before scheduled departure.",
  },
  {
    stationCode: "S",
    stationName: "Shrirangapatna Cauvery Bridge Outer",
    chainageFromMysKm: 14.75,
    stopType: "TECHNICAL_CAUTION_HALT",
    isScheduledCommercial: false,
    historicalDetentionLikelihoodPercent: 24,
    averageHistoricalDetentionMin: 5.5,
    primaryDelayFactor: "Permanent 45 km/h PSR over Cauvery River piers & monsoon water monitoring",
    secondaryTrigger: "Track tamping machine block clearance",
    infrastructureAsset: "Bridge No. 42 (Cauvery South/North spans)",
    riskTier: "MODERATE",
    weatherSensitivity: "HIGH",
    mitigationProtocol: "Dynamic speed profiling; real-time water ultrasonic telemetry.",
  },
  {
    stationCode: "MYA",
    stationName: "Mandya Yard & Platforms",
    chainageFromMysKm: 45.366,
    stopType: "COMMERCIAL_HALT",
    isScheduledCommercial: true,
    historicalDetentionLikelihoodPercent: 62,
    averageHistoricalDetentionMin: 5.8,
    primaryDelayFactor: "Suburban office crowd unreserved coach boarding & luggage parcel loading",
    secondaryTrigger: "Preceding goods rake shunting on Mandya Goods Loop",
    infrastructureAsset: "Platforms 1-3 & Goods Siding Line 4",
    riskTier: "HIGH",
    weatherSensitivity: "MEDIUM",
    mitigationProtocol: "Station marshal crowd control & strict 60-second dwell whistle enforcement.",
  },
  {
    stationCode: "MAD",
    stationName: "Maddur Loop Line 3",
    chainageFromMysKm: 63.83,
    stopType: "OPERATIONAL_LOOP_STABLING",
    isScheduledCommercial: true,
    historicalDetentionLikelihoodPercent: 44,
    averageHistoricalDetentionMin: 11.5,
    primaryDelayFactor: "Loop line stabling of MEMU/Passenger rakes for Vande Bharat/Shatabdi overtake",
    secondaryTrigger: "Down line freight rake crossing",
    infrastructureAsset: "Loop Line 3 (30 km/h turnout)",
    riskTier: "HIGH",
    weatherSensitivity: "LOW",
    mitigationProtocol: "Dynamic overtake dispatching only when express is within 12 km distance.",
  },
  {
    stationCode: "SET",
    stationName: "Settihalli Gradient Siding",
    chainageFromMysKm: 72.8,
    stopType: "TECHNICAL_CAUTION_HALT",
    isScheduledCommercial: false,
    historicalDetentionLikelihoodPercent: 20,
    averageHistoricalDetentionMin: 8.0,
    primaryDelayFactor: "1:150 rising gradient adhesion slip on heavy 22-coach or freight rakes",
    secondaryTrigger: "Wet rail surface due to morning condensation",
    infrastructureAsset: "Gradient Cut-Off Signal ABS-SET-02",
    riskTier: "MODERATE",
    weatherSensitivity: "HIGH",
    mitigationProtocol: "Automatic wheel sanding activation and traction current boost.",
  },
  {
    stationCode: "RMGM",
    stationName: "Ramanagaram Rock Cuttings & Outer",
    chainageFromMysKm: 93.2,
    stopType: "TECHNICAL_CAUTION_HALT",
    isScheduledCommercial: true,
    historicalDetentionLikelihoodPercent: 36,
    averageHistoricalDetentionMin: 4.8,
    primaryDelayFactor: "80 km/h PSR through granite rock cuttings & curve #14 speed restriction",
    secondaryTrigger: "Level crossing gate closure road traffic congestion",
    infrastructureAsset: "Platforms 1-3, Curve #14 & LC-Gate 41",
    riskTier: "MODERATE",
    weatherSensitivity: "MEDIUM",
    mitigationProtocol: "Pre-close LC-gate 41 4 minutes in advance via automated interlocking.",
  },
  {
    stationCode: "BID",
    stationName: "Bidadi Loop Lines 2 & 3",
    chainageFromMysKm: 108.626,
    stopType: "OPERATIONAL_LOOP_STABLING",
    isScheduledCommercial: false,
    historicalDetentionLikelihoodPercent: 72,
    averageHistoricalDetentionMin: 14.2,
    primaryDelayFactor: "Overtake stabling on Loop Line 2 for Wodeyar SF / Shatabdi / Vande Bharat",
    secondaryTrigger: "Automobile freight rake staging for Whitefield Goods Yard",
    infrastructureAsset: "Bidadi Goods Loop Lines 2, 3 & 4 (30 km/h)",
    riskTier: "CRITICAL",
    weatherSensitivity: "LOW",
    mitigationProtocol: "Re-slot preceding MEMU departures by +8m to eliminate loop line detention.",
  },
  {
    stationCode: "KGI",
    stationName: "Kengeri Suburban Junction",
    chainageFromMysKm: 126.032,
    stopType: "COMMERCIAL_HALT",
    isScheduledCommercial: true,
    historicalDetentionLikelihoodPercent: 68,
    averageHistoricalDetentionMin: 6.4,
    primaryDelayFactor: "Massive Bangalore IT/Metro commuter transfer surge (dwells blow out to 6m)",
    secondaryTrigger: "Suburban EMU crossing from Yesvantpur chord line",
    infrastructureAsset: "Platforms 1-4 & KGI Metro Interchange",
    riskTier: "HIGH",
    weatherSensitivity: "MEDIUM",
    mitigationProtocol: "Deploy twin platform door-side boarding marshals during morning/evening peaks.",
  },
  {
    stationCode: "NYH",
    stationName: "Nayandahalli Outer Junction Home Signal",
    chainageFromMysKm: 130.85,
    stopType: "OUTER_SIGNAL_DETENTION",
    isScheduledCommercial: false,
    historicalDetentionLikelihoodPercent: 82,
    averageHistoricalDetentionMin: 9.6,
    primaryDelayFactor: "Held at Home Signal awaiting platform clearance and route lock at KSR Bengaluru (SBC)",
    secondaryTrigger: "SBC PF 1-4 empty rake shunting conflicting with incoming main line path",
    infrastructureAsset: "Home Signal ABS-NYH-UP-01 & South Interlocking Cabin",
    riskTier: "CRITICAL",
    weatherSensitivity: "HIGH",
    mitigationProtocol: "Automated Platform Allocation System (APAS) to assign SBC PF 15 min in advance.",
  },
  {
    stationCode: "SBC",
    stationName: "KSR Bengaluru City Junction (Terminus)",
    chainageFromMysKm: 138.25,
    stopType: "COMMERCIAL_HALT",
    isScheduledCommercial: true,
    historicalDetentionLikelihoodPercent: 48,
    averageHistoricalDetentionMin: 4.5,
    primaryDelayFactor: "15 km/h crossover speed restriction over terminal points & throat crossovers",
    secondaryTrigger: "Simultaneous departure of outbound expresses on adjacent tracks",
    infrastructureAsset: "Platforms 1-10 & Terminal Route Relay Interlocking (RRI)",
    riskTier: "HIGH",
    weatherSensitivity: "MEDIUM",
    mitigationProtocol: "Main line direct route locked 10 minutes before train reaches Nayandahalli.",
  },
];

/**
 * Predict exact potential unscheduled stops for a specific train based on current live conditions
 */
export function predictTrainUnscheduledStops(
  train: TrainConfig,
  currentDelayMin: number,
  weather: EnvironmentalConditions["weather"],
  clockMinutes: number
): TrainUnscheduledStopPrediction[] {
  const predictions: TrainUnscheduledStopPrediction[] = [];
  const isFreightOrMemu = train.type === "FREIGHT_BOXN" || train.type === "MEMU";
  const isPremierExpress = train.type === "VANDE_BHARAT" || train.type === "SHATABDI" || train.type === "SUPERFAST";

  // 1. Check Bidadi Loop Siding Overtake Stop
  if (isFreightOrMemu) {
    predictions.push({
      stationCode: "BID",
      stationName: "Bidadi Loop Line 2/3",
      chainageKm: 108.626,
      predictedStopReason: "Operational loop stabling (12-15m) to allow following Superfast/Vande Bharat to overtake",
      probabilityPercent: 78,
      estimatedDelayIncurredMin: 14,
      delayFactorCategory: "HEADWAY_OVERTAKE",
      recommendedDispatcherAction: "Dispatch train into main line section with minimum 8 min headway gap.",
    });
  }

  // 2. Check Nayandahalli Outer Junction Detention
  const isPeakHour = (clockMinutes >= 420 && clockMinutes <= 630) || (clockMinutes >= 1020 && clockMinutes <= 1260);
  const nayandahalliProb = isPeakHour ? 85 : currentDelayMin > 5 ? 70 : 45;
  predictions.push({
    stationCode: "NYH",
    stationName: "Nayandahalli Outer Home Signal",
    chainageKm: 130.85,
    predictedStopReason: "Held at signal (6-10m) awaiting platform clearance at KSR Bengaluru City (SBC)",
    probabilityPercent: nayandahalliProb,
    estimatedDelayIncurredMin: isPeakHour ? 9 : 5,
    delayFactorCategory: "TERMINAL_CONGESTION",
    recommendedDispatcherAction: "Pre-lock Platform 5 or 6 route prior to train passing Kengeri.",
  });

  // 3. Check Commuter Surge Dwell at Mandya / Kengeri
  if (train.scheduledStops.includes("MYA") && isPeakHour) {
    predictions.push({
      stationCode: "MYA",
      stationName: "Mandya Platform 1",
      chainageKm: 45.366,
      predictedStopReason: "Heavy unreserved commuter surge extending booked 2m dwell to 5-7 min",
      probabilityPercent: 82,
      estimatedDelayIncurredMin: 4,
      delayFactorCategory: "DWELL_OVERRUN",
      recommendedDispatcherAction: "Enforce automated 45s whistle and guard signal synchronization.",
    });
  }

  // 4. Check Weather Restrictions
  if (weather === "HEAVY_MONSOON" || weather === "DENSE_FOG") {
    predictions.push({
      stationCode: "S",
      stationName: "Cauvery Bridge Pier Check",
      chainageKm: 14.75,
      predictedStopReason: weather === "DENSE_FOG"
        ? "Fog Working Stop: Visibility below 100m, Fog PASS acoustic detonation spacing check"
        : "Monsoon Waterlogging Caution Halt: River pier water level verification",
      probabilityPercent: 65,
      estimatedDelayIncurredMin: weather === "DENSE_FOG" ? 8 : 4,
      delayFactorCategory: "WEATHER_RESTRICTION",
      recommendedDispatcherAction: "Authorize automatic visual green wave with remote ultrasonic sensor confirmation.",
    });
  }

  return predictions;
}
