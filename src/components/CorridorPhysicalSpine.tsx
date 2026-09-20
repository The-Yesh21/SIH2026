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
    <div className="bg-surface border border-graphite rounded-xl p-5 space-y-5">
      {/* Header & Filter Deck */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-graphite">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-heading font-semibold text-chalk">
              Corridor Physical Track Spine &amp; Section Delay Diagnostics
            </h2>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-xs font-data font-semibold bg-surface-raised text-steel border border-graphite-light">
              {totalScheduledStopsCount} Commercial Halts
            </span>
          </div>
          <p className="text-sm font-body text-steel mt-1">
            Official SWR Double-Electrified Track (138.25 km) · Predicted section-by-section delay factor propagation &amp; infrastructure analysis
          </p>
        </div>

        {/* Filter Toggle Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterMode("ALL")}
            className={`rounded-lg px-3 py-1.5 text-sm font-body transition-all duration-200 ${
              filterMode === "ALL"
                ? "bg-surface-overlay text-chalk font-semibold"
                : "bg-surface-raised text-steel hover:text-chalk"
            }`}
          >
            All 17 Stations
          </button>
          <button
            onClick={() => setFilterMode("STOPS_ONLY")}
            className={`rounded-lg px-3 py-1.5 text-sm font-body transition-all duration-200 ${
              filterMode === "STOPS_ONLY"
                ? "bg-surface-overlay text-chalk font-semibold"
                : "bg-surface-raised text-steel hover:text-chalk"
            }`}
          >
            Scheduled Halts ({totalScheduledStopsCount})
          </button>
          <button
            onClick={() => setFilterMode("DELAYS_ONLY")}
            className={`rounded-lg px-3 py-1.5 text-sm font-body transition-all duration-200 ${
              filterMode === "DELAYS_ONLY"
                ? "bg-surface-overlay text-chalk font-semibold"
                : "bg-surface-raised text-steel hover:text-chalk"
            }`}
          >
            Bottlenecks Only
          </button>
        </div>
      </div>

      {/* Main Track Timeline Spine */}
      <div className="relative pl-6 sm:pl-9 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-graphite-light">
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
                    ? "bg-signal-green border-signal-green text-ink z-10"
                    : isHalt
                    ? "bg-surface-overlay border-chalk-dim text-chalk"
                    : isPassed
                    ? "bg-graphite border-graphite text-steel"
                    : "bg-surface border-graphite text-steel"
                }`}
              >
                {isTrainHere ? (
                  <Navigation2 className="w-4 h-4 fill-current" />
                ) : isHalt ? (
                  <StopCircle className="w-4 h-4" />
                ) : isPassed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-steel" />
                )}
              </div>

              {/* Station Card Box */}
              <div
                className={`transition-all duration-200 ${
                  isTrainHere
                    ? "bg-surface-raised border-l-3 border-signal-green rounded-xl p-4"
                    : isHalt
                    ? "bg-surface border border-graphite rounded-xl p-4 hover:border-graphite-light"
                    : isPassed
                    ? "bg-surface/50 border border-graphite rounded-xl p-4 opacity-60"
                    : "bg-surface border border-graphite rounded-xl p-4"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-heading font-semibold text-chalk">
                        {station.name}
                      </span>
                      <span className="font-data text-xs text-steel bg-surface-raised px-1.5 py-0.5 rounded">
                        {station.code}
                      </span>

                      {/* Stoppage Status Badge */}
                      {isHalt ? (
                        <span className="text-xs font-body text-chalk-dim flex items-center gap-1">
                          <StopCircle className="w-3.5 h-3.5" />
                          {station.code === "MYS"
                            ? "Origin (Departure)"
                            : station.code === "SBC"
                            ? "Terminus (Destination)"
                            : `Commercial Halt · ${haltDwell}m Dwell`}
                        </span>
                      ) : (
                        <span className="text-xs font-body text-steel flex items-center gap-1">
                          <Zap className="w-3 h-3 text-steel" />
                          Non-Stop Pass Through (@ {forecast?.allowedSpeedKmph || 110} km/h)
                        </span>
                      )}

                      {isTrainHere && (
                        <span className="text-xs font-data font-semibold text-signal-green">
                          Train Near Here
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-body text-steel mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span>KM <span className="font-data">{station.distanceFromMysKm.toFixed(1)}</span> from Mysuru</span>
                      <span>·</span>
                      <span><span className="font-data">{station.platformCount}</span> Platforms</span>
                      {station.hasLoopLine && (
                        <>
                          <span>·</span>
                          <span>
                            Loop Line @ <span className="font-data">{station.loopSpeedKmph}</span> km/h
                          </span>
                        </>
                      )}
                      {station.commuterSurgeProne && (
                        <>
                          <span>·</span>
                          <span className="text-signal-amber font-semibold">
                            Suburban Commuter Surge Node
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Timing & Predicted ETA Readout */}
                  {forecast && (
                    <div className="flex items-center gap-4 bg-surface-raised rounded-lg px-3 py-2 border border-graphite shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-body text-steel">
                          {isHalt ? "Scheduled" : "Passing Time"}
                        </div>
                        <div className="font-data text-sm text-chalk">
                          {forecast.bookedTime}
                        </div>
                      </div>
                      <div className="h-7 w-px bg-graphite" />
                      <div className="text-right">
                        <div className="text-xs font-body text-steel">
                          Predicted ETA
                        </div>
                        <div
                          className={`font-data text-sm ${
                            forecast.predictedDelayMin > 3
                              ? "text-signal-red"
                              : forecast.predictedDelayMin > 0
                              ? "text-signal-amber"
                              : "text-signal-green"
                          }`}
                        >
                          {forecast.predictedTime}
                        </div>
                      </div>
                      {forecast.predictedDelayMin > 0 ? (
                        <span className="font-data text-xs text-signal-amber">
                          +{Math.round(forecast.predictedDelayMin)}m
                        </span>
                      ) : (
                        <span className="font-data text-xs text-signal-green">
                          On Time
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Inter-Station Block Section Track Geometry & PSRs */}
              {section && (
                <div className="ml-2 sm:ml-4 border-l-2 border-dashed border-graphite-light pl-4 py-1 space-y-2">
                  <div
                    onClick={() => toggleSection(section.sectionId)}
                    className="group cursor-pointer bg-surface-raised hover:bg-surface-overlay border border-graphite rounded-lg p-3 transition-all duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <Gauge className="w-4 h-4 text-steel group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-sm font-heading font-semibold text-chalk">
                          Section {section.sectionId}: {section.fromStationName} ➔ {section.toStationName}
                        </span>
                        <span className="text-xs font-body text-steel ml-2">
                          (<span className="font-data">{section.lengthKm.toFixed(1)}</span> km · Max Speed <span className="font-data">{section.sanctionedMpsKmph}</span> km/h)
                        </span>
                      </div>
                    </div>

                    {/* Section Factor Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {section.hasPsr && (
                        <span className="flex items-center gap-1 text-xs font-data text-signal-amber">
                          <AlertTriangle className="w-3 h-3" />
                          Curvature PSR: {section.psrSpeedKmph} km/h
                        </span>
                      )}

                      {section.hasLcGate && (
                        <span className="flex items-center gap-1 text-xs font-data text-steel-light">
                          <ShieldAlert className="w-3 h-3" />
                          LC Gate {section.lcGateId}
                        </span>
                      )}

                      {section.commuterSurgeRisk === "HIGH" && (
                        <span className="flex items-center gap-1 text-xs font-data text-signal-red">
                          Commuter Surge Risk
                        </span>
                      )}

                      {!section.hasPsr && !section.hasTsr && (
                        <span className="flex items-center gap-1 text-xs font-data text-signal-green">
                          <Sparkles className="w-3 h-3" />
                          Slack Recovery (-{section.bufferSlackAllocatedMin}m)
                        </span>
                      )}

                      <div className="text-steel group-hover:text-chalk">
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
                    <div className="bg-surface rounded-lg border border-graphite p-4 text-sm font-body text-chalk-dim space-y-2 animate-fade-in">
                      <div className="font-semibold text-chalk flex items-center gap-2">
                        <Info className="w-4 h-4 text-steel" />
                        Physics &amp; Signal Diagnostics ({section.sectionId}):
                      </div>
                      <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
                        <li>
                          <strong className="text-chalk">Track Geometry:</strong> Sanctioned Maximum Speed is <span className="font-data">{section.sanctionedMpsKmph}</span> km/h with <span className="font-data">{section.bufferSlackAllocatedMin}</span> mins timetable recovery buffer.
                        </li>
                        {section.hasPsr && (
                          <li className="text-signal-amber">
                            <strong>Permanent Speed Restriction:</strong> Limited to <span className="font-data">{section.psrSpeedKmph}</span> km/h due to "{section.psrReason}".
                          </li>
                        )}
                        {section.hasLcGate && (
                          <li className="text-steel-light">
                            <strong>Level Crossing Gate ({section.lcGateId}):</strong> Interlocked roadway closure with automated signal protection.
                          </li>
                        )}
                        {section.commuterSurgeRisk === "HIGH" && (
                          <li className="text-signal-red">
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
