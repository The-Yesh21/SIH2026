/**
 * SWR Corridor Mysuru -> Bengaluru GPS Waypoints & Geodesic Snapper
 */
export interface TrackWaypoint {
  code: string;
  name: string;
  km: number;
  lat: number;
  lon: number;
}

export const SWR_GPS_WAYPOINTS: TrackWaypoint[] = [
  { code: "MYS", name: "Mysuru Junction", km: 0.000, lat: 12.3164, lon: 76.6498 },
  { code: "NHY", name: "Naganahalli", km: 8.550, lat: 12.3734, lon: 76.6621 },
  { code: "S", name: "Shrirangapatna", km: 14.750, lat: 12.4180, lon: 76.6852 },
  { code: "PANP", name: "Pandavapura", km: 19.700, lat: 12.4412, lon: 76.6710 },
  { code: "BDRL", name: "Byadarahalli", km: 28.850, lat: 12.4815, lon: 76.7554 },
  { code: "CGKR", name: "Chandragirikopal", km: 35.050, lat: 12.5021, lon: 76.8123 },
  { code: "MYA", name: "Mandya", km: 45.366, lat: 12.5244, lon: 76.8967 },
  { code: "HNK", name: "Hanakere", km: 55.150, lat: 12.5512, lon: 76.9745 },
  { code: "MAD", name: "Maddur", km: 64.540, lat: 12.5852, lon: 77.0425 },
  { code: "SET", name: "Settihally", km: 75.350, lat: 12.6189, lon: 77.1320 },
  { code: "CPT", name: "Channapatna", km: 82.802, lat: 12.6518, lon: 77.2084 },
  { code: "RMGM", name: "Ramanagaram", km: 93.860, lat: 12.7235, lon: 77.2810 },
  { code: "BID", name: "Bidadi", km: 108.626, lat: 12.7981, lon: 77.3824 },
  { code: "HJL", name: "Hejjala", km: 115.450, lat: 12.8542, lon: 77.4289 },
  { code: "KGI", name: "Kengeri", km: 126.032, lat: 12.9121, lon: 77.4839 },
  { code: "NYH", name: "Nayandahalli", km: 130.850, lat: 12.9432, lon: 77.5211 },
  { code: "SBC", name: "KSR Bengaluru City", km: 138.250, lat: 12.9781, lon: 77.5695 },
];

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dlat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dlon = ((lon2 - lon1) * Math.PI) / 180.0;
  const a =
    Math.sin(dlat / 2.0) ** 2 +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dlon / 2.0) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  return R * c;
}

export interface SnappedGpsResult {
  snappedChainageKm: number;
  crossTrackOffsetMeters: number;
  nearestStationCode: string;
  nearestStationName: string;
  nextStationCode: string;
  nextStationName: string;
  distanceToNextStationKm: number;
  isOnCorridor: boolean;
}

export function snapGpsToCorridor(lat: number, lon: number): SnappedGpsResult {
  let minDistanceKm = Infinity;
  let nearestStation = SWR_GPS_WAYPOINTS[0]!;
  let bestKm = 0.0;

  for (let i = 0; i < SWR_GPS_WAYPOINTS.length - 1; i++) {
    const wp1 = SWR_GPS_WAYPOINTS[i]!;
    const wp2 = SWR_GPS_WAYPOINTS[i + 1]!;

    const segLengthKm = haversineDistanceKm(wp1.lat, wp1.lon, wp2.lat, wp2.lon);
    if (segLengthKm < 0.01) continue;

    const d1 = haversineDistanceKm(lat, lon, wp1.lat, wp1.lon);
    const d2 = haversineDistanceKm(lat, lon, wp2.lat, wp2.lon);

    // Orthogonal projection factor
    const t = Math.max(0, Math.min(1, (d1 ** 2 - d2 ** 2 + segLengthKm ** 2) / (2 * segLengthKm ** 2)));
    const projKm = wp1.km + t * (wp2.km - wp1.km);

    const projLat = wp1.lat + t * (wp2.lat - wp1.lat);
    const projLon = wp1.lon + t * (wp2.lon - wp1.lon);
    const distToSeg = haversineDistanceKm(lat, lon, projLat, projLon);

    if (distToSeg < minDistanceKm) {
      minDistanceKm = distToSeg;
      bestKm = projKm;
      nearestStation = d1 < d2 ? wp1 : wp2;
    }
  }

  let nextStation = SWR_GPS_WAYPOINTS[SWR_GPS_WAYPOINTS.length - 1]!;
  for (const wp of SWR_GPS_WAYPOINTS) {
    if (wp.km > bestKm) {
      nextStation = wp;
      break;
    }
  }

  const distanceToNext = Math.max(0, Number((nextStation.km - bestKm).toFixed(2)));

  return {
    snappedChainageKm: Math.max(0, Math.min(138.25, Number(bestKm.toFixed(3)))),
    crossTrackOffsetMeters: Math.round(minDistanceKm * 1000),
    nearestStationCode: nearestStation.code,
    nearestStationName: nearestStation.name,
    nextStationCode: nextStation.code,
    nextStationName: nextStation.name,
    distanceToNextStationKm: distanceToNext,
    isOnCorridor: minDistanceKm < 15.0,
  };
}

/**
 * Generate synthetic GPS coordinate along the track given chainage KM
 */
export function interpolateGpsFromChainageKm(km: number): { lat: number; lon: number } {
  const normKm = Math.max(0, Math.min(138.25, km));
  for (let i = 0; i < SWR_GPS_WAYPOINTS.length - 1; i++) {
    const wp1 = SWR_GPS_WAYPOINTS[i]!;
    const wp2 = SWR_GPS_WAYPOINTS[i + 1]!;
    if (normKm >= wp1.km && normKm <= wp2.km) {
      const frac = (normKm - wp1.km) / Math.max(0.01, wp2.km - wp1.km);
      return {
        lat: Number((wp1.lat + frac * (wp2.lat - wp1.lat)).toFixed(6)),
        lon: Number((wp1.lon + frac * (wp2.lon - wp1.lon)).toFixed(6)),
      };
    }
  }
  const last = SWR_GPS_WAYPOINTS[SWR_GPS_WAYPOINTS.length - 1]!;
  return { lat: last.lat, lon: last.lon };
}
