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
  ArrowDown,
  Train,
  Layers,
  Check,
} from "lucide-react";

interface CorridorPhysicalSpineProps {
  prediction: DynamicPredictionResult;
  selectedTrain: TrainConfig;
}

export function CorridorPhysicalSpine({
  prediction,
  selectedTrain,
}: CorridorPhysicalSpineProps) {
  // Default filter mode to STOPS_ONLY so it only shows the stops that the train takes
  const [filterMode, setFilterMode] = useState<"STOPS_ONLY" | "ALL" | "DELAYS_ONLY">("STOPS_ONLY");
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [expandedLegIdx, setExpandedLegIdx] = useState<number | null>(null);

  const trainLocKm = selectedTrain.currentLocationKm;
  const allStations = SWR_CORRIDOR_STATIONS;
  const totalScheduledStopsCount = selectedTrain.scheduledStops.length;

  const toggleSection = (id: string) => {
    setExpandedSectionId((prev) => (prev === id ? null : id));
  };

  const toggleLeg = (idx: number) => {
    setExpandedLegIdx((prev) => (prev === idx ? null : idx));
  };

  // Scheduled stop stations for this train
  const scheduledStations = allStations.filter((s) =>
    selectedTrain.scheduledStops.includes(s.code)
  );

  // Stations to display based on filter mode
  const displayedStations =
    filterMode === "STOPS_ONLY"
      ? scheduledStations
      : allStations;

  return (
    <div className="bg-surface border border-graphite rounded-xl p-5 space-y-5">
      {/* Header & Filter Deck */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-graphite">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-heading font-semibold text-chalk">
              Corridor Physical Track Spine &amp; Live Location Tracking
            </h2>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-xs font-data font-semibold bg-signal-green/10 text-signal-green border border-signal-green/30">
              {totalScheduledStopsCount} Scheduled Commercial Halts
            </span>
          </div>
          <p className="text-sm font-body text-steel mt-1">
            {filterMode === "STOPS_ONLY"
              ? `Showing itinerary for ${selectedTrain.name} (${selectedTrain.id}) · Origin to Terminus`
              : "Official SWR Double-Electrified Track (138.25 km) · Live section-by-section delay factor propagation"}
          </p>
        </div>

        {/* Filter Toggle Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterMode("STOPS_ONLY")}
            className={`rounded-lg px-3 py-1.5 text-sm font-body transition-all duration-200 flex items-center gap-1.5 ${
              filterMode === "STOPS_ONLY"
                ? "bg-signal-green/20 text-signal-green font-semibold border border-signal-green/40 shadow-sm"
                : "bg-surface-raised text-steel hover:text-chalk border border-graphite"
            }`}
          >
            <StopCircle className="w-3.5 h-3.5" />
            <span>Train Stops Only ({totalScheduledStopsCount})</span>
          </button>
          <button
            onClick={() => setFilterMode("ALL")}
            className={`rounded-lg px-3 py-1.5 text-sm font-body transition-all duration-200 ${
              filterMode === "ALL"
                ? "bg-surface-overlay text-chalk font-semibold border border-graphite-light"
                : "bg-surface-raised text-steel hover:text-chalk border border-graphite"
            }`}
          >
            All 17 Corridor Stations
          </button>
          <button
            onClick={() => setFilterMode("DELAYS_ONLY")}
            className={`rounded-lg px-3 py-1.5 text-sm font-body transition-all duration-200 ${
              filterMode === "DELAYS_ONLY"
                ? "bg-surface-overlay text-chalk font-semibold border border-graphite-light"
                : "bg-surface-raised text-steel hover:text-chalk border border-graphite"
            }`}
          >
            Bottlenecks Only
          </button>
        </div>
      </div>

      {/* Main Track Timeline Spine */}
      <div className="relative pl-6 sm:pl-9 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-graphite-light">
        {displayedStations.map((station, stopIndex) => {
          const forecast = prediction.stationBreakdown.find((f) => f.code === station.code);
          const nextStation = displayedStations[stopIndex + 1];
          const nextForecast = nextStation
            ? prediction.stationBreakdown.find((f) => f.code === nextStation.code)
            : null;

          // Determine halts and dwell
          const isHalt = selectedTrain.scheduledStops.includes(station.code);
          const haltDwell =
            selectedTrain.dwellMinutes?.[station.code] ??
            (isHalt && station.code !== "MYS" && station.code !== "SBC" ? 2 : 0);

          // EXACT STATUS LOGIC:
          // 1. isPassed: Train has departed past this station's KM marker (> stationKm + 1.2km)
          // 2. isAtStation: Train is currently within station boundary (within ±1.2km)
          // 3. isInTransitToNext: Train is currently running on the track between this station and the next station
          const isPassed = trainLocKm > station.distanceFromMysKm + 1.2;
          const isAtStation = Math.abs(trainLocKm - station.distanceFromMysKm) <= 1.2;
          const isInTransitToNext =
            Boolean(nextStation) &&
            trainLocKm > station.distanceFromMysKm + 1.2 &&
            trainLocKm < (nextStation?.distanceFromMysKm ?? 999) - 1.2;

          // Aggregated leg metrics between this stop and next stop
          let intermediateSections: CorridorSectionRecord[] = [];
          let intermediateSkippedStations: typeof allStations = [];
          let legDistanceKm = 0;
          let legHasPsr = false;
          let legHasTsr = false;
          let legHasLcGate = false;
          let legCommuterRisk = false;
          let legBufferSlackMin = 0;

          if (nextStation) {
            legDistanceKm = nextStation.distanceFromMysKm - station.distanceFromMysKm;

            intermediateSections = CORRIDOR_SECTIONS.filter(
              (sec) =>
                sec.startKm >= station.distanceFromMysKm - 0.2 &&
                sec.endKm <= nextStation.distanceFromMysKm + 0.2
            );

            intermediateSkippedStations = allStations.filter(
              (s) =>
                s.distanceFromMysKm > station.distanceFromMysKm + 0.1 &&
                s.distanceFromMysKm < nextStation.distanceFromMysKm - 0.1
            );

            legHasPsr = intermediateSections.some((s) => s.hasPsr);
            legHasTsr = intermediateSections.some((s) => s.hasTsr);
            legHasLcGate = intermediateSections.some((s) => s.hasLcGate);
            legCommuterRisk = intermediateSections.some((s) => s.commuterSurgeRisk === "HIGH");
            legBufferSlackMin = intermediateSections.reduce(
              (sum, s) => sum + (s.bufferSlackAllocatedMin || 0),
              0
            );
          }

          if (filterMode === "DELAYS_ONLY") {
            const hasAnyBottleneck = legHasPsr || legHasTsr || legHasLcGate || legCommuterRisk;
            if (!hasAnyBottleneck && !isAtStation && !isInTransitToNext && stopIndex !== 0 && stopIndex !== displayedStations.length - 1) {
              return null;
            }
          }

          return (
            <div key={station.code} className="relative space-y-4 animate-fade-in">
              {/* Station Physical Track Node Marker */}
              <div
                className={`absolute -left-6 sm:-left-9 top-3 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isAtStation
                    ? "bg-signal-green border-signal-green text-ink z-20 shadow-lg shadow-signal-green/30 animate-pulse"
                    : isPassed
                    ? "bg-surface-raised border-graphite text-steel z-10"
                    : isHalt
                    ? "bg-surface-overlay border-chalk-dim text-chalk z-10"
                    : "bg-surface border-graphite text-steel"
                }`}
              >
                {isAtStation ? (
                  <Train className="w-4 h-4 text-ink stroke-[2.4]" />
                ) : isPassed ? (
                  <Check className="w-4 h-4 text-signal-green stroke-[2.5]" />
                ) : isHalt ? (
                  <span className="font-data text-[10px] font-bold text-chalk">
                    {stopIndex + 1}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-steel" />
                )}
              </div>

              {/* Station Card Box */}
              <div
                className={`transition-all duration-200 ${
                  isAtStation
                    ? "bg-surface-raised border-l-4 border-signal-green rounded-xl p-4 shadow-lg ring-1 ring-signal-green/30"
                    : isPassed
                    ? "bg-surface/60 border border-graphite/60 rounded-xl p-4 opacity-75"
                    : isHalt
                    ? "bg-surface border border-graphite rounded-xl p-4 hover:border-graphite-light"
                    : "bg-surface border border-graphite rounded-xl p-4"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-base font-heading font-semibold ${isPassed ? "text-chalk-dim" : "text-chalk"}`}>
                        {station.name}
                      </span>
                      <span className="font-data text-xs text-steel bg-surface-raised px-1.5 py-0.5 rounded border border-graphite">
                        {station.code}
                      </span>

                      {/* Stoppage Status Badge */}
                      {isHalt ? (
                        <span
                          className={`text-xs font-body px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            station.code === "MYS"
                              ? "bg-signal-green/10 text-signal-green border border-signal-green/30"
                              : station.code === "SBC"
                              ? "bg-signal-amber/10 text-signal-amber border border-signal-amber/30"
                              : "bg-surface-overlay text-chalk-dim border border-graphite-light"
                          }`}
                        >
                          <StopCircle className="w-3.5 h-3.5" />
                          {station.code === "MYS"
                            ? "Origin (Departure Station)"
                            : station.code === "SBC"
                            ? "Terminus (Final Destination)"
                            : `Stop #${stopIndex + 1} · ${haltDwell}m Commercial Halt`}
                        </span>
                      ) : (
                        <span className="text-xs font-body text-steel flex items-center gap-1">
                          <Zap className="w-3 h-3 text-steel" />
                          Non-Stop Pass Through (@ {forecast?.allowedSpeedKmph || 110} km/h)
                        </span>
                      )}

                      {/* Station Live Operating Status Pill */}
                      {isAtStation ? (
                        <span className="text-xs font-data font-semibold text-signal-green flex items-center gap-1 bg-signal-green/20 px-2.5 py-0.5 rounded-full border border-signal-green/40 shadow-sm animate-pulse">
                          <Train className="w-3.5 h-3.5" />
                          CURRENT LOCATION · Berthed at Platform (KM {trainLocKm.toFixed(1)})
                        </span>
                      ) : isPassed ? (
                        <span className="text-xs font-data text-steel flex items-center gap-1 bg-surface-raised px-2 py-0.5 rounded border border-graphite">
                          <CheckCircle2 className="w-3.5 h-3.5 text-signal-green" />
                          Cleared &amp; Departed
                        </span>
                      ) : null}
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
                    <div className="flex items-center gap-4 bg-surface-raised rounded-lg px-3.5 py-2 border border-graphite shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-body text-steel">
                          {isPassed ? "Scheduled" : isHalt ? "Scheduled" : "Booked Passing"}
                        </div>
                        <div className="font-data text-sm text-chalk font-semibold">
                          {forecast.bookedTime}
                        </div>
                      </div>
                      <div className="h-7 w-px bg-graphite" />
                      <div className="text-right">
                        <div className="text-xs font-body text-steel">
                          {isPassed ? "Actual Departed" : isAtStation ? "Current Time" : "Predicted ETA"}
                        </div>
                        <div
                          className={`font-data text-sm font-bold ${
                            isPassed
                              ? "text-chalk"
                              : forecast.predictedDelayMin > 3
                              ? "text-signal-red"
                              : forecast.predictedDelayMin > 0
                              ? "text-signal-amber"
                              : "text-signal-green"
                          }`}
                        >
                          {forecast.predictedTime}
                        </div>
                      </div>
                      {isPassed ? (
                        <span className="font-data text-xs text-steel bg-surface px-1.5 py-0.5 rounded border border-graphite">
                          ✓ Passed
                        </span>
                      ) : forecast.predictedDelayMin > 0 ? (
                        <span className="font-data text-xs text-signal-amber bg-signal-amber/10 px-1.5 py-0.5 rounded border border-signal-amber/30">
                          +{Math.round(forecast.predictedDelayMin)}m
                        </span>
                      ) : (
                        <span className="font-data text-xs text-signal-green bg-signal-green/10 px-1.5 py-0.5 rounded border border-signal-green/30">
                          On Time
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Inter-Stop Transit Leg & Live Progress Bar */}
              {nextStation && (
                <div className="ml-2 sm:ml-4 border-l-2 border-dashed border-graphite-light pl-4 py-1 space-y-2.5">
                  
                  {/* LIVE ACTIVE TRANSIT BEACON (When train is actively on this leg) */}
                  {isInTransitToNext && (
                    <div className="p-3 rounded-xl bg-signal-green/10 border-2 border-signal-green/50 shadow-md shadow-signal-green/10 animate-fade-in flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-signal-green text-ink flex items-center justify-center font-bold animate-pulse">
                          <Train className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-data font-bold text-signal-green flex items-center gap-2">
                            <span>TRAIN IN ACTIVE TRANSIT</span>
                            <span className="bg-signal-green/20 px-1.5 py-0.2 rounded text-[10px] text-chalk">
                              KM {trainLocKm.toFixed(1)} · {selectedTrain.currentSpeedKmph} km/h
                            </span>
                          </div>
                          <p className="text-xs font-body text-chalk mt-0.5">
                            Approaching <strong className="text-chalk font-semibold">{nextStation.name}</strong> ({nextStation.code}) in{" "}
                            <span className="font-data font-bold text-signal-amber">
                              {(nextStation.distanceFromMysKm - trainLocKm).toFixed(1)} km
                            </span>
                          </p>
                        </div>
                      </div>

                      {nextForecast && (
                        <div className="text-right bg-surface px-3 py-1.5 rounded-lg border border-graphite shrink-0">
                          <div className="text-[10px] text-steel font-data uppercase">Next Stop ETA</div>
                          <div className="text-sm font-data font-bold text-signal-green">
                            {nextForecast.predictedTime}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Leg Header Bar */}
                  <div
                    onClick={() => toggleLeg(stopIndex)}
                    className={`group cursor-pointer border rounded-lg p-3 transition-all duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 ${
                      isInTransitToNext
                        ? "bg-surface-overlay border-signal-green/40 ring-1 ring-signal-green/20"
                        : "bg-surface-raised hover:bg-surface-overlay border-graphite"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Gauge className="w-4 h-4 text-steel group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-sm font-heading font-semibold text-chalk">
                          Leg #{stopIndex + 1}: {station.name} ➔ {nextStation.name}
                        </span>
                        <span className="text-xs font-body text-steel ml-2">
                          (<span className="font-data">{legDistanceKm.toFixed(1)}</span> km
                          {intermediateSkippedStations.length > 0 && (
                            <> · <span className="font-data">{intermediateSkippedStations.length}</span> bypassed stations</>
                          )})
                        </span>
                      </div>
                    </div>

                    {/* Leg Factor Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {legHasPsr && (
                        <span className="flex items-center gap-1 text-xs font-data text-signal-amber bg-signal-amber/10 px-2 py-0.5 rounded border border-signal-amber/20">
                          <AlertTriangle className="w-3 h-3" />
                          Curvature PSR Active
                        </span>
                      )}

                      {legHasLcGate && (
                        <span className="flex items-center gap-1 text-xs font-data text-steel-light bg-surface-overlay px-2 py-0.5 rounded border border-graphite">
                          <ShieldAlert className="w-3 h-3" />
                          LC Gates En-Route
                        </span>
                      )}

                      {legCommuterRisk && (
                        <span className="flex items-center gap-1 text-xs font-data text-signal-red bg-signal-red/10 px-2 py-0.5 rounded border border-signal-red/20">
                          Commuter Surge Risk
                        </span>
                      )}

                      {legBufferSlackMin > 0 && (
                        <span className="flex items-center gap-1 text-xs font-data text-signal-green bg-signal-green/10 px-2 py-0.5 rounded border border-signal-green/20">
                          <Sparkles className="w-3 h-3" />
                          Slack Buffer (-{legBufferSlackMin.toFixed(1)}m)
                        </span>
                      )}

                      <div className="text-steel group-hover:text-chalk">
                        {expandedLegIdx === stopIndex ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Leg Diagnostics Accordion */}
                  {expandedLegIdx === stopIndex && (
                    <div className="bg-surface rounded-lg border border-graphite p-4 text-sm font-body text-chalk-dim space-y-3 animate-fade-in">
                      <div className="font-semibold text-chalk flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-steel" />
                          Track Geometry &amp; Intermediate Passing Stations ({station.code} to {nextStation.code}):
                        </span>
                        <span className="text-xs font-data text-steel">
                          {legDistanceKm.toFixed(1)} km total leg distance
                        </span>
                      </div>

                      {/* Intermediate Skipped Stations List */}
                      {intermediateSkippedStations.length > 0 && (
                        <div className="bg-surface-raised rounded-lg p-3 border border-graphite space-y-1.5">
                          <div className="text-xs font-data text-steel flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-steel" />
                            <span>{intermediateSkippedStations.length} Intermediate Non-Stop Pass-Through Stations:</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {intermediateSkippedStations.map((skip) => {
                              const isSkipPassed = trainLocKm > skip.distanceFromMysKm;
                              return (
                                <span
                                  key={skip.code}
                                  className={`text-xs font-data px-2 py-0.5 rounded border ${
                                    isSkipPassed
                                      ? "bg-surface text-steel border-graphite line-through opacity-70"
                                      : "bg-surface text-chalk border-graphite"
                                  }`}
                                >
                                  {skip.name} ({skip.code}) · KM {skip.distanceFromMysKm.toFixed(1)}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Inter-Station Block Sections Breakdown */}
                      {intermediateSections.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-data text-steel">
                            Block Sections &amp; Track Constraints:
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {intermediateSections.map((sec) => (
                              <div
                                key={sec.sectionId}
                                className="p-2.5 rounded-lg bg-surface-raised border border-graphite text-xs space-y-1"
                              >
                                <div className="font-semibold text-chalk flex items-center justify-between">
                                  <span>{sec.sectionId}: {sec.fromStationName} ➔ {sec.toStationName}</span>
                                  <span className="font-data text-steel">{sec.lengthKm} km</span>
                                </div>
                                <div className="text-steel flex flex-wrap items-center gap-2">
                                  <span>MPS: <span className="font-data text-chalk">{sec.sanctionedMpsKmph} km/h</span></span>
                                  <span>·</span>
                                  <span>Slack: <span className="font-data text-signal-green">-{sec.bufferSlackAllocatedMin}m</span></span>
                                </div>
                                {sec.hasPsr && (
                                  <div className="text-signal-amber font-data">
                                    ⚠️ PSR: {sec.psrSpeedKmph} km/h ({sec.psrReason})
                                  </div>
                                )}
                                {sec.hasLcGate && (
                                  <div className="text-steel-light font-data">
                                    🚦 Interlocked LC Gate {sec.lcGateId}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
