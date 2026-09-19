import React, { useState } from "react";
import {
  TrainConfig,
  StationForecastRow,
  DynamicPredictionResult,
} from "../lib/rail/types";
import { CORRIDOR_SECTIONS, CorridorSectionRecord } from "../lib/rail/corridorDataset";
import { SWR_CORRIDOR_STATIONS } from "../lib/rail/infrastructure";
import {
  MapPin,
  Clock,
  Gauge,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Navigation2,
  SlidersHorizontal,
  StopCircle,
  Zap,
} from "lucide-react";

interface CleanRouteTimelineProps {
  prediction: DynamicPredictionResult;
  selectedTrain: TrainConfig;
}

export function CleanRouteTimeline({
  prediction,
  selectedTrain,
}: CleanRouteTimelineProps) {
  const [filterMode, setFilterMode] = useState<"ALL" | "STOPS_ONLY" | "DELAYS_ONLY">("ALL");
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const trainLocKm = selectedTrain.currentLocationKm;

  // Combine stations and intermediate sections
  const stations = SWR_CORRIDOR_STATIONS;

  const toggleSection = (id: string) => {
    setExpandedSectionId((prev) => (prev === id ? null : id));
  };

  const totalScheduledStopsCount = selectedTrain.scheduledStops.length;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white">
              Route Stoppages &amp; Delay Timeline
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50">
              {totalScheduledStopsCount} Commercial Halts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Detailed itinerary from Mysuru (0.0 km) to KSR Bengaluru (138.25 km) highlighting scheduled halts vs. non-stop pass-throughs
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilterMode("ALL")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterMode === "ALL"
                ? "bg-cyan-600 text-white shadow font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All 17 Stations
          </button>
          <button
            onClick={() => setFilterMode("STOPS_ONLY")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterMode === "STOPS_ONLY"
                ? "bg-indigo-600 text-white shadow font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🛑 Scheduled Halts ({totalScheduledStopsCount})
          </button>
          <button
            onClick={() => setFilterMode("DELAYS_ONLY")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterMode === "DELAYS_ONLY"
                ? "bg-amber-600 text-white shadow font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ⚠️ Bottlenecks Only
          </button>
        </div>
      </div>

      {/* Vertical Interactive Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-indigo-500 before:to-emerald-500">
        {stations.map((station, idx) => {
          const forecast = prediction.stationBreakdown.find((f) => f.code === station.code);
          const nextStation = stations[idx + 1];
          const section = nextStation
            ? CORRIDOR_SECTIONS.find(
                (s) => s.fromStationCode === station.code && s.toStationCode === nextStation.code
              )
            : null;

          const isHalt = selectedTrain.scheduledStops.includes(station.code);
          const haltDwell =
            selectedTrain.dwellMinutes?.[station.code] ??
            (isHalt && station.code !== "MYS" && station.code !== "SBC" ? 1 : 0);

          const isTrainHere =
            Math.abs(trainLocKm - station.distanceFromMysKm) < 3.0 ||
            (trainLocKm >= station.distanceFromMysKm &&
              (!nextStation || trainLocKm < nextStation.distanceFromMysKm));

          const isPassed = trainLocKm > station.distanceFromMysKm + 1.0;

          // Check if this section has restrictions
          const hasBottlenecks =
            section &&
            (section.hasPsr ||
              section.hasTsr ||
              section.hasLcGate ||
              section.commuterSurgeRisk === "HIGH");

          // Filter checks
          if (filterMode === "STOPS_ONLY" && !isHalt && !isTrainHere) {
            return null;
          }
          if (
            filterMode === "DELAYS_ONLY" &&
            !hasBottlenecks &&
            !isTrainHere &&
            idx !== 0 &&
            idx !== stations.length - 1
          ) {
            return null;
          }

          return (
            <div key={station.code} className="relative space-y-4">
              {/* Station Node Marker */}
              <div
                className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                  isTrainHere
                    ? "bg-cyan-500 border-white text-slate-950 shadow-lg shadow-cyan-500/50 ring-4 ring-cyan-500/20"
                    : isHalt
                    ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-500/30"
                    : isPassed
                    ? "bg-slate-800 border-slate-600 text-slate-400"
                    : "bg-slate-900 border-slate-700 text-slate-500"
                }`}
              >
                {isTrainHere ? (
                  <Navigation2 className="w-3.5 h-3.5 fill-current animate-bounce" />
                ) : isHalt ? (
                  <StopCircle className="w-3.5 h-3.5" />
                ) : isPassed ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                )}
              </div>

              {/* Station Info Box */}
              <div
                className={`rounded-xl border p-4 transition-all ${
                  isTrainHere
                    ? "bg-cyan-950/40 border-cyan-500/40 shadow-lg shadow-cyan-950/50"
                    : isHalt
                    ? "bg-slate-900/90 border-slate-700/80 shadow-md"
                    : isPassed
                    ? "bg-slate-900/30 border-slate-800/60 opacity-70"
                    : "bg-slate-900/50 border-slate-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-white">
                        {station.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300">
                        {station.code}
                      </span>

                      {/* Stoppage Status Badge */}
                      {isHalt ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          <StopCircle className="w-3 h-3" />
                          {station.code === "MYS"
                            ? "Origin (Departure)"
                            : station.code === "SBC"
                            ? "Terminus (Destination)"
                            : `Commercial Halt (${haltDwell}m Dwell)`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-800/80 text-slate-400 border border-slate-700/50">
                          <Zap className="w-3 h-3 text-amber-400/80" />
                          Non-Stop Pass Through
                        </span>
                      )}

                      {isTrainHere && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500 text-slate-950 animate-pulse">
                          Train Near Here
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>KM {station.distanceFromMysKm.toFixed(1)} from Mysuru</span>
                      <span>•</span>
                      <span>Platforms: {station.platformCount}</span>
                      {station.hasLoopLine && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-400">Loop speed {station.loopSpeedKmph} km/h</span>
                        </>
                      )}
                      {station.commuterSurgeProne && (
                        <>
                          <span>•</span>
                          <span className="text-rose-400">Suburban commuter hub</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Timing & Delay Status */}
                  {forecast && (
                    <div className="flex items-center gap-3 bg-slate-950/70 px-3.5 py-2 rounded-lg border border-slate-800 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono text-slate-400">
                          {isHalt ? "Scheduled" : "Passing Time"}
                        </div>
                        <div className="text-xs font-mono font-semibold text-slate-300">
                          {forecast.bookedTime}
                        </div>
                      </div>
                      <div className="h-6 w-px bg-slate-800" />
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono text-slate-400">
                          Dynamic ETA
                        </div>
                        <div
                          className={`text-xs font-mono font-bold ${
                            forecast.predictedDelayMin > 3
                              ? "text-amber-400"
                              : forecast.predictedDelayMin > 0
                              ? "text-yellow-300"
                              : "text-emerald-400"
                          }`}
                        >
                          {forecast.predictedTime}
                        </div>
                      </div>
                      {forecast.predictedDelayMin > 0 ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          +{Math.round(forecast.predictedDelayMin)}m
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          On Time
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Inter-Station Block Section (If Available) */}
              {section && (
                <div className="ml-2 sm:ml-4 border-l-2 border-dashed border-slate-800 pl-4 py-1 space-y-2">
                  <div
                    onClick={() => toggleSection(section.sectionId)}
                    className="group cursor-pointer rounded-lg bg-slate-950/60 hover:bg-slate-800/50 border border-slate-800/70 p-3 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <Gauge className="w-4 h-4 text-cyan-400" />
                      <div>
                        <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                          Section: {section.fromStationName} ➔ {section.toStationName}
                        </span>
                        <span className="text-xs text-slate-500 ml-2">
                          ({section.lengthKm.toFixed(1)} km • Max Speed {section.sanctionedMpsKmph} km/h)
                        </span>
                      </div>
                    </div>

                    {/* Section Factors Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {section.hasPsr && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          Curvature PSR: {section.psrSpeedKmph} km/h
                        </span>
                      )}

                      {section.hasLcGate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          <ShieldAlert className="w-3 h-3" />
                          Level Crossing {section.lcGateId}
                        </span>
                      )}

                      {section.commuterSurgeRisk === "HIGH" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30">
                          High Commuter Zone
                        </span>
                      )}

                      {!section.hasPsr && !section.hasTsr && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          <Sparkles className="w-3 h-3" />
                          Buffer Slack (-{section.bufferSlackAllocatedMin}m)
                        </span>
                      )}

                      <div className="text-slate-500 group-hover:text-slate-300">
                        {expandedSectionId === section.sectionId ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section Details */}
                  {expandedSectionId === section.sectionId && (
                    <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs space-y-2 animate-fadeIn">
                      <div className="font-semibold text-slate-200">
                        Section Analysis ({section.sectionId}):
                      </div>
                      <ul className="list-disc list-inside text-slate-400 space-y-1">
                        <li>
                          <strong className="text-slate-300">Track Geometry:</strong> Sanctioned MPS is {section.sanctionedMpsKmph} km/h. Buffer slack allocated: {section.bufferSlackAllocatedMin} mins.
                        </li>
                        {section.hasPsr && (
                          <li className="text-amber-300">
                            <strong>Permanent Speed Restriction (PSR):</strong> Restricted to {section.psrSpeedKmph} km/h due to &quot;{section.psrReason}&quot;.
                          </li>
                        )}
                        {section.hasLcGate && (
                          <li className="text-indigo-300">
                            <strong>Level Crossing Gate ({section.lcGateId}):</strong> Interlocked road closure with potential signal detention if held open.
                          </li>
                        )}
                        {section.commuterSurgeRisk === "HIGH" && (
                          <li className="text-rose-300">
                            <strong>Commuter Dwell:</strong> High suburban footfall zone prone to platform dwell extensions during peak office hours.
                          </li>
                        )}
                      </ul>
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
