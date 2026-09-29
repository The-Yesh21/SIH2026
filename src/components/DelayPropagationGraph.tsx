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
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Delay Existence vs. Delay Propagation Engine
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  Physics + LightGBM
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Separating instantaneous current delay from kinematic slack recovery & downstream network contagion
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Train:</span>
            <span className="text-cyan-400 font-bold">{selectedTrain.name} (#{selectedTrain.id})</span>
          </div>
        </div>

        {/* Delay Math Equation Flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
          {/* Current Delay */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full pointer-events-none" />
            <div className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Current Delay
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              +{decomposition.currentDelayMinutes} <span className="text-xs text-amber-500/80 font-normal">min</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Observed instantaneous gap</div>
          </div>

          <div className="hidden md:flex justify-center text-slate-600">
            <ArrowRight className="w-4 h-4 text-slate-600" />
          </div>

          {/* Propagation Math Tree Breakdown */}
          <div className="md:col-span-2 bg-slate-950/90 border border-indigo-500/20 rounded-xl p-3.5 space-y-2">
            <div className="text-[11px] font-semibold text-indigo-300 flex items-center justify-between">
              <span>Kinematic Propagation Decomposition</span>
              <span className="text-[10px] font-mono text-slate-400">Live Equation</span>
            </div>
            
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-500/20">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Recoverable Slack (Kinematics)
                </span>
                <span className="font-bold">-{decomposition.recoverableMinutes} min</span>
              </div>

              <div className="flex items-center justify-between text-rose-400 bg-rose-950/30 px-2 py-1 rounded border border-rose-500/20">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Downstream Hold Contagion
                </span>
                <span className="font-bold">+{decomposition.downstreamHoldImpactMinutes} min</span>
              </div>

              <div className="flex items-center justify-between text-amber-400 bg-amber-950/30 px-2 py-1 rounded border border-amber-500/20">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  New Section Congestion
                </span>
                <span className="font-bold">+{decomposition.newCongestionMinutes} min</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex justify-center text-slate-600">
            <ArrowRight className="w-4 h-4 text-slate-600" />
          </div>

          {/* Future Projected Delay */}
          <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/50 border border-indigo-500/40 rounded-xl p-3.5 relative overflow-hidden">
            <div className="text-[11px] font-medium text-indigo-300 mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              Future Projected Delay
            </div>
            <div className="text-2xl font-black text-indigo-300 font-mono">
              +{decomposition.futureProjectedDelayMinutes} <span className="text-xs text-indigo-400/80 font-normal">min</span>
            </div>
            <div className="text-[10px] text-indigo-300/70 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Confidence: {decomposition.confidencePct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Delay Propagation Graph Visualization */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Delay Propagation Network Graph 🕸️
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                  Causal Tree Analysis
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualizing how a single root dispatch decision cascades through loop holds, headway friction, and terminal queues
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Interactive Network Node Inspector</span>
          </div>
        </div>

        {/* Tree Render */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-6 relative overflow-x-auto">
          {/* Level 1: Root Cause */}
          <div className="flex flex-col items-center">
            <div 
              onClick={() => setSelectedNode("root-1")}
              className={`cursor-pointer transition-all duration-200 w-full max-w-md p-3.5 rounded-xl border ${
                selectedNode === "root-1" 
                  ? "border-indigo-500 bg-indigo-950/60 shadow-lg shadow-indigo-500/10 scale-[1.02]" 
                  : "border-indigo-500/30 bg-slate-900 hover:border-indigo-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">1. Root Event</span>
                </div>
                <span className="text-[11px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                  VB Priority Corridor
                </span>
              </div>
              <div className="text-sm font-bold text-slate-100 mt-1">{rootGraph.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{rootGraph.detail}</div>
            </div>

            <ArrowDown className="w-5 h-5 text-indigo-400/60 my-2" />

            {/* Level 2: Dispatch Controller Priority */}
            <div 
              onClick={() => setSelectedNode("track-1")}
              className={`cursor-pointer transition-all duration-200 w-full max-w-md p-3.5 rounded-xl border ${
                selectedNode === "track-1" 
                  ? "border-purple-500 bg-purple-950/60 shadow-lg shadow-purple-500/10 scale-[1.02]" 
                  : "border-purple-500/30 bg-slate-900 hover:border-purple-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">2. Track Priority</span>
                </div>
                <span className="text-[11px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                  Precedence Logic
                </span>
              </div>
              <div className="text-sm font-bold text-slate-100 mt-1">Section Controller Precedence Call</div>
              <div className="text-xs text-slate-400 mt-0.5">Holds preceding rakes to prevent braking wave for Vande Bharat</div>
            </div>

            <ArrowDown className="w-5 h-5 text-purple-400/60 my-2" />

            {/* Level 3: Loop Line Hold */}
            <div 
              onClick={() => setSelectedNode("loop-1")}
              className={`cursor-pointer transition-all duration-200 w-full max-w-md p-3.5 rounded-xl border ${
                selectedNode === "loop-1" 
                  ? "border-rose-500 bg-rose-950/60 shadow-lg shadow-rose-500/10 scale-[1.02]" 
                  : "border-rose-500/30 bg-slate-900 hover:border-rose-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">3. 🔴 Loop Hold Bottleneck</span>
                </div>
                <span className="text-[11px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">
                  Mandya & Maddur
                </span>
              </div>
              <div className="text-sm font-bold text-slate-100 mt-1">Switch Points Set to Loop Line</div>
              <div className="text-xs text-slate-400 mt-0.5">Starter signal aspect turned Red; trains diverted to 30 km/h turnout</div>
            </div>

            <ArrowDown className="w-5 h-5 text-rose-400/60 my-2" />

            {/* Level 4: Split into Multiple Trailing Trains */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Branch Train A */}
              <div className="flex flex-col items-center space-y-2">
                <div 
                  onClick={() => setSelectedNode("train-a")}
                  className={`cursor-pointer transition-all duration-200 w-full p-3.5 rounded-xl border ${
                    selectedNode === "train-a" 
                      ? "border-orange-500 bg-orange-950/60 shadow-lg shadow-orange-500/10" 
                      : "border-orange-500/30 bg-slate-900 hover:border-orange-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-400">Train A: Commuter MEMU (#66552)</span>
                    <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30">
                      +14 min delay
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Detained on Mandya Platform 2 loop line</div>
                </div>

                <ArrowDown className="w-4 h-4 text-amber-500/60" />

                <div 
                  onClick={() => setSelectedNode("queue-1")}
                  className={`cursor-pointer transition-all duration-200 w-full p-3.5 rounded-xl border ${
                    selectedNode === "queue-1" 
                      ? "border-amber-500 bg-amber-950/60 shadow-lg shadow-amber-500/10" 
                      : "border-amber-500/30 bg-slate-900 hover:border-amber-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">Station Interlocking Queue</span>
                    <span className="text-xs font-mono text-amber-300">SBC Terminal Throat</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Misses platform slot at SBC, creating trailing queue near Kengeri</div>
                </div>
              </div>

              {/* Branch Train B */}
              <div className="flex flex-col items-center space-y-2">
                <div 
                  onClick={() => setSelectedNode("train-b")}
                  className={`cursor-pointer transition-all duration-200 w-full p-3.5 rounded-xl border ${
                    selectedNode === "train-b" 
                      ? "border-orange-500 bg-orange-950/60 shadow-lg shadow-orange-500/10" 
                      : "border-orange-500/30 bg-slate-900 hover:border-orange-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-400">Train B: Golgumbaz Express (#16536)</span>
                    <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30">
                      +11 min delay
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Held at Maddur outer distant signal waiting for block clearance</div>
                </div>

                <ArrowDown className="w-4 h-4 text-amber-500/60" />

                <div 
                  onClick={() => setSelectedNode("queue-2")}
                  className={`cursor-pointer transition-all duration-200 w-full p-3.5 rounded-xl border ${
                    selectedNode === "queue-2" 
                      ? "border-amber-500 bg-amber-950/60 shadow-lg shadow-amber-500/10" 
                      : "border-amber-500/30 bg-slate-900 hover:border-amber-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">Headway Compression</span>
                    <span className="text-xs font-mono text-amber-300">Channapatna</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Slows to 45 km/h on double yellow signal aspects</div>
                </div>
              </div>
            </div>

            <ArrowDown className="w-5 h-5 text-rose-500 my-3" />

            {/* Level 5: Net Network Cascading Impact */}
            <div 
              onClick={() => setSelectedNode("final-impact")}
              className={`cursor-pointer transition-all duration-200 w-full max-w-lg p-4 rounded-xl border ${
                selectedNode === "final-impact" 
                  ? "border-rose-500 bg-rose-950/80 shadow-xl shadow-rose-500/20 scale-[1.02]" 
                  : "border-rose-500/40 bg-slate-900 hover:border-rose-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-rose-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    5. Total Cascading Network Impact
                  </span>
                </div>
                <span className="text-sm font-mono font-black text-rose-300 bg-rose-900/60 px-2.5 py-1 rounded border border-rose-500/40">
                  +28 min Lost Corridor Buffer
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                A 3-minute precedence hold at Mandya propagated into 28 minutes of cumulative delay across 4 trailing passenger and freight schedules.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
