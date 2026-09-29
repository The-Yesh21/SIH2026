export interface TelemetryPacket {
  train_id: string;
  train_name?: string;
  loco_id?: string;
  driver_id?: string;
  latitude: number;
  longitude: number;
  gps_speed_kmph: number;
  heading_deg?: number;
  accuracy_meters?: number;
  altitude_meters?: number;
  battery_level_pct?: number;
  is_live_satellite?: boolean;
}

export interface LiveTelemetryResponse {
  train_id: string;
  train_name: string;
  loco_id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  gps_speed_kmph: number;
  heading_deg: number;
  accuracy_meters: number;
  altitude_meters: number;
  snapped_chainage_km: number;
  cross_track_offset_meters: number;
  nearest_station_code: string;
  nearest_station_name: string;
  distance_to_next_stop_km: number;
  next_stop_code: string;
  target_throttle_kmph: number;
  signal_aspect_ahead: "GREEN" | "DOUBLE_YELLOW" | "YELLOW" | "RED";
  battery_level_pct: number;
  is_live_satellite_feed: boolean;
  last_heartbeat_timestamp: string;
  status: "ACTIVE_RUNNING" | "STOPPED_AT_STATION" | "STANDBY_SCHEDULED" | "SIGNAL_LOST";
}

const RENDER_BACKEND_URL = "https://sih2026-9ugs.onrender.com";

const BACKEND_BASE =
  ((import.meta as any)?.env?.VITE_API_URL as string) ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? `http://${window.location.hostname}:8000`
    : RENDER_BACKEND_URL);

/**
 * Streams a single GPS packet to FastAPI backend
 */
export async function streamGpsPacket(
  packet: TelemetryPacket
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/telemetry/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(packet),
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    }
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err.message || "Network Error" };
  }
}

/**
 * Fetches all live train telemetry records from FastAPI in-memory buffer
 */
export async function fetchAllLiveTelemetry(): Promise<LiveTelemetryResponse[]> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/telemetry/live`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.fleet || [];
    }
  } catch (err) {}
  return [];
}

/**
 * Fetches specific train live telemetry record
 */
export async function fetchTrainLiveTelemetry(
  trainId: string
): Promise<LiveTelemetryResponse | null> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/telemetry/live/${trainId}`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}
  return null;
}

/**
 * Report driver flagged incident
 */
export async function reportDriverIncident(incident: {
  train_id: string;
  driver_id?: string;
  incident_type: string;
  reported_text?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/telemetry/incident`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(incident),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}
