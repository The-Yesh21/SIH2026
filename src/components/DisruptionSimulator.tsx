import React from "react";
import { EnvironmentalConditions } from "../lib/rail/restrictions";
import { Sliders, CloudRain, CloudFog, Sun, Wrench, Users, ShieldAlert, RotateCcw } from "lucide-react";

interface DisruptionSimulatorProps {
  injectedDelay: number;
  setInjectedDelay: (val: number) => void;
  environment: EnvironmentalConditions;
  setEnvironment: React.Dispatch<React.SetStateAction<EnvironmentalConditions>>;
}

export function DisruptionSimulator({
  injectedDelay,
  setInjectedDelay,
  environment,
  setEnvironment,
}: DisruptionSimulatorProps) {
  const resetAll = () => {
    setInjectedDelay(0);
    setEnvironment({
      weather: "CLEAR",
      visibilityLimitKmph: 130,
      maintenanceBlockActive: false,
      maintenanceChainageKm: { from: 50.0, to: 56.0 },
      maintenanceTsrKmph: 30,
      commuterSurgeMultiplier: 1.0,
      lcGateIncidentDelayMin: 0,
    });
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
          <Sliders className="h-4 w-4 text-cyan-400" />
          What-If Disruption &amp; Incident Simulation Studio
        </h3>
        <button
          onClick={resetAll}
          className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-cyan-300 border border-slate-700 bg-slate-800 px-2 py-1 rounded"
        >
          <RotateCcw className="h-3 w-3" /> Reset Baseline
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
        {/* 1. Primary Delay Slider */}
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
          <div className="flex items-center justify-between text-slate-300">
            <span>Signal / Upstream Delay</span>
            <span className="font-bold text-amber-300">+{injectedDelay} min</span>
          </div>
          <input
            type="range"
            min={0}
            max={60}
            value={injectedDelay}
            onChange={(e) => setInjectedDelay(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 block">
            Injects mid-corridor primary headway delay.
          </span>
        </div>

        {/* 2. Weather & Visibility Selector */}
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
          <div className="flex items-center justify-between text-slate-300">
            <span>Weather &amp; Visibility</span>
            <span className="font-bold text-cyan-300">{environment.weather}</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <button
              onClick={() => setEnvironment((prev) => ({ ...prev, weather: "CLEAR" }))}
              className={`p-1.5 rounded border ${
                environment.weather === "CLEAR"
                  ? "border-cyan-500 bg-cyan-950 text-cyan-300 font-bold"
                  : "border-slate-800 bg-slate-900 text-slate-400"
              }`}
            >
              ☀️ Clear (130)
            </button>
            <button
              onClick={() => setEnvironment((prev) => ({ ...prev, weather: "LIGHT_RAIN" }))}
              className={`p-1.5 rounded border ${
                environment.weather === "LIGHT_RAIN"
                  ? "border-cyan-500 bg-cyan-950 text-cyan-300 font-bold"
                  : "border-slate-800 bg-slate-900 text-slate-400"
              }`}
            >
              🌧️ Rain (90)
            </button>
            <button
              onClick={() => setEnvironment((prev) => ({ ...prev, weather: "HEAVY_MONSOON" }))}
              className={`p-1.5 rounded border ${
                environment.weather === "HEAVY_MONSOON"
                  ? "border-cyan-500 bg-cyan-950 text-cyan-300 font-bold"
                  : "border-slate-800 bg-slate-900 text-slate-400"
              }`}
            >
              ⛈️ Monsoon (60)
            </button>
            <button
              onClick={() => setEnvironment((prev) => ({ ...prev, weather: "DENSE_FOG" }))}
              className={`p-1.5 rounded border ${
                environment.weather === "DENSE_FOG"
                  ? "border-amber-500 bg-amber-950 text-amber-300 font-bold"
                  : "border-slate-800 bg-slate-900 text-slate-400"
              }`}
            >
              🌫️ Fog (30 SWR)
            </button>
          </div>
        </div>

        {/* 3. Maintenance Block / TSR */}
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
          <div className="flex items-center justify-between text-slate-300">
            <span>Engineering Track TSR</span>
            <span className="font-bold text-amber-300">
              {environment.maintenanceBlockActive ? "ACTIVE (30 km/h)" : "OFF"}
            </span>
          </div>
          <button
            onClick={() =>
              setEnvironment((prev) => ({
                ...prev,
                maintenanceBlockActive: !prev.maintenanceBlockActive,
              }))
            }
            className={`w-full py-2 rounded text-[11px] font-bold border transition-all ${
              environment.maintenanceBlockActive
                ? "border-amber-500 bg-amber-950/80 text-amber-300"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
            }`}
          >
            {environment.maintenanceBlockActive ? "⚠️ 30 km/h TSR Imposed" : "+ Impose TSR 30 km/h"}
          </button>
          <span className="text-[10px] text-slate-500 block">
            Maddur-Channapatna track tamping possession.
          </span>
        </div>

        {/* 4. Commuter Rush Surge */}
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
          <div className="flex items-center justify-between text-slate-300">
            <span>Urban Commuter Surge</span>
            <span className="font-bold text-cyan-300">
              {environment.commuterSurgeMultiplier > 1.0 ? "2.5x Peak Rush" : "1.0x Normal"}
            </span>
          </div>
          <button
            onClick={() =>
              setEnvironment((prev) => ({
                ...prev,
                commuterSurgeMultiplier: prev.commuterSurgeMultiplier > 1.0 ? 1.0 : 2.5,
              }))
            }
            className={`w-full py-2 rounded text-[11px] font-bold border transition-all ${
              environment.commuterSurgeMultiplier > 1.0
                ? "border-cyan-500 bg-cyan-950/80 text-cyan-300"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
            }`}
          >
            {environment.commuterSurgeMultiplier > 1.0 ? "👥 Peak Rush Active" : "Set Peak Rush (08:30)"}
          </button>
          <span className="text-[10px] text-slate-500 block">
            Extends dwell at Mandya &amp; Kengeri.
          </span>
        </div>
      </div>
    </div>
  );
}
