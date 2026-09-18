import React from "react";
import { ShapAttributionFactor } from "../lib/rail/types";
import { BarChart3, TrendingUp, TrendingDown, Info } from "lucide-react";

interface ShapWaterfallProps {
  factors: ShapAttributionFactor[];
}

export function ShapWaterfall({ factors }: ShapWaterfallProps) {
  if (factors.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs font-mono text-slate-400">
        No active delay anomalies detected. Train is running on nominal schedule.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          Explainable AI (TreeSHAP) Factor Attribution
        </h3>
        <span className="text-[10px] font-mono text-slate-500">Real-Time Feature Impacts</span>
      </div>

      <p className="text-xs text-slate-400">
        Decomposed factor contributions explaining how physical infrastructure, signaling headway, and timetable slack produce the final ETA:
      </p>

      <div className="space-y-2 font-mono">
        {factors.map((factor, idx) => {
          const isRecovery = factor.impactMinutes < 0;
          return (
            <div
              key={idx}
              className="rounded-lg border border-slate-800/80 bg-slate-950 p-3 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      isRecovery
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-950 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {factor.category}
                  </span>
                  <span className="font-bold text-slate-200">{factor.name}</span>
                </div>
                <span
                  className={`font-black text-sm ${
                    isRecovery ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {factor.impactMinutes > 0
                    ? `+${factor.impactMinutes.toFixed(1)}m`
                    : `${factor.impactMinutes.toFixed(1)}m`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-normal">
                {factor.rationale}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
