import React from "react";
import { TrainConfig } from "../lib/rail/types";
import { SWR_CORRIDOR_STATIONS, DEFAULT_PSR_LIST, DEFAULT_LC_GATES } from "../lib/rail/infrastructure";
import { CORRIDOR_ACTIVE_TRAINS } from "../lib/rail/trains";
import { Activity, Radio, ShieldCheck, MapPin, AlertTriangle, Train } from "lucide-react";

interface CorridorTrafficMapProps {
  selectedTrain: TrainConfig;
}

export function CorridorTrafficMap({ selectedTrain }: CorridorTrafficMapProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          Live Double-Track Corridor Traffic Map (Up &amp; Down Lines)
        </h3>
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400" /> Up-Line (MYS → SBC)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" /> Down-Line (SBC → MYS)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Loop Stabling
          </span>
        </div>
      </div>

      {/* Schematic Multi-Track Layout */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-6">
        {/* Track 1: UP-LINE (MYS -> SBC) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
            <span className="font-bold flex items-center gap-1.5">
              <Train className="h-3.5 w-3.5" /> UP-LINE: MYS ➔ SBC (Eastbound)
            </span>
            <span className="text-slate-500 text-[10px]">Electrified 25kV AC Double Track</span>
          </div>

          <div className="relative h-4 w-full rounded-full bg-slate-900 border border-slate-800 flex items-center px-2">
            <div className="absolute inset-x-0 h-0.5 bg-slate-700" />

            {/* Render Trains on UP Line */}
            {CORRIDOR_ACTIVE_TRAINS.filter((t) => t.id !== "12614").map((t) => {
              const leftPct = Math.min(100, Math.max(0, (t.currentLocationKm / 138.250) * 100));
              const isSelected = t.id === selectedTrain.id;

              return (
                <div
                  key={t.id}
                  className="absolute -top-3.5 flex flex-col items-center transition-all duration-700 -translate-x-1/2 z-10"
                  style={{ left: `${leftPct}%` }}
                >
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[9px] font-mono font-bold shadow-lg ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/30 animate-pulse"
                        : t.type === "VANDE_BHARAT"
                        ? "border-amber-400 bg-amber-500 text-slate-950"
                        : "border-slate-400 bg-slate-700 text-white"
                    }`}
                  >
                    🚆
                  </div>
                  <span
                    className={`text-[9px] font-mono font-bold px-1 rounded whitespace-nowrap mt-0.5 ${
                      isSelected ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40" : "bg-slate-900 text-slate-300"
                    }`}
                  >
                    {t.id} ({t.currentSpeedKmph}k)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Track 2: DOWN-LINE (SBC -> MYS) */}
        <div className="space-y-2 pt-2 border-t border-slate-900">
          <div className="flex items-center justify-between text-xs font-mono text-indigo-300">
            <span className="font-bold flex items-center gap-1.5">
              <Train className="h-3.5 w-3.5" /> DOWN-LINE: SBC ➔ MYS (Westbound)
            </span>
            <span className="text-slate-500 text-[10px]">Opposing Scheduled Traffic</span>
          </div>

          <div className="relative h-4 w-full rounded-full bg-slate-900 border border-slate-800 flex items-center px-2">
            <div className="absolute inset-x-0 h-0.5 bg-slate-700" />

            {/* Wodeyar Express on Down-Line */}
            <div
              className="absolute -top-3.5 flex flex-col items-center -translate-x-1/2 z-10"
              style={{ left: "68%" }}
            >
              <div className="h-5 w-5 rounded-full border-2 border-indigo-400 bg-indigo-500 text-slate-950 flex items-center justify-center text-[9px] font-mono font-bold shadow-lg">
                🚆
              </div>
              <span className="text-[9px] font-mono font-bold px-1 rounded bg-slate-900 text-indigo-300 border border-indigo-500/40 mt-0.5 whitespace-nowrap">
                12614 Wodeyar (88k)
              </span>
            </div>
          </div>
        </div>

        {/* Station Markers Axis */}
        <div className="flex justify-between text-[9px] font-mono text-slate-400 pt-2 border-t border-slate-800">
          {SWR_CORRIDOR_STATIONS.filter((s) => s.isMajorJunction || s.hasLoopLine).map((s) => (
            <div key={s.code} className="flex flex-col items-center text-center">
              <div className="h-2 w-2 rounded-full bg-slate-600 mb-1" />
              <span className="font-bold text-slate-300">{s.code}</span>
              <span className="text-[8px] text-slate-500">{s.distanceFromMysKm.toFixed(0)}k</span>
              {s.hasLoopLine && (
                <span className="text-[7px] text-amber-500 font-sans mt-0.5">Loop 30k</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
