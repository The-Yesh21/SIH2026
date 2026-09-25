import React, { useState, useEffect } from "react";
import { TrainConfig, DynamicPredictionResult } from "../lib/rail/types";
import { ALL_CORRIDOR_FLEET, resolveTrainAtClockTime, formatClockMinutes } from "../lib/rail/timeResolver";
import { EnvironmentalConditions } from "../lib/rail/restrictions";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Flame,
  Gauge,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Radio,
  Search,
  Sparkles,
  Train,
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
  // Step 1: Fleet Selection screen | Step 2: Selected Train's Deep Intelligence screen
  const [activeStep, setActiveStep] = useState<"FLEET_SELECT" | "TRAIN_DETAIL">("FLEET_SELECT");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "RUNNING" | "DELAYED">("ALL");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

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

  const runningCount = ALL_CORRIDOR_FLEET.filter(
    (t) => resolveTrainAtClockTime(t, activeClockMinutes).operatingState === "RUNNING_ON_TRACK"
  ).length;

  const delayedCount = ALL_CORRIDOR_FLEET.filter(
    (t) => resolveTrainAtClockTime(t, activeClockMinutes).delayMinutes > 0
  ).length;

  const handleTrainClick = (trainId: string) => {
    onSelectTrain(trainId);
    setActiveStep("TRAIN_DETAIL");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const primaryVuln = prediction.primaryVulnerabilitySector;

  return (
    <div className="w-full space-y-6">
      {/* Top Stepper Breadcrumb & Fullscreen Controller Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
          <button
            onClick={() => setActiveStep("FLEET_SELECT")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
              activeStep === "FLEET_SELECT"
                ? "bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Train Fleet Selector</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />

          <button
            onClick={() => setActiveStep("TRAIN_DETAIL")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
              activeStep === "TRAIN_DETAIL"
                ? "bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Train className="w-3.5 h-3.5" />
            <span>2. Live Movements &amp; Pain Points (#{selectedTrain.id})</span>
          </button>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Clock: <strong className="text-slate-800">{formatClockMinutes(activeClockMinutes)}</strong></span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold transition-all"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN 1: TRAIN FLEET SELECTOR (Click a train to open its interface)     */}
      {/* ========================================================================= */}
      {activeStep === "FLEET_SELECT" ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Header & Quick Stat Chips */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  🚆
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-heading">
                  SWR Corridor Train Fleet
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                  {ALL_CORRIDOR_FLEET.length} Scheduled Services
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Select any train below to open its live movements, dynamic ETA predictions, and bottleneck sector forensics in full screen.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                Total: <strong>{ALL_CORRIDOR_FLEET.length}</strong>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
                Running: <strong>{runningCount}</strong>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                Delayed: <strong>{delayedCount}</strong>
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search train by name or number (e.g., 12613, Wodeyar, Shatabdi)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs sm:text-sm font-medium text-slate-600 shrink-0">
              <button
                onClick={() => setFilterType("ALL")}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  filterType === "ALL" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
                }`}
              >
                All Trains ({ALL_CORRIDOR_FLEET.length})
              </button>
              <button
                onClick={() => setFilterType("RUNNING")}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  filterType === "RUNNING" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
                }`}
              >
                Running ({runningCount})
              </button>
              <button
                onClick={() => setFilterType("DELAYED")}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  filterType === "DELAYED" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
                }`}
              >
                Delayed ({delayedCount})
              </button>
            </div>
          </div>

          {/* Fullscreen Responsive Train Cards Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredFleet.map((train) => {
              const res = resolveTrainAtClockTime(train, activeClockMinutes);
              const isSelected = train.id === selectedTrain.id;
              const isRunning = res.operatingState === "RUNNING_ON_TRACK";
              const isCompleted = res.operatingState === "TRIP_COMPLETED";

              return (
                <div
                  key={train.id}
                  onClick={() => handleTrainClick(train.id)}
                  className={`group p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? "bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                      : "bg-white border-slate-200 hover:border-blue-400 hover:shadow-md hover:bg-slate-50/30"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Identity & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono font-bold text-xs">
                          #{train.id}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                          {train.name}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                          isRunning
                            ? "bg-emerald-100 text-emerald-800 animate-pulse"
                            : isCompleted
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isRunning ? "RUNNING" : isCompleted ? "COMPLETED" : "SCHEDULED"}
                      </span>
                    </div>

                    {/* Origin ➔ Destination & Timings */}
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Route</div>
                        <div className="font-semibold text-slate-700">{train.origin} ➔ {train.destination}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase">Schedule</div>
                        <div className="font-semibold text-slate-700">{train.scheduledDep} – {train.scheduledArr}</div>
                      </div>
                    </div>

                    {/* Live Position & Telemetry */}
                    {isRunning ? (
                      <div className="flex items-center justify-between text-xs font-mono pt-1">
                        <span className="text-slate-600 font-semibold flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          KM {res.currentLocationKm.toFixed(1)} · {Math.round(res.currentSpeedKmph)} km/h
                        </span>
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                            res.delayMinutes > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {res.delayMinutes > 0 ? `+${res.delayMinutes}m delay` : "ON TIME"}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-mono pt-1">
                        {res.stateLabel}
                      </div>
                    )}
                  </div>

                  {/* Action Open Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-bold group-hover:text-blue-700">
                    <span>Open Live Deck</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* SCREEN 2: SELECTED TRAIN INTERFACE (Recent Movements + ETA & Pain Points) */
        /* ========================================================================= */
        <div className="w-full space-y-6">
          {/* Header Action Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveStep("FLEET_SELECT")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to All Trains</span>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-xs">
                    #{selectedTrain.id}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 font-heading">
                    {selectedTrain.name}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedTrain.origin} ➔ {selectedTrain.destination} (138.25 km corridor) · Loco: {selectedTrain.locoType}
                </p>
              </div>
            </div>

            {/* Quick Train Selector Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono hidden md:inline">Switch Train:</span>
              <select
                value={selectedTrain.id}
                onChange={(e) => onSelectTrain(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ALL_CORRIDOR_FLEET.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} - {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2-Column Fullscreen Split: [Recent Movements & Track Spine] | [Dynamic ETA & Pain Points] */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN (6 Cols / 50% Full-Screen): Recent Movements & Station Progression Spine */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-blue-600" />
                    <span>Recent Movements &amp; Track Spine</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live GPS Telemetry &amp; Station-by-Station Progression
                  </p>
                </div>

                <div className="text-right font-mono">
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                    {resolved.stateLabel}
                  </span>
                </div>
              </div>

              {/* Current Live Kinematic Position Hero Banner */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
                    CURRENT LIVE POSITION
                  </span>
                  <span className="font-mono text-blue-100 text-xs">GPS / Axle Counter Verified</span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-3xl font-bold tracking-tight font-heading">
                      KM {resolved.currentLocationKm.toFixed(1)}
                    </div>
                    <div className="text-xs sm:text-sm text-blue-100 mt-0.5">
                      {resolved.liveSummary}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-3xl font-bold font-mono">
                      {Math.round(resolved.currentSpeedKmph)} <span className="text-sm font-normal text-blue-200">km/h</span>
                    </div>
                    <div className="text-xs text-blue-100">Running Velocity</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/20 flex items-center justify-between text-xs text-blue-100 font-mono">
                  <span>Loco: {selectedTrain.locoType}</span>
                  <span>Aspect: <strong className="text-white">DOUBLE YELLOW (Caution)</strong></span>
                </div>
              </div>

              {/* Station Progression Timeline */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Station Progression &amp; Forecast Timeline
                </div>

                <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                  {prediction.stationBreakdown.map((st) => {
                    const isCleared = st.trackStatus === "CLEARED";
                    const isCurrent = st.trackStatus === "CURRENT_RUNNING";

                    return (
                      <div
                        key={st.code}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                          isCurrent
                            ? "bg-blue-50/80 border-blue-400 shadow-xs"
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
                            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {st.name} <span className="text-slate-400 font-mono font-normal">({st.code})</span>
                            </span>

                            <span className="text-xs sm:text-sm font-mono font-bold text-slate-900">
                              {isCleared ? st.bookedTime : st.predictedTime}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 font-mono mt-1">
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
            </div>

            {/* RIGHT COLUMN (6 Cols / 50% Full-Screen): Dynamic ETA & Pain Points */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* Dynamic ETA Hero Card */}
              <div className="bg-white border-2 border-blue-500 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                      RailRakshak Dynamic ML ETA
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 font-mono">
                    95% ACCURACY
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="text-xs font-mono text-slate-400 uppercase">Booked Schedule</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-700 font-mono mt-1">
                      {selectedTrain.scheduledArr}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">Static Timetable</div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div className="text-xs font-mono text-blue-600 uppercase font-bold">Predicted Dynamic ETA</div>
                    <div className="text-2xl sm:text-3xl font-bold text-blue-700 font-mono mt-1">
                      {prediction.railrakshakDynamicEta}
                    </div>
                    <div className="text-xs text-blue-600 font-mono font-semibold">
                      +{Math.round(prediction.railrakshakDynamicDelayMin)} min arrival variance
                    </div>
                  </div>
                </div>

                {/* Metrics Breakdown Chips */}
                <div className="grid grid-cols-3 gap-3 pt-1 font-mono text-center">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400">Dynamic Delay</div>
                    <div className="text-sm font-bold text-amber-600 mt-0.5">
                      +{Math.round(prediction.railrakshakDynamicDelayMin)}m
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400">Slack Recovered</div>
                    <div className="text-sm font-bold text-emerald-600 mt-0.5">
                      -{prediction.slackRecoveredMin}m
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400">Bottlenecks</div>
                    <div className="text-sm font-bold text-rose-600 mt-0.5">
                      +{prediction.bottlenecksIncurredMin}m
                    </div>
                  </div>
                </div>

                {prediction.confidenceInterval && (
                  <div className="text-center text-xs font-mono text-slate-600 bg-slate-50 py-2 rounded-xl border border-slate-200">
                    Confidence Window: <strong className="text-slate-900">{prediction.confidenceInterval.lowerEta} – {prediction.confidenceInterval.upperEta}</strong>
                  </div>
                )}
              </div>

              {/* Primary Vulnerability Sector Spotlight */}
              {primaryVuln && (
                <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5 font-mono text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      PRIMARY VULNERABILITY SECTOR
                    </span>
                    <span className="text-xs font-mono font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                      {primaryVuln.historicalOccurrenceFrequencyPct}% RISK
                    </span>
                  </div>

                  <div className="text-sm font-bold text-slate-900">
                    {primaryVuln.primarySectorName} ({primaryVuln.chainageRangeKm})
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-body">
                    {primaryVuln.vulnerabilityReason}
                  </p>

                  <div className="pt-2.5 border-t border-amber-200/60 flex items-center justify-between text-xs font-mono text-amber-900">
                    <span>ETA Buffer Added: <strong>+{primaryVuln.etaBufferAdjustedMin}m</strong></span>
                    <span className="text-slate-500">Historical Avg: +{primaryVuln.historicalAverageDelayMin}m</span>
                  </div>
                </div>
              )}

              {/* Active Pain Points & Root Causes Feed */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-600" />
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">Active Pain Points &amp; Root Causes</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {prediction.shapFactors.length} Factors
                  </span>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {prediction.shapFactors.map((factor, idx) => {
                    const isRecovery = factor.type === "recovery";
                    const isHighDelay = factor.impactMinutes > 3.0;

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isRecovery
                            ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                            : isHighDelay
                            ? "bg-rose-50/50 border-rose-200 text-rose-950"
                            : "bg-amber-50/50 border-amber-200 text-amber-950"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-bold text-slate-900 truncate max-w-[240px]">
                            {factor.name}
                          </span>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
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

                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Category: {factor.category}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mt-1.5 font-body">
                          {factor.rationale}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
