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
import { YesterdayTrafficAnalysis } from "./components/YesterdayTrafficAnalysis";
import { FleetDelayAnalysisDeck } from "./components/FleetDelayAnalysisDeck";
import { StopsAndWeatherIntelligenceDeck } from "./components/StopsAndWeatherIntelligenceDeck";
import { Flame } from "lucide-react";

export function App() {
  // Navigation View State
  const [activeTab, setActiveTab] = useState<"COCKPIT" | "ANALYSIS">("COCKPIT");

  // Initialize with exact real-world clock time (in minutes from midnight)
  const [activeClockMinutes, setActiveClockMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [isRealTimeSynced, setIsRealTimeSynced] = useState<boolean>(true);

  // Find initial running or nearest upcoming train for the current clock
  const [selectedTrainId, setSelectedTrainId] = useState<string>(() => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const running = ALL_CORRIDOR_FLEET.find((t) => {
      const res = resolveTrainAtClockTime(t, currentMins);
      return res.operatingState === "RUNNING_ON_TRACK";
    });
    return running ? running.id : "12613";
  });
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
    <div className="min-h-screen bg-ink text-chalk flex flex-col font-body selection:bg-signal-green/30 selection:text-chalk panel-grid">
      {/* 1. Masthead Dispatcher Navigation with Live Real-Time Clock Scrubber & View Tabs */}
      <Header
        showScenarioBar={showScenarioBar}
        setShowScenarioBar={setShowScenarioBar}
        injectedDelay={injectedDelay}
        weather={environment.weather}
        activeClockMinutes={activeClockMinutes}
        setActiveClockMinutes={setActiveClockMinutes}
        isRealTimeSynced={isRealTimeSynced}
        setIsRealTimeSynced={setIsRealTimeSynced}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* 2. Main Mission Control Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7 sm:space-y-8">
        
        {activeTab === "COCKPIT" ? (
          <>
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
          </>
        ) : (
          <>
            {/* Full Fleet Delay Analysis & All Rails Matrix View */}
            <FleetDelayAnalysisDeck
              activeClockMinutes={activeClockMinutes}
              environment={environment}
              injectedDelay={injectedDelay}
              onSelectTrainForCockpit={(trainNo) => {
                setSelectedTrainId(trainNo);
                setActiveTab("COCKPIT");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </>
        )}

        {/* Micro-Climate Weather Sensors & Operational Unscheduled Stops Deck */}
        <StopsAndWeatherIntelligenceDeck
          selectedTrain={resolvedLive.config}
          environment={environment}
          setEnvironment={setEnvironment}
          activeClockMinutes={activeClockMinutes}
          injectedDelay={injectedDelay}
        />

        {/* Yesterday's Corridor Traffic & Delay Gap Forensics Deck */}
        <YesterdayTrafficAnalysis
          onSelectTrainForLiveView={(trainNo) => {
            setSelectedTrainId(trainNo);
            setActiveTab("COCKPIT");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />

        {/* Delay Hotspot Analysis Section (Collapsible) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowHotspots(!showHotspots)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-raised hover:bg-surface-overlay border border-graphite text-xs font-data font-semibold text-signal-amber transition-colors"
            >
              <Flame className="w-4 h-4 text-signal-red" />
              <span>
                {showHotspots
                  ? "Hide Detailed Hotspot Calculations"
                  : "View Infrastructure Bottleneck Technical Specifications"}
              </span>
            </button>
            <span className="text-xs text-steel font-data hidden sm:inline">
              SWR Mysore–Bangalore Division
            </span>
          </div>

          {showHotspots && (
            <div className="animate-fade-in">
              <CorridorDelayHotspots
                environment={environment}
                injectedDelay={injectedDelay}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer Branding & Disclaimer */}
      <footer className="border-t border-graphite bg-ink py-4 px-6 text-center text-xs font-data text-steel">
        RailRakshak v2.0 · SWR Mysore–Bangalore Division · Corridor Delay Intelligence &amp; Infrastructure Factor Prediction Engine
      </footer>
    </div>
  );
}
