import React, { useState, useMemo } from "react";
import { Header, NavTab } from "./components/Header";
import { TrainSelector } from "./components/TrainSelector";
import { EtaComparisonCard } from "./components/EtaComparisonCard";
import { ShapWaterfall } from "./components/ShapWaterfall";
import { CorridorTrackMap } from "./components/CorridorTrackMap";
import { CorridorTrafficMap } from "./components/CorridorTrafficMap";
import { SectionFactorInspector } from "./components/SectionFactorInspector";
import { DisruptionSimulator } from "./components/DisruptionSimulator";
import { TimeDistanceStringline } from "./components/TimeDistanceStringline";
import { CORRIDOR_ACTIVE_TRAINS } from "./lib/rail/trains";
import { TrainConfig } from "./lib/rail/types";
import { DEFAULT_ENVIRONMENT, EnvironmentalConditions } from "./lib/rail/restrictions";
import { computeDynamicEta } from "./lib/rail/dynamicEta";

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [selectedTrain, setSelectedTrain] = useState<TrainConfig>(CORRIDOR_ACTIVE_TRAINS[0]);
  const [injectedDelay, setInjectedDelay] = useState<number>(0);
  const [environment, setEnvironment] = useState<EnvironmentalConditions>(DEFAULT_ENVIRONMENT);

  // Compute Dynamic Multi-Factor ETA
  const prediction = useMemo(() => {
    return computeDynamicEta({
      train: selectedTrain,
      userInjectedDelayMin: injectedDelay,
      environment,
    });
  }, [selectedTrain, injectedDelay, environment]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      {/* Header branded as RailRakshak */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Mission Control Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Train Selector */}
        <TrainSelector
          selectedTrainId={selectedTrain.id}
          onSelectTrain={(t) => {
            setSelectedTrain(t);
            setInjectedDelay(0);
          }}
        />

        {/* Tab 1: Overview & ETA */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Dynamic ETA vs Traditional Comparison */}
            <EtaComparisonCard prediction={prediction} />

            {/* Live Corridor Traffic Map */}
            <CorridorTrafficMap selectedTrain={selectedTrain} />

            {/* Corridor Track Map & Signal Aspect Visualizer */}
            <CorridorTrackMap
              train={prediction.train}
              stationBreakdown={prediction.stationBreakdown}
            />

            {/* Explainable AI (TreeSHAP) Factor Attribution */}
            <ShapWaterfall factors={prediction.shapFactors} />
          </div>
        )}

        {/* Tab 2: Traffic Map */}
        {activeTab === "traffic" && (
          <div className="space-y-6">
            <CorridorTrafficMap selectedTrain={selectedTrain} />
            <CorridorTrackMap
              train={prediction.train}
              stationBreakdown={prediction.stationBreakdown}
            />
          </div>
        )}

        {/* Tab 3: Section Factor Inspector */}
        {activeTab === "inspector" && (
          <div className="space-y-6">
            <SectionFactorInspector
              train={selectedTrain}
              environment={environment}
              injectedDelay={injectedDelay}
            />
            <CorridorTrackMap
              train={prediction.train}
              stationBreakdown={prediction.stationBreakdown}
            />
            <ShapWaterfall factors={prediction.shapFactors} />
          </div>
        )}

        {/* Tab 4: Dispatcher Stringline Diagram */}
        {activeTab === "stringline" && (
          <div className="space-y-6">
            <TimeDistanceStringline selectedTrain={selectedTrain} />
            <CorridorTrackMap
              train={prediction.train}
              stationBreakdown={prediction.stationBreakdown}
            />
          </div>
        )}

        {/* Tab 5: What-If Disruption Lab */}
        {activeTab === "simulator" && (
          <div className="space-y-6">
            <DisruptionSimulator
              injectedDelay={injectedDelay}
              setInjectedDelay={setInjectedDelay}
              environment={environment}
              setEnvironment={setEnvironment}
            />
            <SectionFactorInspector
              train={selectedTrain}
              environment={environment}
              injectedDelay={injectedDelay}
            />
            <EtaComparisonCard prediction={prediction} />
            <ShapWaterfall factors={prediction.shapFactors} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs font-mono text-slate-500">
        RailRakshak · Multi-Factor Railway Traffic Intelligence &amp; Dynamic Dispatching System
      </footer>
    </div>
  );
}
export default App;
