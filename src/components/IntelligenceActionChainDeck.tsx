import React, { useState } from "react";
import { 
  GitCommit, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Activity, 
  Zap, 
  ShieldCheck, 
  Sliders, 
  Sparkles,
  TrendingUp,
  Cpu
} from "lucide-react";
import { ACTION_CHAIN_SEQUENCE, ActionChainStep } from "../lib/rail/delayPropagationEngine";

export const IntelligenceActionChainDeck: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Closed-Loop Intelligence Action Chain
              </h3>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-mono">
                Root Cause → Result
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              The signature 6-stage autonomous railway intelligence loop from physical friction detection to verified recovery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-800 font-mono bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active Loop Feedback: <strong>LOCKED</strong></span>
        </div>
      </div>

      {/* 6-Stage Progress Stepper */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
        {ACTION_CHAIN_SEQUENCE.map((step) => {
          const isActive = step.stepNumber === activeStep;
          let badgeBg = "bg-blue-50 text-blue-800 border-blue-200";
          if (step.stage === "CAUSE") badgeBg = "bg-red-50 text-red-800 border-red-200";
          else if (step.stage === "IMPACT") badgeBg = "bg-amber-50 text-amber-800 border-amber-200";
          else if (step.stage === "PROPAGATION") badgeBg = "bg-purple-50 text-purple-800 border-purple-200";
          else if (step.stage === "ETA") badgeBg = "bg-indigo-50 text-indigo-800 border-indigo-200";
          else if (step.stage === "ACTION") badgeBg = "bg-sky-50 text-sky-800 border-sky-200";
          else if (step.stage === "SIMULATED_RESULT") badgeBg = "bg-emerald-50 text-emerald-800 border-emerald-200";

          return (
            <button
              key={step.stepNumber}
              onClick={() => setActiveStep(step.stepNumber)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                isActive
                  ? "bg-blue-50/80 border-blue-400 shadow-sm ring-2 ring-blue-200 scale-[1.02]"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${badgeBg}`}>
                  {step.badge}
                </span>
                {isActive && <span className="w-2 h-2 rounded-full bg-blue-600" />}
              </div>
              <div className="text-xs font-bold text-slate-900 line-clamp-1 mt-1">{step.title}</div>
              <div className="text-[11px] font-mono text-blue-700 font-bold mt-1">{step.metricValue}</div>
            </button>
          );
        })}
      </div>

      {/* Active Stage Detailed Spotlight */}
      {(() => {
        const step = ACTION_CHAIN_SEQUENCE.find((s) => s.stepNumber === activeStep) || ACTION_CHAIN_SEQUENCE[0];
        return (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-900 font-mono font-bold text-sm shadow-xs">
                  {step.stepNumber}
                </div>
                <div>
                  <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                    STAGE: {step.stage}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-1">{step.title}</h4>
                </div>
              </div>

              <div className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl font-mono text-xs shadow-xs">
                <span className="text-slate-500">{step.metricLabel}: </span>
                <span className="text-blue-700 font-bold">{step.metricValue}</span>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              {step.description}
            </p>

            {/* Visual Workflow Chain Graphic */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between overflow-x-auto text-[11px] font-mono gap-2 shadow-xs">
              <div className="flex items-center gap-1 text-red-700 font-bold shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>1. Cause</span>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <div className="flex items-center gap-1 text-amber-700 font-bold shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>2. Impact (+8m)</span>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <div className="flex items-center gap-1 text-purple-700 font-bold shrink-0">
                <Activity className="w-3.5 h-3.5" />
                <span>3. Propagate (2 rakes)</span>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <div className="flex items-center gap-1 text-indigo-700 font-bold shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>4. ETA (18:50)</span>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <div className="flex items-center gap-1 text-blue-700 font-bold shrink-0">
                <Sliders className="w-3.5 h-3.5" />
                <span>5. Controller Action</span>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <div className="flex items-center gap-1 text-emerald-700 font-bold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>6. Result (18:46)</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
