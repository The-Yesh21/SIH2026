import React, { useState } from "react";
import { TrainConfig } from "../lib/rail/types";
import { CORRIDOR_ACTIVE_TRAINS } from "../lib/rail/trains";
import { Zap, Navigation, Clock, ShieldAlert, Search } from "lucide-react";

interface TrainSelectorProps {
  selectedTrainId: string;
  onSelectTrain: (train: TrainConfig) => void;
}

export function TrainSelector({
  selectedTrainId,
  onSelectTrain,
}: TrainSelectorProps) {
  const [searchInput, setSearchInput] = useState<string>("");

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    const matched = CORRIDOR_ACTIVE_TRAINS.find(
      (t) =>
        t.id.toLowerCase().includes(val.toLowerCase()) ||
        t.name.toLowerCase().includes(val.toLowerCase())
    );
    if (matched) {
      onSelectTrain(matched);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          Corridor Active Services &amp; Live Train Lookup
        </h2>

        {/* Inline Train Number Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by Train # (e.g. 12613, 20608)..."
            className="w-full bg-rail-950 border border-rail-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 shadow-inner"
          />
        </div>
      </div>

      {/* Grid of Train Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {CORRIDOR_ACTIVE_TRAINS.map((train) => {
          const isSelected = selectedTrainId === train.id;

          const getRakeTheme = () => {
            switch (train.type) {
              case "VANDE_BHARAT":
                return {
                  badge: "bg-blue-950/80 text-blue-300 border-blue-500/50",
                  tag: "Trainset EMU",
                  accent: "from-blue-600/30 to-cyan-500/20",
                  border: isSelected
                    ? "border-cyan-400 shadow-cyan-500/20"
                    : "border-rail-700/80 hover:border-cyan-600/50",
                };
              case "SHATABDI":
                return {
                  badge: "bg-amber-950/80 text-amber-300 border-amber-500/50",
                  tag: "WAP-7 Premier",
                  accent: "from-amber-600/30 to-yellow-500/20",
                  border: isSelected
                    ? "border-amber-400 shadow-amber-500/20"
                    : "border-rail-700/80 hover:border-amber-600/50",
                };
              case "SUPERFAST":
                return {
                  badge: "bg-purple-950/80 text-purple-300 border-purple-500/50",
                  tag: "LHB Superfast",
                  accent: "from-purple-600/30 to-indigo-500/20",
                  border: isSelected
                    ? "border-purple-400 shadow-purple-500/20"
                    : "border-rail-700/80 hover:border-purple-600/50",
                };
              case "EXPRESS":
                return {
                  badge: "bg-emerald-950/80 text-emerald-300 border-emerald-500/50",
                  tag: "Express",
                  accent: "from-emerald-600/30 to-teal-500/20",
                  border: isSelected
                    ? "border-emerald-400 shadow-emerald-500/20"
                    : "border-rail-700/80 hover:border-emerald-600/50",
                };
              case "MEMU":
                return {
                  badge: "bg-orange-950/80 text-orange-300 border-orange-500/50",
                  tag: "All-Stop EMU",
                  accent: "from-orange-600/30 to-amber-500/20",
                  border: isSelected
                    ? "border-orange-400 shadow-orange-500/20"
                    : "border-rail-700/80 hover:border-orange-600/50",
                };
              case "FREIGHT_BOXN":
                return {
                  badge: "bg-slate-900 text-slate-300 border-slate-600",
                  tag: "Cargo Rake",
                  accent: "from-slate-700/30 to-slate-800/20",
                  border: isSelected
                    ? "border-slate-300 shadow-slate-500/20"
                    : "border-rail-700/80 hover:border-slate-500",
                };
            }
          };

          const theme = getRakeTheme();

          return (
            <button
              key={train.id}
              onClick={() => {
                onSelectTrain(train);
                setSearchInput(train.id);
              }}
              className={`group text-left p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? `bg-gradient-to-b ${theme.accent} bg-rail-850 shadow-xl ${theme.border} ring-1 ring-white/10 scale-[1.02]`
                  : `bg-rail-850/80 hover:bg-rail-800/90 ${theme.border}`
              }`}
            >
              {/* Header: Number & Tag */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-mono font-bold text-white tracking-wide">
                  #{train.id}
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${theme.badge}`}
                >
                  {theme.tag}
                </span>
              </div>

              {/* Train Name */}
              <div className="my-2">
                <div className="font-bold text-sm text-slate-100 group-hover:text-white line-clamp-1">
                  {train.name}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center justify-between">
                  <span>
                    {train.scheduledDep} ➔ {train.scheduledArr}
                  </span>
                </div>
              </div>

              {/* Footer: Halts & Speed */}
              <div className="pt-2 border-t border-rail-700/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">
                  {train.scheduledStops.length === 2
                    ? "⚡ Non-Stop"
                    : `🛑 ${train.scheduledStops.length} Halts`}
                </span>
                <span className="text-cyan-400 font-semibold">
                  {train.sectionalMpsKmph} km/h
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
