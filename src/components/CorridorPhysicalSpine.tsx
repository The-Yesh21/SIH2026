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
  Radio,
  ArrowRight,
} from "lucide-react";

interface CorridorPhysicalSpineProps {
  prediction: DynamicPredictionResult;
  selectedTrain: TrainConfig;
}

export function CorridorPhysicalSpine({
  prediction,
  selectedTrain,
}: CorridorPhysicalSpineProps) {
  const [filterMode, setFilterMode] = useState<"ALL" | "STOPS_ONLY" | "DELAYS_ONLY">("ALL");
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const trainLocKm = selectedTrain.currentLocationKm;
  const stations = SWR_CORRIDOR_STATIONS;
  const totalScheduledStopsCount = selectedTrain.scheduledStops.length;

  const toggleSection = (id: string) => {
    setExpandedSectionId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-rail-850/90 border border-rail-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Header & Filter Deck */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-rail-700/80">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-3.5 w-3.5 rounded-full bg-cyan-400 animate-pulse aspect-glow-cyan" />
            <h2 className="text-lg font-bold text-white tracking-tight font-sans">
              Corridor Physical Track Spine &amp; Section Delay Diagnostics
            </h2>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-600/40">
              {totalScheduledStopsCount} Commercial Halts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official SWR Double-Electrified Track (138.25 km) · Live section-by-section delay propagation &amp; PSR analysis
          </p>
        </div>

        {/* Filter Toggle Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-rail-950/90 p-1.5 rounded-2xl border border-rail-700 text-xs">
          <button
            onClick={() => setFilterMode("ALL")}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all duration-200 ${
              filterMode === "ALL"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All 17 Stations
          </button>
          <button
            onClick={() => setFilterMode("STOPS_ONLY")}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all duration-200 ${
              filterMode === "STOPS_ONLY"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🛑 Scheduled Halts ({totalScheduledStopsCount})
          </button>
          <button
            onClick={() => setFilterMode("DELAYS_ONLY")}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all duration-200 ${
              filterMode === "DELAYS_ONLY"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ⚠️ Bottlenecks Only
          </button>
        </div>
      </div>

      {/* Main Track Timeline Spine */}
      <div className="relative pl-6 sm:pl-9 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-1 before:bg-gradient-to-b before:from-cyan-500 before:via-indigo-500 before:to-emerald-400 before:rounded-full">
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

          // Check bottlenecks
          const hasBottlenecks =
            section &&
            (section.hasPsr ||
              section.hasTsr ||
              section.hasLcGate ||
              section.commuterSurgeRisk === "HIGH");

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
            <div key={station.code} className="relative space-y-4 animate-fade-in">
              {/* Station Physical Track Node Marker */}
              <div
                className={`absolute -left-6 sm:-left-9 top-2 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isTrainHere
                    ? "bg-cyan-500 border-white text-slate-950 shadow-xl shadow-cyan-500/60 ring-4 ring-cyan-500/25 scale-110 z-10"
                    : isHalt
                    ? "bg-indigo-600 border-indigo-300 text-white shadow-md shadow-indigo-600/40"
                    : isPassed
                    ? "bg-rail-750 border-rail-600 text-slate-400"
                    : "bg-rail-950 border-rail-700 text-slate-500"
                }`}
              >
                {isTrainHere ? (
                  <Navigation2 className="w-4 h-4 fill-current animate-bounce" />
                ) : isHalt ? (
                  <StopCircle className="w-4 h-4" />
                ) : isPassed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                )}
              </div>

              {/* Station Card Box */}
              <div
                className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
                  isTrainHere
                    ? "bg-gradient-to-r from-cyan-950/60 via-rail-850 to-rail-900 border-cyan-500/50 shadow-xl shadow-cyan-950/60 ring-1 ring-cyan-500/30"
                    : isHalt
                    ? "bg-rail-800/90 border-rail-700/90 hover:border-slate-600 shadow-md"
                    : isPassed
                    ? "bg-rail-900/40 border-rail-800/60 opacity-70"
                    : "bg-rail-900/70 border-rail-800"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base sm:text-lg font-extrabold text-white font-sans">
                        {station.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-rail-950 text-cyan-300 border border-rail-700">
                        {station.code}
                      </span>

                      {/* Stoppage Status Badge */}
                      {isHalt ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          <StopCircle className="w-3.5 h-3.5" />
                          {station.code === "MYS"
                            ? "Origin (Departure)"
                            : station.code === "SBC"
                            ? "Terminus (Destination)"
                            : `Commercial Halt · ${haltDwell}m Dwell`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-rail-950/80 text-slate-400 border border-rail-800">
                          <Zap className="w-3 h-3 text-amber-400" />
                          Non-Stop Pass Through (@ {forecast?.allowedSpeedKmph || 110} km/h)
                        </span>
                      )}

                      {isTrainHere && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40 animate-pulse">
                          Train Near Here
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono">
                      <span>KM {station.distanceFromMysKm.toFixed(1)} from Mysuru</span>
                      <span>·</span>
                      <span>{station.platformCount} Platforms</span>
                      {station.hasLoopLine && (
                        <>
                          <span>·</span>
                          <span className="text-cyan-400 font-semibold">
                            Loop Line @ {station.loopSpeedKmph} km/h
                          </span>
                        </>
                      )}
                      {station.commuterSurgeProne && (
                        <>
                          <span>·</span>
                          <span className="text-rose-400 font-semibold">
                            Suburban Commuter Surge Node
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Timing & Dynamic ETA Readout */}
                  {forecast && (
                    <div className="flex items-center gap-4 bg-rail-950/90 px-4 py-2.5 rounded-xl border border-rail-700/80 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono text-slate-400">
                          {isHalt ? "Scheduled" : "Passing Time"}
                        </div>
                        <div className="text-xs sm:text-sm font-mono font-semibold text-slate-300">
                          {forecast.bookedTime}
                        </div>
                      </div>
                      <div className="h-7 w-px bg-rail-800" />
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono text-cyan-400 font-bold">
                          Dynamic ETA
                        </div>
                        <div
                          className={`text-xs sm:text-sm font-mono font-extrabold ${
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
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          +{Math.round(forecast.predictedDelayMin)}m
                        </span>
                      ) : (
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          On Time
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Inter-Station Block Section Track Geometry & PSRs */}
              {section && (
                <div className="ml-2 sm:ml-4 border-l-2 border-dashed border-rail-700/80 pl-4 py-1 space-y-2">
                  <div
                    onClick={() => toggleSection(section.sectionId)}
                    className="group cursor-pointer rounded-xl bg-rail-950/70 hover:bg-rail-800/80 border border-rail-700/70 hover:border-slate-500 p-3.5 transition-all duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <Gauge className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-xs font-bold text-slate-200 group-hover:text-white font-sans">
                          Section {section.sectionId}: {section.fromStationName} ➔ {section.toStationName}
                        </span>
                        <span className="text-xs text-slate-400 ml-2 font-mono">
                          ({section.lengthKm.toFixed(1)} km · Max Speed {section.sanctionedMpsKmph} km/h)
                        </span>
                      </div>
                    </div>

                    {/* Section Factor Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {section.hasPsr && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          Curvature PSR: {section.psrSpeedKmph} km/h
                        </span>
                      )}

                      {section.hasLcGate && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          <ShieldAlert className="w-3 h-3 text-indigo-400" />
                          LC Gate {section.lcGateId}
                        </span>
                      )}

                      {section.commuterSurgeRisk === "HIGH" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          Commuter Surge Risk
                        </span>
                      )}

                      {!section.hasPsr && !section.hasTsr && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          Slack Recovery (-{section.bufferSlackAllocatedMin}m)
                        </span>
                      )}

                      <div className="text-slate-400 group-hover:text-slate-200">
                        {expandedSectionId === section.sectionId ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section Diagnostics Accordion */}
                  {expandedSectionId === section.sectionId && (
                    <div className="p-4 rounded-xl bg-rail-900 border border-rail-700 text-xs space-y-2 animate-slide-down">
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        <Info className="w-4 h-4 text-cyan-400" />
                        Physics &amp; Signal Diagnostics ({section.sectionId}):
                      </div>
                      <ul className="list-disc list-inside text-slate-300 space-y-1.5 font-sans leading-relaxed">
                        <li>
                          <strong className="text-white">Track Geometry:</strong> Sanctioned Maximum Speed is {section.sanctionedMpsKmph} km/h with {section.bufferSlackAllocatedMin} mins timetable recovery buffer.
                        </li>
                        {section.hasPsr && (
                          <li className="text-amber-300">
                            <strong>Permanent Speed Restriction:</strong> Limited to {section.psrSpeedKmph} km/h due to &quot;{section.psrReason}&quot;.
                          </li>
                        )}
                        {section.hasLcGate && (
                          <li className="text-indigo-300">
                            <strong>Level Crossing Gate ({section.lcGateId}):</strong> Interlocked roadway closure with automated signal protection.
                          </li>
                        )}
                        {section.commuterSurgeRisk === "HIGH" && (
                          <li className="text-rose-300">
                            <strong>Suburban Footfall:</strong> High suburban commuter concentration prone to platform dwell extensions during morning &amp; evening peak rush hours.
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
