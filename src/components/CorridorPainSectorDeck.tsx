import React, { useState } from "react";
import { TrainConfig, SectorHotspot, TrainVulnerabilitySector } from "../lib/rail/types";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  Layers,
  MapPin,
  Maximize2,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";

interface CorridorPainSectorDeckProps {
  selectedTrain: TrainConfig;
  hotspotSectors?: SectorHotspot[];
  primaryVulnerability?: TrainVulnerabilitySector;
  onSelectTrain: (trainId: string) => void;
  activeClockMinutes: number;
}

export function CorridorPainSectorDeck({
  selectedTrain,
  hotspotSectors = [],
  primaryVulnerability,
  onSelectTrain,
  activeClockMinutes,
}: CorridorPainSectorDeckProps) {
  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    primaryVulnerability?.primarySectorId || "SECTOR-SBC-THROAT"
  );
  const [sortBy, setSortBy] = useState<"DURATION" | "FREQUENCY">("DURATION");

  const activeSector =
    hotspotSectors.find((s) => s.id === selectedSectorId) || hotspotSectors[0];

  const sortedSectors = [...hotspotSectors].sort((a, b) => {
    if (sortBy === "DURATION") {
      return b.totalCumulativeDelayMin - a.totalCumulativeDelayMin;
    }
    return b.delayFrequencyPct - a.delayFrequencyPct;
  });

  return (
    <div className="bg-surface border border-graphite rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-signal-red/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-graphite pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-signal-red/10 border border-signal-red/30 flex items-center justify-center text-signal-red">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-heading font-bold text-chalk">
                Corridor Bottleneck Sectors (Longest Delay &amp; Recurrence Forensics)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-data font-bold bg-signal-red/15 text-signal-red border border-signal-red/30">
                HISTORICAL FLEET MEMORY
              </span>
            </div>
            <p className="text-xs text-steel font-body">
              Identifies the critical corridor sectors that have delayed all trains for the longest duration and most number of times. Click any train to inspect its sector vulnerability.
            </p>
          </div>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1 bg-surface-raised p-1 rounded-xl border border-graphite self-start sm:self-auto">
          <button
            onClick={() => setSortBy("DURATION")}
            className={`px-3 py-1 rounded-lg text-xs font-data transition-colors ${
              sortBy === "DURATION"
                ? "bg-surface-overlay text-chalk font-semibold border border-chalk/20"
                : "text-steel hover:text-chalk"
            }`}
          >
            Sort: Longest Duration
          </button>
          <button
            onClick={() => setSortBy("FREQUENCY")}
            className={`px-3 py-1 rounded-lg text-xs font-data transition-colors ${
              sortBy === "FREQUENCY"
                ? "bg-surface-overlay text-chalk font-semibold border border-chalk/20"
                : "text-steel hover:text-chalk"
            }`}
          >
            Sort: Most Recurrent (%)
          </button>
        </div>
      </div>

      {/* 1. Selected Train Primary Vulnerability Spotlight */}
      {primaryVulnerability && (
        <div className="bg-gradient-to-r from-signal-red/15 via-surface-raised to-surface border border-signal-red/40 rounded-xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-data font-bold bg-signal-red/20 text-signal-red border border-signal-red/40">
                  ACTIVE TRAIN SECTOR VULNERABILITY
                </span>
                <span className="text-xs font-data text-steel">
                  Service #{selectedTrain.id} ({selectedTrain.name})
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-heading font-bold text-chalk flex items-center gap-2">
                <span>{primaryVulnerability.primarySectorName}</span>
                <span className="text-xs font-data text-signal-cyan font-normal">
                  ({primaryVulnerability.chainageRangeKm})
                </span>
              </h4>
              <p className="text-xs font-body text-chalk-dim leading-relaxed">
                {primaryVulnerability.vulnerabilityReason}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-surface p-3 rounded-lg border border-graphite shrink-0">
              <div className="text-center">
                <div className="text-[10px] font-data text-steel">Historical Recurrence</div>
                <div className="text-sm font-data font-bold text-signal-red mt-0.5">
                  {primaryVulnerability.historicalOccurrenceFrequencyPct}% of runs
                </div>
              </div>
              <div className="w-px h-8 bg-graphite" />
              <div className="text-center">
                <div className="text-[10px] font-data text-steel">Avg Delay Incurred</div>
                <div className="text-sm font-data font-bold text-signal-amber mt-0.5">
                  +{primaryVulnerability.historicalAverageDelayMin} min
                </div>
              </div>
              <div className="w-px h-8 bg-graphite" />
              <div className="text-center">
                <div className="text-[10px] font-data text-steel">ETA Buffer Added</div>
                <div className="text-sm font-data font-bold text-signal-cyan mt-0.5">
                  +{primaryVulnerability.etaBufferAdjustedMin} min
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Hotspot Sector Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sector Navigation List (Left 5 Cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="text-xs font-data font-semibold text-steel uppercase tracking-wider mb-2">
            Top Bottleneck Sectors (Ranked #1 - #{sortedSectors.length})
          </div>

          {sortedSectors.map((sector, idx) => {
            const isSelected = activeSector?.id === sector.id;
            const isTrainVulnerableHere =
              primaryVulnerability?.primarySectorId === sector.id;

            return (
              <div
                key={sector.id}
                onClick={() => setSelectedSectorId(sector.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-surface-overlay border-signal-red/60 ring-1 ring-signal-red/30 shadow-md"
                    : "bg-surface-raised border-graphite hover:border-chalk/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-signal-red/20 text-signal-red text-[11px] font-data font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-heading font-bold text-chalk truncate max-w-[180px] sm:max-w-[220px]">
                      {sector.sectorName}
                    </span>
                  </div>

                  {isTrainVulnerableHere && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-data font-bold bg-signal-amber/20 text-signal-amber border border-signal-amber/40">
                      CURRENT TRAIN
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] font-data text-steel mt-2">
                  <span>{sector.chainageKm}</span>
                  <span className="text-signal-red font-semibold">
                    {sector.totalCumulativeDelayMin}m cumulative
                  </span>
                </div>

                {/* Progress bar of delay frequency */}
                <div className="w-full h-1 bg-graphite/40 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-signal-red rounded-full"
                    style={{ width: `${sector.delayFrequencyPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Sector Deep Dive & Affected Trains List (Right 7 Cols) */}
        {activeSector && (
          <div className="lg:col-span-7 bg-surface-raised border border-graphite rounded-xl p-5 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-graphite pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-data font-bold bg-surface-overlay text-chalk border border-graphite">
                      {activeSector.causeCategory}
                    </span>
                    <span className="text-xs font-data text-steel">{activeSector.chainageKm}</span>
                  </div>
                  <h4 className="text-base font-heading font-bold text-chalk mt-1">
                    {activeSector.sectorName}
                  </h4>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-data text-steel">Speed Cap</div>
                  <div className="text-sm font-data font-bold text-signal-amber">
                    {activeSector.speedCapKmph} km/h
                  </div>
                </div>
              </div>

              {/* Metric Highlights */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface p-3 rounded-lg border border-graphite text-center">
                  <div className="text-[10px] font-data text-steel">Delay Recurrence</div>
                  <div className="text-base font-data font-bold text-signal-red mt-0.5">
                    {activeSector.delayFrequencyPct}%
                  </div>
                  <div className="text-[9px] text-steel">
                    {activeSector.delayedTrainsCount}/{activeSector.totalObservedTrains} trains
                  </div>
                </div>

                <div className="bg-surface p-3 rounded-lg border border-graphite text-center">
                  <div className="text-[10px] font-data text-steel">Avg Delay / Train</div>
                  <div className="text-base font-data font-bold text-signal-amber mt-0.5">
                    +{activeSector.avgDelayPerTrainMin} min
                  </div>
                  <div className="text-[9px] text-steel">per passage</div>
                </div>

                <div className="bg-surface p-3 rounded-lg border border-graphite text-center">
                  <div className="text-[10px] font-data text-steel">Max Detention</div>
                  <div className="text-base font-data font-bold text-signal-red mt-0.5">
                    {activeSector.maxSingleDetentionMin} min
                  </div>
                  <div className="text-[9px] text-steel">single hold</div>
                </div>
              </div>

              {/* Primary Root Cause */}
              <div className="p-3 bg-surface rounded-lg border border-graphite space-y-1">
                <div className="text-[10px] font-data text-steel font-bold uppercase tracking-wider">
                  PRIMARY BOTTLENECK MECHANISM
                </div>
                <p className="text-xs font-body text-chalk-dim leading-relaxed">
                  {activeSector.primaryCause}
                </p>
              </div>

              {/* Affected Trains Breakdown */}
              <div className="space-y-2.5">
                <div className="text-xs font-data font-semibold text-chalk flex items-center justify-between">
                  <span>Most Delayed Trains in this Sector (Click to Open Train &amp; Sector):</span>
                  <span className="text-[10px] text-steel">Select service</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeSector.affectedTrainsList.map((trainRec) => {
                    const isCurrent = selectedTrain.id === trainRec.trainId;

                    return (
                      <div
                        key={trainRec.trainId}
                        onClick={() => onSelectTrain(trainRec.trainId)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-signal-cyan/10 border-signal-cyan/50 text-chalk"
                            : "bg-surface border-graphite hover:border-chalk/30 text-chalk-dim hover:text-chalk"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-data font-bold shrink-0 ${
                              isCurrent
                                ? "bg-signal-cyan/20 text-signal-cyan"
                                : "bg-surface-raised text-steel"
                            }`}
                          >
                            #{trainRec.trainId}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-heading font-bold text-chalk truncate">
                              {trainRec.trainName}
                            </div>
                            <div className="text-[10px] text-steel truncate">
                              {trainRec.vulnerabilityReason}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-data font-bold text-signal-amber">
                              +{trainRec.avgHistoricalDelayMin}m avg
                            </div>
                            <div className="text-[9px] text-steel font-data">
                              Max {trainRec.maxDetentionMin}m
                            </div>
                          </div>

                          <div className="w-6 h-6 rounded-md bg-surface-raised flex items-center justify-center text-steel hover:text-chalk">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mitigation Strategy Footer */}
            <div className="pt-3 border-t border-graphite flex items-center justify-between text-[11px] font-data text-steel">
              <span className="truncate max-w-md">
                <span className="font-semibold text-chalk">Mitigation: </span>
                {activeSector.mitigationStrategy}
              </span>
              <span className="text-signal-green flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sector Monitored
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
