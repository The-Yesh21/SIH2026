import React from "react";
import {
  TrainConfig,
  DynamicPredictionResult,
} from "../lib/rail/types";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT } from "../lib/rail/restrictions";
import { resolveTrainAtClockTime, formatClockMinutes } from "../lib/rail/timeResolver";
import {
  Clock,
  Sparkles,
  AlertTriangle,
  Radio,
  ShieldAlert,
  Sliders,
  CloudSun,
  CloudRain,
  CloudFog,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Layers,
  Wrench,
  Users,
  MapPin,
  Satellite,
  Navigation,
  Gauge,
  CheckCircle2,
} from "lucide-react";

interface DelayIntelligenceDeckProps {
  prediction: DynamicPredictionResult;
  selectedTrain: TrainConfig;
  environment: EnvironmentalConditions;
  setEnvironment: React.Dispatch<React.SetStateAction<EnvironmentalConditions>>;
  injectedDelay: number;
  setInjectedDelay: (delay: number) => void;
  showScenarioBar: boolean;
  activeClockMinutes: number;
}

export function DelayIntelligenceDeck({
  prediction,
  selectedTrain,
  environment,
  setEnvironment,
  injectedDelay,
  setInjectedDelay,
  showScenarioBar,
  activeClockMinutes,
}: DelayIntelligenceDeckProps) {
  const resolved = resolveTrainAtClockTime(selectedTrain, activeClockMinutes);
  const totalDynamicDelayMin = Math.round(prediction.railrakshakDynamicDelayMin);
  const isDelayed = totalDynamicDelayMin > 0;
  const progressPercent = resolved.progressPercent;

  // Calculated approximate GPS coordinates for current position
  const frac = Math.min(1, Math.max(0, resolved.currentLocationKm / 138.25));
  const curLat = (12.3168 + (12.9784 - 12.3168) * frac).toFixed(4);
  const curLng = (76.6499 + (77.5696 - 76.6499) * frac).toFixed(4);

  return (
    <section className="space-y-6">
      {/* 1. Tactical What-If Disruption Simulator (Smooth Slide Down) */}
      {showScenarioBar && (
        <div className="p-5 sm:p-6 rounded-3xl bg-rail-850 border border-cyan-500/40 shadow-2xl space-y-5 animate-slide-down">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Tactical Disruption &amp; Scenario Simulator (What-If Engine)
            </h3>
            <button
              onClick={() => {
                setInjectedDelay(0);
                setEnvironment(DEFAULT_ENVIRONMENT);
              }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 transition-colors font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Scenarios
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Weather selector */}
            <div className="bg-rail-950 p-4 rounded-2xl border border-rail-700 space-y-2.5">
              <label className="text-slate-300 font-semibold block">
                Atmospheric &amp; Track Weather
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "CLEAR", label: "Clear Track", icon: CloudSun },
                  { id: "HEAVY_MONSOON", label: "Monsoon (60k)", icon: CloudRain },
                  { id: "DENSE_FOG", label: "Fog (30k)", icon: CloudFog },
                ].map((w) => {
                  const Icon = w.icon;
                  const isAct = environment.weather === w.id;
                  return (
                    <button
                      key={w.id}
                      onClick={() =>
                        setEnvironment((prev) => ({
                          ...prev,
                          weather: w.id as any,
                        }))
                      }
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 ${
                        isAct
                          ? "bg-cyan-600/25 border-cyan-400 text-cyan-200 font-bold shadow-md shadow-cyan-500/20"
                          : "bg-rail-900 border-rail-700/80 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="text-[11px] font-medium">{w.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delay Injection */}
            <div className="bg-rail-950 p-4 rounded-2xl border border-rail-700 space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="text-slate-300 font-semibold">
                  Inject Line Incident Delay
                </label>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  +{injectedDelay} min
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="45"
                step="5"
                value={injectedDelay}
                onChange={(e) => setInjectedDelay(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-rail-800 rounded-lg"
              />
              <p className="text-[11px] text-slate-400 font-sans">
                Simulate cattle runover, unexpected crossing detention, or locomotive throttle slip.
              </p>
            </div>

            {/* Commuter Rush Surge */}
            <div className="bg-rail-950 p-4 rounded-2xl border border-rail-700 space-y-2.5">
              <label className="text-slate-300 font-semibold block">
                Suburban Commuter Rush Hour
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    setEnvironment((prev) => ({
                      ...prev,
                      commuterSurgeMultiplier: 1.0,
                    }))
                  }
                  className={`py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                    environment.commuterSurgeMultiplier === 1.0
                      ? "bg-cyan-600/25 border-cyan-400 text-cyan-200 font-bold shadow-md shadow-cyan-500/20"
                      : "bg-rail-900 border-rail-700 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Off-Peak
                </button>
                <button
                  onClick={() =>
                    setEnvironment((prev) => ({
                      ...prev,
                      commuterSurgeMultiplier: 1.8,
                    }))
                  }
                  className={`py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                    environment.commuterSurgeMultiplier > 1.0
                      ? "bg-rose-600/25 border-rose-400 text-rose-200 font-bold shadow-md shadow-rose-500/20"
                      : "bg-rail-900 border-rail-700 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Peak Rush Hour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Hero Live Status & Where Is My Train Telemetry Deck */}
      <div className="rounded-3xl border border-rail-700/80 bg-gradient-to-b from-rail-850 to-rail-900 p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
        
        {/* Live Train Status Callout Bar (Where-Is-My-Train Style) */}
        <div className="bg-rail-950 p-4 rounded-2xl border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-mono text-xs">
          <div className="flex items-start sm:items-center gap-3">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 border ${resolved.badgeClass}`}>
              {resolved.stateLabel.split(" ")[0]} {resolved.stateLabel.split(" ")[1] || ""}
            </span>
            <div>
              <div className="font-bold text-white text-sm font-sans">
                {resolved.liveSummary}
              </div>
              <div className="text-slate-400 text-[11px] mt-0.5 font-mono">
                Current Time: <strong className="text-cyan-300">{formatClockMinutes(activeClockMinutes)}</strong> · Scheduled Dep: {selectedTrain.scheduledDep} ➔ Arr: {selectedTrain.scheduledArr}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-rail-800">
            <span className="flex items-center gap-1 text-cyan-300">
              <MapPin className="w-3.5 h-3.5" />
              {curLat}° N, {curLng}° E
            </span>
            <span>·</span>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <Satellite className="w-3.5 h-3.5" /> NavIC Active
            </span>
          </div>
        </div>

        {/* Main Grid: Train Profile vs ETA Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Column: Train Info & Live Progress */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Train #{selectedTrain.id}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-sans">
                {selectedTrain.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                {selectedTrain.scheduledStops.length === 2
                  ? "Non-Stop Express"
                  : `${selectedTrain.scheduledStops.length} Scheduled Halts`}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              <strong className="text-slate-200">Traction / Loco:</strong> {selectedTrain.locoType} ({selectedTrain.coaches} coaches) · Sanctioned MPS: <span className="text-cyan-400 font-bold">{selectedTrain.sectionalMpsKmph} km/h</span>
            </p>

            {/* Journey Progress Track Bar */}
            <div className="bg-rail-950/80 p-4 rounded-2xl border border-rail-700/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Route Traversed:</span>
                <span className="font-bold text-cyan-400">
                  {resolved.currentLocationKm.toFixed(1)} km / 138.25 km ({progressPercent}%)
                </span>
              </div>
              
              {/* Visual Track Bar */}
              <div className="w-full h-2.5 bg-rail-800 rounded-full overflow-hidden p-0.5 border border-rail-700">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 transition-all duration-500 rounded-full shadow-lg shadow-cyan-500/50"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Mysuru Jn (Dep {selectedTrain.scheduledDep})</span>
                <span>KSR Bengaluru (Arr {selectedTrain.scheduledArr})</span>
              </div>
            </div>
          </div>

          {/* Right Column: Booked vs Dynamic Smart ETA */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Booked / Timetable */}
            <div className="bg-rail-950/90 p-5 rounded-2xl border border-rail-700 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" /> Booked Timetable ETA
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-200 mt-3">
                  {selectedTrain.scheduledArr}
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-3 font-sans">
                Official SWR Scheduled Arrival at SBC
              </div>
            </div>

            {/* Dynamic Predicted Arrival */}
            <div
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                isDelayed
                  ? "bg-amber-950/25 border-amber-500/50 text-amber-200 shadow-xl shadow-amber-950/30"
                  : "bg-emerald-950/25 border-emerald-500/50 text-emerald-200 shadow-xl shadow-emerald-950/30"
              }`}
            >
              <div>
                <div className="text-xs font-mono uppercase tracking-wider font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-white">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    Dynamic Smart ETA
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                      isDelayed
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {isDelayed ? `+${totalDynamicDelayMin}m Late` : "On Time"}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-extrabold text-white mt-3 tracking-tight">
                  {prediction.railrakshakDynamicEta}
                </div>
              </div>

              <div className="text-xs text-slate-300 mt-3 font-sans space-y-1">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-emerald-400">⚡ Slack Recovered:</span>
                  <span className="font-bold text-emerald-300">-{prediction.slackRecoveredMin.toFixed(1)}m</span>
                </div>
                {prediction.bottlenecksIncurredMin > 0 && (
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-amber-400">⚠️ Bottlenecks Incurred:</span>
                    <span className="font-bold text-amber-300">+{prediction.bottlenecksIncurredMin.toFixed(1)}m</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Plain-English Root Cause Attribution Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Route Delay Physics &amp; Recovery Factor Breakdown
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Factor 1: Speed Restrictions */}
          <div className="bg-rail-850/80 border border-rail-700/80 rounded-2xl p-4 sm:p-5 space-y-2 hover:border-slate-600 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-sans">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Track Curvature PSRs
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                +{prediction.speedRestrictionPenaltyMin.toFixed(1)}m
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Cauvery River bridge curves (95 km/h), Mandya yard (85 km/h) and Ramanagaram cuttings enforce speed drops.
            </p>
          </div>

          {/* Factor 2: Signaling & Headway */}
          <div className="bg-rail-850/80 border border-rail-700/80 rounded-2xl p-4 sm:p-5 space-y-2 hover:border-slate-600 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-sans">
                <Radio className="w-4 h-4 text-cyan-400" />
                4-Aspect Signaling
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                +{prediction.signalHaltsPenaltyMin.toFixed(1)}m
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Automatic block signaling maintains safe headway spacing behind leading trains with 120m overlap buffer.
            </p>
          </div>

          {/* Factor 3: Commuter Dwells & LC Gates */}
          <div className="bg-rail-850/80 border border-rail-700/80 rounded-2xl p-4 sm:p-5 space-y-2 hover:border-slate-600 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-sans">
                <Users className="w-4 h-4 text-rose-400" />
                Dwells &amp; LC Gates
              </span>
              <span className="text-xs font-mono font-bold text-rose-400">
                +{((prediction.bottlenecksIncurredMin - prediction.speedRestrictionPenaltyMin - prediction.signalHaltsPenaltyMin) > 0 ? (prediction.bottlenecksIncurredMin - prediction.speedRestrictionPenaltyMin - prediction.signalHaltsPenaltyMin).toFixed(1) : "0.0")}m
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Passenger boarding surge at suburban hubs (Bidadi, Kengeri) and interlocked level crossing road holds.
            </p>
          </div>

          {/* Factor 4: Buffer Slack Recovery */}
          <div className="bg-rail-850/80 border border-rail-700/80 rounded-2xl p-4 sm:p-5 space-y-2 hover:border-slate-600 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-sans">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Buffer Slack Recovery
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                -{prediction.slackRecoveredMin.toFixed(1)}m
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              130 km/h straight track sections allow high-power electric traction to make up time between halts.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
