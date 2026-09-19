import React from "react";
import { TrainConfig, DynamicPredictionResult } from "../lib/rail/types";
import { CORRIDOR_ACTIVE_TRAINS } from "../lib/rail/trains";
import { computeDynamicEta } from "../lib/rail/dynamicEta";
import { EnvironmentalConditions } from "../lib/rail/restrictions";
import {
  Flame,
  AlertTriangle,
  TrendingUp,
  Clock,
  Gauge,
  ShieldAlert,
  Users,
  Radio,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";

interface CorridorDelayHotspotsProps {
  environment: EnvironmentalConditions;
  injectedDelay: number;
}

export interface HotspotRecord {
  id: string;
  rank: number;
  location: string;
  chainage: string;
  sharePercent: number;
  avgDelayMinutes: string;
  primaryCause: string;
  causeCategory: "Terminal Throat" | "Suburban Commuters" | "Precedence & Loop" | "Track Curvature PSR" | "Level Crossing";
  affectedTrains: string;
  mitigationStrategy: string;
}

export const CORRIDOR_HOTSPOTS: HotspotRecord[] = [
  {
    id: "HOTSPOT-01",
    rank: 1,
    location: "SBC Terminal Throat & Outer Home Interlocking (SEC-16)",
    chainage: "KM 130.850 ➔ KM 138.250 (Nayandahalli to KSR Bengaluru)",
    sharePercent: 34,
    avgDelayMinutes: "+4.5 to +7.0 min",
    primaryCause: "Severe 30 km/h PSR, diamond cross-overs, platform reception queueing & throat signal holding",
    causeCategory: "Terminal Throat",
    affectedTrains: "All Incoming Trains (100% of corridor services)",
    mitigationStrategy: "AI-assisted platform allocation & dynamic green corridor routing at Nayandahalli outer",
  },
  {
    id: "HOTSPOT-02",
    rank: 2,
    location: "Kengeri ➔ Nayandahalli Suburban Bottleneck (SEC-14 & 15)",
    chainage: "KM 115.450 ➔ KM 130.850 (Hejjala to Nayandahalli)",
    sharePercent: 26,
    avgDelayMinutes: "+2.8 to +5.5 min",
    primaryCause: "MPS drops from 130 km/h to 70-75 km/h on urban curves + heavy commuter boarding dwell surges",
    causeCategory: "Suburban Commuters",
    affectedTrains: "Chamundi Express, MEMU Commuter, Wodeyar SF",
    mitigationStrategy: "Automatic dwell countdown timers & track cant realignment to raise curve speed to 90 km/h",
  },
  {
    id: "HOTSPOT-03",
    rank: 3,
    location: "Bidadi Precedence & Loop Line Stabling Zone (SEC-12/13)",
    chainage: "KM 108.626 (Bidadi Junction)",
    sharePercent: 18,
    avgDelayMinutes: "+15.0 to +22.0 min (Freight/Slow)",
    primaryCause: "Loop line 30 km/h turnouts & long detention holds to allow Vande Bharat/Shatabdi overtakes",
    causeCategory: "Precedence & Loop",
    affectedTrains: "BOXN Freight Cargo, MEMU Passenger",
    mitigationStrategy: "High-speed 1:12 thick-web turnouts (50 km/h) and dynamic moving-block precedence",
  },
  {
    id: "HOTSPOT-04",
    rank: 4,
    location: "Mandya Yard Approach Curves & Commuter Node (SEC-06)",
    chainage: "KM 35.050 ➔ KM 45.366 (Chandragirikopal to Mandya)",
    sharePercent: 12,
    avgDelayMinutes: "+1.8 to +3.2 min",
    primaryCause: "85 km/h Curvature PSR on yard approach + major district passenger exchange",
    causeCategory: "Track Curvature PSR",
    affectedTrains: "All Express & Passenger services with Mandya halt",
    mitigationStrategy: "Electronic interlocking yard modernization & curve easing",
  },
  {
    id: "HOTSPOT-05",
    rank: 5,
    location: "Ramanagaram Rocky Cuttings & Reverse Curves (SEC-11)",
    chainage: "KM 82.802 ➔ KM 93.860 (Channapatna to Ramanagaram)",
    sharePercent: 7,
    avgDelayMinutes: "+1.2 to +2.0 min",
    primaryCause: "90 km/h PSR due to sharp reverse curves through rocky terrain",
    causeCategory: "Track Curvature PSR",
    affectedTrains: "All high-speed trains (Vande Bharat, Shatabdi, Superfast)",
    mitigationStrategy: "Transition curve realignment and track lubrication",
  },
  {
    id: "HOTSPOT-06",
    rank: 6,
    location: "Cauvery River Bridge Approach Curvature (SEC-02)",
    chainage: "KM 8.550 ➔ KM 14.750 (Naganahalli to Shrirangapatna)",
    sharePercent: 3,
    avgDelayMinutes: "+0.8 to +1.4 min",
    primaryCause: "95 km/h PSR on river bridge approach curve",
    causeCategory: "Track Curvature PSR",
    affectedTrains: "All Trains traversing Srirangapatna",
    mitigationStrategy: "High-speed bridge transition slabs & guard rails",
  },
];

export function CorridorDelayHotspots({
  environment,
  injectedDelay,
}: CorridorDelayHotspotsProps) {
  // Compute dynamic predictions for all corridor trains
  const fleetPredictions = CORRIDOR_ACTIVE_TRAINS.map((train) => {
    return computeDynamicEta({
      train,
      environment,
      userInjectedDelayMin: injectedDelay,
    });
  });

  return (
    <div className="space-y-7 animate-fade-in">
      {/* 1. Hotspots Header Banner */}
      <div className="bg-gradient-to-r from-rose-950/70 via-rail-850 to-rail-900 border border-rose-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight font-sans">
                Corridor Delay Generation Analysis &amp; Bottleneck Hotspots
              </h2>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed max-w-3xl">
              Across all 6 active train services on the 138.25 km corridor, <strong>over 78% of all accumulated delays</strong> originate from <strong>3 specific physical bottlenecks</strong>: the SBC Terminal throat, Kengeri suburban curves, and Bidadi loop precedence stabling.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-rail-950/80 p-3.5 rounded-2xl border border-rail-700/80 shrink-0 font-mono">
            <div className="text-center">
              <div className="text-[10px] text-slate-400 uppercase">Top Hotspot</div>
              <div className="text-sm font-bold text-rose-400">SBC Terminal Throat</div>
            </div>
            <div className="h-8 w-px bg-rail-800" />
            <div className="text-center">
              <div className="text-[10px] text-slate-400 uppercase">Max Delay Impact</div>
              <div className="text-sm font-bold text-amber-300">34% of Total Delay</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Delay Hotspots Ranked List */}
      <div className="bg-rail-850/90 border border-rail-700/80 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-rail-700/80">
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Ranked Delay Generation Hotspots (Source to Destination)
          </h3>
          <span className="text-xs text-slate-400 font-mono">6 Modeled Bottlenecks</span>
        </div>

        <div className="space-y-4">
          {CORRIDOR_HOTSPOTS.map((hotspot) => {
            const getCategoryColor = () => {
              switch (hotspot.causeCategory) {
                case "Terminal Throat":
                  return "bg-rose-500/20 text-rose-300 border-rose-500/40";
                case "Suburban Commuters":
                  return "bg-amber-500/20 text-amber-300 border-amber-500/40";
                case "Precedence & Loop":
                  return "bg-purple-500/20 text-purple-300 border-purple-500/40";
                case "Track Curvature PSR":
                  return "bg-blue-500/20 text-blue-300 border-blue-500/40";
                default:
                  return "bg-slate-800 text-slate-300 border-slate-700";
              }
            };

            return (
              <div
                key={hotspot.id}
                className="bg-rail-900/80 hover:bg-rail-800/90 border border-rail-700/80 hover:border-slate-500 rounded-2xl p-4 sm:p-5 transition-all duration-200 space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="flex h-7 w-7 rounded-xl bg-rail-950 border border-rail-700 text-cyan-400 font-mono font-bold text-xs items-center justify-center shrink-0">
                      #{hotspot.rank}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-white font-sans">
                          {hotspot.location}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${getCategoryColor()}`}>
                          {hotspot.causeCategory}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {hotspot.chainage}
                      </div>
                    </div>
                  </div>

                  {/* Delay Impact Tag */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono">
                      <div className="text-[10px] uppercase text-slate-400">Delay Generation</div>
                      <div className="text-sm font-bold text-rose-400">{hotspot.avgDelayMinutes}</div>
                    </div>
                    <div className="w-16 sm:w-24 bg-rail-950 h-2 rounded-full overflow-hidden border border-rail-800">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full"
                        style={{ width: `${hotspot.sharePercent * 2.5}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300 w-10 text-right">
                      {hotspot.sharePercent}%
                    </span>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-rail-800/80 text-xs">
                  <div>
                    <strong className="text-slate-300">Root Cause:</strong>{" "}
                    <span className="text-slate-400">{hotspot.primaryCause}</span>
                  </div>
                  <div>
                    <strong className="text-cyan-300">AI Dispatch Mitigation:</strong>{" "}
                    <span className="text-slate-400">{hotspot.mitigationStrategy}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Fleet-Wide Delay Comparison Matrix */}
      <div className="bg-rail-850/90 border border-rail-700/80 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-rail-700/80">
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Fleet Delay Accumulation &amp; Recovery Matrix
          </h3>
          <span className="text-xs text-slate-400 font-mono">Comparing All Active Trains</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-rail-700 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Train</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-center">Stops</th>
                <th className="py-3 px-3 text-right">Initial Delay</th>
                <th className="py-3 px-3 text-right text-rose-400">Bottlenecks Incurred</th>
                <th className="py-3 px-3 text-right text-emerald-400">Slack Recovered</th>
                <th className="py-3 px-3 text-right text-cyan-300">Dynamic Final ETA</th>
                <th className="py-3 px-3 text-center">Most Impacted Hotspot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rail-800">
              {fleetPredictions.map((pred) => {
                const train = pred.train;
                const dynamicDelay = Math.round(pred.railrakshakDynamicDelayMin);
                const isLate = dynamicDelay > 0;

                // Identify worst section for this train
                const worstSection =
                  train.type === "FREIGHT_BOXN"
                    ? "Bidadi Loop Stabling (SEC-12)"
                    : train.scheduledStops.length > 8
                    ? "Kengeri Commuter Dwell (SEC-15)"
                    : "SBC Terminal Throat (SEC-16)";

                return (
                  <tr
                    key={train.id}
                    className="hover:bg-rail-800/50 transition-colors"
                  >
                    <td className="py-3 px-3 font-bold text-white">
                      #{train.id} {train.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-rail-950 text-slate-300 border border-rail-700 text-[10px]">
                        {train.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {train.scheduledStops.length === 2 ? "⚡ Non-Stop" : `${train.scheduledStops.length} Halts`}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      +{train.initialDelayMin}m
                    </td>
                    <td className="py-3 px-3 text-right text-rose-400 font-bold">
                      +{pred.bottlenecksIncurredMin.toFixed(1)}m
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                      -{pred.slackRecoveredMin.toFixed(1)}m
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          isLate
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {pred.railrakshakDynamicEta} ({isLate ? `+${dynamicDelay}m` : "On Time"})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300 font-sans text-[11px]">
                      {worstSection}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
