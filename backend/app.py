from fastapi import FastAPI, HTTPException, BackgroundTasks
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
    RetrainResponseModel
)
from ml.pain_analyzer import analyze_all_pain_factors
from ml.eta_predictor import predict_dynamic_eta_ml
from ml.model_pipeline import ml_pipeline

app = FastAPI(
    title="RailRakshak ML Intelligence Core",
    description="High-Precision Machine Learning Dynamic ETA Prediction & Explainable AI (XAI) Corridor Intelligence Engine",
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
    Triggers automated dataset generation and retraining of the LightGBM regressor.
    """
    samples = req.sampleCount if (req and req.sampleCount) else 35000
    try:
        metrics = ml_pipeline.train_pipeline(num_samples=samples)
        return RetrainResponseModel(
            status="SUCCESS",
            message=f"Model successfully retrained on {samples} operational corridor journey records.",
            trainingSamplesGenerated=samples,
            evaluationMetrics=ml_pipeline.get_model_info().evaluationMetrics
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model retraining failed: {str(e)}")

@app.post("/api/predict/dynamic-eta", response_model=DynamicPredictionResponseModel)
def predict_eta(req: DynamicEtaRequest):
    """
    Predicts high-precision dynamic arrival ETA, slack recovery, bottleneck detentions,
    and calculates true SHAP feature attributions.
    """
    env = req.environment or EnvironmentalConditionsModel()
    return predict_dynamic_eta_ml(
        train=req.train,
        env=env,
        user_injected_delay_min=req.userInjectedDelayMin
    )

@app.post("/api/analyze/pain-factors", response_model=CorridorPainSummaryModel)
def analyze_pain(req: PainAnalysisRequest):
    """
    Deep operational breakdown of pain factors (turnouts, PSR/TSR, LC gates, signals, commuter surges).
    """
    env = req.environment or EnvironmentalConditionsModel()
    return analyze_all_pain_factors(
        train=req.train,
        env=env,
        injected_delay_min=req.injectedDelayMin,
        active_clock_mins=req.activeClockMinutes
    )

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
