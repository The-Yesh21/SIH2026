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

  // Compute predicted delay factors and ETA for every train across the corridor
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
    <div className="space-y-6 animate-fade-in selection:bg-signal-green/30 selection:text-chalk">
      {/* 1. Header KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface border border-graphite rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-body text-steel">
            Corridor Fleet (Modeled)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-data font-bold text-chalk">
              {ALL_CORRIDOR_FLEET.length}
            </span>
            <span className="text-xs text-signal-green font-body">
              ({activeRunningCount} in transit window)
            </span>
          </div>
          <span className="text-xs text-steel mt-2 font-body">
            SWR Mysuru–Bengaluru Main Line (138.25 km)
          </span>
        </div>

        <div className="bg-surface border border-graphite rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-body text-steel">
            Total Predicted Delay
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-data font-bold text-signal-red">
              +{totalFleetLiveDelay} min
            </span>
            <span className="text-xs text-steel font-body">
              across fleet
            </span>
          </div>
          <span className="text-xs text-steel mt-2 font-body">
            {delayedRakesCount} rakes delayed &gt;5 min
          </span>
        </div>

        <div className="bg-surface border border-graphite rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-body text-steel">
            Max Delayed Service
          </span>
          <div className="mt-2">
            <div className="text-sm font-heading font-semibold text-chalk line-clamp-1">
              #{highestDelayedTrain?.train.id} {highestDelayedTrain?.train.name}
            </div>
            <div className="text-xs font-data text-signal-amber font-bold mt-0.5">
              +{highestDelayedTrain?.liveDelayMin} min ({highestDelayedTrain?.resolved.stateLabel.split(" ")[0]})
            </div>
          </div>
          <span className="text-xs text-steel mt-2 font-body">
            Highest delay accumulation today
          </span>
        </div>

        <div className="bg-surface border border-graphite rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-body text-steel">
            Yesterday vs Today
          </span>
          <div className="mt-2">
            <div className="text-sm font-data font-bold text-chalk">
              {CORRIDOR_TRAFFIC_SUMMARY.averageFleetPunctualityPercent}% Historical Score
            </div>
            <div className="text-xs font-data text-signal-green font-semibold mt-0.5">
              142m lost yesterday ➔ {totalFleetLiveDelay}m active
            </div>
          </div>
          <span className="text-xs text-steel mt-2 font-body">
            +98 min recoverable via dynamic dispatch
          </span>
        </div>
      </div>

      {/* 2. Corridor-Wide Sectional Delay Heatmap (16 Block Sections) */}
      <div className="bg-surface border border-graphite rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-base font-heading font-semibold text-chalk">
            Corridor Sectional Delay Generation Heatmap
          </h2>
          <span className="text-xs font-body text-steel">
            138.25 km · 17 Stations · 16 Block Sections
          </span>
        </div>

        {/* Section Heatmap Bar */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {[
            { name: "MYS-NHY", km: "0-8.5k", loss: "1m", risk: "LOW" },
            { name: "S-PANP", km: "14-23k", loss: "4m", risk: "MED", tag: "Cauvery PSR" },
            { name: "MYA-HNK", km: "45-55k", loss: "14m", risk: "HIGH", tag: "Mandya Surge" },
            { name: "MAD-SET", km: "63-72k", loss: "6m", risk: "MED", tag: "Maddur Loop" },
            { name: "CPT-RMGM", km: "82-93k", loss: "5m", risk: "MED", tag: "Rock Cutting" },
            { name: "BID-HJL", km: "108-115k", loss: "16m", risk: "CRIT", tag: "Freight Loop" },
            { name: "KGI-NYH", km: "126-130k", loss: "12m", risk: "HIGH", tag: "Kengeri Surge" },
            { name: "NYH-SBC", km: "130-138k", loss: "48m", risk: "CRIT", tag: "SBC Throat" },
          ].map((sec) => {
            const riskColor = 
              sec.risk === "LOW" ? "text-signal-green" :
              sec.risk === "MED" ? "text-signal-amber" :
              "text-signal-red";

            return (
              <div
                key={sec.name}
                className="bg-surface-raised border border-graphite rounded-lg p-2 flex flex-col justify-between"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-body font-medium text-chalk-dim">{sec.name}</span>
                  <span className={`text-xs font-data font-semibold ${riskColor}`}>+{sec.loss}</span>
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-body text-steel">
                  <span>{sec.km}</span>
                  <span className={riskColor}>{sec.tag || sec.risk}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface-raised rounded-lg p-2 border border-graphite">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-steel absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search train or name..."
            className="w-full bg-surface border border-graphite rounded-md pl-9 pr-3 py-1.5 text-sm font-body text-chalk placeholder:text-steel focus:outline-none focus:border-graphite-light"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL", label: `All Rails (${ALL_CORRIDOR_FLEET.length})` },
            { id: "RUNNING", label: `Running Now (${activeRunningCount})` },
            { id: "DELAYED", label: `Delayed` },
            { id: "ON_TIME", label: "On Time" },
            { id: "UPCOMING", label: "Upcoming" },
            { id: "COMPLETED", label: "Completed" },
          ].map((tab) => {
            const isAct = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-body transition-all ${
                  isAct
                    ? "bg-surface-overlay text-chalk font-semibold border-b-2 border-chalk"
                    : "bg-surface-raised hover:bg-surface-overlay text-steel hover:text-chalk"
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
          const delayColorClass = !isDelayed ? "text-signal-green" : liveDelayMin < 10 ? "text-signal-amber" : "text-signal-red";

          return (
            <div
              key={train.id}
              className={`bg-surface border rounded-xl overflow-hidden transition-colors ${
                isSelectedDetail ? "border-chalk/30" : "border-graphite"
              }`}
            >
              {/* Main Summary Header Bar */}
              <div
                onClick={() =>
                  setSelectedTrainDetailId(isSelectedDetail ? null : train.id)
                }
                className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 cursor-pointer select-none"
              >
                {/* Train Name, Number & Route */}
                <div className="flex items-start sm:items-center gap-3">
                  <div className="font-data text-sm text-chalk shrink-0">
                    #{train.id}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-heading font-semibold text-chalk">
                        {train.name}
                      </h3>
                      <span className="text-xs text-steel font-body">
                        ({train.type.replace("_", " ")})
                      </span>
                    </div>
                    <div className="text-xs text-steel font-body mt-0.5 flex flex-wrap items-center gap-2">
                      <span>
                        Sched: <span className="font-data">{train.scheduledDep}</span> ➔ <span className="font-data">{train.scheduledArr}</span>
                      </span>
                      <span>·</span>
                      <span className="text-chalk-dim">
                        {train.scheduledStops.length === 2 ? "Non-Stop" : `${train.scheduledStops.length} Halts`}
                      </span>
                      <span>·</span>
                      <span>
                        MPS: <span className="font-data">{train.sectionalMpsKmph}</span> km/h
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operating Status, Live Location & Delay Metrics */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-graphite">
                  {/* Operating State Badge */}
                  <div className="flex items-center gap-1.5 text-xs font-body font-medium text-chalk">
                    <div className={`w-2 h-2 rounded-full ${
                      resolved.stateLabel.includes("ON TIME") ? "bg-signal-green" : 
                      resolved.stateLabel.includes("DELAY") ? "bg-signal-red" : "bg-steel"
                    }`} />
                    {resolved.stateLabel.split(" ")[0]} {resolved.stateLabel.split(" ")[1] || ""}
                  </div>

                  {/* Dynamic Arrival Prediction */}
                  <div className="text-right font-data">
                    <div className="text-xs font-body text-steel">Predicted ETA</div>
                    <div className="text-sm font-data font-bold text-chalk">
                      {prediction.railrakshakDynamicEta}
                    </div>
                  </div>

                  {/* Net Delay Status */}
                  <div className="text-right min-w-[90px]">
                    <div className="text-xs font-body text-steel">Total Delay</div>
                    <div className={`text-sm font-data font-semibold ${delayColorClass}`}>
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
                        className="bg-surface-overlay hover:bg-graphite-light text-chalk text-xs font-body font-medium rounded-lg px-3 py-1.5 border border-graphite transition-colors"
                      >
                        Cockpit
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsible Deep-Dive Delay Intelligence Panel */}
              {isSelectedDetail && (
                <div className="p-5 border-t border-graphite bg-surface-raised space-y-5">
                  
                  {/* Predicted Position & Delay Factors */}
                  <div className="bg-surface rounded-lg p-3 border border-graphite flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-body font-medium text-chalk text-sm">
                        {resolved.liveSummary}
                      </div>
                      <div className="text-steel text-xs font-body">
                        Predicted speed: <span className="font-data text-signal-green">{resolved.currentSpeedKmph} km/h</span> · Route progress: <span className="font-data">{resolved.progressPercent}%</span> (<span className="font-data">{resolved.currentLocationKm.toFixed(1)}</span> / 138.25 km)
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-steel text-xs font-body">
                      <span>Loco: <span className="font-medium text-chalk">{train.locoType}</span></span>
                      <span>({train.coaches} Coaches)</span>
                    </div>
                  </div>

                  {/* Delay Factor Breakdown Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-surface rounded-lg p-3 border border-graphite flex flex-col justify-between">
                      <span className="text-steel font-body text-xs font-medium">Booked Timetable ETA</span>
                      <div className="text-lg font-data font-bold text-chalk mt-1">
                        {train.scheduledArr}
                      </div>
                      <span className="text-xs font-body text-steel-light mt-1">Official SWR Schedule</span>
                    </div>

                    <div className="bg-surface rounded-lg p-3 border border-graphite flex flex-col justify-between">
                      <span className="text-steel font-body text-xs font-medium flex items-center gap-1">Kinetic Slack Recovered</span>
                      <div className="text-lg font-data font-bold text-signal-green mt-1">
                        -{prediction.slackRecoveredMin.toFixed(1)} min
                      </div>
                      <span className="text-xs font-body text-steel-light mt-1">High-speed MPS sectioning</span>
                    </div>

                    <div className="bg-surface rounded-lg p-3 border border-graphite flex flex-col justify-between">
                      <span className="text-steel font-body text-xs font-medium flex items-center gap-1">Incurred Bottlenecks</span>
                      <div className="text-lg font-data font-bold text-signal-amber mt-1">
                        +{prediction.bottlenecksIncurredMin.toFixed(1)} min
                      </div>
                      <span className="text-xs font-body text-steel-light mt-1">Interlocking &amp; dwell losses</span>
                    </div>
                  </div>

                  {/* Yesterday Historical Run Comparison */}
                  {yesterdayRecord && (
                    <div className="p-4 rounded-lg bg-surface border border-graphite space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-body font-medium text-signal-amber text-sm flex items-center gap-1.5">
                          Identified Gap: {yesterdayRecord.primaryGapTitle}
                        </span>
                        <span className="text-steel text-xs font-body">
                          Yesterday Loss: <span className="font-data font-bold text-signal-red">+{yesterdayRecord.totalDelayMin} min</span>
                        </span>
                      </div>
                      <p className="text-xs text-steel-light font-body leading-relaxed">
                        {yesterdayRecord.primaryGapDescription}
                      </p>
                      <div className="pt-2 border-t border-graphite text-xs font-body text-chalk-dim flex items-center gap-1.5">
                        <span className="font-semibold text-chalk">AI Dispatcher Action:</span> 
                        <span>{yesterdayRecord.aiDispatcherRecommendation}</span>
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
