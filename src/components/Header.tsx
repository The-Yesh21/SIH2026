import React, { useState, useEffect } from "react";
import { TrainTrack, Sliders, Radio, Activity, Shield, Sparkles, Clock, Sun, Moon, Sunrise } from "lucide-react";

export type CorridorShift = "MIDDAY" | "MORNING_RUSH" | "NIGHT_WINDOW";

interface HeaderProps {
  showScenarioBar: boolean;
  setShowScenarioBar: (show: boolean) => void;
  injectedDelay: number;
  weather: string;
  shift: CorridorShift;
  setShift: (shift: CorridorShift) => void;
}

export function Header({
  showScenarioBar,
  setShowScenarioBar,
  injectedDelay,
  weather,
  shift,
  setShift,
}: HeaderProps) {
  const [realClock, setRealClock] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setRealClock(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const hasActiveDisruptions = injectedDelay > 0 || weather !== "CLEAR";

  const getShiftLabel = () => {
    switch (shift) {
      case "MIDDAY":
        return { name: "Midday Express Run", time: "12:54 PM", icon: Sun, color: "text-amber-400" };
      case "MORNING_RUSH":
        return { name: "Morning Commuter Peak", time: "07:30 AM", icon: Sunrise, color: "text-cyan-400" };
      case "NIGHT_WINDOW":
        return { name: "Night Maintenance & Freight Block", time: "00:58 AM", icon: Moon, color: "text-indigo-400" };
    }
  };

  const currentShiftInfo = getShiftLabel();
  const ShiftIcon = currentShiftInfo.icon;

  return (
    <header className="border-b border-rail-700/80 bg-rail-900/95 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
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

        {/* Center: Shift & Operating Time Selector */}
        <div className="flex items-center gap-1 bg-rail-950 p-1 rounded-2xl border border-rail-700 font-mono text-xs">
          <button
            onClick={() => setShift("MIDDAY")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              shift === "MIDDAY"
                ? "bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Midday (12:54 PM)</span>
          </button>

          <button
            onClick={() => setShift("MORNING_RUSH")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              shift === "MORNING_RUSH"
                ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sunrise className="w-3.5 h-3.5 text-cyan-400" />
            <span>Morning (07:30 AM)</span>
          </button>

          <button
            onClick={() => setShift("NIGHT_WINDOW")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              shift === "NIGHT_WINDOW"
                ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Night (00:58 AM)</span>
          </button>
        </div>

        {/* Right: Telemetry Readout & What-If Button */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Active Operating Time */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rail-950 border border-rail-700 text-xs font-mono">
            <ShiftIcon className={`w-3.5 h-3.5 ${currentShiftInfo.color} animate-pulse`} />
            <span className="text-white font-bold">{currentShiftInfo.time}</span>
            <span className="text-slate-500 text-[10px]">({currentShiftInfo.name})</span>
          </div>

          {/* Tactical What-If Disruption Simulator Toggle */}
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
