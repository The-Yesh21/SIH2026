import React, { useState, useMemo } from "react";
import { TrainConfig } from "../lib/rail/types";
import { ALL_CORRIDOR_FLEET, resolveTrainAtClockTime, formatClockMinutes } from "../lib/rail/timeResolver";
import { computeDynamicEta } from "../lib/rail/dynamicEta";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT } from "../lib/rail/restrictions";
import { YESTERDAY_FLEET_RUN_DATA, CORRIDOR_TRAFFIC_SUMMARY } from "../lib/rail/yesterdayTrafficData";
import {
  Activity,
  AlertTriangle,
  Clock,
  TrendingDown,
  Sparkles,
  Zap,
  MapPin,
  Flame,
  ArrowRight,
  Filter,
  CheckCircle2,
  Gauge,
  Layers,
  Search,
  ShieldCheck,
  Radio,
  Sliders,
} from "lucide-react";

interface FleetDelayAnalysisDeckProps {
  activeClockMinutes: number;
  environment: EnvironmentalConditions;
  injectedDelay: number;
  onSelectTrainForCockpit?: (trainId: string) => void;
}

export function FleetDelayAnalysisDeck({
  activeClockMinutes,
  environment,
  injectedDelay,
  onSelectTrainForCockpit,
}: FleetDelayAnalysisDeckProps) {
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedTrainDetailId, setSelectedTrainDetailId] = useState<string | null>("12613");

  // Compute live state and dynamic ETA for EVERY train across the corridor
  const fleetAnalysis = useMemo(() => {
    return ALL_CORRIDOR_FLEET.map((train) => {
      const resolved = resolveTrainAtClockTime(train, activeClockMinutes);
      const prediction = computeDynamicEta({
        train: resolved.config,
        userInjectedDelayMin: injectedDelay,
        environment,
      });

      const yesterdayRecord = YESTERDAY_FLEET_RUN_DATA.find((r) => r.trainNumber === train.id);
      const liveDelayMin = Math.round(prediction.railrakshakDynamicDelayMin);

      return {
        train,
        resolved,
        prediction,
        yesterdayRecord,
        liveDelayMin,
        isDelayed: liveDelayMin > 0,
      };
    });
  }, [activeClockMinutes, injectedDelay, environment]);

  // Aggregate corridor-wide statistics
  const totalFleetLiveDelay = fleetAnalysis.reduce((acc, curr) => acc + curr.liveDelayMin, 0);
  const activeRunningCount = fleetAnalysis.filter((f) => f.resolved.operatingState === "RUNNING_ON_TRACK").length;
  const delayedRakesCount = fleetAnalysis.filter((f) => f.liveDelayMin >= 5).length;
  const highestDelayedTrain = [...fleetAnalysis].sort((a, b) => b.liveDelayMin - a.liveDelayMin)[0];

  // Filtered train rows
  const filteredFleet = fleetAnalysis.filter(({ train, resolved, liveDelayMin }) => {
    const matchesSearch =
      train.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      train.name.toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "RUNNING") return resolved.operatingState === "RUNNING_ON_TRACK";
    if (statusFilter === "DELAYED") return liveDelayMin >= 5;
    if (statusFilter === "ON_TIME") return liveDelayMin < 5;
    if (statusFilter === "UPCOMING") return resolved.operatingState === "NOT_STARTED_YET";
    if (statusFilter === "COMPLETED") return resolved.operatingState === "TRIP_COMPLETED";

    return true;
  });

  return (
    <div className="space-y-7 animate-fade-in">
      {/* 1. Header KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-rail-900/90 border border-rail-750 p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" /> Active Corridor Trains
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-white">
              {ALL_CORRIDOR_FLEET.length} Rails
            </span>
            <span className="text-xs text-emerald-400 font-mono font-semibold">
              ({activeRunningCount} on track now)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 font-mono">
            SWR Mysuru–Bengaluru Main Line (138.25 km)
          </span>
        </div>

        <div className="bg-rail-900/90 border border-rail-750 p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-rose-400" /> Total Active Delay
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-rose-400">
              +{totalFleetLiveDelay} min
            </span>
            <span className="text-xs text-slate-400 font-mono">
              across fleet
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 font-mono">
            {delayedRakesCount} rakes delayed &gt;5 min
          </span>
        </div>

        <div className="bg-rail-900/90 border border-rail-750 p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Max Delayed Service
          </span>
          <div className="mt-2">
            <div className="text-sm font-bold text-slate-100 line-clamp-1 font-sans">
              #{highestDelayedTrain?.train.id} {highestDelayedTrain?.train.name}
            </div>
            <div className="text-xs font-mono text-amber-400 font-bold mt-0.5">
              +{highestDelayedTrain?.liveDelayMin} min ({highestDelayedTrain?.resolved.stateLabel.split(" ")[0]})
            </div>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 font-mono">
            Highest delay accumulation today
          </span>
        </div>

        <div className="bg-rail-900/90 border border-rail-750 p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" /> Yesterday vs Today
          </span>
          <div className="mt-2">
            <div className="text-sm font-bold text-slate-100 font-sans">
              {CORRIDOR_TRAFFIC_SUMMARY.averageFleetPunctualityPercent}% Historical Score
            </div>
            <div className="text-xs font-mono text-emerald-400 font-semibold mt-0.5">
              142m lost yesterday ➔ {totalFleetLiveDelay}m active
            </div>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 font-mono">
            +98 min recoverable via dynamic dispatch
          </span>
        </div>
      </div>

      {/* 2. Corridor-Wide Sectional Delay Heatmap (16 Block Sections) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-rail-900/80 border border-rail-750 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-300 uppercase">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Corridor Sectional Delay Generation Heatmap (MYS ➔ SBC)</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            138.25 km · 17 Stations · 16 Block Sections
          </span>
        </div>

        {/* Section Heatmap Bar */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 font-mono text-[10px]">
          {[
            { name: "MYS-NHY", km: "0-8.5k", loss: "1m", risk: "LOW", color: "bg-emerald-950/80 border-emerald-500/40 text-emerald-300" },
            { name: "S-PANP", km: "14-23k", loss: "4m", risk: "MED", color: "bg-yellow-950/80 border-yellow-500/40 text-yellow-300", tag: "Cauvery PSR" },
            { name: "MYA-HNK", km: "45-55k", loss: "14m", risk: "HIGH", color: "bg-rose-950/80 border-rose-500/40 text-rose-300 font-bold", tag: "Mandya Surge" },
            { name: "MAD-SET", km: "63-72k", loss: "6m", risk: "MED", color: "bg-amber-950/80 border-amber-500/40 text-amber-300", tag: "Maddur Loop" },
            { name: "CPT-RMGM", km: "82-93k", loss: "5m", risk: "MED", color: "bg-amber-950/80 border-amber-500/40 text-amber-300", tag: "Rock Cutting" },
            { name: "BID-HJL", km: "108-115k", loss: "16m", risk: "CRIT", color: "bg-rose-950 border-rose-500 text-rose-200 font-bold animate-pulse", tag: "Freight Loop" },
            { name: "KGI-NYH", km: "126-130k", loss: "12m", risk: "HIGH", color: "bg-orange-950/80 border-orange-500/40 text-orange-300 font-bold", tag: "Kengeri Surge" },
            { name: "NYH-SBC", km: "130-138k", loss: "48m", risk: "CRIT", color: "bg-rose-950 border-rose-400 text-rose-100 font-extrabold ring-1 ring-rose-500", tag: "SBC Throat" },
          ].map((sec) => (
            <div
              key={sec.name}
              className={`p-2.5 rounded-xl border flex flex-col justify-between ${sec.color}`}
            >
              <div className="flex justify-between items-center font-bold">
                <span>{sec.name}</span>
                <span>+{sec.loss}</span>
              </div>
              <div className="mt-1.5 flex justify-between text-[9px] text-slate-400">
                <span>{sec.km}</span>
                <span className="font-semibold text-slate-300">{sec.tag || sec.risk}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-rail-950 p-3 rounded-2xl border border-rail-800 font-mono text-xs">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search any train # or name..."
            className="w-full bg-rail-900 border border-rail-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 shadow-inner"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL", label: `All Rails (${ALL_CORRIDOR_FLEET.length})` },
            { id: "RUNNING", label: `Running Now (${activeRunningCount})` },
            { id: "DELAYED", label: `Delayed (≥5m)` },
            { id: "ON_TIME", label: "On Time" },
            { id: "UPCOMING", label: "Upcoming" },
            { id: "COMPLETED", label: "Completed" },
          ].map((tab) => {
            const isAct = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                  isAct
                    ? "bg-cyan-600/30 text-cyan-300 border border-cyan-400 font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-rail-900 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Complete Master Delay Matrix for All Rails */}
      <div className="space-y-3">
        {filteredFleet.map(({ train, resolved, prediction, yesterdayRecord, liveDelayMin }) => {
          const isSelectedDetail = selectedTrainDetailId === train.id;
          const isDelayed = liveDelayMin > 0;

          return (
            <div
              key={train.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isSelectedDetail
                  ? "bg-rail-850 border-cyan-500/60 shadow-xl ring-1 ring-cyan-500/30"
                  : "bg-rail-900/90 hover:bg-rail-850/80 border-rail-800"
              }`}
            >
              {/* Main Summary Header Bar */}
              <div
                onClick={() =>
                  setSelectedTrainDetailId(isSelectedDetail ? null : train.id)
                }
                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 cursor-pointer select-none"
              >
                {/* Train Name, Number & Route */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="px-3 py-1 rounded-xl bg-rail-950 border border-rail-700 font-mono font-bold text-xs text-cyan-300 shrink-0">
                    #{train.id}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white font-sans">
                        {train.name}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        ({train.type.replace("_", " ")})
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                      <span>
                        Sched: <strong>{train.scheduledDep} ➔ {train.scheduledArr}</strong>
                      </span>
                      <span>·</span>
                      <span className="text-cyan-400">
                        {train.scheduledStops.length === 2 ? "Non-Stop" : `${train.scheduledStops.length} Halts`}
                      </span>
                      <span>·</span>
                      <span className="text-slate-400">
                        MPS: {train.sectionalMpsKmph} km/h
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operating Status, Live Location & Delay Metrics */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-rail-800">
                  {/* Operating State Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border tracking-wide ${resolved.badgeClass}`}
                  >
                    {resolved.stateLabel.split(" ")[0]} {resolved.stateLabel.split(" ")[1] || ""}
                  </span>

                  {/* Dynamic Arrival Prediction */}
                  <div className="text-right font-mono">
                    <div className="text-xs text-slate-400">Dynamic ETA</div>
                    <div className="text-sm font-bold text-white">
                      {prediction.railrakshakDynamicEta}
                    </div>
                  </div>

                  {/* Net Delay Status */}
                  <div className="text-right font-mono min-w-[90px]">
                    <div className="text-xs text-slate-400">Total Delay</div>
                    <div
                      className={`text-sm font-extrabold ${
                        !isDelayed
                          ? "text-emerald-400"
                          : liveDelayMin < 10
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {isDelayed ? `+${liveDelayMin} min Late` : "On Time"}
                    </div>
                  </div>

                  {/* Cockpit / Detail Buttons */}
                  <div className="flex items-center gap-2">
                    {onSelectTrainForCockpit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTrainForCockpit(train.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white border border-cyan-500/40 text-xs font-mono font-bold transition-all"
                      >
                        Cockpit
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsible Deep-Dive Delay Intelligence Panel */}
              {isSelectedDetail && (
                <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-rail-800/80 space-y-5 bg-rail-950/60">
                  
                  {/* Live Telemetry Banner */}
                  <div className="p-4 rounded-2xl bg-rail-900 border border-cyan-500/30 font-mono text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-200">
                        {resolved.liveSummary}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Current Speed: <strong className="text-emerald-400">{resolved.currentSpeedKmph} km/h</strong> · Progress: {resolved.progressPercent}% ({resolved.currentLocationKm.toFixed(1)} / 138.25 km)
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-slate-300">
                      <span>Loco: <strong>{train.locoType}</strong></span>
                      <span>({train.coaches} Coaches)</span>
                    </div>
                  </div>

                  {/* Delay Factor Breakdown Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="bg-rail-900 p-3.5 rounded-xl border border-rail-800 flex flex-col justify-between">
                      <span className="text-slate-400 font-semibold">Booked Timetable ETA</span>
                      <div className="text-xl font-bold text-slate-200 mt-1">
                        {train.scheduledArr}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">Official SWR Schedule</span>
                    </div>

                    <div className="bg-rail-900 p-3.5 rounded-xl border border-rail-800 flex flex-col justify-between">
                      <span className="text-emerald-400 font-semibold">⚡ Kinetic Slack Recovered</span>
                      <div className="text-xl font-bold text-emerald-300 mt-1">
                        -{prediction.slackRecoveredMin.toFixed(1)} min
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">High-speed MPS sectioning</span>
                    </div>

                    <div className="bg-rail-900 p-3.5 rounded-xl border border-rail-800 flex flex-col justify-between">
                      <span className="text-amber-400 font-semibold">⚠️ Incurred Bottlenecks</span>
                      <div className="text-xl font-bold text-amber-300 mt-1">
                        +{prediction.bottlenecksIncurredMin.toFixed(1)} min
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">Interlocking &amp; dwell losses</span>
                    </div>
                  </div>

                  {/* Yesterday Historical Run Comparison */}
                  {yesterdayRecord && (
                    <div className="p-4 rounded-2xl bg-rail-900/90 border border-rail-750 space-y-2.5">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          Yesterday Identified Gap: {yesterdayRecord.primaryGapTitle}
                        </span>
                        <span className="text-slate-400">
                          Yesterday Loss: <strong className="text-rose-400">+{yesterdayRecord.totalDelayMin} min</strong>
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed">
                        {yesterdayRecord.primaryGapDescription}
                      </p>
                      <div className="pt-2 border-t border-rail-800 text-xs font-mono text-cyan-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span><strong>AI Dispatcher Action:</strong> {yesterdayRecord.aiDispatcherRecommendation}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
