import React, { useState, useEffect } from "react";
import {
  TrainTrack,
  Sliders,
  Radio,
  Clock,
  Sun,
  Moon,
  Sunrise,
  RotateCcw,
  Play,
  Pause,
} from "lucide-react";
import { formatClockMinutes } from "../lib/rail/timeResolver";

interface HeaderProps {
  showScenarioBar: boolean;
  setShowScenarioBar: (show: boolean) => void;
  injectedDelay: number;
  weather: string;
  activeClockMinutes: number;
  setActiveClockMinutes: (mins: number) => void;
  isRealTimeSynced: boolean;
  setIsRealTimeSynced: (synced: boolean) => void;
}

export function Header({
  showScenarioBar,
  setShowScenarioBar,
  injectedDelay,
  weather,
  activeClockMinutes,
  setActiveClockMinutes,
  isRealTimeSynced,
  setIsRealTimeSynced,
}: HeaderProps) {
  // Sync with real-time clock when in real-time mode
  useEffect(() => {
    if (!isRealTimeSynced) return;

    const updateClock = () => {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      setActiveClockMinutes(currentMins);
    };

    updateClock();
    const interval = setInterval(updateClock, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [isRealTimeSynced, setActiveClockMinutes]);

  const hasActiveDisruptions = injectedDelay > 0 || weather !== "CLEAR";

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsRealTimeSynced(false);
    setActiveClockMinutes(Number(e.target.value));
  };

  const handlePresetClick = (mins: number) => {
    setIsRealTimeSynced(false);
    setActiveClockMinutes(mins);
  };

  const handleSyncRealTime = () => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    setActiveClockMinutes(currentMins);
    setIsRealTimeSynced(true);
  };

  return (
    <header className="border-b border-rail-700/80 bg-rail-900/95 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
        {/* Left: Branding & Corridor Identity */}
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10 shrink-0">
            <TrainTrack className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold tracking-tight text-white font-sans">
                RailRakshak
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Live COA-AI
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              SWR Corridor · <strong className="text-slate-200">Mysuru (MYS) ➔ KSR Bengaluru (SBC)</strong> · 138.25 km
            </p>
          </div>
        </div>

        {/* Center: Dynamic Real-Time Time Scrubber */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-rail-950 p-2 rounded-2xl border border-rail-700 font-mono text-xs">
          {/* Time Display & Real-Time Sync Toggle */}
          <div className="flex items-center justify-between sm:justify-start gap-2 px-2">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-sm bg-rail-900 px-3 py-1 rounded-xl border border-rail-700/80">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>{formatClockMinutes(activeClockMinutes)}</span>
            </div>

            <button
              onClick={handleSyncRealTime}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                isRealTimeSynced
                  ? "bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-sm"
                  : "bg-rail-900 border-rail-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {isRealTimeSynced ? "🟢 Real-Time Clock (Now)" : "Sync Real-Time"}
            </button>
          </div>

          {/* Quick Scrub Presets */}
          <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-rail-800 pt-2 sm:pt-0 sm:pl-2.5">
            {[
              { label: "Night (01:25 AM)", mins: 85 },
              { label: "Morning (07:30 AM)", mins: 450 },
              { label: "Midday (12:54 PM)", mins: 774 },
              { label: "Evening (19:00 PM)", mins: 1140 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => handlePresetClick(p.mins)}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${
                  !isRealTimeSynced && Math.abs(activeClockMinutes - p.mins) < 30
                    ? "bg-cyan-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-rail-900"
                }`}
              >
                {p.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Right: What-If Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowScenarioBar(!showScenarioBar)}
            className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
              showScenarioBar
                ? "bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400"
                : hasActiveDisruptions
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30"
                : "bg-rail-800 hover:bg-rail-750 border-rail-700 text-slate-200 hover:border-slate-500"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 transition-transform group-hover:rotate-45" />
            <span>{showScenarioBar ? "Close Simulator" : "What-If Simulator"}</span>
            {hasActiveDisruptions && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
