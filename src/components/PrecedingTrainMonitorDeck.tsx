import React from "react";
import { TrainConfig, PrecedingTrainContext, SectionFriction } from "../lib/rail/types";
import { EnvironmentalConditions } from "../lib/rail/restrictions";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Gauge,
  Radio,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";

interface PrecedingTrainMonitorDeckProps {
  selectedTrain: TrainConfig;
  precedingContext?: PrecedingTrainContext;
  sections?: SectionFriction[];
  activeClockMinutes: number;
  environment: EnvironmentalConditions;
  onSelectTrain?: (trainId: string) => void;
}

export function PrecedingTrainMonitorDeck({
  selectedTrain,
  precedingContext,
  sections,
  activeClockMinutes,
  environment,
  onSelectTrain,
}: PrecedingTrainMonitorDeckProps) {
  const lead = precedingContext;

  const avgFriction =
    sections && sections.length > 0
      ? sections.reduce((acc, s) => acc + s.frictionScore, 0) / sections.length
      : 0.18;

  const healthScore = Math.round(Math.max(15, (1.0 - avgFriction) * 100));

  return (
    <div className="bg-surface border border-graphite rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-signal-cyan/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-graphite pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-signal-cyan/10 border border-signal-cyan/30 flex items-center justify-center text-signal-cyan">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-heading font-bold text-chalk">
                Continuous Corridor Telemetry &amp; Preceding-Train Behavioral Monitor
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-data font-bold bg-signal-cyan/15 text-signal-cyan border border-signal-cyan/30">
                LIVE ML STREAM
              </span>
            </div>
            <p className="text-xs text-steel font-body">
              Real-time monitoring of preceding train clearances, headway compression, and dynamic section friction across SWR 138.25 km corridor.
            </p>
          </div>
        </div>

        {/* Overall Corridor Flow Health */}
        <div className="flex items-center gap-4 bg-surface-raised px-3.5 py-2 rounded-xl border border-graphite">
          <div className="text-right">
            <div className="text-[10px] font-data text-steel uppercase tracking-wider">
              Corridor Flow Index
            </div>
            <div className="text-sm font-data font-bold text-chalk flex items-center gap-1.5 justify-end">
              <span
                className={
                  healthScore >= 75
                    ? "text-signal-green"
                    : healthScore >= 50
                    ? "text-signal-amber"
                    : "text-signal-red"
                }
              >
                {healthScore}%
              </span>
              <span className="text-[10px] text-steel">
                {healthScore >= 75 ? "Optimal" : healthScore >= 50 ? "Moderate" : "Congested"}
              </span>
            </div>
          </div>
          <div
            className={`w-3 h-3 rounded-full animate-ping ${
              healthScore >= 75
                ? "bg-signal-green"
                : healthScore >= 50
                ? "bg-signal-amber"
                : "bg-signal-red"
            }`}
          />
        </div>
      </div>

      {/* 1. Live Preceding Train Tracking Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 bg-surface-raised border border-graphite rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-data font-semibold text-chalk">
              <Compass className="w-4 h-4 text-signal-cyan" />
              <span>Preceding Train Spatial Separation</span>
            </div>
            {lead?.hasPrecedingTrain && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-data font-bold border ${
                  lead.headwayCompressionRisk === "HIGH_RISK_BRAKING"
                    ? "bg-signal-red/20 text-signal-red border-signal-red/40"
                    : lead.headwayCompressionRisk === "CAUTION_AMBER"
                    ? "bg-signal-amber/20 text-signal-amber border-signal-amber/40"
                    : "bg-signal-green/20 text-signal-green border-signal-green/40"
                }`}
              >
                {lead.headwayCompressionRisk === "HIGH_RISK_BRAKING"
                  ? "HEADWAY COMPRESSED"
                  : lead.headwayCompressionRisk === "CAUTION_AMBER"
                  ? "CAUTION WAVE"
                  : "CLEAR HEADWAY"}
              </span>
            )}
          </div>

          {lead?.hasPrecedingTrain ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-surface p-3.5 rounded-lg border border-graphite">
                <div>
                  <div className="text-[10px] font-data text-steel">LEAD TRAIN IN SAME BLOCK</div>
                  <div className="text-sm font-heading font-bold text-chalk flex items-center gap-2 mt-0.5">
                    <span>{lead.leadTrainName}</span>
                    <span className="text-xs font-data text-signal-cyan">#{lead.leadTrainId}</span>
                  </div>
                  <div className="text-xs text-steel mt-0.5">
                    Location: KM {lead.leadTrainLocationKm?.toFixed(1)} · Type: {lead.leadTrainType}
                  </div>
                </div>

                {onSelectTrain && lead.leadTrainId && (
                  <button
                    onClick={() => onSelectTrain(lead.leadTrainId!)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-raised border border-graphite text-xs font-data text-chalk transition-colors flex items-center gap-1"
                  >
                    <span>Track Lead</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Spatial Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface p-3 rounded-lg border border-graphite text-center">
                  <div className="text-[10px] font-data text-steel">Distance Gap</div>
                  <div className="text-base font-data font-bold text-chalk mt-1">
                    {lead.headwayDistanceKm} <span className="text-xs text-steel font-normal">km</span>
                  </div>
                </div>
                <div className="bg-surface p-3 rounded-lg border border-graphite text-center">
                  <div className="text-[10px] font-data text-steel">Time Headway</div>
                  <div className="text-base font-data font-bold text-chalk mt-1">
                    {lead.headwayGapMinutes} <span className="text-xs text-steel font-normal">min</span>
                  </div>
                </div>
                <div className="bg-surface p-3 rounded-lg border border-graphite text-center">
                  <div className="text-[10px] font-data text-steel">Ripple Delay Impact</div>
                  <div
                    className={`text-base font-data font-bold mt-1 ${
                      lead.rippleDelayPropagatedMin > 0 ? "text-signal-amber" : "text-signal-green"
                    }`}
                  >
                    {lead.rippleDelayPropagatedMin > 0 ? `+${lead.rippleDelayPropagatedMin}m` : "0.0m"}
                  </div>
                </div>
              </div>

              {/* Operational Summary */}
              <div className="p-3 rounded-lg bg-surface border border-graphite flex items-start gap-2.5">
                {lead.headwayCompressionRisk === "NOMINAL_GREEN" ? (
                  <CheckCircle2 className="w-4 h-4 text-signal-green shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-signal-amber shrink-0 mt-0.5" />
                )}
                <p className="text-xs font-body text-chalk-dim leading-relaxed">
                  {lead.operationalSummary}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center space-y-2 bg-surface rounded-lg border border-graphite">
              <CheckCircle2 className="w-8 h-8 text-signal-green mx-auto" />
              <div className="text-sm font-heading font-semibold text-chalk">
                Clear Track Ahead
              </div>
              <p className="text-xs text-steel">
                No active preceding trains detected within the immediate downstream block. Target train enjoys full sectional permissible speed.
              </p>
            </div>
          )}
        </div>

        {/* 2. ML Behavioral Memory & Continuous Feedback Loop */}
        <div className="lg:col-span-6 bg-surface-raised border border-graphite rounded-xl p-4 sm:p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-data font-semibold text-chalk">
              <Sparkles className="w-4 h-4 text-signal-cyan" />
              <span>How the Intelligence Model Learns from Previous Trains</span>
            </div>

            <div className="space-y-2.5">
              <div className="p-2.5 rounded-lg bg-surface border border-graphite flex items-start gap-2.5 text-xs text-chalk-dim">
                <span className="w-5 h-5 rounded-full bg-signal-cyan/15 text-signal-cyan font-data font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <span className="font-semibold text-chalk">Block Clearance Telemetry: </span>
                  When previous trains clear stations (e.g. Mandya, Maddur, Ramanagaram), their actual traversal time is compared with the Working Time Table (WTT).
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-surface border border-graphite flex items-start gap-2.5 text-xs text-chalk-dim">
                <span className="w-5 h-5 rounded-full bg-signal-cyan/15 text-signal-cyan font-data font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <span className="font-semibold text-chalk">Dynamic Section Degradation Index (SDI): </span>
                  Slowdowns from turnout loop entries, LC gate holding, or commuter surges dynamically elevate section friction scores.
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-surface border border-graphite flex items-start gap-2.5 text-xs text-chalk-dim">
                <span className="w-5 h-5 rounded-full bg-signal-cyan/15 text-signal-cyan font-data font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <span className="font-semibold text-chalk">LightGBM + SHAP Attributions: </span>
                  The model infers the exact ripple penalty on following trains, preventing blind static timetable optimism.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-graphite/60 flex items-center justify-between text-[11px] font-data text-steel">
            <span>Model Core: LightGBM Regressor (34 Spatial-Temporal Features)</span>
            <span className="text-signal-green flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Continuous Online Sync
            </span>
          </div>
        </div>
      </div>

      {/* 3. Section Degradation Index (SDI) 8-Block Heatmap */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-data font-semibold text-chalk">
            <Activity className="w-4 h-4 text-signal-amber" />
            <span>SWR Corridor Section Degradation &amp; Friction Matrix (8 Block Sections)</span>
          </div>
          <span className="text-[11px] font-data text-steel">
            Mysuru (KM 0) ➔ KSR Bengaluru (KM 138.25)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sections?.map((sec) => {
            const isHeavy = sec.degradationTier === "HEAVY_CONGESTION" || sec.degradationTier === "BLOCKED_RESTRICTED";
            const isModerate = sec.degradationTier === "MODERATE_FRICTION";

            return (
              <div
                key={sec.sectionCode}
                className={`p-3.5 rounded-xl border transition-all ${
                  isHeavy
                    ? "bg-signal-red/10 border-signal-red/30"
                    : isModerate
                    ? "bg-signal-amber/10 border-signal-amber/30"
                    : "bg-surface-raised border-graphite"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-heading font-bold text-chalk truncate max-w-[140px]">
                    {sec.fromStation.split(" ")[0]} ➔ {sec.toStation.split(" ")[0]}
                  </span>
                  <span
                    className={`text-[10px] font-data font-bold px-1.5 py-0.5 rounded ${
                      isHeavy
                        ? "bg-signal-red/20 text-signal-red"
                        : isModerate
                        ? "bg-signal-amber/20 text-signal-amber"
                        : "bg-signal-green/20 text-signal-green"
                    }`}
                  >
                    {Math.round(sec.frictionScore * 100)}% FRICTION
                  </span>
                </div>

                <div className="text-[11px] text-steel font-data mt-1">
                  KM {sec.startKm} - {sec.endKm} ({sec.lengthKm} km) · MPS: {sec.sectionalMpsKmph} kph
                </div>

                {/* Friction Bar */}
                <div className="w-full h-1.5 bg-graphite/40 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full ${
                      isHeavy ? "bg-signal-red" : isModerate ? "bg-signal-amber" : "bg-signal-green"
                    }`}
                    style={{ width: `${Math.round(sec.frictionScore * 100)}%` }}
                  />
                </div>

                <p className="text-[11px] text-chalk-dim font-body mt-2 line-clamp-2 leading-relaxed">
                  {sec.activeRestrictionReason}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
