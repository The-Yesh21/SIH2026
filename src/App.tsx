import React, { useState, useMemo } from "react";
import { TrainConfig } from "./lib/rail/types";
import { DEFAULT_ENVIRONMENT, EnvironmentalConditions } from "./lib/rail/restrictions";
import { computeDynamicEta } from "./lib/rail/dynamicEta";
import {
  ALL_CORRIDOR_FLEET,
  resolveTrainAtClockTime,
} from "./lib/rail/timeResolver";
import { Header } from "./components/Header";
import { TrainSelector } from "./components/TrainSelector";
import { DelayIntelligenceDeck } from "./components/DelayIntelligenceDeck";
import { CorridorPhysicalSpine } from "./components/CorridorPhysicalSpine";
import { CorridorDelayHotspots } from "./components/CorridorDelayHotspots";
import { Flame } from "lucide-react";

export function App() {
  // Initialize with exact real-world clock time (in minutes from midnight)
  const [activeClockMinutes, setActiveClockMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [isRealTimeSynced, setIsRealTimeSynced] = useState<boolean>(true);

  const [selectedTrainId, setSelectedTrainId] = useState<string>("12613");
  const [injectedDelay, setInjectedDelay] = useState<number>(0);
  const [environment, setEnvironment] = useState<EnvironmentalConditions>(DEFAULT_ENVIRONMENT);
  const [showScenarioBar, setShowScenarioBar] = useState<boolean>(false);
  const [showHotspots, setShowHotspots] = useState<boolean>(false);

  // Find base train config from full 24-hour fleet
  const baseTrain =
    ALL_CORRIDOR_FLEET.find((t) => t.id === selectedTrainId) ||
    ALL_CORRIDOR_FLEET[0];

  // Dynamically resolve train location, speed, and state at the active clock time
  const resolvedLive = useMemo(() => {
    return resolveTrainAtClockTime(baseTrain, activeClockMinutes);
  }, [baseTrain, activeClockMinutes]);

  // Compute Dynamic Multi-Factor ETA based on resolved live state
  const prediction = useMemo(() => {
    return computeDynamicEta({
      train: resolvedLive.config,
      userInjectedDelayMin: injectedDelay,
      environment,
    });
  }, [resolvedLive.config, injectedDelay, environment]);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 rail-grid-pattern">
      {/* 1. Masthead Dispatcher Navigation with Live Real-Time Clock Scrubber */}
      <Header
        showScenarioBar={showScenarioBar}
        setShowScenarioBar={setShowScenarioBar}
        injectedDelay={injectedDelay}
        weather={environment.weather}
        activeClockMinutes={activeClockMinutes}
        setActiveClockMinutes={setActiveClockMinutes}
        isRealTimeSynced={isRealTimeSynced}
        setIsRealTimeSynced={setIsRealTimeSynced}
      />

      {/* 2. Main Mission Control Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-7">
        
        {/* Train Command Deck with 24-Hour Fleet and Live State Status */}
        <TrainSelector
          selectedTrainId={selectedTrainId}
          onSelectTrain={(train) => {
            setSelectedTrainId(train.id);
            setInjectedDelay(0);
          }}
          activeClockMinutes={activeClockMinutes}
        />

        {/* Live Train Status & Where-Is-My-Train Dynamic ETA Deck */}
        <DelayIntelligenceDeck
          prediction={prediction}
          selectedTrain={resolvedLive.config}
          environment={environment}
          setEnvironment={setEnvironment}
          injectedDelay={injectedDelay}
          setInjectedDelay={setInjectedDelay}
          showScenarioBar={showScenarioBar}
          activeClockMinutes={activeClockMinutes}
        />

        {/* Physical Track Spine & Station-by-Station Live Running Log */}
        <CorridorPhysicalSpine
          prediction={prediction}
          selectedTrain={resolvedLive.config}
        />

        {/* Delay Hotspot Analysis Section (Collapsible) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowHotspots(!showHotspots)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rail-850 hover:bg-rail-800 border border-rail-700 text-xs font-mono font-bold text-amber-300 transition-colors"
            >
              <Flame className="w-4 h-4 text-rose-400" />
              <span>
                {showHotspots
                  ? "Hide Delay Generation Hotspots"
                  : "🔥 View Where Most Delays Are Created (Hotspot Analytics)"}
              </span>
            </button>
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              SWR Mysore–Bangalore Division
            </span>
          </div>

          {showHotspots && (
            <div className="animate-slide-down">
              <CorridorDelayHotspots
                environment={environment}
                injectedDelay={injectedDelay}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer Branding & Disclaimer */}
      <footer className="border-t border-rail-800 bg-rail-950/80 py-4 px-4 sm:px-6 text-center text-xs font-mono text-slate-500">
        RailRakshak v2.0 · SWR Mysore–Bangalore Division 24-Hour Real-Time Clock Synchronization &amp; Dynamic Live Status Engine
      </footer>
    </div>
  );
}
