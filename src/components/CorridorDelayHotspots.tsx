import React from "react";
import { TrainConfig, DynamicPredictionResult } from "../lib/rail/types";
import { CORRIDOR_ACTIVE_TRAINS } from "../lib/rail/trains";
import { computeDynamicEta } from "../lib/rail/dynamicEta";
import { EnvironmentalConditions } from "../lib/rail/restrictions";

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
    <div className="space-y-6 animate-fade-in">
      {/* 1. Hotspots Header Banner */}
      <div className="bg-surface border border-graphite rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-lg font-heading font-semibold text-chalk">
              Corridor Delay Generation Analysis &amp; Bottleneck Hotspots
            </h2>
            <p className="text-sm font-body text-steel leading-relaxed max-w-2xl">
              Across all 6 active train services on the 138.25 km corridor, <strong>over 78% of all accumulated delays</strong> originate from <strong>3 specific physical bottlenecks</strong>: the SBC Terminal throat, Kengeri suburban curves, and Bidadi loop precedence stabling.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-surface-raised rounded-lg px-4 py-2 border border-graphite font-data text-xs shrink-0">
            <div className="text-center">
              <div className="text-[10px] text-steel font-body uppercase">Top Hotspot</div>
              <div className="text-sm font-bold text-signal-red">SBC Terminal Throat</div>
            </div>
            <div className="h-8 w-px bg-graphite" />
            <div className="text-center">
              <div className="text-[10px] text-steel font-body uppercase">Max Delay Impact</div>
              <div className="text-sm font-bold text-signal-amber">34% of Total Delay</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Delay Hotspots Ranked List */}
      <div className="bg-surface border border-graphite rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-graphite">
          <h3 className="text-base font-heading font-semibold text-chalk">
            Ranked Delay Generation Hotspots (Source to Destination)
          </h3>
          <span className="text-xs font-body text-steel">6 Modeled Bottlenecks</span>
        </div>

        <div className="space-y-4">
          {CORRIDOR_HOTSPOTS.map((hotspot) => {
            const getCategoryStyle = () => {
              switch (hotspot.causeCategory) {
                case "Terminal Throat":
                  return "text-signal-red";
                case "Suburban Commuters":
                  return "text-signal-amber";
                case "Precedence & Loop":
                  return "text-steel-light";
                case "Track Curvature PSR":
                  return "text-signal-amber";
                case "Level Crossing":
                  return "text-steel";
                default:
                  return "text-steel";
              }
            };

            return (
              <div
                key={hotspot.id}
                className="bg-surface-raised hover:bg-surface-overlay border border-graphite rounded-xl p-4 transition-colors space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="font-data text-sm font-bold text-chalk w-6 h-6 rounded bg-surface flex items-center justify-center border border-graphite shrink-0">
                      {hotspot.rank}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-heading font-semibold text-chalk">
                          {hotspot.location}
                        </span>
                        <span className={`text-xs font-body ${getCategoryStyle()}`}>
                          {hotspot.causeCategory}
                        </span>
                      </div>
                      <div className="text-xs text-steel font-body mt-0.5">
                        {hotspot.chainage}
                      </div>
                    </div>
                  </div>

                  {/* Delay Impact Tag */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] font-body text-steel">Delay Generation</div>
                      <div className="font-data text-sm text-signal-red">{hotspot.avgDelayMinutes}</div>
                    </div>
                    <div className="w-16 sm:w-24 bg-graphite h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-signal-red h-full rounded-full"
                        style={{ width: `${hotspot.sharePercent * 2.5}%` }}
                      />
                    </div>
                    <span className="font-data text-xs text-signal-amber w-10 text-right">
                      {hotspot.sharePercent}%
                    </span>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-graphite text-sm font-body text-steel">
                  <div>
                    <strong className="text-chalk-dim font-semibold">Root Cause:</strong>{" "}
                    <span>{hotspot.primaryCause}</span>
                  </div>
                  <div>
                    <strong className="text-signal-green font-semibold">AI Dispatch Mitigation:</strong>{" "}
                    <span>{hotspot.mitigationStrategy}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Fleet-Wide Delay Comparison Matrix */}
      <div className="bg-surface border border-graphite rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-graphite">
          <h3 className="text-base font-heading font-semibold text-chalk">
            Fleet Delay Accumulation &amp; Recovery Matrix
          </h3>
          <span className="text-xs font-body text-steel">Comparing All Active Trains</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-graphite font-body text-xs text-steel">
                <th className="py-3 px-3 font-normal">Train</th>
                <th className="py-3 px-3 font-normal">Type</th>
                <th className="py-3 px-3 text-center font-normal">Stops</th>
                <th className="py-3 px-3 text-right font-normal">Initial Delay</th>
                <th className="py-3 px-3 text-right font-normal">Bottlenecks Incurred</th>
                <th className="py-3 px-3 text-right font-normal">Slack Recovered</th>
                <th className="py-3 px-3 text-right font-normal">Predicted ETA</th>
                <th className="py-3 px-3 text-center font-normal">Most Impacted Hotspot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite/50">
              {fleetPredictions.map((pred) => {
                const train = pred.train;
                const dynamicDelay = Math.round(pred.railrakshakDynamicDelayMin);
                const isLate = dynamicDelay > 0;
                const isVeryLate = dynamicDelay >= 10;

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
                    className="hover:bg-surface-raised transition-colors"
                  >
                    <td className="py-3 px-3 font-heading text-sm text-chalk">
                      {train.id} {train.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-body text-steel">
                        {train.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-data text-xs text-chalk-dim">
                      {train.scheduledStops.length === 2 ? "Non-Stop" : `${train.scheduledStops.length} Halts`}
                    </td>
                    <td className="py-3 px-3 text-right font-data text-xs text-steel">
                      +{train.initialDelayMin}m
                    </td>
                    <td className="py-3 px-3 text-right text-signal-red font-data text-xs">
                      +{pred.bottlenecksIncurredMin.toFixed(1)}m
                    </td>
                    <td className="py-3 px-3 text-right text-signal-green font-data text-xs">
                      -{pred.slackRecoveredMin.toFixed(1)}m
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-data text-xs ${
                          isVeryLate
                            ? "text-signal-red"
                            : isLate
                            ? "text-signal-amber"
                            : "text-signal-green"
                        }`}
                      >
                        {pred.railrakshakDynamicEta} ({isLate ? `+${dynamicDelay}m` : "On Time"})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-steel font-body text-xs">
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
