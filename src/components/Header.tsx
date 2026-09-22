import React, { useState, useEffect } from "react";
import {
  TrainTrack,
  Sliders,
  Radio,
  Clock,
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
  activeTab: "COCKPIT" | "PAIN_FACTORS" | "ANALYSIS";
  setActiveTab: (tab: "COCKPIT" | "PAIN_FACTORS" | "ANALYSIS") => void;
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
    <header className="bg-ink/95 backdrop-blur-md border-b border-graphite sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
        {/* Left: Branding & Corridor Identity */}
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 flex items-center justify-center text-chalk shrink-0">
            <TrainTrack className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-heading font-bold text-chalk">
                RailRakshak
              </h1>
            </div>
            <p className="text-sm font-body text-steel">
              SWR Corridor · <strong className="text-chalk">Mysuru (MYS) ➔ KSR Bengaluru (SBC)</strong> · 138.25 km
            </p>
          </div>
        </div>

        {/* Center: Dynamic Real-Time Time Scrubber */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-surface p-2 rounded-lg border border-graphite font-data text-xs">
          {/* Time Display & Real-Time Sync Toggle */}
          <div className="flex items-center justify-between sm:justify-start gap-2 px-2">
            <div className="flex items-center gap-1.5 text-chalk font-data font-semibold text-sm">
              <Clock className="w-4 h-4" />
              <span>{formatClockMinutes(activeClockMinutes)}</span>
            </div>

            <button
              onClick={handleSyncRealTime}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                isRealTimeSynced
                  ? "bg-signal-green-muted border-signal-green text-signal-green"
                  : "bg-surface-raised border-graphite text-steel"
              }`}
            >
              {isRealTimeSynced ? "Real-Time Clock (Now)" : "Sync Real-Time"}
            </button>
          </div>

          {/* Quick Scrub Presets */}
          <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-graphite pt-2 sm:pt-0 sm:pl-2.5">
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
                  className={`px-2 py-1 rounded-md transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-surface-overlay text-chalk font-semibold"
                      : "text-steel hover:text-chalk hover:bg-surface-raised"
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
            className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
              showScenarioBar
                ? "bg-signal-amber-muted border-signal-amber text-signal-amber"
                : "bg-surface-raised hover:bg-surface-overlay text-chalk-dim border-graphite"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 transition-transform group-hover:rotate-45" />
            <span>{showScenarioBar ? "Close Simulator" : "What-If Simulator"}</span>
          </button>
        </div>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("COCKPIT")}
          className={`flex items-center gap-2 px-4 py-2 font-heading font-medium text-sm transition-all duration-200 whitespace-nowrap ${
            activeTab === "COCKPIT"
              ? "text-chalk border-b-2 border-chalk font-bold"
              : "text-steel hover:text-chalk border-b-2 border-transparent"
          }`}
        >
          <Radio className="w-4 h-4 text-signal-green" />
          <span>Corridor Dynamic Cockpit</span>
        </button>

        <button
          onClick={() => setActiveTab("PAIN_FACTORS")}
          className={`flex items-center gap-2 px-4 py-2 font-heading font-medium text-sm transition-all duration-200 whitespace-nowrap ${
            activeTab === "PAIN_FACTORS"
              ? "text-signal-amber border-b-2 border-signal-amber font-bold"
              : "text-steel hover:text-signal-amber border-b-2 border-transparent"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-signal-red animate-pulse" />
          <span>Pain Factors &amp; Recovery Confidence</span>
        </button>

        <button
          onClick={() => setActiveTab("ANALYSIS")}
          className={`flex items-center gap-2 px-4 py-2 font-heading font-medium text-sm transition-all duration-200 whitespace-nowrap ${
            activeTab === "ANALYSIS"
              ? "text-chalk border-b-2 border-chalk font-bold"
              : "text-steel hover:text-chalk border-b-2 border-transparent"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Fleet Delay Matrix &amp; Forensics</span>
        </button>
      </div>
    </header>
  );
}
