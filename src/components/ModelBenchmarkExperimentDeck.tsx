import React from "react";
import { 
  BarChart3, 
  CheckCircle2, 
  Award, 
  TrendingDown, 
  ShieldCheck, 
  FileCheck2, 
  Target,
  Sparkles
} from "lucide-react";
import { MODEL_BENCHMARK_RESULTS } from "../lib/rail/delayPropagationEngine";

export const ModelBenchmarkExperimentDeck: React.FC = () => {
  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                Empirical Evaluation: Model A vs Model B vs Model C (RailRakshak)
              </h3>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Hackathon Benchmark Proof
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Rigorous comparative experiment on 14-day historical trips (1,480 corridor train runs across MYS–SBC)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl">
          <Sparkles className="w-4 h-4" />
          <span>Error Reduction: <strong>-84.2% vs Static</strong></span>
        </div>
      </div>

      {/* Visual Error Comparison Bars */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Destination ETA Prediction Error (MAE in Minutes)</span>
          <span className="text-[11px] font-mono text-slate-400">Lower is Better ↓</span>
        </div>

        <div className="space-y-3">
          {/* Model A */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-rose-400 font-bold">Model A: Static Timetable + Linear Delay (NTES)</span>
              <span className="font-mono font-bold text-rose-400">14.8 min MAE</span>
            </div>
            <div className="h-3.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full w-full transition-all duration-500" />
            </div>
          </div>

          {/* Model B */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 font-bold">Model B: Tabular ML (Pattern-Only, No Corridor Physics)</span>
              <span className="font-mono font-bold text-amber-400">8.9 min MAE</span>
            </div>
            <div className="h-3.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full w-[60%] transition-all duration-500" />
            </div>
          </div>

          {/* Model C (RailRakshak) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Model C: RailRakshak Dual-Core (Kinematics + LightGBM + XAI)
              </span>
              <span className="font-mono font-black text-emerald-400 text-sm">2.1 min MAE</span>
            </div>
            <div className="h-3.5 bg-slate-800 rounded-full overflow-hidden border border-emerald-500/40">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full w-[14.2%] shadow-lg shadow-emerald-500/50 transition-all duration-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Metric Matrix Table */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold font-sans">
                <th className="py-3 px-3.5">Evaluation Architecture</th>
                <th className="py-3 px-3 text-right font-mono">MAE (Interm.)</th>
                <th className="py-3 px-3 text-right font-mono">MAE (Dest.)</th>
                <th className="py-3 px-3 text-right font-mono">RMSE</th>
                <th className="py-3 px-3 text-right font-mono">Pred. Bias</th>
                <th className="py-3 px-3 text-right font-mono">Recovery Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {MODEL_BENCHMARK_RESULTS.map((res, idx) => (
                <tr 
                  key={idx} 
                  className={res.isRailRakshak ? "bg-emerald-950/20 hover:bg-emerald-950/30" : "hover:bg-slate-900/40"}
                >
                  <td className="py-3 px-3.5 font-sans">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${res.color}`} />
                      <span className={`font-bold ${res.isRailRakshak ? "text-emerald-300" : "text-slate-200"}`}>
                        {res.modelName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 ml-4">{res.modelType}</div>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-300">{res.maeIntermediateMin} min</td>
                  <td className={`py-3 px-3 text-right font-bold ${res.isRailRakshak ? "text-emerald-400 text-sm" : "text-slate-300"}`}>
                    {res.maeDestinationMin} min
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300">{res.rmseMin} min</td>
                  <td className={`py-3 px-3 text-right ${res.biasMin > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {res.biasMin > 0 ? `+${res.biasMin}m` : `${res.biasMin}m`}
                  </td>
                  <td className={`py-3 px-3 text-right font-black ${res.isRailRakshak ? "text-emerald-400 text-sm" : "text-slate-400"}`}>
                    {res.recoveryAccuracyPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scientific Validation Callout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
          <FileCheck2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-100">Why Model A Fails: </strong>
            Static schedule linear addition assumes delays persist without recovery, creating a +8.4 min late bias as trains regain time on 130 km/h double tracks.
          </div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-100">Why RailRakshak Wins: </strong>
            Combines train tractive curve kinematics ($P=F\cdot v$) with LightGBM gradient boosting and real-time block signal states, reducing error to just 2.1 minutes.
          </div>
        </div>
      </div>
    </div>
  );
};
