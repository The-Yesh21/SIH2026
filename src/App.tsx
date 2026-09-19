import React, { useState, useMemo } from "react";
import { TrainConfig } from "./lib/rail/types";
import { CORRIDOR_ACTIVE_TRAINS } from "./lib/rail/trains";
import { DEFAULT_ENVIRONMENT, EnvironmentalConditions } from "./lib/rail/restrictions";
import { computeDynamicEta } from "./lib/rail/dynamicEta";
import { Header, CorridorShift } from "./components/Header";
import { TrainSelector } from "./components/TrainSelector";
import { DelayIntelligenceDeck } from "./components/DelayIntelligenceDeck";
import { CorridorPhysicalSpine } from "./components/CorridorPhysicalSpine";
import { CorridorDelayHotspots } from "./components/CorridorDelayHotspots";
import { Flame, Layers } from "lucide-react";

export function App() {
  const [shift, setShift] = useState<CorridorShift>("MIDDAY");
  const [selectedTrain, setSelectedTrain] = useState<TrainConfig>(CORRIDOR_ACTIVE_TRAINS[0]);
  const [injectedDelay, setInjectedDelay] = useState<number>(0);
  const [environment, setEnvironment] = useState<EnvironmentalConditions>(DEFAULT_ENVIRONMENT);
  const [showScenarioBar, setShowScenarioBar] = useState<boolean>(false);
  const [showHotspots, setShowHotspots] = useState<boolean>(false);

  // Auto-switch primary active train when shift changes
  const handleShiftChange = (newShift: CorridorShift) => {
    setShift(newShift);
    if (newShift === "MIDDAY") {
      setSelectedTrain(CORRIDOR_ACTIVE_TRAINS[0]); // #12613 Wodeyar SF
    } else if (newShift === "MORNING_RUSH") {
      const chamundi = CORRIDOR_ACTIVE_TRAINS.find((t) => t.id === "16215");
      if (chamundi) setSelectedTrain(chamundi);
    } else if (newShift === "NIGHT_WINDOW") {
      const freight = CORRIDOR_ACTIVE_TRAINS.find((t) => t.id === "BOXN-58219");
      if (freight) setSelectedTrain(freight);
    }
  };

  // Compute Dynamic Multi-Factor ETA based on current train position
  const prediction = useMemo(() => {
    return computeDynamicEta({
      train: selectedTrain,
      userInjectedDelayMin: injectedDelay,
      environment,
    });
  }, [selectedTrain, injectedDelay, environment]);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 rail-grid-pattern">
      {/* 1. Masthead Dispatcher Navigation with Shift Selector */}
      <Header
        showScenarioBar={showScenarioBar}
        setShowScenarioBar={setShowScenarioBar}
        injectedDelay={injectedDelay}
        weather={environment.weather}
        shift={shift}
        setShift={handleShiftChange}
      />

      {/* 2. Main Mission Control Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-7">
        
        {/* Train Command Deck with Inline Search */}
        <TrainSelector
          selectedTrainId={selectedTrain.id}
          onSelectTrain={(train) => {
            setSelectedTrain(train);
            setInjectedDelay(0);
          }}
        />

        {/* Live Train Status & Where-Is-My-Train Dynamic ETA Deck */}
        <DelayIntelligenceDeck
          prediction={prediction}
          selectedTrain={selectedTrain}
          environment={environment}
          setEnvironment={setEnvironment}
          injectedDelay={injectedDelay}
          setInjectedDelay={setInjectedDelay}
          showScenarioBar={showScenarioBar}
        />

        {/* Physical Track Spine & Station-by-Station Live Running Log */}
        <CorridorPhysicalSpine
          prediction={prediction}
          selectedTrain={selectedTrain}
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
        RailRakshak v2.0 · SWR Mysore–Bangalore Division Precision Dispatching &amp; Live NavIC RTIS Telemetry Engine
      </footer>
    </div>
  );
}
