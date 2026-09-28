import sqlite3
import os
import datetime
from typing import List, Dict, Any, Optional

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DB_DIR, "telemetry_history.db")

def init_telemetry_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Time-series GPS telemetry logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS telemetry_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        train_id TEXT NOT NULL,
        train_name TEXT,
        loco_id TEXT,
        driver_id TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        gps_speed_kmph REAL NOT NULL,
        heading_deg REAL,
        accuracy_meters REAL,
        altitude_meters REAL,
        snapped_chainage_km REAL NOT NULL,
        nearest_station_code TEXT,
        nearest_station_name TEXT,
        distance_to_next_stop_km REAL,
        next_stop_code TEXT,
        target_throttle_kmph REAL,
        signal_aspect_ahead TEXT,
        battery_level_pct INTEGER,
        is_live_satellite BOOLEAN DEFAULT 1,
        status TEXT DEFAULT 'ACTIVE_RUNNING',
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Driver reported incidents and signal holds
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS driver_incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        train_id TEXT NOT NULL,
        driver_id TEXT,
        chainage_km REAL NOT NULL,
        nearest_station TEXT,
        incident_type TEXT NOT NULL,
        speed_at_incident_kmph REAL,
        reported_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Indexes for fast historical querying
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_train_recorded ON telemetry_logs (train_id, recorded_at DESC)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_train_chainage ON telemetry_logs (train_id, snapped_chainage_km)")

    conn.commit()
    conn.close()

def log_telemetry_record(data: Dict[str, Any]):
    """
    Appends a single telemetry record to SQLite.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO telemetry_logs (
            train_id, train_name, loco_id, driver_id, latitude, longitude,
            gps_speed_kmph, heading_deg, accuracy_meters, altitude_meters,
            snapped_chainage_km, nearest_station_code, nearest_station_name,
            distance_to_next_stop_km, next_stop_code, target_throttle_kmph,
            signal_aspect_ahead, battery_level_pct, is_live_satellite, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("train_id"),
            data.get("train_name"),
            data.get("loco_id"),
            data.get("driver_id"),
            data.get("latitude"),
            data.get("longitude"),
            data.get("gps_speed_kmph", 0.0),
            data.get("heading_deg", 0.0),
            data.get("accuracy_meters", 5.0),
            data.get("altitude_meters", 0.0),
            data.get("snapped_chainage_km", 0.0),
            data.get("nearest_station_code"),
            data.get("nearest_station_name"),
            data.get("distance_to_next_stop_km", 0.0),
            data.get("next_stop_code"),
            data.get("target_throttle_kmph", 0.0),
            data.get("signal_aspect_ahead", "GREEN"),
            data.get("battery_level_pct", 100),
            data.get("is_live_satellite", True),
            data.get("status", "ACTIVE_RUNNING")
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f">>> [Telemetry DB Error] Failed to log telemetry: {e}")

def log_driver_incident(data: Dict[str, Any]) -> int:
    """
    Logs an incident report from the driver.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO driver_incidents (
        train_id, driver_id, chainage_km, nearest_station,
        incident_type, speed_at_incident_kmph, reported_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("train_id"),
        data.get("driver_id"),
        data.get("chainage_km", 0.0),
        data.get("nearest_station"),
        data.get("incident_type"),
        data.get("speed_at_incident_kmph", 0.0),
        data.get("reported_text", "")
    ))
    incident_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return incident_id

def get_train_telemetry_history(train_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Retrieves latest time-series GPS breadcrumbs for a train.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM telemetry_logs 
    WHERE train_id = ? 
    ORDER BY id DESC 
    LIMIT ?
    """, (train_id, limit))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
