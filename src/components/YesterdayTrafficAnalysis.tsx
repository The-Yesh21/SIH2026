import React, { useState } from "react";
import {
  CORRIDOR_TRAFFIC_SUMMARY,
  YESTERDAY_FLEET_RUN_DATA,
  YesterdayTrainRunRecord,
  DelayGapCategory,
} from "../lib/rail/yesterdayTrafficData";
import {
  Activity,
  AlertOctagon,
  Clock,
  TrendingDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Filter,
  ShieldCheck,
  AlertTriangle,
  Zap,
  MapPin,
  Flame,
  ArrowRight,
} from "lucide-react";

interface YesterdayTrafficAnalysisProps {
  onSelectTrainForLiveView?: (trainId: string) => void;
}

export function YesterdayTrafficAnalysis({
  onSelectTrainForLiveView,
}: YesterdayTrafficAnalysisProps) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [expandedTrainNo, setExpandedTrainNo] = useState<string | null>("12613");

  const summary = CORRIDOR_TRAFFIC_SUMMARY;

  const filteredRuns = YESTERDAY_FLEET_RUN_DATA.filter((run) => {
    if (selectedCategoryFilter === "ALL") return true;
    if (selectedCategoryFilter === "DELAYED") return run.totalDelayMin >= 10;
    if (selectedCategoryFilter === "ON_TIME") return run.totalDelayMin < 10;
    return run.primaryGapCategory === selectedCategoryFilter;
  });

  const getCategoryBadge = (cat: DelayGapCategory) => {
    switch (cat) {
      case "HEADWAY_WAKE":
        return {
          label: "Headway Wake Gap",
          style: "bg-amber-950/80 text-amber-300 border-amber-500/40",
        };
      case "SBC_THROAT_INTERLOCKING":
        return {
          label: "SBC Throat Interlocking",
          style: "bg-rose-950/80 text-rose-300 border-rose-500/40",
        };
      case "DWELL_TIME_OVERRUN":
        return {
          label: "Dwell Time Surge",
          style: "bg-orange-950/80 text-orange-300 border-orange-500/40",
        };
      case "PSR_SPEED_RESTRICTION":
        return {
          label: "PSR Speed Drag",
          style: "bg-yellow-950/80 text-yellow-300 border-yellow-500/40",
        };
      case "LOOP_LINE_STABLING":
        return {
          label: "Loop Siding Detention",
          style: "bg-purple-950/80 text-purple-300 border-purple-500/40",
        };
      case "RAKE_TURNAROUND":
        return {
          label: "Yard Turnaround Delay",
          style: "bg-blue-950/80 text-blue-300 border-blue-500/40",
        };
    }
  };

  return (
    <section className="space-y-6">
      {/* 1. Header & Context Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-rail-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Yesterday Corridor Traffic &amp; Delay Gap Forensics
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {summary.reportDate} · Comprehensive 138.25 km Fleet Log Analysis &amp; Bottleneck Attribution
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            +{summary.recoverableMinutesWithAiDispatch}m Recoverable via AI
          </span>
        </div>
      </div>

      {/* 2. Key Forensic Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-rail-900/90 border border-rail-750 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" /> Fleet Punctuality
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-white">
              {summary.averageFleetPunctualityPercent}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({summary.onTimeServicesCount}/{summary.totalServicesOperated} on-time)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-2 font-mono">
            SWR corridor punctuality standard: &gt;85%
          </span>
        </div>

        <div className="bg-rail-900/90 border border-rail-750 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-rose-400" /> Total Delay Lost
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-rose-400">
              {summary.totalCorridorDelayMinutesLost}m
            </span>
            <span className="text-xs text-slate-400 font-mono">
              across 10 rakes
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-2 font-mono">
            Average delay per delayed rake: 23.6 min
          </span>
        </div>

        <div className="bg-rail-900/90 border border-rail-750 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-amber-400" /> #1 Choke Point
          </span>
          <div className="mt-2">
            <div className="text-sm font-bold text-slate-200 line-clamp-1 font-sans">
              SBC Outer Throat Interlocking
            </div>
            <div className="text-xs font-mono text-amber-400 mt-0.5">
              48 min loss (Nayandahalli–SBC)
            </div>
          </div>
          <span className="text-[10px] text-slate-500 mt-2 font-mono">
            Platform allocation &amp; shunting conflicts
          </span>
        </div>

        <div className="bg-rail-900/90 border border-rail-750 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" /> Top Delay Category
          </span>
          <div className="mt-2">
            <div className="text-sm font-bold text-slate-200 line-clamp-1 font-sans">
              Commuter Dwells &amp; Wake
            </div>
            <div className="text-xs font-mono text-orange-400 mt-0.5">
              53 min cumulative loss
            </div>
          </div>
          <span className="text-[10px] text-slate-500 mt-2 font-mono">
            Mandya &amp; Kengeri passenger surges
          </span>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-rail-950 p-2.5 rounded-2xl border border-rail-800 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400 px-2 font-semibold">
          <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filter Gaps:
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL", label: `All Services (${YESTERDAY_FLEET_RUN_DATA.length})` },
            { id: "DELAYED", label: "Delayed (≥10m)" },
            { id: "ON_TIME", label: "On-Time (<10m)" },
            { id: "HEADWAY_WAKE", label: "Headway Gaps" },
            { id: "SBC_THROAT_INTERLOCKING", label: "SBC Throat" },
            { id: "DWELL_TIME_OVERRUN", label: "Dwell Overrun" },
            { id: "LOOP_LINE_STABLING", label: "Loop Stabling" },
          ].map((btn) => {
            const isAct = selectedCategoryFilter === btn.id;
            return (
              <button
                key={btn.id}
                onClick={() => setSelectedCategoryFilter(btn.id)}
                className={`px-3 py-1 rounded-xl text-[11px] font-medium transition-all ${
                  isAct
                    ? "bg-cyan-600/30 text-cyan-300 border border-cyan-400 font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-rail-900 border border-transparent"
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Comprehensive Train-by-Train Run Table & Forensics */}
      <div className="space-y-3">
        {filteredRuns.map((run) => {
          const isExpanded = expandedTrainNo === run.trainNumber;
          const badge = getCategoryBadge(run.primaryGapCategory);

          return (
            <div
              key={run.trainNumber}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isExpanded
                  ? "bg-rail-850/95 border-cyan-500/50 shadow-xl ring-1 ring-cyan-500/30"
                  : "bg-rail-900/80 hover:bg-rail-850/80 border-rail-800"
              }`}
            >
              {/* Card Header Row */}
              <div
                onClick={() => setExpandedTrainNo(isExpanded ? null : run.trainNumber)}
                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 cursor-pointer select-none"
              >
                {/* Left: Train Identity & Punctuality */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="px-3 py-1 rounded-xl bg-rail-950 border border-rail-700 font-mono font-bold text-xs text-cyan-300 shrink-0">
                    #{run.trainNumber}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white font-sans">
                        {run.trainName}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        ({run.serviceType})
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                      <span>Scheduled: {run.scheduledDep} ➔ {run.scheduledArr}</span>
                      <span>·</span>
                      <span className="text-slate-300">
                        Actual Run: <strong className="text-white">{run.actualDep} ➔ {run.actualArr}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Delay Metric, Gap Tag & Expand Chevron */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-rail-800">
                  {/* Gap Category Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${badge.style}`}
                  >
                    {badge.label}
                  </span>

                  {/* Net Delay Status */}
                  <div className="text-right">
                    <div
                      className={`text-sm font-mono font-extrabold ${
                        run.totalDelayMin === 0
                          ? "text-emerald-400"
                          : run.totalDelayMin < 10
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {run.totalDelayMin === 0
                        ? "On Time"
                        : `+${run.totalDelayMin} min Late`}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {run.punctualityScorePercent}% Score
                    </div>
                  </div>

                  <button className="p-1 rounded-lg bg-rail-800 text-slate-400 hover:text-white">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible Deep-Dive Details */}
              {isExpanded && (
                <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-rail-800/80 space-y-5 bg-rail-950/60">
                  
                  {/* Primary Root Cause Callout */}
                  <div className="p-4 rounded-2xl bg-rail-900/90 border border-rail-750 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Identified Delay Gap: {run.primaryGapTitle}
                      </span>
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        {run.bottleneckHotspot}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {run.primaryGapDescription}
                    </p>
                  </div>

                  {/* Sectional Delay Waterfall */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono uppercase text-slate-400 font-bold">
                      Station-by-Station Delay Waterfall (Where Minutes Were Lost)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {run.sectionalBreakdown.map((sec, idx) => (
                        <div
                          key={idx}
                          className="bg-rail-900 p-3 rounded-xl border border-rail-800 flex flex-col justify-between space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-slate-200">
                              {sec.sectionName}
                            </span>
                            <span className="px-2 py-0.5 rounded-md font-bold text-rose-400 bg-rose-950/50 border border-rose-500/30">
                              +{sec.delayIncurredMin}m
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-sans line-clamp-2">
                            {sec.rootCause}
                          </p>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Chainage: {sec.chainageKm} km
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Dispatcher Actionable Recommendation */}
                  <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-mono text-xs">
                    <div className="space-y-1">
                      <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        AI Dispatcher Dynamic Fix for Today:
                      </div>
                      <p className="text-slate-200 font-sans text-xs">
                        {run.aiDispatcherRecommendation}
                      </p>
                    </div>

                    {onSelectTrainForLiveView && (
                      <button
                        onClick={() => onSelectTrainForLiveView(run.trainNumber)}
                        className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
                      >
                        <span>Live Track Train #{run.trainNumber}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
