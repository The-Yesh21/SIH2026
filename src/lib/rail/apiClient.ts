import {
  TrainConfig,
  DynamicPredictionResult,
} from "./types";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT } from "./restrictions";
import { computeDynamicEta } from "./dynamicEta";
import { analyzeCorridorPainFactors, CorridorPainSummary } from "./painFactorEngine";

const BACKEND_API_BASE = "http://localhost:8000";

let isBackendOnline = false;

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      isBackendOnline = true;
      return true;
    }
  } catch (err) {
    isBackendOnline = false;
  }
  return false;
}

export function getBackendStatus(): boolean {
  return isBackendOnline;
}

/**
 * High-Precision Dynamic ETA computation with automatic Python ML backend & TypeScript fallback
 */
export async function getDynamicPrediction(params: {
  train: TrainConfig;
  userInjectedDelayMin?: number;
  environment?: EnvironmentalConditions;
}): Promise<{ prediction: DynamicPredictionResult; source: "PYTHON_ML" | "CLIENT_KINEMATICS" }> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/predict/dynamic-eta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        train: params.train,
        environment: params.environment || DEFAULT_ENVIRONMENT,
        userInjectedDelayMin: params.userInjectedDelayMin || 0,
      }),
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const data = await res.json();
      isBackendOnline = true;
      return {
        prediction: data,
        source: "PYTHON_ML",
      };
    }
  } catch (err) {
    // Fallback to client-side kinematic simulator
    isBackendOnline = false;
  }

  const localPred = computeDynamicEta({
    train: params.train,
    userInjectedDelayMin: params.userInjectedDelayMin,
    environment: params.environment,
  });

  return {
    prediction: localPred,
    source: "CLIENT_KINEMATICS",
  };
}

export async function getModelMetadata(): Promise<import("./types").ModelMetadata | null> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/ml/model-info`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // backend offline or unavailable
  }
  return null;
}

export async function triggerModelRetrain(sampleCount: number = 35000): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/ml/retrain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sampleCount }),
      signal: AbortSignal.timeout(30000),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}
