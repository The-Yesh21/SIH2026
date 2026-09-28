from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

from models.pain_factors import (
    TrainConfigModel,
    EnvironmentalConditionsModel,
    CorridorPainSummaryModel,
    DynamicPredictionResponseModel,
    ModelMetadataResponseModel,
    RetrainResponseModel,
    ContinuousCorridorMonitorResponseModel,
    SectionFrictionModel,
    SectorHotspotModel,
    TrainVulnerabilitySectorModel
)
from ml.pain_analyzer import (
    analyze_all_pain_factors,
    compute_all_section_frictions,
    resolve_lead_train_context,
    get_corridor_sector_hotspots,
    resolve_train_primary_vulnerability_sector,
    CORRIDOR_SCHEDULED_FLEET
)
from ml.eta_predictor import predict_dynamic_eta_ml, format_clock_display
from ml.model_pipeline import ml_pipeline
from telemetry.manager import telemetry_manager
from telemetry.db import get_train_telemetry_history

class TelemetryStreamPacket(BaseModel):
    train_id: str
    train_name: Optional[str] = "Corridor Service"
    loco_id: Optional[str] = "WAP-7"
    driver_id: Optional[str] = "SWR-LP-01"
    latitude: float
    longitude: float
    gps_speed_kmph: float = 0.0
    heading_deg: Optional[float] = 48.0
    accuracy_meters: Optional[float] = 4.0
    altitude_meters: Optional[float] = 680.0
    battery_level_pct: Optional[int] = 95
    is_live_satellite: Optional[bool] = True

class DriverIncidentReport(BaseModel):
    train_id: str
    driver_id: Optional[str] = "SWR-LP-01"
    incident_type: str = "SIGNAL_HOLD"
    reported_text: Optional[str] = ""

app = FastAPI(
    title="RailRakshak ML Intelligence Core",
    description="High-Precision Machine Learning Dynamic ETA Prediction & Explainable AI (XAI) Corridor Intelligence Engine with Continuous Preceding Train Monitoring and Sector Bottleneck Forensics",
    version="3.0.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DynamicEtaRequest(BaseModel):
    train: TrainConfigModel
    environment: Optional[EnvironmentalConditionsModel] = None
    userInjectedDelayMin: float = 0.0
    activeClockMinutes: float = 0.0

class PainAnalysisRequest(BaseModel):
    train: TrainConfigModel
    environment: Optional[EnvironmentalConditionsModel] = None
    injectedDelayMin: float = 0.0
    activeClockMinutes: float = 0.0

class RetrainRequest(BaseModel):
    sampleCount: Optional[int] = 35000

@app.get("/")
@app.get("/api/health")
def health_check():
    return {
        "status": "ONLINE",
        "service": "RailRakshak ML Intelligence Backend",
        "version": "3.0.0",
        "framework": "FastAPI + LightGBM + SHAP",
        "corridor": "South Western Railway (MYS - SBC 138.25 km)",
        "accuracyEngine": "Dual-Core Gradient-Boosted Trees (LightGBM) & SHAP TreeExplainer",
        "continuousMonitoring": "ACTIVE",
        "modelStatus": "READY" if ml_pipeline.model is not None else "INITIALIZING"
    }

@app.get("/api/ml/model-info", response_model=ModelMetadataResponseModel)
def get_model_info():
    """
    Returns active ML model metadata, validation scores (R2, MAE, RMSE), and feature importance ranking.
    """
    return ml_pipeline.get_model_info()

@app.post("/api/ml/retrain", response_model=RetrainResponseModel)
def retrain_model(req: Optional[RetrainRequest] = None):
    """
    Triggers automated dataset generation and retraining of the LightGBM regressor with preceding train features.
    """
    samples = req.sampleCount if (req and req.sampleCount) else 35000
    try:
        metrics = ml_pipeline.train_pipeline(num_samples=samples)
        return RetrainResponseModel(
            status="SUCCESS",
            message=f"Model successfully retrained on {samples} operational corridor journey records with preceding train behavioral memory.",
            trainingSamplesGenerated=samples,
            evaluationMetrics=ml_pipeline.get_model_info().evaluationMetrics
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model retraining failed: {str(e)}")

@app.post("/api/predict/dynamic-eta", response_model=DynamicPredictionResponseModel)
def predict_eta(req: DynamicEtaRequest):
    """
    Predicts high-precision dynamic arrival ETA, slack recovery, bottleneck detentions,
    preceding train behavioral ripple, sector hotspot vulnerabilities, and calculates true SHAP feature attributions.
    """
    env = req.environment or EnvironmentalConditionsModel()
    return predict_dynamic_eta_ml(
        train=req.train,
        env=env,
        user_injected_delay_min=req.userInjectedDelayMin,
        active_clock_mins=req.activeClockMinutes
    )

@app.post("/api/analyze/pain-factors", response_model=CorridorPainSummaryModel)
def analyze_pain(req: PainAnalysisRequest):
    """
    Deep operational breakdown of pain factors (turnouts, PSR/TSR, LC gates, signals, commuter surges, preceding train ripple).
    """
    env = req.environment or EnvironmentalConditionsModel()
    return analyze_all_pain_factors(
        train=req.train,
        env=env,
        injected_delay_min=req.injectedDelayMin,
        active_clock_mins=req.activeClockMinutes
    )

@app.get("/api/corridor/sector-pain-points", response_model=List[SectorHotspotModel])
def get_sector_pain_points():
    """
    Returns all corridor pain point sectors ranked by longest cumulative duration
    and highest recurrence frequency, along with affected train details.
    """
    return get_corridor_sector_hotspots()

@app.get("/api/corridor/train-vulnerability/{train_id}", response_model=TrainVulnerabilitySectorModel)
def get_train_vulnerability(train_id: str = Path(description="Train service ID e.g. 12613, 66552, BOXN-58219")):
    """
    Returns the primary vulnerability sector for a specific train service.
    """
    dummy_train = TrainConfigModel(
        id=train_id,
        name="Selected Service",
        type="SUPERFAST" if train_id in ["12613", "12008", "20608"] else ("FREIGHT_BOXN" if "BOXN" in train_id else "EXPRESS"),
        priorityTier=1 if train_id in ["20608", "12008"] else (4 if "BOXN" in train_id else 2),
        scheduledDep="11:30",
        scheduledArr="14:00",
        scheduledStops=["MYS", "SBC"],
        currentLocationKm=0.0
    )
    return resolve_train_primary_vulnerability_sector(dummy_train)

@app.get("/api/corridor/continuous-monitor", response_model=ContinuousCorridorMonitorResponseModel)
def get_continuous_corridor_monitor(
    clockMinutes: float = Query(default=840.0, description="Clock time in minutes from midnight"),
    weather: str = Query(default="CLEAR")
):
    """
    Continuous real-time monitor providing corridor health scores, section degradation indices,
    and active preceding-train ripple alerts across all 8 SWR block sections.
    """
    env = EnvironmentalConditionsModel(weather=weather if weather in ["CLEAR", "FOG_MIST", "MONSOON_RAIN", "HEAVY_DOWNPOUR"] else "CLEAR")
    sections = compute_all_section_frictions(active_clock_mins=clockMinutes, env=env)
    
    avg_friction = sum(s.frictionScore for s in sections) / max(1, len(sections))
    health_score = round(max(15.0, (1.0 - avg_friction) * 100.0), 1)
    
    status = "OPTIMAL_FLOW" if health_score >= 70.0 else ("MODERATE_FRICTION" if health_score >= 45.0 else "SEVERE_CONGESTION")
    
    alerts = []
    if avg_friction > 0.4:
        alerts.append("Kengeri–SBC terminal approach throat experiencing elevated headway compression.")
    if env.weather in ["MONSOON_RAIN", "HEAVY_DOWNPOUR"]:
        alerts.append("Adhesion decay caution active over Shrirangapatna Cauvery bridge curve.")
    if len(alerts) == 0:
        alerts.append("All 8 corridor block sections operating within nominal Working Time Table (WTT) parameters.")

    return ContinuousCorridorMonitorResponseModel(
        activeClockMinutes=clockMinutes,
        activeClockDisplay=format_clock_display(clockMinutes),
        corridorHealthScorePct=health_score,
        overallStatus=status,
        activeTrainsCount=len(CORRIDOR_SCHEDULED_FLEET),
        sections=sections,
        precedingTrainAlerts=alerts,
        recentCrossingsSummary="Real-time telemetry continuously ingesting block section clearances & lead train delay deltas."
    )

# ----------------- 🛰️ SATELLITE GPS & LOCO-PILOT TELEMETRY APIS -----------------

@app.post("/api/telemetry/stream")
def ingest_telemetry_stream(packet: TelemetryStreamPacket):
    """
    Ingests live GPS coordinate packets from Loco-Pilot mobile cab app,
    snaps to SWR corridor chainage, updates in-memory live state, and logs to SQLite.
    """
    processed = telemetry_manager.process_incoming_telemetry(packet.model_dump())
    return {
        "status": "INGESTED",
        "train_id": packet.train_id,
        "snapped_chainage_km": processed["snapped_chainage_km"],
        "nearest_station": processed["nearest_station_name"],
        "target_throttle_kmph": processed["target_throttle_kmph"],
        "signal_aspect_ahead": processed["signal_aspect_ahead"],
        "distance_to_next_stop_km": processed["distance_to_next_stop_km"],
        "recorded_at": processed["last_heartbeat_timestamp"]
    }

@app.get("/api/telemetry/live")
def get_all_live_telemetry():
    """
    Returns latest in-memory live GPS telemetry state for all active trains across the corridor.
    """
    return {
        "count": len(telemetry_manager.live_fleet_state),
        "fleet": telemetry_manager.get_all_live_fleet()
    }

@app.get("/api/telemetry/live/{train_id}")
def get_train_live_telemetry(train_id: str):
    """
    Returns latest live satellite GPS state for a specific locomotive / train service.
    """
    state = telemetry_manager.get_live_train_state(train_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"No telemetry state found for train {train_id}")
    return state

@app.get("/api/telemetry/history/{train_id}")
def get_train_history(train_id: str, limit: int = Query(default=100, le=500)):
    """
    Retrieves time-series GPS breadcrumbs for a train from SQLite.
    """
    logs = get_train_telemetry_history(train_id, limit)
    return {
        "train_id": train_id,
        "count": len(logs),
        "history": logs
    }

@app.post("/api/telemetry/incident")
def report_driver_incident(incident: DriverIncidentReport):
    """
    Records a driver-flagged operational hazard or unscheduled signal hold.
    """
    res = telemetry_manager.record_driver_incident(incident.model_dump())
    return {
        "status": "INCIDENT_LOGGED",
        "incident_id": res.get("incident_id"),
        "train_id": incident.train_id,
        "chainage_km": res.get("chainage_km"),
        "nearest_station": res.get("nearest_station"),
        "incident_type": incident.incident_type
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
