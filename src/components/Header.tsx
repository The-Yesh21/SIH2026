import React, { useState, useEffect } from "react";
import {
  TrainTrack,
  Sliders,
  Radio,
  Clock,
  Cpu,
  CheckCircle2,
  Sparkles,
  Satellite,
  Info,
} from "lucide-react";
import { formatClockMinutes } from "../lib/rail/timeResolver";
import { checkBackendHealth, wakeUpBackend } from "../lib/rail/apiClient";

interface HeaderProps {
  showScenarioBar: boolean;
  setShowScenarioBar: (show: boolean) => void;
  injectedDelay: number;
  weather: string;
  activeClockMinutes: number;
  setActiveClockMinutes: (mins: number) => void;
  isRealTimeSynced: boolean;
  setIsRealTimeSynced: (synced: boolean) => void;
  activeTab: "COCKPIT" | "OPTIMAL_ROUTE" | "SIMULATOR" | "LOCO_PILOT" | "STITCH_INSIGHT" | "PAIN_FACTORS" | "ANALYSIS";
  setActiveTab: (tab: "COCKPIT" | "OPTIMAL_ROUTE" | "SIMULATOR" | "LOCO_PILOT" | "STITCH_INSIGHT" | "PAIN_FACTORS" | "ANALYSIS") => void;
  onOpenCorridorBriefing?: () => void;
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
  activeTab,
  setActiveTab,
  onOpenCorridorBriefing,
}: HeaderProps) {
  const [pythonBackendOnline, setPythonBackendOnline] = useState<boolean>(false);
  const [isWaking, setIsWaking] = useState<boolean>(false);

  useEffect(() => {
    const probe = async () => {
      const isUp = await checkBackendHealth();
      setPythonBackendOnline(isUp);
    };
    probe();
    const interval = setInterval(probe, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleWakeUp = async () => {
    if (pythonBackendOnline || isWaking) return;
    setIsWaking(true);
    await wakeUpBackend();
    const isUp = await checkBackendHealth();
    setPythonBackendOnline(isUp);
    setIsWaking(false);
  };

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
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
        {/* Left: Branding & Corridor Identity */}
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 flex items-center justify-center shrink-0 rounded-2xl bg-indigo-50 border border-indigo-100 p-1 shadow-xs">
            <img src="/logo.svg" alt="RailRakshak Logo" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-heading font-bold text-slate-900 tracking-tight">
                RailRakshak
              </h1>
              {/* Python ML Backend Status Badge with One-Click Wake-Up */}
              <button
                onClick={handleWakeUp}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-data font-semibold border transition-all cursor-pointer ${
                  pythonBackendOnline
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : isWaking
                    ? "bg-amber-50 text-amber-700 border-amber-300 animate-pulse"
                    : "bg-slate-100 text-slate-600 border-slate-300 hover:border-amber-400 hover:text-amber-700"
                }`}
                title={
                  pythonBackendOnline
                    ? "FastAPI Python ML Intelligence Core Active (LightGBM + SHAP)"
                    : isWaking
                    ? "Waking up Render Python server from sleep..."
                    : "Server sleeping. Click to wake up Render Python ML instance!"
                }
              >
                {isWaking ? (
                  <div className="w-2.5 h-2.5 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                ) : (
                  <Cpu className="w-3 h-3" />
                )}
                <span>
                  {pythonBackendOnline
                    ? "Python ML Engine Online"
                    : isWaking
                    ? "Waking Cloud Engine..."
                    : "Hybrid Offline Mode (Click to Wake)"}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={onOpenCorridorBriefing}
                className="text-xs font-body text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer group"
                title="Click to view Evaluator Corridor Scope Briefing"
              >
                <span>SWR Corridor · <strong className="text-slate-900 group-hover:text-indigo-600">Mysuru (MYS) ➔ KSR Bengaluru (SBC)</strong> · 138.25 km</span>
                <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-mono font-bold">
                  PROTOTYPE SCOPE
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Center: Dynamic Real-Time Time Scrubber */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-50 p-2 rounded-xl border border-slate-200 font-data text-xs">
          {/* Time Display & Real-Time Sync Toggle */}
          <div className="flex items-center justify-between sm:justify-start gap-2 px-2">
            <div className="flex items-center gap-1.5 text-slate-900 font-data font-semibold text-sm">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>{formatClockMinutes(activeClockMinutes)}</span>
            </div>

            <button
              onClick={handleSyncRealTime}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                isRealTimeSynced
                  ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                  : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {isRealTimeSynced ? "Real-Time Clock (Now)" : "Sync Real-Time"}
            </button>
          </div>

          {/* Quick Scrub Presets */}
          <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-2.5">
            {[
              { label: "Night (01:25 AM)", mins: 85 },
              { label: "Morning (07:30 AM)", mins: 450 },
              { label: "Midday (12:54 PM)", mins: 774 },
              { label: "Evening (19:00 PM)", mins: 1140 },
            ].map((p) => {
              const isActive = !isRealTimeSynced && Math.abs(activeClockMinutes - p.mins) < 30;
              return (
                <button
                  key={p.label}
                  onClick={() => handlePresetClick(p.mins)}
                  className={`px-2 py-1 rounded-md transition-all whitespace-nowrap text-xs ${
                    isActive
                      ? "bg-indigo-600 text-white font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                  }`}
                >
                  {p.label.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: What-If Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowScenarioBar(!showScenarioBar)}
            className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
              showScenarioBar
                ? "bg-amber-100 border-amber-300 text-amber-800 shadow-xs"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-600 transition-transform group-hover:rotate-45" />
            <span>{showScenarioBar ? "Close Simulator" : "What-If Simulator"}</span>
          </button>
        </div>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x py-1.5 border-t border-slate-100">
        <button
          onClick={() => setActiveTab("COCKPIT")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-heading font-semibold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap shrink-0 ${
            activeTab === "COCKPIT"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-400" />
          <span>Section Controller Cockpit</span>
        </button>

        <button
          onClick={() => setActiveTab("OPTIMAL_ROUTE")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-heading font-bold transition-all duration-200 whitespace-nowrap border shrink-0 ${
            activeTab === "OPTIMAL_ROUTE"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
              : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>⚡ AI Dispatch Optimizer</span>
          <span className="px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 text-[10px] font-mono font-black uppercase">
            OPTIMAL
          </span>
        </button>

        <button
          onClick={() => setActiveTab("SIMULATOR")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-heading font-bold transition-all duration-200 whitespace-nowrap border shrink-0 ${
            activeTab === "SIMULATOR"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
              : "bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <span>🚂 Digital Twin Simulator</span>
          <span className="px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-900 text-[10px] font-mono font-black uppercase">
            PHYSICS
          </span>
        </button>

        <button
          onClick={() => setActiveTab("LOCO_PILOT")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-heading font-bold transition-all duration-200 whitespace-nowrap border shrink-0 ${
            activeTab === "LOCO_PILOT"
              ? "bg-sky-600 text-white border-sky-600 shadow-xs"
              : "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100"
          }`}
        >
          <Satellite className="w-4 h-4 text-sky-600 animate-pulse" />
          <span>🛰️ Loco-Cab DAS (NavIC)</span>
          <span className="px-1.5 py-0.2 rounded bg-sky-200 text-sky-900 text-[10px] font-mono font-black uppercase">
            RTIS / NavIC
          </span>
        </button>

        <button
          onClick={() => setActiveTab("STITCH_INSIGHT")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-heading font-bold transition-all duration-200 whitespace-nowrap border shrink-0 ${
            activeTab === "STITCH_INSIGHT"
              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
              : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>📊 Station Master Briefing</span>
          <span className="px-1.5 py-0.2 rounded bg-blue-200 text-blue-900 text-[10px] font-mono font-black uppercase">
            PORTAL
          </span>
        </button>

        <button
          onClick={() => setActiveTab("PAIN_FACTORS")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-heading font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap shrink-0 ${
            activeTab === "PAIN_FACTORS"
              ? "bg-amber-100 text-amber-900 font-bold"
              : "text-slate-600 hover:text-amber-800 hover:bg-amber-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Bottleneck Forensics</span>
        </button>

        <button
          onClick={() => setActiveTab("ANALYSIS")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-heading font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap shrink-0 ${
            activeTab === "ANALYSIS"
              ? "bg-slate-900 text-white font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Sliders className="w-4 h-4 text-slate-500" />
          <span>Fleet KPI Analytics</span>
        </button>
      </div>
    </header>
  );
}
