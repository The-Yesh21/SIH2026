import React, { useState } from "react";
import { TrainConfig } from "../lib/rail/types";
import { EnvironmentalConditions } from "../lib/rail/restrictions";
import { evaluateTrainRecoveryCapability, TRACTIVE_PROFILES } from "../lib/rail/recoveryIntelligence";
import { analyzeCorridorPainFactors, IdentifiedPainIncident, PainFactorType } from "../lib/rail/painFactorEngine";
import { ALL_CORRIDOR_FLEET } from "../lib/rail/timeResolver";
import { PRIORITY_TIERS } from "../lib/rail/dispatching";
import {
  Zap,
  ShieldAlert,
  Flame,
  Clock,
  Gauge,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  GitCommit,
  Radio,
  Sparkles,
  RefreshCw,
  Droplets,
  Cpu,
  Activity,
} from "lucide-react";

interface PainFactorIntelligenceDeckProps {
  selectedTrain: TrainConfig;
  environment: EnvironmentalConditions;
  injectedDelay: number;
  activeClockMinutes: number;
  onSelectTrain?: (trainId: string) => void;
}

export function PainFactorIntelligenceDeck({
  selectedTrain,
  environment,
  injectedDelay,
  activeClockMinutes,
  onSelectTrain,
}: PainFactorIntelligenceDeckProps) {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "UNSCHEDULED" | "TRACTION" | "SPEED" | "THROAT_WATERING">("ALL");

  // 1. Compute dynamic recovery capability for active train
  const recovery = evaluateTrainRecoveryCapability({
    train: selectedTrain,
    injectedDelayMin: injectedDelay,
    environment,
  });

  // 2. Deep corridor pain factor inspection
  const painAnalysis = analyzeCorridorPainFactors({
    train: selectedTrain,
    injectedDelayMin: injectedDelay,
    environment,
    activeClockMinutes,
  });

  // 3. Compute recovery assessments for the entire corridor fleet for comparative analysis
  const fleetAssessments = ALL_CORRIDOR_FLEET.map((t) => {
    const tRecovery = evaluateTrainRecoveryCapability({
      train: t,
      injectedDelayMin: t.id === selectedTrain.id ? injectedDelay : 0,
      environment,
    });
    const tPain = analyzeCorridorPainFactors({
      train: t,
      injectedDelayMin: t.id === selectedTrain.id ? injectedDelay : 0,
      environment,
      activeClockMinutes,
    });
    return {
      train: t,
      recovery: tRecovery,
      pain: tPain,
    };
  });

  const filteredIncidents = painAnalysis.incidents.filter((inc) => {
    if (filterType === "UNSCHEDULED") return inc.type === "UNSCHEDULED_LOOP_HOLD";
    if (filterType === "TRACTION") return inc.type === "OHE_VOLTAGE_SAG" || inc.type === "WET_RAIL_ADHESION_SLIP";
    if (filterType === "SPEED") return inc.type === "TSR_CAUTION_SLOWDOWN" || inc.type === "PSR_CURVE_GRADIENT_CAP";
    if (filterType === "THROAT_WATERING")
      return (
        inc.type === "TERMINAL_THROAT_CHOKE" ||
        inc.type === "WATERING_SANITATION_BLEED" ||
        inc.type === "LC_ROAD_TRAFFIC_JAM" ||
        inc.type === "WILD_HOTBOX_INSPECTION"
      );
    return true;
  });

  const activeIncident =
    painAnalysis.incidents.find((i) => i.id === selectedIncidentId) || painAnalysis.incidents[0];

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-graphite pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-data font-bold bg-signal-amber/15 text-signal-amber border border-signal-amber/30">
              Kinematic Physics &amp; Pain Diagnostics
            </span>
            <span className="text-xs font-data text-steel">
              SWR Mysuru–Bengaluru Corridor (138.25 km)
            </span>
          </div>
          <h2 className="text-xl font-heading font-bold text-chalk mt-1 flex items-center gap-2">
            <Flame className="w-5 h-5 text-signal-red" />
            Delay Pain Factors &amp; Recovery Confidence Intelligence
          </h2>
          <p className="text-xs text-steel mt-0.5">
            Real-time attribution of unscheduled station loop stabling, OHE voltage sags, wet-rail slip, and SBC terminal throat bottlenecks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] uppercase font-data text-steel block">Active Rake</span>
            <span className="text-xs font-data font-bold text-chalk">
              {selectedTrain.id} · {selectedTrain.name}
            </span>
          </div>
        </div>
      </div>

      {/* TOP ROW: DUAL COCKPIT CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* CARD 1: RECOVERY CONFIDENCE & PACE CAPABILITY (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-graphite bg-surface-card p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-data uppercase tracking-wider text-steel font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-signal-green" />
              Kinematic Recovery Confidence
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-data font-bold ${
                recovery.confidenceTier === "HIGH_CONFIDENCE_RECOVERY"
                  ? "bg-signal-green/20 text-signal-green border border-signal-green/40"
                  : recovery.confidenceTier === "MODERATE_RECOVERY"
                  ? "bg-signal-amber/20 text-signal-amber border border-signal-amber/40"
                  : recovery.confidenceTier === "MARGINAL_RECOVERY"
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                  : "bg-signal-red/20 text-signal-red border border-signal-red/40"
              }`}
            >
              {recovery.confidenceTier.replace(/_/g, " ")}
            </span>
          </div>

          {/* Large Confidence Radial & Net Slack Math */}
          <div className="flex items-center gap-4 bg-surface-raised p-4 rounded-xl border border-graphite">
            <div className="relative flex items-center justify-center w-20 h-20 flex-shrink-0">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-graphite"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeDasharray={213.6}
                  strokeDashoffset={213.6 - (213.6 * recovery.recoveryConfidenceScore) / 100}
                  className={`${
                    recovery.recoveryConfidenceScore >= 75
                      ? "text-signal-green"
                      : recovery.recoveryConfidenceScore >= 45
                      ? "text-signal-amber"
                      : "text-signal-red"
                  } transition-all duration-1000 ease-out`}
                  fill="transparent"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-heading font-black text-chalk">
                  {recovery.recoveryConfidenceScore}%
                </span>
                <span className="text-[9px] font-data uppercase text-steel">Score</span>
              </div>
            </div>

            <div className="space-y-1 text-xs font-data flex-1">
              <div className="flex justify-between items-center">
                <span className="text-steel">Current Delay:</span>
                <span className="font-bold text-signal-red">+{recovery.currentDelayMin} min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-steel">Max Kinematic Recovery:</span>
                <span className="font-bold text-signal-green">-{recovery.maxKinematicRecoverableMin} min</span>
              </div>
              <div className="flex justify-between items-center border-t border-graphite pt-1">
                <span className="text-chalk font-semibold">Predicted Arrival Delay:</span>
                <span
                  className={`font-black ${
                    recovery.projectedTerminalDelayMin === 0
                      ? "text-signal-green"
                      : "text-signal-amber"
                  }`}
                >
                  {recovery.projectedTerminalDelayMin === 0
                    ? "0 min (ON TIME)"
                    : `+${recovery.projectedTerminalDelayMin} min`}
                </span>
              </div>
            </div>
          </div>

          {/* Qualitative Verdict Box */}
          <div className="p-3 rounded-xl bg-ink/70 border border-graphite text-xs">
            <div className="text-[10px] font-data uppercase text-steel font-bold mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-signal-amber" />
              Dynamic Recovery Verdict
            </div>
            <p className="text-chalk leading-relaxed font-sans">{recovery.recoveryVerdict}</p>
          </div>

          {/* Tractive Physics Spec Grid */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-data">
            <div className="p-2.5 rounded-lg bg-surface-raised border border-graphite">
              <div className="text-[10px] text-steel">Acceleration</div>
              <div className="text-sm font-bold text-chalk mt-0.5">
                {recovery.tractiveProfile.nominalAccelMps2} m/s²
              </div>
              <div className="text-[9px] text-signal-green font-semibold">
                {recovery.paceRegainRating.replace(/_/g, " ")}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-raised border border-graphite">
              <div className="text-[10px] text-steel">0 ➔ 100 km/h</div>
              <div className="text-sm font-bold text-chalk mt-0.5">
                {recovery.tractiveProfile.timeToReach100KmphSec}s
              </div>
              <div className="text-[9px] text-steel">Sprint Time</div>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-raised border border-graphite">
              <div className="text-[10px] text-steel">Sectional MPS</div>
              <div className="text-sm font-bold text-signal-amber mt-0.5">
                {recovery.tractiveProfile.sectionalMpsKmph} km/h
              </div>
              <div className="text-[9px] text-steel">Top Speed Cap</div>
            </div>
          </div>
        </div>

        {/* CARD 2: PAIN FACTORS ALL THE WAY & UNSCHEDULED HALT FORENSICS (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-graphite bg-surface-card p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-data uppercase tracking-wider text-steel font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-signal-red" />
                Corridor Pain Factor Diagnostics
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-data font-bold bg-signal-red/15 text-signal-red border border-signal-red/30">
                +{painAnalysis.totalPainPenaltyMin} min Total Drag
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1 font-data text-[10px]">
              {(["ALL", "UNSCHEDULED", "TRACTION", "SPEED", "THROAT_WATERING"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterType(cat)}
                  className={`px-2.5 py-1 rounded-lg border transition-all ${
                    filterType === cat
                      ? "bg-signal-amber text-ink font-bold border-signal-amber"
                      : "bg-surface-raised text-steel border-graphite hover:text-chalk"
                  }`}
                >
                  {cat === "ALL"
                    ? "All Factors"
                    : cat === "UNSCHEDULED"
                    ? "Unscheduled Loops"
                    : cat === "TRACTION"
                    ? "Traction & OHE"
                    : cat === "SPEED"
                    ? "TSR/PSR Caps"
                    : "Terminal & Yard"}
                </button>
              ))}
            </div>
          </div>

          {/* Pain Factor Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-data text-xs">
            <div className="p-2.5 rounded-xl bg-surface-raised border border-graphite">
              <div className="text-[10px] text-steel">Unscheduled Halts</div>
              <div className="text-base font-bold text-signal-red mt-0.5">
                {painAnalysis.unscheduledHaltsCount} Stops
              </div>
              <div className="text-[9px] text-steel">
                +{painAnalysis.unscheduledHaltDurationMin}m in Sidings
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-raised border border-graphite">
              <div className="text-[10px] text-steel">Traction / OHE Sag</div>
              <div className="text-base font-bold text-signal-amber mt-0.5">
                +{painAnalysis.tractionLossPenaltyMin}m
              </div>
              <div className="text-[9px] text-steel">Grid / Slip Drag</div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-raised border border-graphite">
              <div className="text-[10px] text-steel">Speed Restrictions</div>
              <div className="text-base font-bold text-signal-amber mt-0.5">
                +{painAnalysis.speedRestrictionPenaltyMin}m
              </div>
              <div className="text-[9px] text-steel">PSRs &amp; Curves</div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-raised border border-graphite">
              <div className="text-[10px] text-steel">SBC Terminal Outer</div>
              <div className="text-base font-bold text-chalk mt-0.5">
                +{painAnalysis.terminalThroatPenaltyMin}m
              </div>
              <div className="text-[9px] text-steel">Platform Reception</div>
            </div>
          </div>

          {/* List of Detected Pain Incidents */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filteredIncidents.length === 0 ? (
              <div className="p-4 text-center text-xs font-data text-steel bg-surface-raised rounded-xl">
                No pain factors found under this filter. Nominal track clearance.
              </div>
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = activeIncident?.id === inc.id;
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncidentId(inc.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-surface-raised border-signal-amber/70 ring-1 ring-signal-amber/30"
                        : "bg-surface-raised/60 border-graphite hover:border-steel/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {inc.type === "UNSCHEDULED_LOOP_HOLD" ? (
                          <span className="p-1 rounded bg-signal-red/20 text-signal-red">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        ) : inc.type === "OHE_VOLTAGE_SAG" || inc.type === "WET_RAIL_ADHESION_SLIP" ? (
                          <span className="p-1 rounded bg-signal-amber/20 text-signal-amber">
                            <Zap className="w-3.5 h-3.5" />
                          </span>
                        ) : inc.type === "WATERING_SANITATION_BLEED" ? (
                          <span className="p-1 rounded bg-sky-500/20 text-sky-400">
                            <Droplets className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="p-1 rounded bg-signal-amber/20 text-signal-amber">
                            <Clock className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <div>
                          <div className="text-xs font-data font-bold text-chalk flex items-center gap-1.5">
                            <span>{inc.stationName}</span>
                            <span className="text-[10px] text-steel font-normal">
                              (km {inc.chainageKm.toFixed(1)})
                            </span>
                            {inc.isUnscheduledHalt && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-signal-red/30 text-signal-red border border-signal-red/50 uppercase">
                                No Scheduled Halt (Looped)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-steel font-sans mt-0.5 line-clamp-1">
                            {inc.rootCauseDescription}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-data font-black text-signal-red block">
                          +{inc.penaltyDurationMin} min
                        </span>
                        <span className="text-[9px] font-data text-steel uppercase">
                          {inc.severity}
                        </span>
                      </div>
                    </div>

                    {/* Expand breakdown if selected */}
                    {isSelected && inc.loopPenaltyDecomposition && (
                      <div className="mt-3 pt-3 border-t border-graphite text-[10px] font-data grid grid-cols-5 gap-1 text-center bg-ink/60 p-2 rounded-lg">
                        <div>
                          <div className="text-steel">Turnout Decel</div>
                          <div className="text-chalk font-bold">
                            +{inc.loopPenaltyDecomposition.turnoutDecelerationMin}m
                          </div>
                        </div>
                        <div>
                          <div className="text-steel">Siding Settling</div>
                          <div className="text-chalk font-bold">
                            +{inc.loopPenaltyDecomposition.loopEntrySettlingMin}m
                          </div>
                        </div>
                        <div>
                          <div className="text-steel">Siding Wait</div>
                          <div className="text-signal-red font-bold">
                            +{inc.loopPenaltyDecomposition.stationaryHoldMin}m
                          </div>
                        </div>
                        <div>
                          <div className="text-steel">Restart Accel</div>
                          <div className="text-chalk font-bold">
                            +{inc.loopPenaltyDecomposition.restartAccelerationMin}m
                          </div>
                        </div>
                        <div>
                          <div className="text-steel">Rejoin Main</div>
                          <div className="text-chalk font-bold">
                            +{inc.loopPenaltyDecomposition.rejoiningMainlineMin}m
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* FULL FLEET COMPARATIVE RECOVERY & PAIN MATRIX */}
      <div className="rounded-2xl border border-graphite bg-surface-card p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-graphite pb-3">
          <div>
            <h3 className="text-sm font-heading font-bold text-chalk flex items-center gap-2">
              <Layers className="w-4 h-4 text-signal-amber" />
              Corridor 24-Hour Fleet Recovery Pattern &amp; Priority Propagation Matrix
            </h3>
            <p className="text-xs text-steel font-sans mt-0.5">
              Side-by-side analysis of all corridor rakes: Who has the tractive muscle to erase delay vs who cascades delay to following trains.
            </p>
          </div>
          <span className="text-xs font-data text-steel">
            Click any train row to load in mission control
          </span>
        </div>

        {/* Fleet Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-data text-xs border-collapse">
            <thead>
              <tr className="border-b border-graphite text-steel uppercase text-[10px]">
                <th className="py-2.5 px-3">Train / Class</th>
                <th className="py-2.5 px-3">Priority Tier</th>
                <th className="py-2.5 px-3">Tractive Power</th>
                <th className="py-2.5 px-3 text-right">Current Delay</th>
                <th className="py-2.5 px-3 text-right">Max Slack Recovery</th>
                <th className="py-2.5 px-3 text-center">Recovery Conf.</th>
                <th className="py-2.5 px-3 text-center">Unscheduled Halts</th>
                <th className="py-2.5 px-3 text-right">Final Projected Delay</th>
                <th className="py-2.5 px-3">Operational Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite/40">
              {fleetAssessments.map(({ train, recovery: tRec, pain: tPain }) => {
                const isCurrentSelected = train.id === selectedTrain.id;
                return (
                  <tr
                    key={train.id}
                    onClick={() => onSelectTrain && onSelectTrain(train.id)}
                    className={`cursor-pointer transition-all ${
                      isCurrentSelected
                        ? "bg-signal-amber/10 font-semibold"
                        : "hover:bg-surface-raised/70"
                    }`}
                  >
                    {/* Train Info */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {isCurrentSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-signal-amber animate-pulse" />
                        )}
                        <div>
                          <div className="text-chalk font-bold">{train.id}</div>
                          <div className="text-[10px] text-steel font-sans">{train.name}</div>
                        </div>
                      </div>
                    </td>

                    {/* Priority Tier */}
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          train.priorityTier === 1
                            ? "bg-signal-green/20 text-signal-green border border-signal-green/30"
                            : train.priorityTier === 2
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            : train.priorityTier === 3
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        Tier {train.priorityTier} ({PRIORITY_TIERS[train.type].name.split(" ")[0]})
                      </span>
                    </td>

                    {/* Tractive Power */}
                    <td className="py-3 px-3">
                      <div className="text-chalk">{tRec.tractiveProfile.nominalAccelMps2} m/s²</div>
                      <div className="text-[10px] text-steel">
                        {tRec.tractiveProfile.powerToWeightHpPerTon} HP/ton
                      </div>
                    </td>

                    {/* Current Delay */}
                    <td className="py-3 px-3 text-right">
                      <span
                        className={
                          tRec.currentDelayMin > 0 ? "text-signal-red font-bold" : "text-signal-green"
                        }
                      >
                        {tRec.currentDelayMin > 0 ? `+${tRec.currentDelayMin}m` : "0m"}
                      </span>
                    </td>

                    {/* Max Slack Recovery */}
                    <td className="py-3 px-3 text-right font-bold text-signal-green">
                      -{tRec.maxKinematicRecoverableMin}m
                    </td>

                    {/* Recovery Confidence */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tRec.recoveryConfidenceScore >= 75
                            ? "bg-signal-green/20 text-signal-green"
                            : tRec.recoveryConfidenceScore >= 45
                            ? "bg-signal-amber/20 text-signal-amber"
                            : "bg-signal-red/20 text-signal-red"
                        }`}
                      >
                        {tRec.recoveryConfidenceScore}%
                      </span>
                    </td>

                    {/* Unscheduled Halts */}
                    <td className="py-3 px-3 text-center">
                      {tPain.unscheduledHaltsCount > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-signal-red/20 text-signal-red font-bold">
                          {tPain.unscheduledHaltsCount} Loop Halts
                        </span>
                      ) : (
                        <span className="text-[10px] text-steel">None</span>
                      )}
                    </td>

                    {/* Final Projected Delay */}
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-black ${
                          tRec.projectedTerminalDelayMin === 0
                            ? "text-signal-green"
                            : "text-signal-amber"
                        }`}
                      >
                        {tRec.projectedTerminalDelayMin === 0
                          ? "0m (ON TIME)"
                          : `+${tRec.projectedTerminalDelayMin}m`}
                      </span>
                    </td>

                    {/* Operational Verdict */}
                    <td className="py-3 px-3 font-sans text-[11px] text-steel max-w-xs">
                      {tRec.recoveryVerdict}
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
