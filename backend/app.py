from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

from models.pain_factors import (
    TrainConfigModel,
    EnvironmentalConditionsModel,
    CorridorPainSummaryModel,
    DynamicPredictionResponseModel
)
from ml.pain_analyzer import analyze_all_pain_factors
from ml.eta_predictor import predict_dynamic_eta_ml

app = FastAPI(
    title="RailRakshak Python ML Intelligence Core",
    description="High-Precision Machine Learning Dynamic ETA Prediction & Indian Railways Pain Factor Analysis Engine",
    version="2.5.0"
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

class PainAnalysisRequest(BaseModel):
    train: TrainConfigModel
    environment: Optional[EnvironmentalConditionsModel] = None
    injectedDelayMin: float = 0.0
    activeClockMinutes: float = 0.0

@app.get("/")
@app.get("/api/health")
def health_check():
    return {
        "status": "ONLINE",
        "service": "RailRakshak ML Intelligence Backend",
        "version": "2.5.0",
        "framework": "FastAPI + LightGBM + SHAP",
        "corridor": "South Western Railway (MYS - SBC 138.25 km)",
        "accuracyEngine": "Dual-Core Kinematic & Multi-Factor ML"
    }

@app.post("/api/predict/dynamic-eta", response_model=DynamicPredictionResponseModel)
def predict_eta(req: DynamicEtaRequest):
    env = req.environment or EnvironmentalConditionsModel()
    return predict_dynamic_eta_ml(
        train=req.train,
        env=env,
        user_injected_delay_min=req.userInjectedDelayMin
    )

@app.post("/api/analyze/pain-factors", response_model=CorridorPainSummaryModel)
def analyze_pain(req: PainAnalysisRequest):
    env = req.environment or EnvironmentalConditionsModel()
    return analyze_all_pain_factors(
        train=req.train,
        env=env,
        injected_delay_min=req.injectedDelayMin,
        active_clock_mins=req.activeClockMinutes
    )

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
