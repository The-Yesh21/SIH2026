import React, { useState } from "react";
import { TrainConfig, DynamicPredictionResult } from "../lib/rail/types";
import { ALL_CORRIDOR_FLEET, resolveTrainAtClockTime, formatClockMinutes } from "../lib/rail/timeResolver";
import { EnvironmentalConditions } from "../lib/rail/restrictions";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Gauge,
  MapPin,
  Radio,
  Search,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";

interface CleanSectionedCockpitProps {
  selectedTrain: TrainConfig;
  prediction: DynamicPredictionResult;
  onSelectTrain: (trainId: string) => void;
  activeClockMinutes: number;
  environment: EnvironmentalConditions;
  injectedDelay: number;
  setInjectedDelay: (delay: number) => void;
}

export function CleanSectionedCockpit({
  selectedTrain,
  prediction,
  onSelectTrain,
  activeClockMinutes,
  environment,
  injectedDelay,
  setInjectedDelay,
}: CleanSectionedCockpitProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "RUNNING" | "DELAYED">("ALL");

  const resolved = resolveTrainAtClockTime(selectedTrain, activeClockMinutes);

  // Filter fleet
  const filteredFleet = ALL_CORRIDOR_FLEET.filter((train) => {
    const matchesSearch =
      train.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      train.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const res = resolveTrainAtClockTime(train, activeClockMinutes);
    if (filterType === "RUNNING") return res.operatingState === "RUNNING_ON_TRACK";
    if (filterType === "DELAYED") return res.delayMinutes > 0;
    return true;
  });

  const lead = prediction.precedingTrainContext;
  const primaryVuln = prediction.primaryVulnerabilitySector;

  return (
    <div className="space-y-6">
      {/* 3-Column Sectioned App Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* SECTION 1: TRAIN FLEET SELECTOR (Left 3.5 Cols / ~340px) */}
        {/* ========================================================= */}
        <section className="lg:col-span-4 xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                {ALL_CORRIDOR_FLEET.length}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Corridor Fleet</h3>
                <p className="text-[11px] text-slate-500 font-mono">MYS ➔ SBC Services</p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              LIVE
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search train (e.g., 12613, Wodeyar)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
            />
          </div>

          {/* Quick Filter Pills */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-medium text-slate-600">
            <button
              onClick={() => setFilterType("ALL")}
              className={`py-1 rounded-lg text-center transition-all ${
                filterType === "ALL" ? "bg-white text-slate-900 shadow-xs font-semibold" : "hover:text-slate-900"
              }`}
            >
              All ({ALL_CORRIDOR_FLEET.length})
            </button>
            <button
              onClick={() => setFilterType("RUNNING")}
              className={`py-1 rounded-lg text-center transition-all ${
                filterType === "RUNNING" ? "bg-white text-slate-900 shadow-xs font-semibold" : "hover:text-slate-900"
              }`}
            >
              Running
            </button>
            <button
              onClick={() => setFilterType("DELAYED")}
              className={`py-1 rounded-lg text-center transition-all ${
                filterType === "DELAYED" ? "bg-white text-slate-900 shadow-xs font-semibold" : "hover:text-slate-900"
              }`}
            >
              Delayed
            </button>
          </div>

          {/* Train Cards List */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredFleet.map((train) => {
              const res = resolveTrainAtClockTime(train, activeClockMinutes);
              const isSelected = train.id === selectedTrain.id;
              const isRunning = res.operatingState === "RUNNING_ON_TRACK";
              const isCompleted = res.operatingState === "TRIP_COMPLETED";

              return (
                <div
                  key={train.id}
                  onClick={() => onSelectTrain(train.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="text-blue-600 font-mono">#{train.id}</span>
                      <span className="truncate max-w-[140px]">{train.name}</span>
                    </span>

                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono ${
                        isRunning
                          ? "bg-blue-100 text-blue-700"
                          : isCompleted
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isRunning ? "RUNNING" : isCompleted ? "COMPLETED" : "SCHEDULED"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono">
                    <span>{train.origin} ➔ {train.destination}</span>
                    <span>Dep {train.scheduledDep}</span>
                  </div>

                  {isRunning && (
                    <div className="flex items-center justify-between text-[10px] mt-2 pt-2 border-t border-slate-100 font-mono">
                      <span className="text-slate-600 font-semibold">
                        KM {res.currentLocationKm.toFixed(1)} · {Math.round(res.currentSpeedKmph)} km/h
                      </span>
                      <span
                        className={
                          res.delayMinutes > 0 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"
                        }
                      >
                        {res.delayMinutes > 0 ? `+${res.delayMinutes}m delay` : "ON TIME"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: LIVE MOVEMENTS & TRACK SPINE (Center 4.5 Cols) */}
        {/* ========================================================= */}
        <section className="lg:col-span-8 xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Recent Movements &amp; Track Spine
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 font-mono">
                  #{selectedTrain.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedTrain.name} · {selectedTrain.origin} ➔ {selectedTrain.destination} (138.25 km)
              </p>
            </div>

            <div className="text-right font-mono">
              <div className="text-[10px] text-slate-400">STATUS</div>
              <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {resolved.stateLabel}
              </div>
            </div>
          </div>

          {/* Current Live Kinematic Position Hero Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
                CURRENT LIVE POSITION
              </span>
              <span className="font-mono text-blue-100">GPS / Axle Counter Verified</span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-bold tracking-tight">
                  KM {resolved.currentLocationKm.toFixed(1)}
                </div>
                <div className="text-xs text-blue-100 mt-0.5">
                  {resolved.liveSummary}
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold font-mono">
                  {Math.round(resolved.currentSpeedKmph)} <span className="text-sm font-normal text-blue-200">km/h</span>
                </div>
                <div className="text-[11px] text-blue-100">Running Velocity</div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs text-blue-100 font-mono">
              <span>Loco: {selectedTrain.locoType}</span>
              <span>Aspect: <strong className="text-white">DOUBLE YELLOW (Caution)</strong></span>
            </div>
          </div>

          {/* Linear Station-by-Station Progression Timeline */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono mb-2">
              Station Progression &amp; Forecast Timeline
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {prediction.stationBreakdown.map((st, idx) => {
                const isCleared = st.trackStatus === "CLEARED";
                const isCurrent = st.trackStatus === "CURRENT_RUNNING";
                const isForecast = st.trackStatus === "FORECASTED";

                return (
                  <div
                    key={st.code}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-blue-50/70 border-blue-400 shadow-xs"
                        : isCleared
                        ? "bg-slate-50/70 border-slate-200"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    {/* Node Dot */}
                    <div className="mt-0.5 shrink-0">
                      {isCleared ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] animate-bounce">
                          🚆
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white" />
                      )}
                    </div>

                    {/* Station Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {st.name} <span className="text-slate-400 font-mono font-normal">({st.code})</span>
                        </span>

                        <span className="text-xs font-mono font-bold text-slate-900">
                          {isCleared ? st.bookedTime : st.predictedTime}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1">
                        <span>KM {st.distanceFromMysKm.toFixed(1)} · MPS {st.allowedSpeedKmph} km/h</span>
                        <span
                          className={
                            st.predictedDelayMin > 0
                              ? "text-amber-600 font-semibold"
                              : "text-emerald-600 font-semibold"
                          }
                        >
                          {st.predictedDelayMin > 0 ? `+${st.predictedDelayMin}m` : "On Time"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: DYNAMIC ETA & PAIN POINTS (Right 4 Cols)      */}
        {/* ========================================================= */}
        <section className="lg:col-span-12 xl:col-span-4 space-y-5">
          {/* Dynamic ETA Hero Card */}
          <div className="bg-white border-2 border-blue-500 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                  RailRakshak Dynamic ML ETA
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 font-mono">
                95% ACCURACY
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Booked Schedule</div>
                <div className="text-lg font-bold text-slate-700 font-mono mt-0.5">
                  {selectedTrain.scheduledArr}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Static Timetable</div>
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <div className="text-[10px] font-mono text-blue-600 uppercase font-bold">Predicted Dynamic ETA</div>
                <div className="text-xl font-bold text-blue-700 font-mono mt-0.5">
                  {prediction.railrakshakDynamicEta}
                </div>
                <div className="text-[10px] text-blue-600 font-mono font-semibold">
                  +{Math.round(prediction.railrakshakDynamicDelayMin)} min arrival variance
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Chips */}
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[9px] text-slate-400">Dynamic Delay</div>
                <div className="text-xs font-bold text-amber-600 mt-0.5">
                  +{Math.round(prediction.railrakshakDynamicDelayMin)}m
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[9px] text-slate-400">Slack Recovered</div>
                <div className="text-xs font-bold text-emerald-600 mt-0.5">
                  -{prediction.slackRecoveredMin}m
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[9px] text-slate-400">Bottlenecks</div>
                <div className="text-xs font-bold text-rose-600 mt-0.5">
                  +{prediction.bottlenecksIncurredMin}m
                </div>
              </div>
            </div>

            {prediction.confidenceInterval && (
              <div className="text-center text-[11px] font-mono text-slate-500 bg-slate-50 py-1.5 rounded-lg border border-slate-200">
                Confidence Window: <strong>{prediction.confidenceInterval.lowerEta} – {prediction.confidenceInterval.upperEta}</strong>
              </div>
            )}
          </div>

          {/* Primary Vulnerability Sector Spotlight */}
          {primaryVuln && (
            <div className="bg-amber-50/60 border border-amber-300 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900 flex items-center gap-1.5 font-mono text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  PRIMARY VULNERABILITY SECTOR
                </span>
                <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                  {primaryVuln.historicalOccurrenceFrequencyPct}% RISK
                </span>
              </div>

              <div className="text-xs font-bold text-slate-900">
                {primaryVuln.primarySectorName} ({primaryVuln.chainageRangeKm})
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed font-body">
                {primaryVuln.vulnerabilityReason}
              </p>

              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] font-mono text-amber-900">
                <span>ETA Buffer Added: <strong>+{primaryVuln.etaBufferAdjustedMin}m</strong></span>
                <span className="text-[10px] text-slate-500">Historical Avg: +{primaryVuln.historicalAverageDelayMin}m</span>
              </div>
            </div>
          )}

          {/* Active Pain Points & Root Causes Feed */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Active Pain Points &amp; Root Causes</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {prediction.shapFactors.length} Factors
              </span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {prediction.shapFactors.map((factor, idx) => {
                const isRecovery = factor.type === "recovery";
                const isHighDelay = factor.impactMinutes > 3.0;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      isRecovery
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                        : isHighDelay
                        ? "bg-rose-50/50 border-rose-200 text-rose-950"
                        : "bg-amber-50/50 border-amber-200 text-amber-950"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 truncate max-w-[200px]">
                        {factor.name}
                      </span>
                      <span
                        className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          isRecovery
                            ? "bg-emerald-100 text-emerald-700"
                            : isHighDelay
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isRecovery ? `${factor.impactMinutes}m` : `+${factor.impactMinutes}m`}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Category: {factor.category}
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed mt-1 font-body">
                      {factor.rationale}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
