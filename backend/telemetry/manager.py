import time
import datetime
import threading
from typing import Dict, Any, List, Optional
from fastapi import WebSocket

from telemetry.db import init_telemetry_db, log_telemetry_record, log_driver_incident, get_train_telemetry_history
from telemetry.track_snapper import snap_gps_to_corridor_chainage

class FleetTelemetryManager:
    """
    High-Performance In-Memory Stream Buffer for Real-Time Satellite Telemetry.
    Maintains current live GPS status for all active locomotives and pushes to WebSockets.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self.live_fleet_state: Dict[str, Dict[str, Any]] = {}
        self.active_websockets: List[WebSocket] = []
        init_telemetry_db()
        self._init_default_fleet_state()

    def _init_default_fleet_state(self):
        """
        Initializes in-memory slots for SWR 10-train fleet.
        """
        default_trains = [
            {"id": "20608", "name": "Vande Bharat Express", "loco": "EMU #20608", "km": 45.4, "mps": 130},
            {"id": "12008", "name": "Shatabdi Express", "loco": "WAP-7 #37012", "km": 0.0, "mps": 120},
            {"id": "12613", "name": "Wodeyar Superfast", "loco": "WAP-7 #30510", "km": 93.3, "mps": 110},
            {"id": "16022", "name": "Kaveri Express", "loco": "WAP-7 #30490", "km": 0.0, "mps": 110},
            {"id": "16215", "name": "Chamundi Express", "loco": "WAP-7 #30482", "km": 19.5, "mps": 110},
            {"id": "66552", "name": "Mysuru - SBC MEMU", "loco": "3-Phase MEMU #1104", "km": 64.3, "mps": 95},
            {"id": "16232", "name": "Mayiladuturai Express", "loco": "WAP-7 #30412", "km": 0.0, "mps": 110},
            {"id": "16236", "name": "Tuticorin Express", "loco": "WAP-7 #30355", "km": 0.0, "mps": 110},
            {"id": "16586", "name": "MRDW - SMVB Express", "loco": "WDP-4D #40182", "km": 108.0, "mps": 110},
            {"id": "BOXN-58219", "name": "BOXN Freight Rake", "loco": "Twin WAG-9HC #31890", "km": 126.0, "mps": 75},
        ]
        
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        for t in default_trains:
            self.live_fleet_state[t["id"]] = {
                "train_id": t["id"],
                "train_name": t["name"],
                "loco_id": t["loco"],
                "driver_id": f"SWR-LP-{t['id'][:4]}",
                "latitude": 12.3164,
                "longitude": 76.6498,
                "gps_speed_kmph": 0.0,
                "heading_deg": 48.0,
                "accuracy_meters": 3.0,
                "altitude_meters": 680.0,
                "snapped_chainage_km": t["km"],
                "nearest_station_code": "MYS",
                "nearest_station_name": "Mysuru Junction",
                "distance_to_next_stop_km": 19.7,
                "next_stop_code": "PANP",
                "target_throttle_kmph": t["mps"],
                "signal_aspect_ahead": "GREEN",
                "battery_level_pct": 98,
                "is_live_satellite_feed": False,
                "last_heartbeat_timestamp": now_iso,
                "last_heartbeat_epoch": time.time(),
                "status": "STANDBY_SCHEDULED"
            }

    def process_incoming_telemetry(self, packet: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ingests a raw GPS coordinate packet from a loco-pilot, snaps to track,
        updates in-memory state, and saves to SQLite in background.
        """
        train_id = str(packet.get("train_id", "20608"))
        lat = float(packet.get("latitude", 12.3164))
        lon = float(packet.get("longitude", 76.6498))
        speed = float(packet.get("gps_speed_kmph", 0.0))
        heading = float(packet.get("heading_deg", 48.0))
        accuracy = float(packet.get("accuracy_meters", 4.0))
        altitude = float(packet.get("altitude_meters", 680.0))
        battery = int(packet.get("battery_level_pct", 95))
        is_sat = bool(packet.get("is_live_satellite", True))
        driver_id = packet.get("driver_id", f"SWR-LP-{train_id[:4]}")
        loco_id = packet.get("loco_id", f"WAP-7 #{train_id}")
        train_name = packet.get("train_name", "Corridor Active Service")

        # Snap to SWR track
        snapped = snap_gps_to_corridor_chainage(lat, lon)
        chainage_km = snapped["snapped_chainage_km"]

        # Calculate target green-wave throttle
        mps = 130 if "20608" in train_id else (120 if "12008" in train_id else 110)
        target_throttle = round(min(mps, max(30.0, speed * 1.05)), 1)
        if speed < 5.0 and chainage_km > 0.5 and chainage_km < 137.5:
            signal_aspect = "YELLOW"
        else:
            signal_aspect = "GREEN"

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        record = {
            "train_id": train_id,
            "train_name": train_name,
            "loco_id": loco_id,
            "driver_id": driver_id,
            "latitude": lat,
            "longitude": lon,
            "gps_speed_kmph": round(speed, 1),
            "heading_deg": round(heading, 1),
            "accuracy_meters": round(accuracy, 1),
            "altitude_meters": round(altitude, 1),
            "snapped_chainage_km": chainage_km,
            "cross_track_offset_meters": snapped["cross_track_offset_meters"],
            "nearest_station_code": snapped["nearest_station_code"],
            "nearest_station_name": snapped["nearest_station_name"],
            "distance_to_next_stop_km": snapped["distance_to_next_station_km"],
            "next_stop_code": snapped["next_station_code"],
            "target_throttle_kmph": target_throttle,
            "signal_aspect_ahead": signal_aspect,
            "battery_level_pct": battery,
            "is_live_satellite_feed": is_sat,
            "last_heartbeat_timestamp": now_iso,
            "last_heartbeat_epoch": time.time(),
            "status": "ACTIVE_RUNNING" if speed > 2.0 else "STOPPED_AT_STATION"
        }

        # Update in-memory state with lock
        with self._lock:
            self.live_fleet_state[train_id] = record

        # Async background write to SQLite
        try:
            log_telemetry_record(record)
        except Exception as e:
            print(f">>> [Telemetry Write Warning]: {e}")

        return record

    def get_live_train_state(self, train_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self.live_fleet_state.get(train_id)

    def get_all_live_fleet(self) -> List[Dict[str, Any]]:
        with self._lock:
            # Check TTL (mark SIGNAL_LOST if no packet for > 45s)
            now = time.time()
            result = []
            for t_id, record in self.live_fleet_state.items():
                copy_rec = dict(record)
                if record.get("is_live_satellite_feed") and (now - record.get("last_heartbeat_epoch", now) > 45.0):
                    copy_rec["status"] = "SIGNAL_LOST"
                result.append(copy_rec)
            return result

    def record_driver_incident(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        train_id = str(incident_data.get("train_id", "20608"))
        with self._lock:
            current = self.live_fleet_state.get(train_id, {})
            chainage = current.get("snapped_chainage_km", 0.0)
            station = current.get("nearest_station_name", "Corridor Section")
            speed = current.get("gps_speed_kmph", 0.0)

        incident_record = {
            "train_id": train_id,
            "driver_id": incident_data.get("driver_id", "SWR-LP-01"),
            "chainage_km": chainage,
            "nearest_station": station,
            "incident_type": incident_data.get("incident_type", "SIGNAL_HOLD"),
            "speed_at_incident_kmph": speed,
            "reported_text": incident_data.get("reported_text", "Driver flagged track hazard")
        }

        incident_id = log_driver_incident(incident_record)
        incident_record["incident_id"] = incident_id
        return incident_record

# Global Singleton Manager
telemetry_manager = FleetTelemetryManager()
