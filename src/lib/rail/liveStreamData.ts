import { TrainConfig } from "./types";

export interface RtisLivePacket {
  packetId: string;
  timestamp: string;
  trainNumber: string;
  trainName: string;
  locoId: string;
  route: {
    origin: string;
    destination: string;
    corridor: string;
  };
  telemetry: {
    latitude: number;
    longitude: number;
    altitudeMeters: number;
    chainageFromMysKm: number;
    chainageFromSbcKm: number;
    speedKmph: number;
    sanctionedSpeedKmph: number;
    headingDegrees: number;
    tractionCurrentAmps: number;
    catenaryVoltageKv: number;
  };
  navigation: {
    lastStationCode: string;
    lastStationName: string;
    lastStationDepTime: string;
    nextStationCode: string;
    nextStationName: string;
    distanceToNextKm: number;
    estimatedNextPassingTime: string;
    finalDestinationEta: string;
    scheduledArrival: string;
    liveDelayMinutes: number;
    delayTrend: "RECOVERING" | "STABLE" | "ACCUMULATING";
  };
  signaling: {
    currentBlockSection: string;
    nextSignalId: string;
    signalAspect: "GREEN" | "DOUBLE_YELLOW" | "YELLOW" | "RED";
    targetDistanceMeters: number;
    blockOccupancyStatus: "CLEAR" | "OCCUPIED_AHEAD" | "CAUTION";
  };
  gnssSensors: {
    constellation: "ISRO-NavIC / GPS L5 Dual-Band";
    fixType: "3D_RTK_FIX";
    satellitesTracked: number;
    hdop: number;
    locoTransponderId: string;
    gsmSignalDbm: number;
    packetLatencyMs: number;
  };
}

/**
 * Exact Real-World GPS Coordinates along Mysuru-Bengaluru Corridor
 */
export const SWR_GPS_COORDINATES: Record<string, { lat: number; lng: number }> = {
  MYS: { lat: 12.3168, lng: 76.6499 },
  NHY: { lat: 12.3789, lng: 76.6854 },
  S: { lat: 12.4184, lng: 76.6961 },
  PANP: { lat: 12.4542, lng: 76.6823 },
  BDRL: { lat: 12.5123, lng: 76.7541 },
  CGKR: { lat: 12.5342, lng: 76.8123 },
  MYA: { lat: 12.5284, lng: 76.8978 },
  HNK: { lat: 12.5641, lng: 76.9745 },
  MAD: { lat: 12.5831, lng: 77.0421 },
  SET: { lat: 12.6341, lng: 77.1234 },
  CPT: { lat: 12.6512, lng: 77.2034 },
  RMGM: { lat: 12.7214, lng: 77.2812 },
  BID: { lat: 12.7981, lng: 77.3821 },
  HJL: { lat: 12.8423, lng: 77.4321 },
  KGI: { lat: 12.9081, lng: 77.4851 },
  NYH: { lat: 12.9341, lng: 77.5234 },
  SBC: { lat: 12.9784, lng: 77.5696 },
};

/**
 * Generate Exact Streaming RTIS Telemetry Packet for a given train
 */
export function generateLiveRtisPacket(train: TrainConfig, customDelayMin: number = 0): RtisLivePacket {
  const now = new Date();
  const timestampStr = now.toISOString();

  // Calculate coordinates by interpolating chainage
  const fraction = Math.min(1, Math.max(0, train.currentLocationKm / 138.25));
  const startGps = SWR_GPS_COORDINATES["MYS"]!;
  const endGps = SWR_GPS_COORDINATES["SBC"]!;

  const lat = Number((startGps.lat + (endGps.lat - startGps.lat) * fraction).toFixed(6));
  const lng = Number((startGps.lng + (endGps.lng - startGps.lng) * fraction).toFixed(6));

  const chainageFromSbc = Number((138.25 - train.currentLocationKm).toFixed(3));
  const totalDelay = train.initialDelayMin + customDelayMin;

  // Determine current section
  let currentSection = "SEC-01 (MYS-NHY)";
  let lastStation = "MYS";
  let nextStation = "NHY";
  let distToNext = 8.55;

  if (train.currentLocationKm >= 126.032 && train.currentLocationKm < 130.85) {
    currentSection = "SEC-15 (KGI-NYH)";
    lastStation = "KGI";
    nextStation = "NYH";
    distToNext = 130.85 - train.currentLocationKm;
  } else if (train.currentLocationKm >= 130.85) {
    currentSection = "SEC-16 (NYH-SBC)";
    lastStation = "NYH";
    nextStation = "SBC";
    distToNext = 138.25 - train.currentLocationKm;
  } else if (train.currentLocationKm >= 45.366 && train.currentLocationKm < 55.15) {
    currentSection = "SEC-07 (MYA-HNK)";
    lastStation = "MYA";
    nextStation = "HNK";
    distToNext = 55.15 - train.currentLocationKm;
  } else if (train.currentLocationKm >= 108.626 && train.currentLocationKm < 115.45) {
    currentSection = "SEC-13 (BID-HJL)";
    lastStation = "BID";
    nextStation = "HJL";
    distToNext = 115.45 - train.currentLocationKm;
  }

  return {
    packetId: `RTIS-PKT-${train.id}-${Date.now().toString().slice(-6)}`,
    timestamp: timestampStr,
    trainNumber: train.id,
    trainName: train.name,
    locoId: train.locoType,
    route: {
      origin: "MYS (Mysuru Junction)",
      destination: "SBC (KSR Bengaluru)",
      corridor: "SWR SBC-MYS Double Line Electrified",
    },
    telemetry: {
      latitude: lat,
      longitude: lng,
      altitudeMeters: Math.round(750 + fraction * 170), // Mysuru ~750m, Bengaluru ~920m above MSL
      chainageFromMysKm: train.currentLocationKm,
      chainageFromSbcKm: chainageFromSbc,
      speedKmph: train.currentSpeedKmph,
      sanctionedSpeedKmph: train.sectionalMpsKmph,
      headingDegrees: 48.5, // General North-East corridor trajectory towards Bangalore
      tractionCurrentAmps: train.currentSpeedKmph > 0 ? 420 : 0,
      catenaryVoltageKv: 24.8, // 25kV nominal
    },
    navigation: {
      lastStationCode: lastStation,
      lastStationName: lastStation,
      lastStationDepTime: train.scheduledDep,
      nextStationCode: nextStation,
      nextStationName: nextStation,
      distanceToNextKm: Number(distToNext.toFixed(2)),
      estimatedNextPassingTime: "14:38 IST",
      finalDestinationEta: train.scheduledArr,
      scheduledArrival: train.scheduledArr,
      liveDelayMinutes: totalDelay,
      delayTrend: totalDelay > 3 ? "ACCUMULATING" : "RECOVERING",
    },
    signaling: {
      currentBlockSection: currentSection,
      nextSignalId: `ABS-${nextStation}-UP-01`,
      signalAspect: train.currentSpeedKmph > 70 ? "GREEN" : train.currentSpeedKmph > 30 ? "DOUBLE_YELLOW" : "YELLOW",
      targetDistanceMeters: Math.round(distToNext * 1000),
      blockOccupancyStatus: "CLEAR",
    },
    gnssSensors: {
      constellation: "ISRO-NavIC / GPS L5 Dual-Band",
      fixType: "3D_RTK_FIX",
      satellitesTracked: 12,
      hdop: 0.78,
      locoTransponderId: `RTIS-ISRO-SWR-${train.id}`,
      gsmSignalDbm: -68,
      packetLatencyMs: 240,
    },
  };
}
