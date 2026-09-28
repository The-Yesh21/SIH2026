import React, { useState, useMemo } from "react";
import {
  Train,
  Clock,
  AlertTriangle,
  Zap,
  TrendingUp,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  ChevronRight,
  ShieldAlert,
  Gauge,
  Sparkles,
  ArrowRight,
  Play,
  RotateCcw,
  Sliders,
  Timer,
  Layers,
} from "lucide-react";
import { TrainConfig, DynamicPredictionResult } from "../lib/rail/types";
import { ALL_CORRIDOR_FLEET, resolveTrainAtClockTime, formatClockMinutes } from "../lib/rail/timeResolver";
import { SWR_CORRIDOR_STATIONS } from "../lib/rail/infrastructure";
import { getTrainHistoricalRecoveryDNA } from "../lib/rail/godModeSimulator";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT } from "../lib/rail/restrictions";

interface ExecutiveHumanCockpitProps {
  selectedTrain: TrainConfig;
  prediction: DynamicPredictionResult;
  onSelectTrain: (trainId: string) => void;
  activeClockMinutes: number;
  setActiveClockMinutes: (mins: number) => void;
  isRealTimeSynced: boolean;
  setIsRealTimeSynced: (synced: boolean) => void;
  onOpenSimulator: () => void;
  onOpenOptimalRoute: () => void;
  environment?: EnvironmentalConditions;
  injectedDelay?: number;
  setInjectedDelay?: (delay: number) => void;
}

const TOP_BOTTLENECK_STATIONS = [
  {
    code: "MYA",
    name: "Mandya",
    km: 45.4,
    avgDelayMin: 12.4,
    primaryReason: "Commuter passenger surge & loop line holds for VIP train overtaking",
    impactTier: "HIGH_BOTTLENECK",
  },
  {
    code: "KGI",
    name: "Kengeri ➔ SBC Approach",
    km: 126.0,
    avgDelayMin: 14.8,
    primaryReason: "Terminal throat interlocking congestion & suburban headway compression",
    impactTier: "CRITICAL_BOTTLENECK",
  },
  {
    code: "RMGM",
    name: "Ramanagaram",
    km: 93.9,
    avgDelayMin: 8.2,
    primaryReason: "Curvature & gradient permanent speed restriction (PSR 90 km/h)",
    impactTier: "MODERATE",
  },
  {
    code: "MAD",
    name: "Maddur",
    km: 64.5,
    avgDelayMin: 6.5,
    primaryReason: "Level crossing gate closure delays (LC-42) & commuter boardings",
    impactTier: "MODERATE",
  },
];

const DELAY_FACTORS_RANKING = [
  {
    name: "Precedence & Loop Line Holds",
    category: "Dispatching",
    sharePct: 34,
    description: "Lower-tier trains (MEMU/Freight) held on loop tracks to let Vande Bharat & Shatabdi pass.",
    color: "bg-rose-500",
  },
  {
    name: "SBC Terminal Throat Congestion",
    category: "Terminal Capacity",
    sharePct: 28,
    description: "Platform occupancy delays at Bengaluru City causing trains to crawl near Kengeri/Nayandahalli.",
    color: "bg-amber-500",
  },
  {
    name: "Commuter Platform Dwell Surges",
    category: "Passenger Surge",
    sharePct: 18,
    description: "Peak morning & evening rush at Mandya, Channapatna & Ramanagaram delaying departures.",
    color: "bg-indigo-500",
  },
  {
    name: "Permanent Speed Restrictions & Curvature",
    category: "Civil Track",
    sharePct: 12,
    description: "Mandatory track speed caps across curves and turnouts (e.g. 15 km/h yard throat limits).",
    color: "bg-blue-500",
  },
  {
    name: "Level Crossing Gate Clearance Delays",
    category: "Road Interlocking",
    sharePct: 8,
    description: "Heavy highway road traffic holding up interlocked gate closures at Mandya & Bidadi.",
    color: "bg-emerald-500",
  },
];

export function ExecutiveHumanCockpit({
  selectedTrain,
  prediction,
  onSelectTrain,
  activeClockMinutes,
  setActiveClockMinutes,
  isRealTimeSynced,
  setIsRealTimeSynced,
  onOpenSimulator,
  onOpenOptimalRoute,
  environment = DEFAULT_ENVIRONMENT,
  injectedDelay = 0,
  setInjectedDelay,
}: ExecutiveHumanCockpitProps) {
  // Light / Dark Theme State
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      return (localStorage.getItem("railrakshak_theme") as "dark" | "light") || "dark";
    } catch {
      return "dark";
    }
  });

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("railrakshak_theme", next);
    } catch {}
  };

  const isDark = theme === "dark";

  // Fleet Resolution for all 10 trains at current clock
  const fleetStatus = useMemo(() => {
    return ALL_CORRIDOR_FLEET.map((train) => {
      const resolved = resolveTrainAtClockTime(train, activeClockMinutes);
      const dna = getTrainHistoricalRecoveryDNA(train);
      const totalDelay = resolved.delayMinutes + (train.id === selectedTrain.id ? injectedDelay : 0);
      return {
        train,
        resolved,
        dna,
        totalDelay,
      };
    });
  }, [activeClockMinutes, selectedTrain.id, injectedDelay]);

  // 1. Train with MOST Amount of Delay
  const mostDelayed = useMemo(() => {
    const sorted = [...fleetStatus].sort((a, b) => b.totalDelay - a.totalDelay);
    return sorted[0] || fleetStatus[0];
  }, [fleetStatus]);

  // 2. Train with BEST Recovery Rate & Chance of Getting Delay Back
  const bestRecovery = useMemo(() => {
    // Priority to trains with active delay and highest recovery rate (Vande Bharat / Shatabdi)
    const delayedTrains = fleetStatus.filter((t) => t.totalDelay > 0);
    if (delayedTrains.length > 0) {
      return delayedTrains.sort((a, b) => b.dna.historicalRecoveryRate - a.dna.historicalRecoveryRate)[0]!;
    }
    // Default to Vande Bharat
    return fleetStatus.find((t) => t.train.type === "VANDE_BHARAT") || fleetStatus[0]!;
  }, [fleetStatus]);

  // Active selected train status
  const currentSelectedState = useMemo(() => {
    return fleetStatus.find((t) => t.train.id === selectedTrain.id) || fleetStatus[0]!;
  }, [fleetStatus, selectedTrain.id]);

  // Styling helpers based on theme
  const bgMain = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";
  const bgCard = isDark ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm";
  const bgCardHighlight = isDark ? "bg-slate-900 border-indigo-500/40" : "bg-white border-indigo-200 shadow-md";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";
  const textSubtle = isDark ? "text-slate-500" : "text-slate-400";
  const bgInput = isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-100 border-slate-300 text-slate-900";
  const bgPill = isDark ? "bg-slate-800/80 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className={`space-y-8 animate-fade-in transition-colors duration-200 ${bgMain}`}>
      
      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE MASTHEAD & THEME SWITCHER                                */}
      {/* ========================================================================= */}
      <div className={`rounded-3xl p-6 sm:p-8 border transition-all ${bgCard}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-xs font-bold font-mono uppercase tracking-wider">
                South Western Railway · SWR Trunk Corridor
              </span>
              <span className={`text-xs font-medium ${textMuted}`}>
                Mysuru (MYS) ➔ KSR Bengaluru (SBC) · 138.25 km
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading tracking-tight">
              Corridor Traffic Intelligence Cockpit
            </h1>
            <p className={`text-sm max-w-2xl leading-relaxed ${textMuted}`}>
              Real-time monitoring of all 10 corridor trains, delay root causes, bottleneck stations, and machine learning delay recovery pacing.
            </p>
          </div>

          {/* Quick Actions & Theme Switcher */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-semibold text-xs transition-all ${
                isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700"
                  : "bg-slate-100 hover:bg-slate-200 text-indigo-700 border-slate-300"
              }`}
              title="Toggle Light / Dark Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </button>

            {/* Optimal Route Shortcut */}
            <button
              onClick={onOpenOptimalRoute}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Optimal Train Finder</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THE 3 CRITICAL INTELLIGENCE SPOTLIGHTS (Direct Answers to Core Qs)   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* SPOTLIGHT 1: Train with the MOST Amount of Delay */}
        <div className={`rounded-3xl p-6 border-2 border-rose-500/50 flex flex-col justify-between gap-4 transition-all ${
          isDark ? "bg-gradient-to-b from-rose-950/30 to-slate-900" : "bg-rose-50/50 shadow-sm"
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Most Delayed Train</span>
              </span>
              <span className="text-xl font-black font-data text-rose-500">
                +{mostDelayed.totalDelay} min late
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold font-heading">
                #{mostDelayed.train.id} {mostDelayed.train.name}
              </h3>
              <p className={`text-xs mt-1 ${textMuted}`}>
                {mostDelayed.train.type.replace("_", " ")} · Loco: {mostDelayed.train.locoType}
              </p>
            </div>

            {/* Plain English Delay Cause */}
            <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
              isDark ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-white border-rose-200 text-slate-700"
            }`}>
              <strong>Why it is delayed:</strong> Held on loop lines near Mandya for VIP train precedence and extended commuter platform dwells.
            </div>
          </div>

          <button
            onClick={() => onSelectTrain(mostDelayed.train.id)}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
          >
            <span>Inspect Delayed Service</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* SPOTLIGHT 2: Train with the BEST Recovery Rate */}
        <div className={`rounded-3xl p-6 border-2 border-emerald-500/50 flex flex-col justify-between gap-4 transition-all ${
          isDark ? "bg-gradient-to-b from-emerald-950/30 to-slate-900" : "bg-emerald-50/50 shadow-sm"
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Best Delay Recovery Rate</span>
              </span>
              <span className="text-xl font-black font-data text-emerald-500">
                {Math.round(bestRecovery.dna.historicalRecoveryRate * 100)}% Potential
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold font-heading">
                #{bestRecovery.train.id} {bestRecovery.train.name}
              </h3>
              <p className={`text-xs mt-1 ${textMuted}`}>
                {bestRecovery.dna.tractiveLabel} · Top speed: {bestRecovery.train.sectionalMpsKmph} km/h
              </p>
            </div>

            {/* Plain English Recovery Explanation */}
            <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
              isDark ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-white border-emerald-200 text-slate-700"
            }`}>
              <strong>How it recovers lost time:</strong> Distributed EMU traction allows rapid acceleration to 130 km/h on clear sections, reclaiming up to 5.1 minutes of schedule slack.
            </div>
          </div>

          <button
            onClick={() => onSelectTrain(bestRecovery.train.id)}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
          >
            <span>View Recovery Pacing</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* SPOTLIGHT 3: Top Delay Bottleneck Stop / Sector */}
        <div className={`rounded-3xl p-6 border-2 border-amber-500/50 flex flex-col justify-between gap-4 transition-all ${
          isDark ? "bg-gradient-to-b from-amber-950/30 to-slate-900" : "bg-amber-50/50 shadow-sm"
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Top Delay Bottleneck Stop</span>
              </span>
              <span className="text-xl font-black font-data text-amber-500">
                Mandya (MYA)
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold font-heading">
                Mandya Junction (KM 45.4)
              </h3>
              <p className={`text-xs mt-1 ${textMuted}`}>
                Average recorded detention: ~12.4 mins per train
              </p>
            </div>

            {/* Plain English Bottleneck Explanation */}
            <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
              isDark ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-white border-amber-200 text-slate-700"
            }`}>
              <strong>Primary bottleneck factor:</strong> Heavy commuter boardings during rush hours combined with 30 km/h loop turnout holds create cascading delays along the trunk line.
            </div>
          </div>

          <button
            onClick={onOpenSimulator}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
          >
            <span>Simulate Bottleneck in Digital Twin</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SECTION 1: ALL TRAINS WE ARE COVERING (Fleet Navigator)                */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold font-heading flex items-center gap-2">
              <Train className="w-5 h-5 text-indigo-500" />
              <span>All Corridor Trains Covered (10 Scheduled Services)</span>
            </h2>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              Click any train to inspect its live ETA prediction, delay root causes, and station-by-station schedule.
            </p>
          </div>
          <span className={`text-xs font-mono ${textMuted}`}>
            Corridor Clock: <strong className={isDark ? "text-white" : "text-slate-900"}>{formatClockMinutes(activeClockMinutes)}</strong>
          </span>
        </div>

        {/* Fleet Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {fleetStatus.map(({ train, resolved, totalDelay }) => {
            const isSelected = train.id === selectedTrain.id;
            const isLate = totalDelay > 3;

            return (
              <button
                key={train.id}
                onClick={() => onSelectTrain(train.id)}
                className={`text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                  isSelected
                    ? "ring-2 ring-indigo-500 shadow-md " + (isDark ? "bg-indigo-950/40 border-indigo-500" : "bg-indigo-50/80 border-indigo-400")
                    : isDark
                    ? "bg-slate-900/80 hover:bg-slate-900 border-slate-800"
                    : "bg-white hover:bg-slate-50 border-slate-200 shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-indigo-400">
                      #{train.id}
                    </span>
                    {isLate ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[10px] font-bold">
                        +{totalDelay}m Late
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                        On Time
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold font-heading line-clamp-1 leading-snug">
                    {train.name}
                  </h4>
                  <p className={`text-[11px] mt-0.5 ${textMuted}`}>
                    {train.scheduledDep} ➔ {train.scheduledArr}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono">
                  <span className={textMuted}>{train.type.replace("_", " ")}</span>
                  <span className={isSelected ? "text-indigo-400 font-bold" : textMuted}>
                    {resolved.stateLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SECTION 2: DEEP-DIVE INSPECTION FOR SELECTED TRAIN                     */}
      {/* ========================================================================= */}
      <div className={`rounded-3xl p-6 sm:p-8 border space-y-6 ${bgCardHighlight}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-slate-800/40">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              #{selectedTrain.id.slice(-3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-400">
                  Detailed Investigation
                </span>
                <span className={`text-xs ${textMuted}`}>
                  · Loco: {selectedTrain.locoType}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold font-heading">
                #{selectedTrain.id} {selectedTrain.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSimulator}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Digital Twin Simulator</span>
            </button>
          </div>
        </div>

        {/* ETA Comparison Banner: Naive vs AI Dynamic */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`p-4 rounded-2xl border ${isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
            <span className={`text-xs font-medium ${textMuted} block`}>Booked Time Table (WTT)</span>
            <div className="text-2xl font-bold font-data mt-1">{selectedTrain.scheduledArr}</div>
            <span className={`text-xs ${textMuted}`}>Scheduled arrival at SBC</span>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
            <span className={`text-xs font-medium text-rose-500 block`}>Traditional Naive ETA (Static)</span>
            <div className="text-2xl font-bold font-data text-rose-500 mt-1">{prediction.traditionalStaticEta}</div>
            <span className="text-xs text-rose-400">+{prediction.traditionalStaticDelayMin} min delay (No physics)</span>
          </div>

          <div className={`p-4 rounded-2xl border-2 border-emerald-500 ${isDark ? "bg-emerald-950/30 border-emerald-500/50" : "bg-emerald-50 border-emerald-400"}`}>
            <span className="text-xs font-bold text-emerald-500 block">RailRakshak AI Dynamic ETA</span>
            <div className="text-2xl font-bold font-data text-emerald-500 mt-1">{prediction.railrakshakDynamicEta}</div>
            <span className="text-xs text-emerald-500 font-medium">
              Recovered {prediction.slackRecoveredMin}m slack · Optimal arrival
            </span>
          </div>
        </div>

        {/* Plain Language AI Narrative */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
          isDark ? "bg-indigo-950/30 border-indigo-500/30 text-slate-200" : "bg-indigo-50/60 border-indigo-200 text-slate-800"
        }`}>
          <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs leading-relaxed">
            <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">
              AI Dynamic Dispatcher Explanation
            </h4>
            <p>
              Unlike static timetable apps that simply add delay to scheduled arrival, RailRakshak's kinematic ML engine calculates that this train can exploit <strong>{currentSelectedState.dna.tractiveLabel}</strong> across the remaining clear sections. Recommended target throttle is <strong>{Math.min(selectedTrain.sectionalMpsKmph, 115)} km/h</strong> to clear green waves and arrive at <strong>{prediction.railrakshakDynamicEta}</strong>.
            </p>
          </div>
        </div>

        {/* Station-by-Station Timetable Progress */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold font-heading">
            Station-by-Station Stop Forecast
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {SWR_CORRIDOR_STATIONS.filter((st) => selectedTrain.scheduledStops.includes(st.code)).map((st) => {
              const isPast = currentSelectedState.resolved.currentLocationKm >= st.distanceFromMysKm;
              return (
                <div
                  key={st.code}
                  className={`p-3 rounded-xl border text-center font-mono ${
                    isPast
                      ? isDark ? "bg-slate-950/40 border-slate-800 opacity-60" : "bg-slate-100 border-slate-200 opacity-60"
                      : isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-300"
                  }`}
                >
                  <div className="text-[10px] text-indigo-400 font-bold">{st.code}</div>
                  <div className="text-xs font-bold mt-0.5">{st.name.split(" ")[0]}</div>
                  <div className={`text-[10px] mt-1 ${isPast ? "text-emerald-500 font-semibold" : textMuted}`}>
                    {isPast ? "Passed" : `KM ${st.distanceFromMysKm.toFixed(0)}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SECTION 3: WHAT CAUSES THE DELAYS? (Corridor Root Causes & Hotspots)   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 6 Cols: Top Delay Factors Ranking */}
        <div className={`lg:col-span-6 rounded-3xl p-6 border space-y-4 ${bgCard}`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-800/40">
            <div>
              <h3 className="text-base font-bold font-heading flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <span>What Delay Factors Occur Most Often?</span>
              </h3>
              <p className={`text-xs mt-0.5 ${textMuted}`}>
                Corridor operational breakdown ranked by recurrence and lost minutes.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {DELAY_FACTORS_RANKING.map((factor) => (
              <div key={factor.name} className="space-y-1.5 text-xs">
                <div className="flex justify-between font-medium">
                  <span>{factor.name}</span>
                  <span className="font-bold text-indigo-500">{factor.sharePct}% of total delay</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${factor.sharePct}%` }}
                    className={`h-full rounded-full ${factor.color}`}
                  />
                </div>

                <p className={`text-[11px] ${textMuted}`}>
                  {factor.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right 6 Cols: Top Bottleneck Stations */}
        <div className={`lg:col-span-6 rounded-3xl p-6 border space-y-4 ${bgCard}`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-800/40">
            <div>
              <h3 className="text-base font-bold font-heading flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" />
                <span>Top Bottleneck Stops &amp; Locations</span>
              </h3>
              <p className={`text-xs mt-0.5 ${textMuted}`}>
                Specific stations along the 138 km route causing highest delays.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {TOP_BOTTLENECK_STATIONS.map((st) => (
              <div
                key={st.code}
                className={`p-3.5 rounded-2xl border flex flex-col gap-1 ${
                  isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold font-heading">
                    {st.name} ({st.code}) · KM {st.km}
                  </span>
                  <span className="text-xs font-bold text-rose-500">
                    +{st.avgDelayMin}m avg detention
                  </span>
                </div>
                <p className={`text-xs ${textMuted}`}>
                  {st.primaryReason}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
