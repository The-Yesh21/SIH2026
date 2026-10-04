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
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                "What If...?" Counterfactual Scenario Simulator
              </h3>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-mono">
                Decision Support System
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate dispatch interventions and observe multi-train delay recovery &amp; corridor throughput recovery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasRun && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
              className={`text-left p-4 rounded-2xl border transition-all ${
                isSelected
                  ? "bg-purple-50 border-purple-300 shadow-sm ring-2 ring-purple-200"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold line-clamp-1 ${isSelected ? "text-purple-900" : "text-slate-900"}`}>
                  {scenario.name}
                </span>
                {isSelected && <span className="w-2 h-2 rounded-full bg-purple-600" />}
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {scenario.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Scenario Details & Counterfactual Impact */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <span className="text-xs font-mono text-purple-700 uppercase tracking-wider font-bold">
              Proposed Intervention
            </span>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{activeScenario.intervention}</div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-emerald-800 shadow-xs">
              Total Saved: <strong>+{activeScenario.totalCorridorMinutesSaved} min</strong>
            </div>
            <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-blue-800 shadow-xs">
              Throughput Gain: <strong>+{activeScenario.systemThroughputGainPct}%</strong>
            </div>
          </div>
        </div>

        {/* Train by Train Before vs After Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-100/80 font-sans">
                <th className="py-2.5 px-3">Impacted Train</th>
                <th className="py-2.5 px-3 font-mono">Current Delay (Baseline)</th>
                <th className="py-2.5 px-3 font-mono text-purple-800">Simulated Delay (What If)</th>
                <th className="py-2.5 px-3 text-right font-mono text-emerald-700">Time Recovered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {activeScenario.trainImpacts.map((train) => (
                <tr key={train.trainId} className="hover:bg-slate-100/60 transition-colors">
                  <td className="py-3 px-3 font-sans">
                    <span className="font-bold text-slate-900">{train.trainName}</span>
                    <span className="text-[11px] text-slate-500 ml-1.5">(#{train.trainId})</span>
                  </td>
                  <td className="py-3 px-3 text-red-600 font-bold">
                    +{train.beforeDelayMin} min
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-900 font-bold">+{train.afterDelayMin} min</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                        -{train.recoveredMin}m
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-black text-sm">
                    {train.recoveredMin} min saved
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Takeaway Callout */}
        <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-slate-700">
            <span className="font-bold text-purple-900">Controller Decision Takeaway: </span>
            Clearing one single bottleneck at this location recovers{" "}
            <span className="font-bold text-emerald-700 font-mono">
              {activeScenario.totalCorridorMinutesSaved} minutes
            </span>{" "}
            across the corridor fleet, breaking cascading queue formations before they reach the KSR Bengaluru terminal interlocking.
          </div>
        </div>
      </div>
    </div>
  );
};
