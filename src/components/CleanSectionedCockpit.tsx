import React, { useState, useEffect } from "react";
import { TrainConfig, DynamicPredictionResult } from "../lib/rail/types";
import { ALL_CORRIDOR_FLEET, resolveTrainAtClockTime, formatClockMinutes } from "../lib/rail/timeResolver";
import { EnvironmentalConditions } from "../lib/rail/restrictions";
import {
  Activity,
  AlertOctagon,
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
  RefreshCw,
  Search,
  ShieldAlert,
  Sliders,
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
  // Navigation: Step 1: Fleet Selection screen | Step 2: Selected Train's Deep Intelligence screen
  const [activeStep, setActiveStep] = useState<"FLEET_SELECT" | "TRAIN_DETAIL">("FLEET_SELECT");
  const [detailFocusTab, setDetailFocusTab] = useState<"ALL" | "MOVEMENTS" | "PAIN_POINTS" | "ETA">("ALL");
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
    setDetailFocusTab("ALL");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const primaryVuln = prediction.primaryVulnerabilitySector;
  const leadContext = prediction.precedingTrainContext;

  return (
    <div className="w-full space-y-6 font-body">
      {/* Top Stepper Breadcrumb & Fullscreen Controller Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
          <button
            onClick={() => setActiveStep("FLEET_SELECT")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeStep === "FLEET_SELECT"
                ? "bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Select Train ({ALL_CORRIDOR_FLEET.length} Trains)</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />

          <button
            onClick={() => setActiveStep("TRAIN_DETAIL")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeStep === "TRAIN_DETAIL"
                ? "bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Train className="w-4 h-4" />
            <span>2. #{selectedTrain.id} {selectedTrain.name}</span>
          </button>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Clock: <strong className="text-slate-900">{formatClockMinutes(activeClockMinutes)}</strong></span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold transition-all shadow-xs"
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
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  🚆
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-heading">
                    SWR Mysuru – Bengaluru Train Fleet
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select any train below to view its <strong>Recent Movements</strong>, <strong>Pain Points Faced</strong>, and <strong>Dynamic ML ETA</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                Total Fleet: <strong>{ALL_CORRIDOR_FLEET.length}</strong>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-semibold">
                Running Now: <strong>{runningCount}</strong>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-semibold">
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
                placeholder="Search by train name or number (e.g., 12613, Wodeyar, Shatabdi, 16215)..."
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
                      ? "bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-md"
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

                    {/* Route & Timings */}
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Route</div>
                        <div className="font-semibold text-slate-700">{train.origin} ➔ {train.destination}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Scheduled</div>
                        <div className="font-semibold text-slate-700">{train.scheduledDep} – {train.scheduledArr}</div>
                      </div>
                    </div>

                    {/* Live Movement & Telemetry Summary */}
                    {isRunning ? (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-700 font-semibold flex items-center gap-1">
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
                        <div className="text-[11px] text-slate-500 truncate">
                          {res.liveSummary}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-mono pt-1">
                        {res.stateLabel}
                      </div>
                    )}
                  </div>

                  {/* Action Open Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-bold group-hover:text-blue-700">
                    <span>Inspect Movements, ETA &amp; Pain Points</span>
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
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveStep("FLEET_SELECT")}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition-colors shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Fleet List</span>
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-mono font-bold text-xs sm:text-sm">
                      #{selectedTrain.id}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                      {selectedTrain.name}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedTrain.origin} ➔ {selectedTrain.destination} (138.25 km) · Loco: {selectedTrain.locoType} · Type: {selectedTrain.type}
                  </p>
                </div>
              </div>

              {/* Train Switcher & Live State */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1.5 rounded-xl font-mono text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {resolved.stateLabel}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline">Switch:</span>
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
            </div>

            {/* Sub-Tabs: Filter focus to All, Recent Movements, Pain Points, or Dynamic ETA */}
            <div className="flex items-center gap-1.5 border-t border-slate-100 pt-3 overflow-x-auto">
              <button
                onClick={() => setDetailFocusTab("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all whitespace-nowrap ${
                  detailFocusTab === "ALL"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                ⚡ Complete 3-in-1 View
              </button>

              <button
                onClick={() => setDetailFocusTab("MOVEMENTS")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all whitespace-nowrap ${
                  detailFocusTab === "MOVEMENTS"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>📍 Recent Movements</span>
              </button>

              <button
                onClick={() => setDetailFocusTab("PAIN_POINTS")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all whitespace-nowrap ${
                  detailFocusTab === "PAIN_POINTS"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>⚠️ Pain Points Faced</span>
              </button>

              <button
                onClick={() => setDetailFocusTab("ETA")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold font-heading transition-all whitespace-nowrap ${
                  detailFocusTab === "ETA"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>⏱️ Dynamic ETA</span>
              </button>
            </div>
          </div>

          {/* Interactive What-If Scenario Delay Simulator Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-bold text-slate-800">What-If Delay Simulator:</span>
              <span className="text-slate-500">Inject additional corridor delay:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[0, 5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setInjectedDelay(mins)}
                  className={`px-3 py-1 rounded-lg border transition-all ${
                    injectedDelay === mins
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {mins === 0 ? "Normal (0m)" : `+${mins}m`}
                </button>
              ))}
            </div>
          </div>

          {/* 2-Column Fullscreen Responsive Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ========================================================================= */}
            {/* SECTION 1: RECENT MOVEMENTS & STATION PROGRESSION SPINE (Left 6 Cols)     */}
            {/* ========================================================================= */}
            {(detailFocusTab === "ALL" || detailFocusTab === "MOVEMENTS") && (
              <div className={`${detailFocusTab === "MOVEMENTS" ? "lg:col-span-12" : "lg:col-span-6"} bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5`}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-blue-600" />
                      <span>1. Recent Movements &amp; Track Telemetry</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Live GPS Position, Velocity &amp; Station Progression
                    </p>
                  </div>

                  <div className="text-right font-mono">
                    <span className="px-2.5 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      GPS + RTIS Sync
                    </span>
                  </div>
                </div>

                {/* Current Live Kinematic Position Hero Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
                      CURRENT LIVE POSITION
                    </span>
                    <span className="font-mono text-blue-100 text-xs">Axle Counter &amp; GNSS Verified</span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-3xl font-bold tracking-tight font-heading">
                        KM {resolved.currentLocationKm.toFixed(1)}
                      </div>
                      <div className="text-xs sm:text-sm text-blue-100 mt-0.5 font-medium">
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
                    <span>Locomotive: <strong>{selectedTrain.locoType}</strong></span>
                    <span>Signal Aspect: <strong className="text-white">DOUBLE YELLOW (Caution)</strong></span>
                  </div>
                </div>

                {/* Preceding Train Headway Tracking Radar Banner */}
                {leadContext && leadContext.leadTrainId && (
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs font-mono flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                      <span className="text-slate-700">
                        Lead Train: <strong>#{leadContext.leadTrainId} {leadContext.leadTrainName}</strong>
                      </span>
                    </div>
                    <div className="text-blue-700 font-bold">
                      Gap: {leadContext.headwayGapMinutes}m ({leadContext.headwayDistanceKm ? leadContext.headwayDistanceKm.toFixed(1) : "0.0"} km)
                    </div>
                  </div>
                )}

                {/* Station Progression Timeline */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    <span>Station Progression &amp; Forecast Timeline</span>
                    <span>17 Stations Track Spine</span>
                  </div>

                  <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                    {prediction.stationBreakdown.map((st) => {
                      const isCleared = st.trackStatus === "CLEARED";
                      const isCurrent = st.trackStatus === "CURRENT_RUNNING";

                      return (
                        <div
                          key={st.code}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                            isCurrent
                              ? "bg-blue-50/90 border-blue-400 shadow-xs"
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
                                    ? "text-amber-600 font-bold"
                                    : "text-emerald-600 font-bold"
                                }
                              >
                                {st.predictedDelayMin > 0 ? `+${st.predictedDelayMin}m variance` : "On Time"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SECTION 2 & 3: DYNAMIC ETA & PAIN POINTS FACED (Right 6 Cols)             */}
            {/* ========================================================================= */}
            {(detailFocusTab === "ALL" || detailFocusTab === "ETA" || detailFocusTab === "PAIN_POINTS") && (
              <div className={`${detailFocusTab !== "ALL" ? "lg:col-span-12" : "lg:col-span-6"} space-y-5`}>
                
                {/* ------------------------------------------------------------- */}
                {/* DYNAMIC ETA CARD                                              */}
                {/* ------------------------------------------------------------- */}
                {(detailFocusTab === "ALL" || detailFocusTab === "ETA") && (
                  <div className="bg-white border-2 border-blue-500 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                          2. Dynamic ML ETA Prediction
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 font-mono">
                        95% ACCURACY
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="text-xs font-mono text-slate-400 uppercase font-semibold">Booked Timetable ETA</div>
                        <div className="text-xl sm:text-2xl font-bold text-slate-700 font-mono mt-1">
                          {selectedTrain.scheduledArr}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">Static Timetable Arrival</div>
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
                        <div className="text-[10px] text-slate-400">Predicted Delay</div>
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
                        <div className="text-[10px] text-slate-400">Bottlenecks Incurred</div>
                        <div className="text-sm font-bold text-rose-600 mt-0.5">
                          +{prediction.bottlenecksIncurredMin}m
                        </div>
                      </div>
                    </div>

                    {prediction.confidenceInterval && (
                      <div className="text-center text-xs font-mono text-slate-600 bg-slate-50 py-2 rounded-xl border border-slate-200">
                        95% Confidence Interval: <strong className="text-slate-900">{prediction.confidenceInterval.lowerEta} – {prediction.confidenceInterval.upperEta}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* PRIMARY VULNERABILITY SECTOR SPOTLIGHT                        */}
                {/* ------------------------------------------------------------- */}
                {(detailFocusTab === "ALL" || detailFocusTab === "PAIN_POINTS") && primaryVuln && (
                  <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5 font-mono text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        3. PRIMARY VULNERABILITY BOTTLENECK SECTOR
                      </span>
                      <span className="text-xs font-mono font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                        {primaryVuln.historicalOccurrenceFrequencyPct}% RECURRENCE
                      </span>
                    </div>

                    <div className="text-sm sm:text-base font-bold text-slate-900">
                      {primaryVuln.primarySectorName} ({primaryVuln.chainageRangeKm})
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-body">
                      {primaryVuln.vulnerabilityReason}
                    </p>

                    <div className="pt-2.5 border-t border-amber-200/60 flex items-center justify-between text-xs font-mono text-amber-900">
                      <span>Dynamic ETA Buffer Injected: <strong>+{primaryVuln.etaBufferAdjustedMin}m</strong></span>
                      <span className="text-slate-500">Historical Avg Delay: +{primaryVuln.historicalAverageDelayMin}m</span>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* ACTIVE PAIN POINTS & ROOT CAUSES FEED                         */}
                {/* ------------------------------------------------------------- */}
                {(detailFocusTab === "ALL" || detailFocusTab === "PAIN_POINTS") && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-rose-600" />
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">Active Pain Point Factors &amp; Attribution</h3>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {prediction.shapFactors.length} Factors Detected
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
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
                )}

              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
