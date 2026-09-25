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
        return { label: "Headway Wake Gap", style: "text-signal-amber" };
      case "SBC_THROAT_INTERLOCKING":
        return { label: "SBC Throat Interlocking", style: "text-signal-red" };
      case "DWELL_TIME_OVERRUN":
        return { label: "Dwell Time Surge", style: "text-signal-amber" };
      case "PSR_SPEED_RESTRICTION":
        return { label: "PSR Speed Drag", style: "text-signal-amber" };
      case "LOOP_LINE_STABLING":
        return { label: "Loop Siding Detention", style: "text-steel-light" };
      case "RAKE_TURNAROUND":
        return { label: "Yard Turnaround Delay", style: "text-steel-light" };
    }
  };

  return (
    <section className="space-y-6 animate-fade-in selection:bg-signal-green/30 selection:text-chalk">
      {/* 1. Header & Context Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-graphite pb-4">
        <div>
          <h2 className="text-lg font-heading font-semibold text-chalk">
            Yesterday Corridor Traffic &amp; Delay Gap Forensics
          </h2>
          <p className="text-xs text-steel font-body mt-1">
            {summary.reportDate} · Comprehensive 138.25 km Fleet Log Analysis &amp; Bottleneck Attribution
          </p>
        </div>

        <div className="flex items-center text-xs font-body">
          <span className="px-3 py-1.5 rounded-lg bg-surface-raised border border-graphite text-signal-green font-medium">
            +<span className="font-data">{summary.recoverableMinutesWithAiDispatch}</span>m Recoverable via AI
          </span>
        </div>
      </div>

      {/* 2. Key Forensic Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface border border-graphite rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-body text-steel">Fleet Punctuality</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-data font-bold text-chalk">
              {summary.averageFleetPunctualityPercent}%
            </span>
            <span className="text-xs text-steel font-body">
              ({summary.onTimeServicesCount}/{summary.totalServicesOperated} on-time)
            </span>
          </div>
          <span className="text-xs text-steel mt-2 font-body">
            SWR corridor punctuality standard: &gt;85%
          </span>
        </div>

        <div className="bg-surface border border-graphite rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-body text-steel">Total Delay Lost</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-data font-bold text-signal-red">
              {summary.totalCorridorDelayMinutesLost}m
            </span>
            <span className="text-xs text-steel font-body">
              across 10 rakes
            </span>
          </div>
          <span className="text-xs text-steel mt-2 font-body">
            Average delay per delayed rake: 23.6 min
          </span>
        </div>

        <div className="bg-surface border border-graphite rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-body text-steel">#1 Choke Point</span>
          <div className="mt-2">
            <div className="text-sm font-heading font-semibold text-chalk line-clamp-1">
              SBC Outer Throat Interlocking
            </div>
            <div className="text-xs font-body text-signal-amber mt-0.5">
              <span className="font-data">48</span> min loss (Nayandahalli–SBC)
            </div>
          </div>
          <span className="text-xs text-steel mt-2 font-body">
            Platform allocation &amp; shunting conflicts
          </span>
        </div>

        <div className="bg-surface border border-graphite rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-body text-steel">Top Delay Category</span>
          <div className="mt-2">
            <div className="text-sm font-heading font-semibold text-chalk line-clamp-1">
              Commuter Dwells &amp; Wake
            </div>
            <div className="text-xs font-body text-signal-amber mt-0.5">
              <span className="font-data">53</span> min cumulative loss
            </div>
          </div>
          <span className="text-xs text-steel mt-2 font-body">
            Mandya &amp; Kengeri passenger surges
          </span>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-surface-raised p-2 border border-graphite rounded-lg">
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
                className={`px-3 py-1.5 rounded-md text-sm font-body transition-all ${
                  isAct
                    ? "bg-surface-overlay text-chalk font-semibold border-b-2 border-chalk"
                    : "bg-surface-raised hover:bg-surface-overlay text-steel hover:text-chalk"
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
              className={`bg-surface border rounded-xl overflow-hidden transition-colors ${
                isExpanded ? "border-chalk/30" : "border-graphite"
              }`}
            >
              {/* Card Header Row */}
              <div
                onClick={() => setExpandedTrainNo(isExpanded ? null : run.trainNumber)}
                className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 cursor-pointer select-none"
              >
                {/* Left: Train Identity & Punctuality */}
                <div className="flex items-start sm:items-center gap-3">
                  <div className="font-data text-sm text-chalk shrink-0">
                    #{run.trainNumber}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-heading font-semibold text-chalk">
                        {run.trainName}
                      </h3>
                      <span className="text-xs text-steel font-body">
                        ({run.serviceType})
                      </span>
                    </div>
                    <div className="text-xs text-steel font-body mt-0.5 flex items-center gap-2">
                      <span>Scheduled: <span className="font-data">{run.scheduledDep}</span> ➔ <span className="font-data">{run.scheduledArr}</span></span>
                      <span>·</span>
                      <span className="text-chalk-dim">
                        Actual: <span className="font-data text-chalk">{run.actualDep}</span> ➔ <span className="font-data text-chalk">{run.actualArr}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Delay Metric, Gap Tag & Expand Chevron */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-graphite">
                  {/* Gap Category Badge */}
                  <span className={`text-xs font-body font-medium ${badge.style}`}>
                    {badge.label}
                  </span>

                  {/* Net Delay Status */}
                  <div className="text-right">
                    <div
                      className={`text-sm font-data font-semibold ${
                        run.totalDelayMin === 0
                          ? "text-signal-green"
                          : run.totalDelayMin < 10
                          ? "text-signal-amber"
                          : "text-signal-red"
                      }`}
                    >
                      {run.totalDelayMin === 0
                        ? "On Time"
                        : `+${run.totalDelayMin} min Late`}
                    </div>
                    <div className="text-xs text-steel font-body">
                      <span className="font-data">{run.punctualityScorePercent}</span>% Score
                    </div>
                  </div>

                  <button className="text-steel hover:text-chalk">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible Deep-Dive Details */}
              {isExpanded && (
                <div className="p-5 border-t border-graphite bg-surface-raised space-y-5">
                  
                  {/* Primary Root Cause Callout */}
                  <div className="p-4 rounded-lg bg-surface border border-graphite space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-body font-medium text-signal-amber">
                        Delay Gap: {run.primaryGapTitle}
                      </span>
                      <span className="text-xs font-body text-steel-light">
                        {run.bottleneckHotspot}
                      </span>
                    </div>
                    <p className="text-sm text-chalk-dim font-body leading-relaxed">
                      {run.primaryGapDescription}
                    </p>
                  </div>

                  {/* Sectional Delay Waterfall */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-heading font-semibold text-chalk">
                      Station-by-Station Delay Waterfall
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {run.sectionalBreakdown.map((sec, idx) => (
                        <div
                          key={idx}
                          className="bg-surface p-3 rounded-lg border border-graphite flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-body font-medium text-chalk text-sm">
                              {sec.sectionName}
                            </span>
                            <span className="font-data font-semibold text-signal-red text-sm">
                              +{sec.delayIncurredMin}m
                            </span>
                          </div>
                          <p className="text-xs text-steel font-body line-clamp-2">
                            {sec.rootCause}
                          </p>
                          <div className="text-xs text-steel-light font-body">
                            Chainage: <span className="font-data">{sec.chainageKm}</span> km
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Dispatcher Actionable Recommendation */}
                  <div className="p-4 rounded-lg bg-surface border-l-3 border-signal-green flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-body font-medium text-chalk text-sm">
                        AI Dispatcher Dynamic Fix for Today:
                      </div>
                      <p className="text-chalk-dim font-body text-sm">
                        {run.aiDispatcherRecommendation}
                      </p>
                    </div>

                    {onSelectTrainForLiveView && (
                      <button
                        onClick={() => onSelectTrainForLiveView(run.trainNumber)}
                        className="bg-surface-overlay hover:bg-graphite-light text-chalk font-body text-xs font-medium rounded-lg px-3 py-1.5 border border-graphite shrink-0 transition-colors"
                      >
                        Live Track #{run.trainNumber}
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
