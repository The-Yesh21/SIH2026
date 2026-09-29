import React, { useState } from "react";
import { 
  Sliders, 
  Play, 
  CheckCircle2, 
  TrendingDown, 
  Zap, 
  ArrowRight, 
  Sparkles, 
  RotateCcw,
  Clock,
  Activity
} from "lucide-react";
import { COUNTERFACTUAL_SCENARIOS, CounterfactualScenario } from "../lib/rail/delayPropagationEngine";

export const CounterfactualScenarioDeck: React.FC = () => {
  const [activeScenarioId, setActiveScenarioId] = useState<string>(COUNTERFACTUAL_SCENARIOS[0].id);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [hasRun, setHasRun] = useState<boolean>(false);

  const activeScenario: CounterfactualScenario =
    COUNTERFACTUAL_SCENARIOS.find((s) => s.id === activeScenarioId) || COUNTERFACTUAL_SCENARIOS[0];

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setHasRun(true);
    }, 600);
  };

  const handleReset = () => {
    setHasRun(false);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                "What If...?" Counterfactual Scenario Simulator
              </h3>
              <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                Decision Support System
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Simulate dispatch interventions and observe multi-train delay recovery & corridor throughput recovery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasRun && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Simulating Dispatch...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run "What If" Simulation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scenario Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {COUNTERFACTUAL_SCENARIOS.map((scenario) => {
          const isSelected = scenario.id === activeScenarioId;
          return (
            <button
              key={scenario.id}
              onClick={() => {
                setActiveScenarioId(scenario.id);
                setHasRun(false);
              }}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                isSelected
                  ? "bg-purple-950/60 border-purple-500/60 shadow-lg shadow-purple-500/10"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-200 line-clamp-1">{scenario.name}</span>
                {isSelected && <span className="w-2 h-2 rounded-full bg-purple-400" />}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {scenario.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Scenario Details & Counterfactual Impact */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <span className="text-xs font-mono text-purple-400 uppercase tracking-wider font-bold">
              Proposed Intervention
            </span>
            <div className="text-sm font-bold text-slate-100 mt-0.5">{activeScenario.intervention}</div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-lg text-emerald-400">
              Total Saved: <span className="font-bold">+{activeScenario.totalCorridorMinutesSaved} min</span>
            </div>
            <div className="bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-lg text-cyan-400">
              Throughput Gain: <span className="font-bold">+{activeScenario.systemThroughputGainPct}%</span>
            </div>
          </div>
        </div>

        {/* Train by Train Before vs After Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/40">
                <th className="py-2.5 px-3">Impacted Train</th>
                <th className="py-2.5 px-3 font-mono">Current Delay (Baseline)</th>
                <th className="py-2.5 px-3 font-mono text-purple-300">Simulated Delay (What If)</th>
                <th className="py-2.5 px-3 text-right font-mono text-emerald-400">Time Recovered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {activeScenario.trainImpacts.map((train) => (
                <tr key={train.trainId} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-3 font-sans">
                    <span className="font-bold text-slate-200">{train.trainName}</span>
                    <span className="text-[11px] text-slate-400 ml-1.5">(#{train.trainId})</span>
                  </td>
                  <td className="py-3 px-3 text-rose-400 font-bold">
                    +{train.beforeDelayMin} min
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-300 font-bold">+{train.afterDelayMin} min</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        -{train.recoveredMin}m
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-black text-sm">
                    {train.recoveredMin} min saved
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Takeaway Callout */}
        <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900/40 border border-purple-500/30 rounded-xl p-3.5 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-slate-300">
            <span className="font-bold text-purple-300">Controller Decision Takeaway: </span>
            Clearing one single bottleneck at this location recovers{" "}
            <span className="font-bold text-emerald-400 font-mono">
              {activeScenario.totalCorridorMinutesSaved} minutes
            </span>{" "}
            across the corridor fleet, breaking cascading queue formations before they reach the KSR Bengaluru terminal interlocking.
          </div>
        </div>
      </div>
    </div>
  );
};
