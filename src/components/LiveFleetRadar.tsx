import React from "react";
import { LiveTrainTelemetry } from "../lib/rail/liveTelemetryEngine";
import { SWR_CORRIDOR_STATIONS } from "../lib/rail/infrastructure";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Radio,
  Gauge,
  Navigation,
  MapPin,
  Activity,
  Zap,
} from "lucide-react";

interface LiveFleetRadarProps {
  fleet: LiveTrainTelemetry[];
  selectedTrainId: string;
  onSelectTrainId: (id: string) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  simSpeed: number;
  setSimSpeed: (speed: number) => void;
  onResetFleet: () => void;
}

export function LiveFleetRadar({
  fleet,
  selectedTrainId,
  onSelectTrainId,
  isPlaying,
  setIsPlaying,
  simSpeed,
  setSimSpeed,
  onResetFleet,
}: LiveFleetRadarProps) {
  const majorStations = [
    { code: "MYS", name: "Mysuru", km: 0.0 },
    { code: "PANP", name: "Pandavapura", km: 19.7 },
    { code: "MYA", name: "Mandya", km: 45.4 },
    { code: "MAD", name: "Maddur", km: 64.5 },
    { code: "CPT", name: "Channapatna", km: 82.8 },
    { code: "RMGM", name: "Ramanagaram", km: 93.9 },
    { code: "BID", name: "Bidadi", km: 108.6 },
    { code: "KGI", name: "Kengeri", km: 126.0 },
    { code: "SBC", name: "KSR Bengaluru", km: 138.25 },
  ];

  return (
    <div className="bg-rail-850/90 border border-rail-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
      {/* Header with Live NavIC Ping & Simulation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-rail-700/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white font-sans">
                Live Fleet NavIC-RTIS Radar
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Satellite Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Simultaneous real-time physics tracking across all 6 corridor trainsets
            </p>
          </div>
        </div>

        {/* Play / Pause / Speed Multiplier Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-rail-950 p-1.5 rounded-2xl border border-rail-700 font-mono text-xs">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all duration-200 ${
              isPlaying
                ? "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Live Run
              </>
            )}
          </button>

          {/* Speed Multipliers */}
          <div className="flex items-center bg-rail-900 rounded-xl p-0.5 border border-rail-800">
            {[1, 5, 15].map((spd) => (
              <button
                key={spd}
                onClick={() => setSimSpeed(spd)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  simSpeed === spd
                    ? "bg-cyan-600 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            onClick={onResetFleet}
            title="Reset to Scheduled Positions"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-rail-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-Time Linear Track Radar Diagram */}
      <div className="relative pt-6 pb-4 px-2 sm:px-4 space-y-6">
        {/* Double Electrified Track Graphic */}
        <div className="relative h-24 bg-rail-950/90 rounded-2xl border border-rail-700/80 p-3 overflow-hidden shadow-inner">
          {/* Track sleepers background */}
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-4 border-y border-rail-700/80 track-sleeper-pattern" />
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-cyan-500/40" />

          {/* Major Station Ticks */}
          {majorStations.map((stn) => {
            const leftPercent = (stn.km / 138.25) * 100;
            return (
              <div
                key={stn.code}
                className="absolute top-2 bottom-2 flex flex-col items-center justify-between pointer-events-none"
                style={{ left: `${leftPercent}%` }}
              >
                <span className="text-[9px] font-mono font-bold text-slate-400 bg-rail-900/90 px-1 rounded border border-rail-700">
                  {stn.code}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span className="text-[8px] font-mono text-slate-500">
                  {stn.km.toFixed(0)}k
                </span>
              </div>
            );
          })}

          {/* Dynamic Train Position Markers on Radar */}
          {fleet.map((t, idx) => {
            const leftPercent = Math.min(100, Math.max(0, (t.currentLocationKm / 138.25) * 100));
            const isSelected = selectedTrainId === t.trainId;

            const getTrainMarkerColor = () => {
              switch (t.type) {
                case "VANDE_BHARAT":
                  return "bg-cyan-400 text-slate-950 border-white ring-cyan-400";
                case "SHATABDI":
                  return "bg-amber-400 text-slate-950 border-white ring-amber-400";
                case "SUPERFAST":
                  return "bg-purple-400 text-slate-950 border-white ring-purple-400";
                case "EXPRESS":
                  return "bg-emerald-400 text-slate-950 border-white ring-emerald-400";
                case "MEMU":
                  return "bg-orange-400 text-slate-950 border-white ring-orange-400";
                default:
                  return "bg-slate-300 text-slate-950 border-white ring-slate-400";
              }
            };

            // Offset alternating trains vertically so they never collide visually
            const topOffset = idx % 2 === 0 ? "top-3" : "bottom-3";

            return (
              <button
                key={t.trainId}
                onClick={() => onSelectTrainId(t.trainId)}
                className={`absolute ${topOffset} -translate-x-1/2 z-20 transition-all duration-300 group flex flex-col items-center`}
                style={{ left: `${leftPercent}%` }}
              >
                <div
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold shadow-lg flex items-center gap-1 border transition-transform ${
                    isSelected ? "scale-110 ring-4 ring-cyan-500/30" : "hover:scale-105"
                  } ${getTrainMarkerColor()}`}
                >
                  <Navigation className="w-2.5 h-2.5 fill-current rotate-90" />
                  <span>#{t.trainId}</span>
                </div>
                <div className="text-[9px] font-mono font-bold text-cyan-300 bg-rail-950/90 px-1 rounded shadow mt-0.5 whitespace-nowrap">
                  {t.currentSpeedKmph} km/h
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Fleet Telemetry Tele-Ticker Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {fleet.map((t) => {
            const isSelected = selectedTrainId === t.trainId;
            return (
              <div
                key={t.trainId}
                onClick={() => onSelectTrainId(t.trainId)}
                className={`cursor-pointer p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
                  isSelected
                    ? "bg-rail-800 border-cyan-400 shadow-md ring-1 ring-cyan-400"
                    : "bg-rail-900/80 hover:bg-rail-800/80 border-rail-700/80"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white">
                      #{t.trainId}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                      {t.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    KM {t.currentLocationKm.toFixed(1)} · Next:{" "}
                    <strong className="text-slate-300">{t.nextStationCode}</strong> ({t.distanceToNextKm.toFixed(1)} km)
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <div className="text-xs font-bold text-cyan-400 flex items-center gap-1 justify-end">
                    <Gauge className="w-3.5 h-3.5" />
                    <span>{t.currentSpeedKmph} km/h</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Aspect: <span className="font-bold text-emerald-400">{t.liveAspect}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
