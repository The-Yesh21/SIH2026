import React from "react";
import { DynamicPredictionResult } from "../lib/rail/types";
import { Sparkles, Clock, AlertTriangle, CheckCircle2, TrendingDown, Layers } from "lucide-react";

interface EtaComparisonCardProps {
  prediction: DynamicPredictionResult;
}

export function EtaComparisonCard({ prediction }: EtaComparisonCardProps) {
  const {
    train,
    traditionalStaticEta,
    traditionalStaticDelayMin,
    railrakshakDynamicEta,
    railrakshakDynamicDelayMin,
    slackRecoveredMin,
    bottlenecksIncurredMin,
    speedRestrictionPenaltyMin,
  } = prediction;

  const errorDeltaMin = traditionalStaticDelayMin - railrakshakDynamicDelayMin;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Traditional Static NTES ETA Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
            Traditional Static ETA (NTES)
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
            Linear Schedule + Delay
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-3">
          <div className="font-mono text-3xl font-extrabold text-slate-300">
            {traditionalStaticEta}
          </div>
          <div className="text-xs font-mono font-bold text-rose-400">
            (+{traditionalStaticDelayMin} min delay)
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          Assumes uniform delay propagation without accounting for downstream timetable slack recovery, 
          track speed limits, or priority overtakes.
        </p>
      </div>

      {/* 2. RailRakshak Dynamic ETA Card */}
      <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-950 to-cyan-950/30 p-5 relative overflow-hidden shadow-lg ring-1 ring-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono uppercase font-bold text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            RailRakshak Dynamic ETA
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold">
            Kinematic-ML Hybrid
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-3">
          <div className="font-mono text-3xl font-black text-emerald-300">
            {railrakshakDynamicEta}
          </div>
          <div className="text-xs font-mono font-bold text-emerald-400">
            ({railrakshakDynamicDelayMin > 0 ? `+${railrakshakDynamicDelayMin}m actual delay` : "On-Time Arrival"})
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-emerald-500/20 flex flex-wrap items-center justify-between text-xs font-mono text-emerald-300">
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
            <span>Slack Recovery: <strong>-{slackRecoveredMin} min</strong></span>
          </div>
          {prediction.confidenceInterval && (
            <div className="text-cyan-300 text-[11px] font-semibold">
              95% CI: {prediction.confidenceInterval.lowerEta} – {prediction.confidenceInterval.upperEta} (±{prediction.confidenceInterval.rmseMarginMin}m)
            </div>
          )}
          {errorDeltaMin !== 0 && !prediction.confidenceInterval && (
            <div className="text-cyan-300 font-bold">
              Accuracy Improvement: {Math.abs(errorDeltaMin)} min precision gain
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
