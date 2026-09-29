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
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                Closed-Loop Intelligence Action Chain
              </h3>
              <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
                Root Cause → Result
              </span>
            </div>
            <p className="text-xs text-slate-400">
              The signature 6-stage autonomous railway intelligence loop from physical friction detection to verified recovery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Loop Feedback: <strong>LOCKED</strong></span>
        </div>
      </div>

      {/* 6-Stage Progress Stepper */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {ACTION_CHAIN_SEQUENCE.map((step) => {
          const isActive = step.stepNumber === activeStep;
          return (
            <button
              key={step.stepNumber}
              onClick={() => setActiveStep(step.stepNumber)}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                isActive
                  ? "bg-slate-800/90 border-cyan-500/80 shadow-lg shadow-cyan-500/10 scale-[1.02]"
                  : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${step.badgeColor}`}>
                  {step.badge}
                </span>
                {isActive && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
              </div>
              <div className="text-xs font-bold text-slate-200 line-clamp-1 mt-1">{step.title}</div>
              <div className="text-[11px] font-mono text-cyan-400 font-bold mt-1">{step.metricValue}</div>
            </button>
          );
        })}
      </div>

      {/* Active Stage Detailed Spotlight */}
      {(() => {
        const step = ACTION_CHAIN_SEQUENCE.find((s) => s.stepNumber === activeStep) || ACTION_CHAIN_SEQUENCE[0];
        return (
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200 font-mono font-bold text-sm">
                  {step.stepNumber}
                </div>
                <div>
                  <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded border ${step.badgeColor}`}>
                    STAGE: {step.stage}
                  </span>
                  <h4 className="text-base font-bold text-slate-100 mt-1">{step.title}</h4>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-xl font-mono text-xs">
                <span className="text-slate-400">{step.metricLabel}: </span>
                <span className="text-cyan-400 font-bold">{step.metricValue}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {step.description}
            </p>

            {/* Visual Workflow Chain Graphic */}
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between overflow-x-auto text-[11px] font-mono gap-2">
              <div className="flex items-center gap-1 text-rose-400 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>1. Cause</span>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
              <div className="flex items-center gap-1 text-amber-400 shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>2. Impact (+8m)</span>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
              <div className="flex items-center gap-1 text-indigo-400 shrink-0">
                <Activity className="w-3.5 h-3.5" />
                <span>3. Propagate (2 rakes)</span>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
              <div className="flex items-center gap-1 text-purple-400 shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>4. ETA (18:50)</span>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
              <div className="flex items-center gap-1 text-blue-400 shrink-0">
                <Sliders className="w-3.5 h-3.5" />
                <span>5. Controller Action</span>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
              <div className="flex items-center gap-1 text-emerald-400 font-bold shrink-0">
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
