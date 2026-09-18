import React from "react";
import { StationForecastRow, TrainConfig } from "../lib/rail/types";
import { Activity, Radio, CheckCircle2, AlertTriangle, ShieldCheck, MapPin } from "lucide-react";

interface CorridorTrackMapProps {
  train: TrainConfig;
  stationBreakdown: StationForecastRow[];
}

export function CorridorTrackMap({ train, stationBreakdown }: CorridorTrackMapProps) {
  const progressPct = Math.min(100, Math.max(0, Math.round((train.currentLocationKm / 138.250) * 100)));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          Corridor Track Topology &amp; Automatic Signaling (138.25 km)
        </h3>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Clear (130)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Attention/Caution (75/30)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Danger (0)
          </span>
        </div>
      </div>

      {/* Schematic Track Progress Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>MYS (0.0 km)</span>
          <span className="text-cyan-400 font-bold">
            {train.name} · {train.currentLocationKm.toFixed(1)} km ({progressPct}%)
          </span>
          <span>SBC (138.25 km)</span>
        </div>

        <div className="relative h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-400 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Station Markers */}
        <div className="flex justify-between text-[9px] font-mono text-slate-400 overflow-x-auto pt-1 pb-1">
          {stationBreakdown.map((s) => {
            const isCurrent = s.trackStatus === "CURRENT_RUNNING";
            const isPast = s.trackStatus === "CLEARED";
            return (
              <div key={s.code} className="flex flex-col items-center min-w-[28px]">
                <div
                  className={`h-2.5 w-2.5 rounded-full border ${
                    isCurrent
                      ? "border-amber-400 bg-amber-400 ring-4 ring-amber-500/30 animate-pulse"
                      : isPast
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-700 bg-slate-900"
                  }`}
                />
                <span className={`mt-1 font-bold ${isCurrent ? "text-amber-300" : ""}`}>
                  {s.code}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Microscopic Station-by-Station Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950 uppercase text-[10px] text-slate-400">
            <tr>
              <th className="py-2.5 px-3">Station Node</th>
              <th className="py-2.5 px-2">Dist (MYS)</th>
              <th className="py-2.5 px-2">Chainage (SBC)</th>
              <th className="py-2.5 px-3">Booked</th>
              <th className="py-2.5 px-3">Dynamic ETA</th>
              <th className="py-2.5 px-2">Speed MPS</th>
              <th className="py-2.5 px-3 text-right">Signal Aspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
            {stationBreakdown.map((s) => (
              <tr
                key={s.code}
                className={
                  s.trackStatus === "CURRENT_RUNNING"
                    ? "bg-amber-950/30 font-bold text-amber-200"
                    : s.trackStatus === "CLEARED"
                    ? "text-slate-500"
                    : "text-slate-300 hover:bg-slate-800/20"
                }
              >
                <td className="py-2 px-3 flex items-center gap-1.5">
                  {s.trackStatus === "CURRENT_RUNNING" && (
                    <Radio className="h-3 w-3 text-amber-400 animate-pulse" />
                  )}
                  {s.name} ({s.code})
                </td>
                <td className="py-2 px-2 text-slate-400">{s.distanceFromMysKm.toFixed(1)}k</td>
                <td className="py-2 px-2 text-slate-500">{s.chainageFromSbcKm.toFixed(1)}k</td>
                <td className="py-2 px-3 text-slate-400">{s.bookedTime}</td>
                <td className="py-2 px-3 text-cyan-300 font-bold">{s.predictedTime}</td>
                <td className="py-2 px-2 text-slate-300">{s.allowedSpeedKmph} km/h</td>
                <td className="py-2 px-3 text-right">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      s.signalAspect === "GREEN"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                        : s.signalAspect === "DOUBLE_YELLOW"
                        ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                        : s.signalAspect === "YELLOW"
                        ? "bg-yellow-950 text-yellow-300 border border-yellow-500/40"
                        : "bg-rose-950 text-rose-300 border border-rose-500/40"
                    }`}
                  >
                    {s.signalAspect}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
