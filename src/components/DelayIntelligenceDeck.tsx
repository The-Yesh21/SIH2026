import React from "react";
import {
  TrainConfig,
  DynamicPredictionResult,
} from "../lib/rail/types";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT } from "../lib/rail/restrictions";
import { resolveTrainAtClockTime, formatClockMinutes } from "../lib/rail/timeResolver";
import { MapPin } from "lucide-react";

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


  return (
    <section className="space-y-6">
      {/* 1. Tactical What-If Disruption Simulator */}
      {showScenarioBar && (
        <div className="bg-surface border border-graphite rounded-xl p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-semibold text-chalk">
              Tactical disruption & scenario simulator
            </h3>
            <button
              onClick={() => {
                setInjectedDelay(0);
                setEnvironment(DEFAULT_ENVIRONMENT);
              }}
              className="text-xs font-body text-steel hover:text-chalk transition-colors"
            >
              Reset scenarios
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Weather selector */}
            <div className="space-y-2.5">
              <label className="font-body text-sm text-chalk-dim block">
                Atmospheric & track weather
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "CLEAR", label: "Clear track" },
                  { id: "HEAVY_MONSOON", label: "Monsoon (60k)" },
                  { id: "DENSE_FOG", label: "Fog (30k)" },
                ].map((w) => {
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
                      className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-lg border text-center transition-all duration-200 ${
                        isAct
                          ? "bg-surface-overlay border-chalk/40 text-chalk font-semibold"
                          : "bg-surface-raised border-graphite text-chalk-dim hover:bg-surface-overlay"
                      }`}
                    >
                      <span className="text-xs font-body">{w.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delay Injection */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="font-body text-sm text-chalk-dim">
                  Inject line incident delay
                </label>
                <span className="font-data text-sm text-signal-amber">
                  +{injectedDelay}m
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="45"
                step="5"
                value={injectedDelay}
                onChange={(e) => setInjectedDelay(Number(e.target.value))}
                className="w-full accent-signal-amber cursor-pointer h-1.5 bg-graphite rounded-lg"
              />
              <p className="text-xs text-steel font-body">
                Simulate cattle runover, unexpected crossing detention, or locomotive throttle slip.
              </p>
            </div>

            {/* Commuter Rush Surge */}
            <div className="space-y-2.5">
              <label className="font-body text-sm text-chalk-dim block">
                Suburban commuter rush hour
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    setEnvironment((prev) => ({
                      ...prev,
                      commuterSurgeMultiplier: 1.0,
                    }))
                  }
                  className={`py-2 px-3 rounded-lg border text-center text-xs transition-all ${
                    environment.commuterSurgeMultiplier === 1.0
                      ? "bg-surface-overlay border-chalk/40 text-chalk font-semibold"
                      : "bg-surface-raised border-graphite text-chalk-dim hover:bg-surface-overlay"
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
                  className={`py-2 px-3 rounded-lg border text-center text-xs transition-all ${
                    environment.commuterSurgeMultiplier > 1.0
                      ? "bg-surface-overlay border-chalk/40 text-chalk font-semibold"
                      : "bg-surface-raised border-graphite text-chalk-dim hover:bg-surface-overlay"
                  }`}
                >
                  Peak rush hour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Predicted Delay Intelligence Panel */}
      <div className="bg-surface border border-graphite rounded-xl p-5 space-y-5">
        
        {/* Train Status & Delay Factor Callout Bar */}
        <div className={`bg-surface-raised border-l-3 ${isDelayed ? 'border-signal-amber' : 'border-signal-green'} p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
          <div className="flex items-start sm:items-center gap-3">
            <span className="text-xs font-body font-semibold text-chalk">
              {resolved.stateLabel}
            </span>
            <div>
              <div className="font-body font-medium text-chalk text-sm">
                {resolved.liveSummary}
              </div>
              <div className="text-steel text-xs mt-0.5 font-body">
                Simulation Time: <strong className="font-data text-chalk-dim">{formatClockMinutes(activeClockMinutes)}</strong> · Scheduled Dep: <span className="font-data">{selectedTrain.scheduledDep}</span> ➔ Arr: <span className="font-data">{selectedTrain.scheduledArr}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-steel shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-graphite">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="font-data">KM {resolved.currentLocationKm.toFixed(1)}</span>
              <span className="font-body text-steel">of 138.25 km</span>
            </span>
            <span>·</span>
            <span className="font-body text-steel-light">
              {isDelayed ? `${totalDynamicDelayMin} delay factors accumulated` : 'No delay factors active'}
            </span>
          </div>
        </div>

        {/* Main Grid: Train Profile vs ETA Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Column: Train Info & Live Progress */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-body text-sm text-steel">
                Train <span className="font-data text-chalk-dim">{selectedTrain.id}</span>
              </span>
              <h2 className="text-xl font-heading font-bold text-chalk">
                {selectedTrain.name}
              </h2>
              <span className="text-xs font-body text-steel">
                {selectedTrain.scheduledStops.length === 2
                  ? "Non-stop express"
                  : `${selectedTrain.scheduledStops.length} scheduled halts`}
              </span>
            </div>

            <p className="text-xs font-body text-steel">
              Traction / Loco: {selectedTrain.locoType} ({selectedTrain.coaches} coaches) · Sanctioned MPS: <span className="font-data text-chalk-dim">{selectedTrain.sectionalMpsKmph} km/h</span>
            </p>

            {/* Journey Progress Track Bar */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-body">
                <span className="text-steel">Route traversed</span>
                <span className="font-data text-chalk-dim">
                  {resolved.currentLocationKm.toFixed(1)} km / 138.25 km ({progressPercent}%)
                </span>
              </div>
              
              {/* Visual Track Bar */}
              <div className="w-full h-1.5 bg-graphite rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${isDelayed ? 'bg-signal-amber' : 'bg-signal-green'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-body text-steel">
                <span>Mysuru Jn (Dep <span className="font-data">{selectedTrain.scheduledDep}</span>)</span>
                <span>KSR Bengaluru (Arr <span className="font-data">{selectedTrain.scheduledArr}</span>)</span>
              </div>
            </div>
          </div>

          {/* Right Column: Timetable vs Predicted ETA */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Booked / Timetable */}
            <div className="bg-surface-raised border border-graphite rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="text-xs font-body text-steel">
                  Timetable ETA (baseline)
                </div>
                <div className="text-3xl font-data font-bold text-chalk mt-3">
                  {selectedTrain.scheduledArr}
                </div>
              </div>
              <div className="text-xs text-steel mt-3 font-body">
                SWR scheduled arrival without delay factors
              </div>
            </div>

            {/* Predicted Arrival — accounting for infrastructure factors */}
            <div className={`bg-surface-raised border border-graphite rounded-xl p-5 flex flex-col justify-between border-l-3 ${isDelayed ? 'border-l-signal-amber' : 'border-l-signal-green'}`}>
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-body text-steel">
                    Predicted ETA (with delay factors)
                  </div>
                  <div className={`font-data text-xs ${isDelayed ? 'text-signal-amber' : 'text-signal-green'}`}>
                    {isDelayed ? `+${totalDynamicDelayMin}m late` : "On time"}
                  </div>
                </div>
                <div className="text-3xl font-data font-bold text-chalk mt-3">
                  {prediction.railrakshakDynamicEta}
                </div>
              </div>

              <div className="text-xs text-steel mt-3 font-body space-y-1">
                <div className="flex items-center justify-between">
                  <span>Slack recovered</span>
                  <span className="font-data text-signal-green">-{prediction.slackRecoveredMin.toFixed(1)}m</span>
                </div>
                {prediction.bottlenecksIncurredMin > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Bottlenecks incurred</span>
                    <span className="font-data text-signal-amber">+{prediction.bottlenecksIncurredMin.toFixed(1)}m</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Infrastructure Delay Factor Attribution */}
      <div className="space-y-6">
        <h3 className="text-base font-heading font-semibold text-chalk">
          Infrastructure delay factors along route (historical pattern)
        </h3>

        <div className="bg-surface-raised rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 gap-y-3">
            {/* Factor 1 */}
            <div className="flex justify-between items-baseline border-b border-graphite pb-2 md:border-b-0 md:pb-0">
              <span className="font-body text-sm text-chalk-dim">Track curvature PSRs</span>
              <span className="font-data text-sm text-signal-amber">
                +{prediction.speedRestrictionPenaltyMin.toFixed(1)}m
              </span>
            </div>

            {/* Factor 2 */}
            <div className="flex justify-between items-baseline border-b border-graphite pb-2 md:border-b-0 md:pb-0">
              <span className="font-body text-sm text-chalk-dim">4-aspect signaling</span>
              <span className="font-data text-sm text-signal-amber">
                +{prediction.signalHaltsPenaltyMin.toFixed(1)}m
              </span>
            </div>

            {/* Factor 3 */}
            <div className="flex justify-between items-baseline border-b border-graphite pb-2 md:border-b-0 md:pb-0">
              <span className="font-body text-sm text-chalk-dim">Dwells & LC gates</span>
              <span className="font-data text-sm text-signal-amber">
                +{((prediction.bottlenecksIncurredMin - prediction.speedRestrictionPenaltyMin - prediction.signalHaltsPenaltyMin) > 0 ? (prediction.bottlenecksIncurredMin - prediction.speedRestrictionPenaltyMin - prediction.signalHaltsPenaltyMin).toFixed(1) : "0.0")}m
              </span>
            </div>

            {/* Factor 4 */}
            <div className="flex justify-between items-baseline">
              <span className="font-body text-sm text-chalk-dim">Buffer slack recovery</span>
              <span className="font-data text-sm text-signal-green">
                -{prediction.slackRecoveredMin.toFixed(1)}m
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
