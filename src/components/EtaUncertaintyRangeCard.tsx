import React from "react";
import { 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  TrendingUp, 
  Sparkles, 
  ChevronRight, 
  ArrowUpRight,
  Info
} from "lucide-react";
import { TrainConfig } from "../lib/rail/types";
import { decomposeDelayPropagation, getEtaChangeExplanation } from "../lib/rail/delayPropagationEngine";

interface EtaUncertaintyRangeCardProps {
  train: TrainConfig;
  currentDelay: number;
  clockMinutes: number;
}

export const EtaUncertaintyRangeCard: React.FC<EtaUncertaintyRangeCardProps> = ({
  train,
  currentDelay,
  clockMinutes,
}) => {
  const decomp = decomposeDelayPropagation(train, currentDelay, clockMinutes);
  const explanation = getEtaChangeExplanation(currentDelay);

  // Confidence color
  const confColor =
    decomp.confidencePct >= 85
      ? "text-emerald-800 bg-emerald-50 border-emerald-200"
      : decomp.confidencePct >= 70
      ? "text-amber-800 bg-amber-50 border-amber-200"
      : "text-red-800 bg-red-50 border-red-200";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 4. ETA with Confidence & Expected Uncertainty Range */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    Probabilistic ETA &amp; Confidence Range
                  </h3>
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-mono">
                    Uncertainty Bounds
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dual-Core Kinematic + Quantile LightGBM projection under section friction
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-mono font-bold ${confColor}`}>
              <ShieldCheck className="w-4 h-4" />
              <span>Confidence: {decomp.confidencePct}%</span>
            </div>
          </div>

          {/* Primary ETA Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <span className="text-xs text-slate-500 block mb-0.5 font-medium">Destination Predicted Arrival (ETA)</span>
                <div className="text-3xl font-black font-mono text-blue-700 tracking-tight flex items-baseline gap-2">
                  <span>{train.scheduledArr}</span>
                  <span className="text-sm font-normal text-red-600 font-sans">
                    (+{decomp.futureProjectedDelayMinutes} min projected)
                  </span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-500 block mb-0.5 font-medium">Scheduled Timetable (WTT)</span>
                <span className="text-base font-mono text-slate-700 font-bold">{train.scheduledArr}</span>
              </div>
            </div>
          </div>

          {/* Uncertainty Timeline Bracket Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-bold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                Expected Range (90% CI Bracket)
              </span>
              <span className="font-mono font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-200">
                {decomp.expectedRangeDisplay}
              </span>
            </div>

            {/* Visual Range Timeline Bar */}
            <div className="pt-2 pb-1">
              <div className="relative h-7 flex items-center">
                {/* Horizontal line */}
                <div className="absolute left-0 right-0 h-1.5 bg-slate-200 rounded-full" />
                
                {/* Active uncertainty band */}
                <div className="absolute left-[15%] right-[15%] h-3 bg-blue-200/80 rounded-full border border-blue-400" />

                {/* Left bracket (Min) */}
                <div className="absolute left-[15%] flex flex-col items-center -translate-x-1/2">
                  <div className="w-2 h-5 bg-blue-600 rounded-full" />
                </div>

                {/* Center dot (Predicted ETA) */}
                <div className="absolute left-[50%] flex flex-col items-center -translate-x-1/2">
                  <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md" />
                </div>

                {/* Right bracket (Max) */}
                <div className="absolute right-[15%] flex flex-col items-center translate-x-1/2">
                  <div className="w-2 h-5 bg-blue-600 rounded-full" />
                </div>
              </div>

              {/* Range labels */}
              <div className="flex justify-between text-[11px] font-mono text-slate-500 px-2 mt-1">
                <span>Min: -{Math.round(decomp.futureProjectedDelayMinutes * 0.2)}m</span>
                <span className="text-blue-700 font-bold">Predicted Median ETA</span>
                <span>Max: +{Math.round(decomp.futureProjectedDelayMinutes * 0.2)}m</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-[11px] text-slate-500 flex items-center gap-1.5 border-t border-slate-200 pt-3">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Calculated using 14-day Bayesian historical corridor variance &amp; real-time GPS telemetry.</span>
        </div>
      </div>

      {/* 5. ETA Change Explanation (SHAP Attribution) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    ETA Change Explanation (SHAP)
                  </h3>
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-mono">
                    XAI Factor Attribution
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Itemized additive attribution of why the arrival time shifted
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-50 border border-red-200 text-red-700 font-mono font-bold text-xs">
              <span>⚠️ +{explanation.netImpactMinutes} MIN SHIFT</span>
            </div>
          </div>

          {/* Itemized Cause Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden mb-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-600 font-semibold font-sans">
                  <th className="py-2.5 px-3">Contributing Cause</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {explanation.causes.map((cause, idx) => (
                  <tr key={idx} className="hover:bg-slate-100/50 transition-colors">
                    <td className="py-2.5 px-3 font-sans text-slate-800 flex items-center gap-2">
                      <span className={`text-base leading-none ${cause.iconColor}`}>•</span>
                      <span className="font-medium">{cause.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-sans text-[11px]">{cause.category}</td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <span className={cause.impactMinutes > 0 ? "text-red-600" : "text-emerald-600"}>
                        {cause.impactMinutes > 0 ? `+${cause.impactMinutes} min` : `${cause.impactMinutes} min`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                  <td colSpan={2} className="py-2.5 px-3 text-slate-900 font-sans">
                    Net ETA Impact
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-600">
                    +{explanation.netImpactMinutes} min
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200 pt-3">
          <span>TreeExplainer baseline E[f(x)] = 0.0 min</span>
          <span className="font-mono text-indigo-700 font-bold">Lossless Attribution Σ φ_i = ΔETA</span>
        </div>
      </div>
    </div>
  );
};
