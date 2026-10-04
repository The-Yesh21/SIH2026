import React, { useState } from "react";
import { 
  GitCommit, 
  GitPullRequest, 
  GitBranch, 
  ArrowDown, 
  AlertTriangle, 
  Zap, 
  Clock, 
  TrendingUp, 
  ChevronRight, 
  ShieldCheck, 
  Activity,
  Layers,
  ArrowRight
} from "lucide-react";
import { TrainConfig } from "../lib/rail/types";
import { 
  decomposeDelayPropagation, 
  getCorridorDelayPropagationGraph, 
  PropagationNode 
} from "../lib/rail/delayPropagationEngine";

interface DelayPropagationGraphProps {
  selectedTrain: TrainConfig;
  currentDelay: number;
  clockMinutes: number;
}

export const DelayPropagationGraph: React.FC<DelayPropagationGraphProps> = ({
  selectedTrain,
  currentDelay,
  clockMinutes,
}) => {
  const [selectedNode, setSelectedNode] = useState<string>("loop-1");
  const decomposition = decomposeDelayPropagation(selectedTrain, currentDelay, clockMinutes);
  const rootGraph = getCorridorDelayPropagationGraph(clockMinutes);

  return (
    <div className="space-y-6">
      {/* 2. Delay Existence vs Delay Propagation Decomposition Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Delay Existence vs. Delay Propagation Engine
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-mono">
                  Physics + LightGBM
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Separating instantaneous current delay from kinematic slack recovery &amp; downstream network contagion
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-500">Train:</span>
            <span className="text-indigo-700 font-bold">{selectedTrain.name} (#{selectedTrain.id})</span>
          </div>
        </div>

        {/* Delay Math Equation Flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
          {/* Current Delay */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 relative overflow-hidden shadow-xs">
            <div className="text-[11px] font-medium text-amber-800 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Current Delay</span>
            </div>
            <div className="text-2xl font-black text-amber-900 font-mono">
              +{decomposition.currentDelayMinutes} <span className="text-xs text-amber-700 font-normal">min</span>
            </div>
            <div className="text-[10px] text-amber-700 mt-1">Observed instantaneous gap</div>
          </div>

          <div className="hidden md:flex justify-center text-slate-400">
            <ArrowRight className="w-5 h-5" />
          </div>

          {/* Propagation Math Tree Breakdown */}
          <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Kinematic Propagation Decomposition</span>
              <span className="text-[10px] font-mono text-slate-500">Live Equation</span>
            </div>
            
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Recoverable Slack (Kinematics)</span>
                </span>
                <span className="font-bold">-{decomposition.recoverableMinutes} min</span>
              </div>

              <div className="flex items-center justify-between text-red-800 bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Downstream Hold Contagion</span>
                </span>
                <span className="font-bold">+{decomposition.downstreamHoldImpactMinutes} min</span>
              </div>

              <div className="flex items-center justify-between text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>New Section Congestion</span>
                </span>
                <span className="font-bold">+{decomposition.newCongestionMinutes} min</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex justify-center text-slate-400">
            <ArrowRight className="w-5 h-5" />
          </div>

          {/* Future Projected Delay */}
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 relative overflow-hidden shadow-xs">
            <div className="text-[11px] font-medium text-indigo-800 mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>Future Projected Delay</span>
            </div>
            <div className="text-2xl font-black text-indigo-900 font-mono">
              +{decomposition.futureProjectedDelayMinutes} <span className="text-xs text-indigo-700 font-normal">min</span>
            </div>
            <div className="text-[10px] text-indigo-700 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Confidence: <strong>{decomposition.confidencePct}%</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Delay Propagation Graph Visualization */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Delay Propagation Network Graph 🕸️
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-mono">
                  Causal Tree Analysis
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Visualizing how a single root dispatch decision cascades through loop holds, headway friction, and terminal queues
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-600 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>Interactive Network Node Inspector</span>
          </div>
        </div>

        {/* Tree Render */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-x-auto">
          {/* Level 1: Root Cause */}
          <div className="flex flex-col items-center">
            <div 
              onClick={() => setSelectedNode("root-1")}
              className={`cursor-pointer transition-all duration-200 w-full max-w-md p-4 rounded-2xl border ${
                selectedNode === "root-1" 
                  ? "border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-200 scale-[1.02]" 
                  : "border-slate-300 bg-white hover:border-indigo-400 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">1. Root Event</span>
                </div>
                <span className="text-[11px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">
                  VB Priority Corridor
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1">{rootGraph.label}</div>
              <div className="text-xs text-slate-600 mt-0.5">{rootGraph.detail}</div>
            </div>

            <ArrowDown className="w-5 h-5 text-slate-400 my-2" />

            {/* Level 2: Dispatch Controller Priority */}
            <div 
              onClick={() => setSelectedNode("track-1")}
              className={`cursor-pointer transition-all duration-200 w-full max-w-md p-4 rounded-2xl border ${
                selectedNode === "track-1" 
                  ? "border-purple-600 bg-purple-50 shadow-md ring-2 ring-purple-200 scale-[1.02]" 
                  : "border-slate-300 bg-white hover:border-purple-400 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-800">2. Track Priority</span>
                </div>
                <span className="text-[11px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                  Precedence Logic
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1">Section Controller Precedence Call</div>
              <div className="text-xs text-slate-600 mt-0.5">Holds preceding rakes to prevent braking wave for Vande Bharat</div>
            </div>

            <ArrowDown className="w-5 h-5 text-slate-400 my-2" />

            {/* Level 3: Loop Line Hold */}
            <div 
              onClick={() => setSelectedNode("loop-1")}
              className={`cursor-pointer transition-all duration-200 w-full max-w-md p-4 rounded-2xl border ${
                selectedNode === "loop-1" 
                  ? "border-red-600 bg-red-50 shadow-md ring-2 ring-red-200 scale-[1.02]" 
                  : "border-slate-300 bg-white hover:border-red-400 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-red-800">3. 🔴 Loop Hold Bottleneck</span>
                </div>
                <span className="text-[11px] font-mono bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">
                  Mandya &amp; Maddur
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1">Switch Points Set to Loop Line</div>
              <div className="text-xs text-slate-600 mt-0.5">Starter signal aspect turned Red; trains diverted to 30 km/h turnout</div>
            </div>

            <ArrowDown className="w-5 h-5 text-slate-400 my-2" />

            {/* Level 4: Split into Multiple Trailing Trains */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Branch Train A */}
              <div className="flex flex-col items-center space-y-2">
                <div 
                  onClick={() => setSelectedNode("train-a")}
                  className={`cursor-pointer transition-all duration-200 w-full p-4 rounded-2xl border ${
                    selectedNode === "train-a" 
                      ? "border-amber-600 bg-amber-50 shadow-md ring-2 ring-amber-200" 
                      : "border-slate-300 bg-white hover:border-amber-400 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">Train A: Commuter MEMU (#66552)</span>
                    <span className="text-xs font-mono font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                      +14 min delay
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">Detained on Mandya Platform 2 loop line</div>
                </div>

                <ArrowDown className="w-4 h-4 text-slate-400" />

                <div 
                  onClick={() => setSelectedNode("queue-1")}
                  className={`cursor-pointer transition-all duration-200 w-full p-4 rounded-2xl border ${
                    selectedNode === "queue-1" 
                      ? "border-yellow-600 bg-yellow-50 shadow-md ring-2 ring-yellow-200" 
                      : "border-slate-300 bg-white hover:border-yellow-400 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-yellow-900">Station Interlocking Queue</span>
                    <span className="text-xs font-mono text-yellow-800 font-bold">SBC Terminal Throat</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">Misses platform slot at SBC, creating trailing queue near Kengeri</div>
                </div>
              </div>

              {/* Branch Train B */}
              <div className="flex flex-col items-center space-y-2">
                <div 
                  onClick={() => setSelectedNode("train-b")}
                  className={`cursor-pointer transition-all duration-200 w-full p-4 rounded-2xl border ${
                    selectedNode === "train-b" 
                      ? "border-amber-600 bg-amber-50 shadow-md ring-2 ring-amber-200" 
                      : "border-slate-300 bg-white hover:border-amber-400 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">Train B: Golgumbaz Express (#16536)</span>
                    <span className="text-xs font-mono font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                      +11 min delay
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">Held at Maddur outer distant signal waiting for block clearance</div>
                </div>

                <ArrowDown className="w-4 h-4 text-slate-400" />

                <div 
                  onClick={() => setSelectedNode("queue-2")}
                  className={`cursor-pointer transition-all duration-200 w-full p-4 rounded-2xl border ${
                    selectedNode === "queue-2" 
                      ? "border-yellow-600 bg-yellow-50 shadow-md ring-2 ring-yellow-200" 
                      : "border-slate-300 bg-white hover:border-yellow-400 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-yellow-900">Headway Compression</span>
                    <span className="text-xs font-mono text-yellow-800 font-bold">Channapatna</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">Slows to 45 km/h on double yellow signal aspects</div>
                </div>
              </div>
            </div>

            <ArrowDown className="w-5 h-5 text-red-500 my-3" />

            {/* Level 5: Net Network Cascading Impact */}
            <div 
              onClick={() => setSelectedNode("final-impact")}
              className={`cursor-pointer transition-all duration-200 w-full max-w-lg p-5 rounded-2xl border ${
                selectedNode === "final-impact" 
                  ? "border-red-600 bg-red-50 shadow-lg ring-2 ring-red-300 scale-[1.02]" 
                  : "border-red-200 bg-red-50/60 hover:border-red-400 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-600 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-red-800">
                    5. Total Cascading Network Impact
                  </span>
                </div>
                <span className="text-sm font-mono font-black text-red-800 bg-red-100 px-3 py-1 rounded-xl border border-red-200">
                  +28 min Lost Corridor Buffer
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                A 3-minute precedence hold at Mandya propagated into 28 minutes of cumulative delay across 4 trailing passenger and freight schedules.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
