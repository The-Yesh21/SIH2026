import React, { useState } from "react";
import { TrainConfig } from "../lib/rail/types";
import {
  ALL_CORRIDOR_FLEET,
  resolveTrainAtClockTime,
  ResolvedLiveTrain,
} from "../lib/rail/timeResolver";
import { Zap, Navigation, Clock, ShieldAlert, Search, CheckCircle2, PlayCircle } from "lucide-react";

interface TrainSelectorProps {
  selectedTrainId: string;
  onSelectTrain: (train: TrainConfig) => void;
  activeClockMinutes: number;
}

export function TrainSelector({
  selectedTrainId,
  onSelectTrain,
  activeClockMinutes,
}: TrainSelectorProps) {
  const [searchInput, setSearchInput] = useState<string>("");

  const resolvedFleet: ResolvedLiveTrain[] = ALL_CORRIDOR_FLEET.map((train) =>
    resolveTrainAtClockTime(train, activeClockMinutes)
  );

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    const matched = resolvedFleet.find(
      (t) =>
        t.config.id.toLowerCase().includes(val.toLowerCase()) ||
        t.config.name.toLowerCase().includes(val.toLowerCase())
    );
    if (matched) {
      onSelectTrain(matched.config);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          24-Hour Corridor Fleet Status &amp; Live Train Lookup
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {resolvedFleet.map((resolved) => {
          const train = resolved.config;
          const isSelected = selectedTrainId === train.id;

          const getStatusBadge = () => {
            switch (resolved.operatingState) {
              case "RUNNING_ON_TRACK":
                return {
                  text: `🟢 RUNNING (KM ${resolved.currentLocationKm.toFixed(0)})`,
                  style: "bg-emerald-950/90 text-emerald-300 border-emerald-400 font-bold animate-pulse",
                };
              case "TRIP_COMPLETED":
                return {
                  text: "🏁 ARRIVED (At SBC)",
                  style: "bg-slate-900/90 text-slate-400 border-slate-700",
                };
              case "NOT_STARTED_YET":
                return {
                  text: `🕒 UPCOMING (${train.scheduledDep})`,
                  style: "bg-indigo-950/90 text-indigo-300 border-indigo-600/40",
                };
            }
          };

          const status = getStatusBadge();

          return (
            <button
              key={train.id}
              onClick={() => {
                onSelectTrain(train);
                setSearchInput(train.id);
              }}
              className={`group text-left p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? "bg-rail-800 border-cyan-400 shadow-xl ring-2 ring-cyan-400/40 scale-[1.02]"
                  : "bg-rail-850/80 hover:bg-rail-800/90 border-rail-700/80"
              }`}
            >
              {/* Header: Number & Live Operating State */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-mono font-bold text-white tracking-wide">
                  #{train.id}
                </span>
                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full border tracking-wide ${status.style}`}
                >
                  {status.text}
                </span>
              </div>

              {/* Train Name */}
              <div className="my-2">
                <div className="font-bold text-sm text-slate-100 group-hover:text-white line-clamp-1 font-sans">
                  {train.name}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center justify-between">
                  <span>
                    {train.scheduledDep} ➔ {train.scheduledArr}
                  </span>
                  <span className="text-cyan-400 font-semibold">
                    {train.scheduledStops.length === 2 ? "Non-Stop" : `${train.scheduledStops.length} Stops`}
                  </span>
                </div>
              </div>

              {/* Footer: Live Telemetry Indicator */}
              <div className="pt-2 border-t border-rail-700/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">
                  {resolved.operatingState === "RUNNING_ON_TRACK" ? (
                    <span className="text-emerald-400 font-bold">{resolved.currentSpeedKmph} km/h</span>
                  ) : resolved.operatingState === "TRIP_COMPLETED" ? (
                    <span className="text-slate-400">Trip Finished</span>
                  ) : (
                    <span className="text-indigo-300">At Mysuru (MYS)</span>
                  )}
                </span>
                <span className="text-slate-500 text-[10px]">
                  {train.type.replace("_", " ")}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
