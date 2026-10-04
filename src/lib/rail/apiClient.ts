import {
  TrainConfig,
  DynamicPredictionResult,
  ModelMetadata,
  SectionFriction,
} from "./types";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT } from "./restrictions";
import { computeDynamicEta } from "./dynamicEta";
import { analyzeCorridorPainFactors, CorridorPainSummary } from "./painFactorEngine";

const RENDER_BACKEND_URL = "https://sih2026-9ugs.onrender.com";

const BACKEND_API_BASE =
  ((import.meta as any)?.env?.VITE_API_URL as string) ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? `http://${window.location.hostname}:8000`
    : RENDER_BACKEND_URL);

let isBackendOnline = false;
let isWakingUp = false;

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      isBackendOnline = true;
      isWakingUp = false;
      return true;
    }
  } catch (err) {
    // If api/health fails, try root endpoint fallback
    try {
      const rootRes = await fetch(`${BACKEND_API_BASE}/`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      if (rootRes.ok) {
        isBackendOnline = true;
        isWakingUp = false;
        return true;
      }
    } catch (e) {
      isBackendOnline = false;
    }
  }
  isWakingUp = false;
  return false;
}

export async function wakeUpBackend(): Promise<boolean> {
  isWakingUp = true;
  try {
    const res = await fetch(`${BACKEND_API_BASE}/`, {
      method: "GET",
      signal: AbortSignal.timeout(15000), // longer timeout for cold start spin-up
    });
    if (res.ok) {
      isBackendOnline = true;
      isWakingUp = false;
      return true;
    }
  } catch (e) {
    // still booting
  }
  const healthy = await checkBackendHealth();
  isWakingUp = false;
  return healthy;
}

export function getBackendStatus(): boolean {
  return isBackendOnline;
}

export function getIsWakingUp(): boolean {
  return isWakingUp;
}

// Automatically start keep-alive heartbeat in browser (pings every 25 seconds to prevent Render cold spin-down)
if (typeof window !== "undefined") {
  setInterval(() => {
    checkBackendHealth();
  }, 25000);
}

export interface ContinuousCorridorMonitorData {
  activeClockMinutes: number;
  activeClockDisplay: string;
  corridorHealthScorePct: number;
  overallStatus: "OPTIMAL_FLOW" | "MODERATE_FRICTION" | "SEVERE_CONGESTION";
  activeTrainsCount: number;
  sections: SectionFriction[];
  precedingTrainAlerts: string[];
  recentCrossingsSummary: string;
}

/**
 * High-Precision Dynamic ETA computation with automatic Python ML backend & TypeScript fallback
 */
export async function getDynamicPrediction(params: {
  train: TrainConfig;
  userInjectedDelayMin?: number;
  environment?: EnvironmentalConditions;
  activeClockMinutes?: number;
}): Promise<{ prediction: DynamicPredictionResult; source: "PYTHON_ML" | "CLIENT_KINEMATICS" }> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/predict/dynamic-eta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        train: params.train,
        environment: params.environment || DEFAULT_ENVIRONMENT,
        userInjectedDelayMin: params.userInjectedDelayMin || 0,
        activeClockMinutes: params.activeClockMinutes || 0,
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
    isBackendOnline = false;
  }

  const localPred = computeDynamicEta({
    train: params.train,
    userInjectedDelayMin: params.userInjectedDelayMin,
    environment: params.environment,
    activeClockMinutes: params.activeClockMinutes,
  });

  return {
    prediction: localPred,
    source: "CLIENT_KINEMATICS",
  };
}

export async function getContinuousCorridorMonitor(
  clockMinutes: number = 840,
  weather: string = "CLEAR"
): Promise<ContinuousCorridorMonitorData | null> {
  try {
    const res = await fetch(
      `${BACKEND_API_BASE}/api/corridor/continuous-monitor?clockMinutes=${clockMinutes}&weather=${encodeURIComponent(weather)}`,
      {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      }
    );
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // backend unavailable
  }
  return null;
}

export async function getModelMetadata(): Promise<ModelMetadata | null> {
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
