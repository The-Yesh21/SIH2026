import React, { useState, useMemo } from "react";
import {
  Zap,
  Clock,
  Navigation,
  Compass,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Play,
  Gauge,
  Sparkles,
  MapPin,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Timer,
  Award,
  TrainTrack,
  Flame,
} from "lucide-react";
import { SWR_CORRIDOR_STATIONS } from "../lib/rail/infrastructure";
import {
  findOptimalTrains,
  PerfectionQueryResult,
  OptimalTrainOption,
  getStationByCode,
} from "../lib/rail/perfectionEngine";
import { formatClockMinutes } from "../lib/rail/timeResolver";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT } from "../lib/rail/restrictions";

interface OptimalRouteOptimizerProps {
  activeClockMinutes: number;
  setActiveClockMinutes: (mins: number) => void;
  isRealTimeSynced: boolean;
  setIsRealTimeSynced: (synced: boolean) => void;
  onSelectTrainForCockpit: (trainId: string) => void;
  onSelectTrainForSimulator: (trainId: string) => void;
  environment?: EnvironmentalConditions;
  injectedDelay?: number;
}

const POPULAR_STATION_PAIRS = [
  { from: "MYS", to: "SBC", label: "MYS ➔ SBC (Full Trunk 138.2 km)" },
  { from: "PANP", to: "SBC", label: "PANP ➔ SBC (Pandavapura ➔ SBC)" },
  { from: "MYA", to: "SBC", label: "MYA ➔ SBC (Mandya Commuter Hub)" },
  { from: "MAD", to: "SBC", label: "MAD ➔ SBC (Maddur ➔ SBC)" },
  { from: "CPT", to: "SBC", label: "CPT ➔ SBC (Channapatna ➔ SBC)" },
  { from: "RMGM", to: "SBC", label: "RMGM ➔ SBC (Ramanagaram ➔ SBC)" },
  { from: "BID", to: "SBC", label: "BID ➔ SBC (Bidadi ➔ SBC)" },
  { from: "KGI", to: "SBC", label: "KGI ➔ SBC (Kengeri Suburban)" },
  { from: "MYS", to: "MYA", label: "MYS ➔ MYA (Mysuru to Mandya)" },
];

export function OptimalRouteOptimizer({
  activeClockMinutes,
  setActiveClockMinutes,
  isRealTimeSynced,
  setIsRealTimeSynced,
  onSelectTrainForCockpit,
  onSelectTrainForSimulator,
  environment = DEFAULT_ENVIRONMENT,
  injectedDelay = 0,
}: OptimalRouteOptimizerProps) {
  const [originCode, setOriginCode] = useState<string>("MYS");
  const [destCode, setDestCode] = useState<string>("SBC");
  const [requirePassengerHaltsOnly, setRequirePassengerHaltsOnly] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PERFECTION" | "SOONEST" | "FASTEST">("ALL");

  // Validate station selection
  const originStation = getStationByCode(originCode) || SWR_CORRIDOR_STATIONS[0]!;
  const destStation = getStationByCode(destCode) || SWR_CORRIDOR_STATIONS[SWR_CORRIDOR_STATIONS.length - 1]!;

  // Compute Optimization Results
  const result: PerfectionQueryResult = useMemo(() => {
    return findOptimalTrains({
      originCode,
      destCode,
      queryClockMinutes: activeClockMinutes,
      environment,
      injectedDelay,
      requirePassengerHaltsOnly,
    });
  }, [originCode, destCode, activeClockMinutes, environment, injectedDelay, requirePassengerHaltsOnly]);

  // Quick swap stations if valid
  const handleSwapStations = () => {
    if (originStation.distanceFromMysKm > destStation.distanceFromMysKm) {
      // Swapping when already reverse
      const temp = originCode;
      setOriginCode(destCode);
      setDestCode(temp);
    } else {
      // SWR corridor is currently modeled MYS -> SBC
      const temp = originCode;
      setOriginCode(destCode);
      setDestCode(temp);
    }
  };

  const handleSelectPair = (from: string, to: string) => {
    setOriginCode(from);
    setDestCode(to);
  };

  // Filter options
  const displayedOptions = useMemo(() => {
    if (activeFilter === "PERFECTION") {
      return result.options.filter((o) => o.isPerfectionChoice);
    }
    if (activeFilter === "SOONEST") {
      return result.options.filter((o) => o.isNextDeparture);
    }
    if (activeFilter === "FASTEST") {
      return result.options.filter((o) => o.isFastestTransit);
    }
    return result.options;
  }, [result.options, activeFilter]);

  const best = result.bestChoice;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner & Perfection Philosophy */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/80 via-surface-raised to-ink border border-indigo-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-heading font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>AI Multi-Factor Transit &amp; Dispatch Optimizer</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-chalk">
              Optimal Train Perfection System
            </h2>
            <p className="text-sm font-body text-steel max-w-2xl leading-relaxed">
              Find the mathematically perfect train for your journey. Balances <strong className="text-chalk">Wait Cost</strong> at departure station with <strong className="text-chalk">In-Motion Velocity</strong>, <strong className="text-chalk">Dynamic Delay Recovery DNA</strong>, and real-time corridor congestion to deliver the earliest destination arrival with highest reliability.
            </p>
          </div>

          {/* Quick Real-Time Status Pill */}
          <div className="bg-surface/80 backdrop-blur-md border border-graphite rounded-xl p-4 flex flex-col gap-1.5 shrink-0">
            <span className="text-[11px] font-heading uppercase tracking-wider text-steel">Active Query Time</span>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-signal-green animate-pulse" />
              <span className="text-xl font-data font-bold text-chalk">{result.queryClockStr}</span>
            </div>
            <span className="text-[11px] font-data text-steel">
              {isRealTimeSynced ? "● Live Real-Time Synced" : "● Simulator Scrubbed Time"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Station Selector & Route Search Bar */}
      <div className="bg-surface rounded-2xl border border-graphite p-5 sm:p-6 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Origin Stop Input */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-heading font-semibold uppercase tracking-wider text-steel flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-signal-green" />
              <span>Origin Station (From Stop)</span>
            </label>
            <div className="relative">
              <select
                value={originCode}
                onChange={(e) => setOriginCode(e.target.value)}
                className="w-full bg-surface-raised border border-graphite focus:border-signal-green text-chalk rounded-xl px-4 py-3 text-sm font-heading font-semibold focus:outline-none transition-all shadow-inner"
              >
                {SWR_CORRIDOR_STATIONS.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.name} ({st.code}) — {st.distanceFromMysKm.toFixed(1)} km
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap / Arrow Button */}
          <div className="md:col-span-2 flex justify-center items-end py-1">
            <button
              onClick={handleSwapStations}
              title="Reverse Direction"
              className="p-3 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-graphite hover:border-steel text-chalk transition-all duration-200 group"
            >
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform text-signal-green" />
            </button>
          </div>

          {/* Destination Stop Input */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-heading font-semibold uppercase tracking-wider text-steel flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-indigo-400" />
              <span>Destination Station (To Stop)</span>
            </label>
            <div className="relative">
              <select
                value={destCode}
                onChange={(e) => setDestCode(e.target.value)}
                className="w-full bg-surface-raised border border-graphite focus:border-indigo-400 text-chalk rounded-xl px-4 py-3 text-sm font-heading font-semibold focus:outline-none transition-all shadow-inner"
              >
                {SWR_CORRIDOR_STATIONS.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.name} ({st.code}) — {st.distanceFromMysKm.toFixed(1)} km
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Route Presets */}
        <div className="pt-2 border-t border-graphite/60 flex flex-wrap items-center gap-2">
          <span className="text-xs font-heading text-steel uppercase tracking-wider font-semibold mr-1">
            Popular SWR Corridors:
          </span>
          {POPULAR_STATION_PAIRS.map((pair) => {
            const isSelected = originCode === pair.from && destCode === pair.to;
            return (
              <button
                key={pair.label}
                onClick={() => handleSelectPair(pair.from, pair.to)}
                className={`px-3 py-1.5 rounded-lg text-xs font-heading transition-all duration-200 border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-md font-bold"
                    : "bg-surface-raised hover:bg-surface-overlay text-steel hover:text-chalk border-graphite"
                }`}
              >
                {pair.label}
              </button>
            );
          })}
        </div>

        {/* Query Controls & Filters */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-body text-steel hover:text-chalk">
              <input
                type="checkbox"
                checked={requirePassengerHaltsOnly}
                onChange={(e) => setRequirePassengerHaltsOnly(e.target.checked)}
                className="w-4 h-4 rounded border-graphite text-indigo-500 focus:ring-indigo-400 focus:ring-offset-ink bg-surface-raised cursor-pointer"
              />
              <span>Commercial Halts Only (Hide Express Non-Stop &amp; Freights)</span>
            </label>
          </div>

          {/* Quick Filter Badges */}
          <div className="flex items-center gap-1.5">
            {[
              { id: "ALL", label: `All Options (${result.options.length})` },
              { id: "PERFECTION", label: "🎯 Perfection Choice" },
              { id: "SOONEST", label: "⏱️ Soonest Departure" },
              { id: "FASTEST", label: "⚡ Fastest In-Transit" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-3 py-1 rounded-md text-xs font-heading transition-all ${
                  activeFilter === f.id
                    ? "bg-surface-overlay text-chalk font-bold border border-steel"
                    : "text-steel hover:text-chalk hover:bg-surface-raised"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. HERO SPOTLIGHT: The Perfection Choice Card */}
      {best ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-raised via-surface to-indigo-950/40 border-2 border-signal-green/60 p-6 sm:p-7 shadow-2xl space-y-5">
          {/* Top Banner with Perfection Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-graphite pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-signal-green/20 border border-signal-green/40 text-signal-green">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-signal-green/20 text-signal-green border border-signal-green/40 text-[11px] font-heading font-black tracking-wider uppercase">
                    🏆 #1 PERFECTION RECOMMENDATION
                  </span>
                  <span className="text-xs font-data text-steel">
                    Perfection Index: <strong className="text-signal-green text-sm">{best.perfectionScore}%</strong>
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-heading font-black text-chalk mt-0.5">
                  #{best.train.id} {best.train.name}
                </h3>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectTrainForCockpit(best.train.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-signal-green text-ink font-heading font-bold text-xs hover:bg-signal-green/90 transition-all shadow-md"
              >
                <RadioIcon />
                <span>Open in Cockpit</span>
              </button>
              <button
                onClick={() => onSelectTrainForSimulator(best.train.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-heading font-bold text-xs hover:bg-indigo-500 transition-all shadow-md"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulate Run</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Origin Departure */}
            <div className="bg-surface/80 rounded-xl p-3.5 border border-graphite">
              <span className="text-[11px] font-heading uppercase text-steel">Departs {originStation.name}</span>
              <div className="text-xl font-data font-bold text-chalk mt-1">
                {best.predictedDepOriginStr}
              </div>
              <div className="text-xs font-data text-signal-green mt-0.5">
                {best.waitTimeMins === 0
                  ? "Leaving Right Now!"
                  : `In ${best.waitTimeMins} minutes`}
              </div>
            </div>

            {/* Destination Arrival */}
            <div className="bg-surface/80 rounded-xl p-3.5 border border-graphite">
              <span className="text-[11px] font-heading uppercase text-steel">Arrives {destStation.name}</span>
              <div className="text-xl font-data font-bold text-signal-green mt-1">
                {best.predictedArrDestStr}
              </div>
              <div className="text-xs font-data text-steel mt-0.5">
                Earliest arrival at terminus
              </div>
            </div>

            {/* Transit Time & Speed */}
            <div className="bg-surface/80 rounded-xl p-3.5 border border-graphite">
              <span className="text-[11px] font-heading uppercase text-steel">In-Transit Duration</span>
              <div className="text-xl font-data font-bold text-chalk mt-1">
                {Math.floor(best.transitDurationMins / 60)}h {best.transitDurationMins % 60}m
              </div>
              <div className="text-xs font-data text-steel mt-0.5">
                Avg: <strong className="text-chalk">{best.avgSpeedKmph} km/h</strong> ({best.distanceKm} km)
              </div>
            </div>

            {/* Total Cost of Journey */}
            <div className="bg-surface/80 rounded-xl p-3.5 border border-graphite">
              <span className="text-[11px] font-heading uppercase text-steel">Total Journey Time</span>
              <div className="text-xl font-data font-bold text-indigo-300 mt-1">
                {Math.floor(best.totalJourneyMins / 60)}h {best.totalJourneyMins % 60}m
              </div>
              <div className="text-xs font-data text-steel mt-0.5">
                Wait {best.waitTimeMins}m + Ride {best.transitDurationMins}m
              </div>
            </div>
          </div>

          {/* Time Cast Visual Breakdown Bar */}
          <div className="space-y-1.5 bg-surface/60 p-4 rounded-xl border border-graphite">
            <div className="flex justify-between text-xs font-heading text-steel">
              <span className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-signal-amber" />
                <span>Journey Timeline Breakdown (Time Cast Analysis)</span>
              </span>
              <span className="font-data text-chalk">
                Now: {result.queryClockStr} ➔ Destination Arrival: {best.predictedArrDestStr}
              </span>
            </div>
            <div className="h-4 w-full bg-graphite/40 rounded-full overflow-hidden flex p-0.5 gap-1">
              {/* Wait Portion */}
              {best.waitTimeMins > 0 && (
                <div
                  style={{
                    width: `${Math.max(10, (best.waitTimeMins / best.totalJourneyMins) * 100)}%`,
                  }}
                  className="bg-signal-amber rounded-l-full h-full flex items-center justify-center text-[10px] font-data font-bold text-ink"
                  title={`Wait Time: ${best.waitTimeMins} mins`}
                >
                  Wait {best.waitTimeMins}m
                </div>
              )}
              {/* Transit Portion */}
              <div
                style={{
                  width: `${Math.max(20, (best.transitDurationMins / best.totalJourneyMins) * 100)}%`,
                }}
                className="bg-signal-green rounded-r-full h-full flex items-center justify-center text-[10px] font-data font-bold text-ink"
                title={`Transit Time: ${best.transitDurationMins} mins`}
              >
                In-Motion {best.transitDurationMins}m
              </div>
            </div>
            <div className="flex justify-between text-[11px] font-data text-steel pt-1">
              <span>● Boarding at {originStation.name} in {best.waitTimeMins} mins</span>
              <span>● {best.stopsEnRoute.length === 0 ? "Non-Stop High Speed Run" : `${best.stopsEnRoute.length} intermediate stops: ${best.stopsEnRoute.join(", ")}`}</span>
            </div>
          </div>

          {/* AI Reasoning Narrative Box */}
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-indigo-300">
                Why This Train is the Mathematically Optimal Choice
              </h4>
              <p className="text-xs font-body text-chalk leading-relaxed">
                {best.aiDecisionReason} {best.kinematicVerdict} {best.throttleAdvisory}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-surface border border-graphite text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-signal-amber mx-auto" />
          <h3 className="text-lg font-heading font-bold text-chalk">
            No Commercial Train Halts Found for This Station Pair
          </h3>
          <p className="text-sm font-body text-steel max-w-md mx-auto">
            Please uncheck "Commercial Halts Only" to view freight / non-stop bypass schedules, or select major junctions like Mysuru (MYS), Mandya (MYA), Ramanagaram (RMGM), or Bengaluru (SBC).
          </p>
        </div>
      )}

      {/* 4. Complete Comparison Matrix & Ranked Train List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-heading font-bold text-chalk flex items-center gap-2">
            <TrainTrack className="w-5 h-5 text-signal-green" />
            <span>Ranked Fleet Dispatch &amp; Transit Options ({displayedOptions.length} Trains)</span>
          </h3>
          <span className="text-xs font-data text-steel">
            Sorted by Earliest Absolute Destination Arrival
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedOptions.map((opt, idx) => {
            const isBest = opt.isPerfectionChoice;
            return (
              <div
                key={opt.train.id}
                className={`rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between gap-4 ${
                  isBest
                    ? "bg-surface-raised border-signal-green/60 shadow-lg shadow-signal-green/10"
                    : "bg-surface border-graphite hover:border-steel/60 hover:bg-surface-raised"
                }`}
              >
                {/* Header with Badges */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-data font-bold text-steel">
                          #{idx + 1}
                        </span>
                        {opt.badgeLabels.map((badge) => (
                          <span
                            key={badge}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-heading font-bold ${
                              badge.includes("Perfection")
                                ? "bg-signal-green/20 text-signal-green border border-signal-green/40"
                                : badge.includes("Fastest")
                                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                                : "bg-signal-amber/20 text-signal-amber border border-signal-amber/40"
                            }`}
                          >
                            {badge}
                          </span>
                        ))}
                        <span className="text-[10px] font-data px-1.5 py-0.5 rounded bg-surface-overlay text-steel border border-graphite">
                          {opt.train.type}
                        </span>
                      </div>
                      <h4 className="text-base font-heading font-bold text-chalk mt-1">
                        #{opt.train.id} {opt.train.name}
                      </h4>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-heading uppercase text-steel">Perfection</div>
                      <div className="text-base font-data font-black text-signal-green">
                        {opt.perfectionScore}%
                      </div>
                    </div>
                  </div>

                  {/* Timing & Wait Stats */}
                  <div className="grid grid-cols-3 gap-2 bg-surface-raised/80 p-3 rounded-xl border border-graphite text-xs">
                    <div>
                      <span className="text-[10px] font-heading uppercase text-steel block">Departs Origin</span>
                      <strong className="text-chalk font-data text-sm">{opt.predictedDepOriginStr}</strong>
                      <span className="text-[10px] block text-signal-green font-data">
                        {opt.waitTimeMins === 0 ? "Now" : `In ${opt.waitTimeMins}m`}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-heading uppercase text-steel block">Transit Ride</span>
                      <strong className="text-chalk font-data text-sm">
                        {Math.floor(opt.transitDurationMins / 60)}h {opt.transitDurationMins % 60}m
                      </strong>
                      <span className="text-[10px] block text-steel font-data">
                        {opt.avgSpeedKmph} km/h avg
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-heading uppercase text-steel block">Destination ETA</span>
                      <strong className="text-signal-green font-data text-sm">{opt.predictedArrDestStr}</strong>
                      <span className="text-[10px] block text-indigo-300 font-data">
                        Total: {opt.totalJourneyMins}m
                      </span>
                    </div>
                  </div>

                  {/* Stops & Delay Risk */}
                  <div className="flex items-center justify-between text-xs text-steel pt-1">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-signal-green" />
                      <span>
                        {opt.stopsEnRoute.length === 0
                          ? "Non-Stop Corridor Run"
                          : `${opt.stopsEnRoute.length} halts (${opt.stopsEnRoute.join(", ")})`}
                      </span>
                    </span>
                    <span className="font-data text-[11px]">
                      MPS: <strong className="text-chalk">{opt.train.sectionalMpsKmph} km/h</strong>
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-2 border-t border-graphite/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-body text-steel truncate max-w-[200px]" title={opt.aiDecisionReason}>
                    {opt.aiDecisionReason}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onSelectTrainForCockpit(opt.train.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-heading font-semibold bg-surface-raised hover:bg-surface-overlay border border-graphite text-chalk transition-all"
                    >
                      Inspect
                    </button>
                    <button
                      onClick={() => onSelectTrainForSimulator(opt.train.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-heading font-semibold bg-indigo-600/80 hover:bg-indigo-600 text-white transition-all flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      <span>Sim</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RadioIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
    </svg>
  );
}
