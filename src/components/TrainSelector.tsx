import React from "react";
import { TrainConfig } from "../lib/rail/types";
import { CORRIDOR_ACTIVE_TRAINS } from "../lib/rail/trains";
import { Train, Zap, Shield, Clock } from "lucide-react";

interface TrainSelectorProps {
  selectedTrainId: string;
  onSelectTrain: (train: TrainConfig) => void;
}

export function TrainSelector({ selectedTrainId, onSelectTrain }: TrainSelectorProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
          <Train className="h-4 w-4 text-cyan-400" />
          Active Corridor Services
        </h2>
        <span className="text-[10px] font-mono text-slate-500">MYS → SBC</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {CORRIDOR_ACTIVE_TRAINS.map((t) => {
          const isSelected = t.id === selectedTrainId;
          const isVande = t.type === "VANDE_BHARAT";
          const isShatabdi = t.type === "SHATABDI";

          return (
            <button
              key={t.id}
              onClick={() => onSelectTrain(t)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? "border-cyan-500 bg-cyan-950/40 text-cyan-100 ring-1 ring-cyan-500/30"
                  : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-100 text-sm">
                  {t.id} {t.name}
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isVande
                      ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                      : isShatabdi
                      ? "bg-indigo-950 text-indigo-300 border border-indigo-500/40"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {t.type.replace("_", " ")}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Dep: {t.scheduledDep}</span>
                <span>Arr: {t.scheduledArr}</span>
                <span className="text-cyan-400 font-semibold">{t.sectionalMpsKmph} km/h</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
