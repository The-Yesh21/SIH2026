import os
import json
import time
import datetime
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, root_mean_squared_error
import shap

from ml.dataset_generator import (
    generate_synthetic_railway_dataset,
    FEATURE_COLUMNS,
    TRAIN_TYPE_MAP,
    WEATHER_MAP,
    SURFACE_MAP,
    PRIORITY_SPECS,
    CORRIDOR_LENGTH_KM
)
from models.pain_factors import (
    TrainConfigModel,
    EnvironmentalConditionsModel,
    FeatureImportanceItem,
    ModelEvaluationMetrics,
    ModelMetadataResponseModel
)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
MODEL_FILE_PATH = os.path.join(MODEL_DIR, "railrakshak_lgbm_model.joblib")
METADATA_FILE_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

FEATURE_DESCRIPTIONS = {
    "train_type_code": "Train Rolling Stock Type (Vande Bharat, Shatabdi, Superfast, Express, MEMU, Freight)",
    "priority_tier": "Operational Dispatching Priority Tier (1: Highest, 4: Freight)",
    "coaches": "Train Coach Composition Length",
    "tractive_hp_per_ton": "Tractive Effort Power-to-Weight Ratio (HP/ton)",
    "nominal_decel": "Service Braking Deceleration Rate (m/s²)",
    "sectional_mps": "Maximum Permissible Speed for Train & Section (km/h)",
    "current_km": "Current Traversed Distance from Mysuru Junction (km)",
    "remaining_km": "Remaining Distance to SBC Terminal (km)",
    "current_speed_kmph": "Live Telemetry Running Speed (km/h)",
    "initial_delay_min": "Initial Recorded Schedule Delay (minutes)",
    "injected_delay_min": "Active Scenario Injected Delay (minutes)",
    "total_current_delay": "Total Cumulative Delay at Current Observation (minutes)",
    "dep_hour": "Departure Hour of Day (0-23)",
    "dep_hour_sin": "Cyclic Time Feature (Sine of Departure Hour)",
    "dep_hour_cos": "Cyclic Time Feature (Cosine of Departure Hour)",
    "is_peak_hour": "Corridor Peak Traffic Window (Morning / Evening Rush)",
    "weather_code": "Environmental Weather State (Clear, Fog, Monsoon, Heavy Rain)",
    "ambient_temp_celsius": "Ambient Track & Air Temperature (°C)",
    "visibility_meters": "Driver Track Visibility Range (meters)",
    "rail_surface_code": "Rail Adhesion Surface State (Dry, Damp, Wet, Waterlogged)",
    "adhesion_factor": "Wheel-Rail Traction Adhesion Coefficient",
    "commuter_surge_multiplier": "Suburban Passenger Boarding Surge Multiplier",
    "ohe_voltage_kv": "25kV AC Overhead Traction Voltage (kV)",
    "wild_alarm_flag": "Wheel Impact Load Detector Hotbox Alarm Active",
    "single_line_block_flag": "Maintenance Mega-Block / Single Line Working Active",
    "remaining_stops_count": "Number of Downstream Scheduled Halts Remaining",
    "downstream_tsr_count": "Active Temporary Speed Restrictions Ahead",
    "downstream_lc_gates_count": "Downstream Level Crossing Gates Ahead",
    "terminal_throat_occupancy": "KSR Bengaluru (SBC) Approach Throat Congestion Ratio"
}

class RailwayMLPipeline:
    def __init__(self):
        self.model: Optional[lgb.LGBMRegressor] = None
        self.explainer: Optional[shap.TreeExplainer] = None
        self.metrics: Optional[Dict[str, Any]] = None
        self.feature_importances: List[Dict[str, Any]] = []
        self.trained_at: Optional[str] = None
        self._initialize()

    def _initialize(self):
        os.makedirs(MODEL_DIR, exist_ok=True)
        if os.path.exists(MODEL_FILE_PATH) and os.path.exists(METADATA_FILE_PATH):
            try:
                self.load_model()
                print(">>> [RailRakshak ML] Successfully loaded pre-trained LightGBM intelligence model.")
                return
            except Exception as e:
                print(f">>> [RailRakshak ML] Failed to load saved model: {e}. Retraining fresh model...")
        
        # Train fresh model on first boot
        print(">>> [RailRakshak ML] Training initial LightGBM Intelligence Model on SWR corridor dataset...")
        self.train_pipeline(num_samples=35000)

    def train_pipeline(self, num_samples: int = 35000) -> Dict[str, Any]:
        """
        Generates synthetic operational data, trains LightGBM regressor with GBDT,
        evaluates metrics, computes SHAP TreeExplainer, and persists artifacts.
        """
        start_time = time.time()
        df = generate_synthetic_railway_dataset(num_samples=num_samples)
        
        X = df[FEATURE_COLUMNS]
        y = df["dynamic_delay_delta_min"]
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train High-Precision LightGBM Regressor
        model = lgb.LGBMRegressor(
            objective="regression",
            n_estimators=300,
            learning_rate=0.035,
            num_leaves=31,
            max_depth=7,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=42,
            n_jobs=-1,
            verbose=-1
        )
        model.fit(X_train, y_train)
        
        # Evaluate on Test Set
        y_pred = model.predict(X_test)
        r2 = float(r2_score(y_test, y_pred))
        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(root_mean_squared_error(y_test, y_pred))
        
        # Build SHAP TreeExplainer
        explainer = shap.TreeExplainer(model)
        
        # Compute Feature Importances
        raw_importances = model.feature_importances_
        norm_importances = (raw_importances / np.sum(raw_importances)) * 100.0
        
        fi_list = []
        for feat_name, imp in sorted(zip(FEATURE_COLUMNS, norm_importances), key=lambda x: x[1], reverse=True):
            fi_list.append({
                "feature": feat_name,
                "importance": round(float(imp), 2),
                "description": FEATURE_DESCRIPTIONS.get(feat_name, feat_name)
            })
            
        trained_timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        metrics_dict = {
            "r2Score": round(r2, 4),
            "meanAbsoluteErrorMin": round(mae, 3),
            "rootMeanSquaredErrorMin": round(rmse, 3),
            "sampleCount": num_samples,
            "featuresCount": len(FEATURE_COLUMNS),
            "trainedAt": trained_timestamp
        }
        
        self.model = model
        self.explainer = explainer
        self.metrics = metrics_dict
        self.feature_importances = fi_list
        self.trained_at = trained_timestamp
        
        # Save model and metadata
        joblib.dump(model, MODEL_FILE_PATH)
        with open(METADATA_FILE_PATH, "w") as f:
            json.dump({
                "metrics": metrics_dict,
                "feature_importances": fi_list,
                "trainedAt": trained_timestamp
            }, f, indent=2)
            
        elapsed = time.time() - start_time
        print(f">>> [RailRakshak ML] Model trained in {elapsed:.2f}s | R²: {r2:.4f} | MAE: {mae:.2f}m | RMSE: {rmse:.2f}m")
        return metrics_dict

    def load_model(self):
        self.model = joblib.load(MODEL_FILE_PATH)
        self.explainer = shap.TreeExplainer(self.model)
        with open(METADATA_FILE_PATH, "r") as f:
            meta = json.load(f)
            self.metrics = meta["metrics"]
            self.feature_importances = meta["feature_importances"]
            self.trained_at = meta.get("trainedAt")

    def build_feature_vector(
        self,
        train: TrainConfigModel,
        env: EnvironmentalConditionsModel,
        injected_delay_min: float = 0.0
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Extracts tabular feature vector from current live train config and environmental telemetry.
        """
        ttype = train.type
        spec = PRIORITY_SPECS.get(ttype, PRIORITY_SPECS["EXPRESS"])
        current_km = float(min(CORRIDOR_LENGTH_KM - 0.1, max(0.0, train.currentLocationKm)))
        remaining_km = float(CORRIDOR_LENGTH_KM - current_km)
        total_delay = float(train.initialDelayMin + injected_delay_min)
        
        # Departure & Time features
        try:
            dep_parts = train.scheduledDep.split(":")
            dep_hour = int(dep_parts[0])
        except Exception:
            dep_hour = 12
            
        dep_hour_sin = float(np.sin(2 * np.pi * dep_hour / 24.0))
        dep_hour_cos = float(np.cos(2 * np.pi * dep_hour / 24.0))
        is_peak = 1 if (env.isPeakHour or ((7 <= dep_hour <= 10) or (17 <= dep_hour <= 20))) else 0
        
        weather_code = WEATHER_MAP.get(env.weather, 0)
        rail_surface_code = SURFACE_MAP.get(env.railSurfaceCondition, 0)
        
        adhesion = 1.0
        if env.railSurfaceCondition == "DAMP":
            adhesion = 0.85
        elif env.railSurfaceCondition == "WET_SLIPPERY":
            adhesion = 0.68
        elif env.railSurfaceCondition == "WATERLOGGED":
            adhesion = 0.52
            
        frac_remaining = remaining_km / CORRIDOR_LENGTH_KM
        remaining_stops = max(0, len([s for s in train.scheduledStops if s not in ["MYS", "SBC"]]))
        remaining_stops = int(np.round(remaining_stops * frac_remaining))
        
        downstream_tsr = max(0, int(np.round(frac_remaining * 2)))
        downstream_lc = max(0, int(np.round(frac_remaining * 14)))
        
        near_sbc = 1.0 if (remaining_km < 25.0) else (remaining_km / 25.0)
        throat_occupancy = float(np.clip(0.45 + (0.40 if is_peak else 0.10) * (1.0 - near_sbc), 0.2, 1.0))
        
        feat_dict = {
            "train_type_code": TRAIN_TYPE_MAP.get(ttype, 3),
            "priority_tier": train.priorityTier,
            "coaches": train.coaches,
            "tractive_hp_per_ton": spec["tractiveHp"],
            "nominal_decel": train.nominalDecelerationMps2,
            "sectional_mps": train.sectionalMpsKmph,
            "current_km": current_km,
            "remaining_km": remaining_km,
            "current_speed_kmph": float(train.currentSpeedKmph),
            "initial_delay_min": float(train.initialDelayMin),
            "injected_delay_min": float(injected_delay_min),
            "total_current_delay": total_delay,
            "dep_hour": dep_hour,
            "dep_hour_sin": dep_hour_sin,
            "dep_hour_cos": dep_hour_cos,
            "is_peak_hour": is_peak,
            "weather_code": weather_code,
            "ambient_temp_celsius": float(env.ambientTempCelsius),
            "visibility_meters": float(env.visibilityMeters),
            "rail_surface_code": rail_surface_code,
            "adhesion_factor": adhesion,
            "commuter_surge_multiplier": float(env.commuterSurgeMultiplier),
            "ohe_voltage_kv": float(env.oheVoltageKv),
            "wild_alarm_flag": 1 if env.wildAlarmActive else 0,
            "single_line_block_flag": 1 if env.singleLineBlockActive else 0,
            "remaining_stops_count": remaining_stops,
            "downstream_tsr_count": downstream_tsr,
            "downstream_lc_gates_count": downstream_lc,
            "terminal_throat_occupancy": throat_occupancy
        }
        
        df_row = pd.DataFrame([feat_dict])[FEATURE_COLUMNS]
        return df_row, feat_dict

    def predict_with_shap(
        self,
        train: TrainConfigModel,
        env: EnvironmentalConditionsModel,
        injected_delay_min: float = 0.0
    ) -> Dict[str, Any]:
        """
        Runs LightGBM inference and computes true SHAP attribution values for XAI explainability.
        """
        df_feat, feat_dict = self.build_feature_vector(train, env, injected_delay_min)
        
        # 1. Model inference: predicts net delta to delay
        predicted_delta = float(self.model.predict(df_feat)[0])
        total_current_delay = feat_dict["total_current_delay"]
        
        predicted_final_delay = max(0.0, total_current_delay + predicted_delta)
        
        # 2. Compute SHAP values
        shap_values = self.explainer.shap_values(df_feat)[0]
        base_value = float(self.explainer.expected_value)
        
        # 3. Categorize SHAP factors
        shap_attributions = []
        for feat_name, shap_val in zip(FEATURE_COLUMNS, shap_values):
            val = float(shap_val)
            if abs(val) < 0.05:
                continue
                
            is_recovery = val < 0
            cat_name = self._categorize_feature(feat_name)
            rationale = self._explain_feature_impact(feat_name, feat_dict[feat_name], val)
            
            shap_attributions.append({
                "feature": feat_name,
                "category": cat_name,
                "name": FEATURE_DESCRIPTIONS.get(feat_name, feat_name).split("(")[0].strip(),
                "impactMinutes": round(val, 2),
                "type": "recovery" if is_recovery else "delay",
                "rationale": rationale
            })
            
        # Sort by absolute impact
        shap_attributions.sort(key=lambda x: abs(x["impactMinutes"]), reverse=True)
        
        # 4. Deconstruct slack recovered vs bottlenecks
        negative_shaps = sum(abs(x["impactMinutes"]) for x in shap_attributions if x["type"] == "recovery")
        positive_shaps = sum(x["impactMinutes"] for x in shap_attributions if x["type"] == "delay")
        
        slack_recovered = float(min(total_current_delay * 0.85, negative_shaps + max(0.0, -predicted_delta)))
        bottlenecks = float(positive_shaps + max(0.0, predicted_delta))
        
        # Confidence intervals based on RMSE
        rmse = self.metrics["rootMeanSquaredErrorMin"] if self.metrics else 1.2
        confidence_margin = float(1.96 * rmse)
        
        return {
            "predictedDeltaMin": predicted_delta,
            "predictedFinalDelayMin": predicted_final_delay,
            "slackRecoveredMin": round(slack_recovered, 2),
            "bottlenecksIncurredMin": round(bottlenecks, 2),
            "shapAttributions": shap_attributions,
            "baseValue": base_value,
            "confidenceMarginMin": round(confidence_margin, 2),
            "rmse": rmse
        }

    def _categorize_feature(self, feature: str) -> str:
        if "tractive" in feature or "decel" in feature or "mps" in feature or "train_type" in feature:
            return "Kinematic Tractive Reserve"
        if "weather" in feature or "temp" in feature or "visibility" in feature or "adhesion" in feature:
            return "Weather & Track Adhesion"
        if "ohe" in feature:
            return "Traction Power (OHE)"
        if "peak" in feature or "dep_hour" in feature or "surge" in feature or "stops" in feature:
            return "Commuter & Dwell Load"
        if "tsr" in feature or "psr" in feature:
            return "Speed Restrictions (TSR/PSR)"
        if "throat" in feature or "lc_gates" in feature or "single_line" in feature or "wild" in feature:
            return "Signaling & Corridor Bottlenecks"
        return "Schedule & Base Delay"

    def _explain_feature_impact(self, feature: str, value: Any, impact: float) -> str:
        impact_abs = abs(impact)
        if feature == "tractive_hp_per_ton":
            return f"High tractive reserve ({value} HP/t) enables sectional sprint recovery of {impact_abs:.1f} mins."
        if feature == "priority_tier":
            tier = int(value)
            return f"Tier {tier} dispatching precedence {'ensures mainline green wave' if tier == 1 else 'risks loop line holding'} ({impact:+.1f} min impact)."
        if feature == "terminal_throat_occupancy":
            return f"SBC junction approach throat occupancy at {float(value)*100:.0f}% imposes {impact_abs:.1f} min caution slowing."
        if feature == "weather_code":
            w = ["Clear", "Fog/Mist", "Monsoon Rain", "Heavy Downpour"][int(value)]
            return f"{w} weather condition affects braking distances by {impact:+.1f} mins."
        if feature == "adhesion_factor":
            return f"Wheel-rail adhesion index ({value:.2f}) modifies tractive acceleration curve ({impact:+.1f} min)."
        if feature == "commuter_surge_multiplier":
            return f"Platform commuter crowding surge factor ({value:.1f}x) impacts station dwell by {impact:+.1f} min."
        if feature == "downstream_tsr_count":
            return f"{int(value)} active speed restriction zones ahead impose {impact:+.1f} min cumulative caution penalty."
        if feature == "single_line_block_flag" and value == 1:
            return f"Active Single-Line Working / Mega-Block introduces {impact_abs:.1f} min single-line section wait."
        if feature == "wild_alarm_flag" and value == 1:
            return f"WILD wheel impact detector hotbox alert requires {impact_abs:.1f} min rolling stock inspection."
        if feature == "ohe_voltage_kv":
            return f"OHE traction line voltage at {value:.1f} kV modifies locomotive power output ({impact:+.1f} min)."
        return f"{FEATURE_DESCRIPTIONS.get(feature, feature)} influenced dynamic ETA by {impact:+.1f} mins."

    def get_model_info(self) -> ModelMetadataResponseModel:
        return ModelMetadataResponseModel(
            modelName="RailRakshak SWR Gradient-Boosted ML Intelligence Core",
            algorithm="LightGBM Regressor (GBDT) + SHAP TreeExplainer",
            version="3.0.0-PROD",
            status="READY",
            corridor="South Western Railway (MYS - SBC 138.25 km)",
            evaluationMetrics=ModelEvaluationMetrics(
                r2Score=self.metrics["r2Score"] if self.metrics else 0.965,
                meanAbsoluteErrorMin=self.metrics["meanAbsoluteErrorMin"] if self.metrics else 0.85,
                rootMeanSquaredErrorMin=self.metrics["rootMeanSquaredErrorMin"] if self.metrics else 1.15,
                sampleCount=self.metrics["sampleCount"] if self.metrics else 35000,
                featuresCount=len(FEATURE_COLUMNS),
                trainedAt=self.trained_at or datetime.datetime.now(datetime.timezone.utc).isoformat()
            ),
            topFeatureImportances=[
                FeatureImportanceItem(
                    feature=f["feature"],
                    importance=f["importance"],
                    description=f["description"]
                ) for f in self.feature_importances[:10]
            ],
            shapExplainerReady=self.explainer is not None
        )

# Global Singleton Instance of the ML Pipeline
ml_pipeline = RailwayMLPipeline()
