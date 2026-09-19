import React, { useState } from "react";
import { TrainConfig } from "../lib/rail/types";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT } from "../lib/rail/restrictions";
import {
  getCorridorWeatherZones,
  CORRIDOR_POTENTIAL_STOPS,
  predictTrainUnscheduledStops,
  OperationalStopRecord,
  WeatherZoneTelemetry,
} from "../lib/rail/stopsAndWeatherIntelligence";
import {
  Cloud,
  CloudSun,
  CloudRain,
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
  Gauge,
  AlertTriangle,
  MapPin,
  Clock,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Sliders,
  Filter,
  Flame,
  ArrowRight,
} from "lucide-react";

interface StopsAndWeatherIntelligenceDeckProps {
  selectedTrain: TrainConfig;
  environment: EnvironmentalConditions;
  setEnvironment: React.Dispatch<React.SetStateAction<EnvironmentalConditions>>;
  activeClockMinutes: number;
  injectedDelay: number;
}

export function StopsAndWeatherIntelligenceDeck({
  selectedTrain,
  environment,
  setEnvironment,
  activeClockMinutes,
  injectedDelay,
}: StopsAndWeatherIntelligenceDeckProps) {
  const [activeTab, setActiveTab] = useState<"WEATHER" | "STOPS" | "TRAIN_PREDICTION">("WEATHER");
  const [stopFilter, setStopFilter] = useState<string>("ALL");

  const weatherZones = getCorridorWeatherZones(environment.weather);
  const trainPredictions = predictTrainUnscheduledStops(
    selectedTrain,
    injectedDelay,
    environment.weather,
    activeClockMinutes
  );

  const filteredStops = CORRIDOR_POTENTIAL_STOPS.filter((stop) => {
    if (stopFilter === "ALL") return true;
    if (stopFilter === "UNSCHEDULED_ONLY") return !stop.isScheduledCommercial;
    if (stopFilter === "SCHEDULED_ONLY") return stop.isScheduledCommercial;
    if (stopFilter === "HIGH_RISK") return stop.riskTier === "CRITICAL" || stop.riskTier === "HIGH";
    return true;
  });

  const getWeatherIcon = (w: string) => {
    switch (w) {
      case "HEAVY_MONSOON":
        return <CloudRain className="w-5 h-5 text-cyan-400" />;
      case "DENSE_FOG":
        return <CloudFog className="w-5 h-5 text-indigo-400" />;
      case "LIGHT_RAIN":
        return <Cloud className="w-5 h-5 text-blue-400" />;
      case "CLEAR":
      default:
        return <CloudSun className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <section className="rounded-3xl border border-rail-700/80 bg-gradient-to-b from-rail-850 to-rail-900 p-6 sm:p-7 shadow-2xl space-y-6">
      {/* 1. Header & Section Selector Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-rail-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Corridor Weather &amp; Operational Unscheduled Stops Intelligence
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Micro-climate sensors across 5 sectors &amp; 17-station delay factor detention profiling
              </p>
            </div>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="flex items-center gap-1.5 bg-rail-950 p-1.5 rounded-2xl border border-rail-800 text-xs font-mono">
          {[
            { id: "WEATHER", label: "🌤️ Micro-Climate Sensors" },
            { id: "STOPS", label: "🛑 Operational Stops & Gaps" },
            { id: "TRAIN_PREDICTION", label: `🎯 Train #${selectedTrain.id} Forecast` },
          ].map((tab) => {
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  isAct
                    ? "bg-cyan-600 text-white font-bold shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-rail-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: 5 Micro-Climate Weather Zones */}
      {activeTab === "WEATHER" && (
        <div className="space-y-5 animate-fade-in">
          {/* Quick Weather Disruption Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-rail-950 p-3.5 rounded-2xl border border-rail-800 text-xs font-mono">
            <span className="text-slate-300 font-bold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Simulate Track Weather Condition:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "CLEAR", label: "Clear Track (130k)", icon: CloudSun },
                { id: "LIGHT_RAIN", label: "Light Rain (90k)", icon: Cloud },
                { id: "HEAVY_MONSOON", label: "Monsoon (60k)", icon: CloudRain },
                { id: "DENSE_FOG", label: "Winter Fog (30k)", icon: CloudFog },
              ].map((w) => {
                const Icon = w.icon;
                const isAct = environment.weather === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() =>
                      setEnvironment((prev) => ({
                        ...prev,
                        weather: w.id as any,
                      }))
                    }
                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-center transition-all ${
                      isAct
                        ? "bg-cyan-600/30 border-cyan-400 text-cyan-200 font-bold shadow-sm"
                        : "bg-rail-900 border-rail-750 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{w.label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5 Corridor Micro-Climate Sector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weatherZones.map((zone) => (
              <div
                key={zone.zoneId}
                className="bg-rail-900/90 border border-rail-750 rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-cyan-500/40 transition-colors"
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-rail-950 border border-rail-700 text-cyan-300 font-bold">
                      {zone.zoneId}
                    </span>
                    <span className="text-slate-400">{zone.chainageKm}</span>
                  </div>
                  <h3 className="font-bold text-sm text-white font-sans mt-2">
                    {zone.zoneName}
                  </h3>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Nodes: {zone.stationsCovered.join(" ➔ ")}
                  </div>
                </div>

                {/* Telemetry Sensor Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-rail-950/80 p-3 rounded-xl border border-rail-800">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-rose-400" /> Air:
                    </span>
                    <strong>{zone.ambientTempC}°C</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" /> Rail:
                    </span>
                    <strong className="text-amber-300">{zone.railTempC}°C</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Hum:
                    </span>
                    <strong>{zone.humidityPercent}%</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5 text-indigo-400" /> Wind:
                    </span>
                    <strong>{zone.windSpeedKmph}k {zone.windDirection}</strong>
                  </div>
                </div>

                {/* Speed Limit & Braking Factor */}
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Max Sectional MPS:</span>
                    <span className="font-bold text-cyan-400">{zone.speedCeilingKmph} km/h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Braking Distance Mult:</span>
                    <span className="font-bold text-amber-400">{zone.brakingDistanceMultiplier}x normal</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Adhesion Coeff:</span>
                    <span className="font-bold text-emerald-400">{zone.adhesionCoefficient} μ</span>
                  </div>

                  {zone.activeCautionOrder && (
                    <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/40 text-[11px] text-amber-300">
                      ⚠️ {zone.activeCautionOrder}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Operational Stops & Delay Factors */}
      {activeTab === "STOPS" && (
        <div className="space-y-4 animate-fade-in">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-rail-950 p-2.5 rounded-2xl border border-rail-800 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-400 px-2 font-semibold">
              <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filter Stops:
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", label: `All 17 Corridor Nodes` },
                { id: "UNSCHEDULED_ONLY", label: `Operational / Unscheduled Only` },
                { id: "SCHEDULED_ONLY", label: `Commercial Halts` },
                { id: "HIGH_RISK", label: `High/Critical Detention Risk` },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setStopFilter(b.id)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-medium transition-all ${
                    stopFilter === b.id
                      ? "bg-cyan-600/30 text-cyan-300 border border-cyan-400 font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-rail-900"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stops List */}
          <div className="space-y-3">
            {filteredStops.map((stop) => (
              <div
                key={stop.stationCode}
                className="bg-rail-900/90 border border-rail-750 p-4 sm:p-5 rounded-2xl space-y-3"
              >
                {/* Top Row: Station Code, Name & Stop Type Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-xl bg-rail-950 border border-rail-700 text-cyan-300 font-mono font-bold text-xs">
                      {stop.stationCode}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-white font-sans">
                        {stop.stationName}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        KM {stop.chainageFromMysKm.toFixed(1)} from Mysuru · Asset: {stop.infrastructureAsset}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                        stop.isScheduledCommercial
                          ? "bg-indigo-950/80 text-indigo-300 border-indigo-500/40"
                          : "bg-purple-950/80 text-purple-300 border-purple-500/40"
                      }`}
                    >
                      {stop.isScheduledCommercial ? "Scheduled Commercial Halt" : "Operational / Loop Siding Stop"}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                        stop.riskTier === "CRITICAL"
                          ? "bg-rose-950 text-rose-300 border-rose-500 animate-pulse"
                          : stop.riskTier === "HIGH"
                          ? "bg-amber-950 text-amber-300 border-amber-500"
                          : "bg-slate-900 text-slate-400 border-slate-700"
                      }`}
                    >
                      {stop.riskTier} RISK ({stop.historicalDetentionLikelihoodPercent}% Prob)
                    </span>
                  </div>
                </div>

                {/* Primary Delay Factors & Secondary Triggers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-rail-950 p-3 rounded-xl border border-rail-800 space-y-1">
                    <span className="font-mono text-amber-400 font-bold uppercase text-[11px]">
                      ⚠️ Primary Delay Factor:
                    </span>
                    <p className="text-slate-300 font-sans">
                      {stop.primaryDelayFactor}
                    </p>
                  </div>

                  <div className="bg-rail-950 p-3 rounded-xl border border-rail-800 space-y-1">
                    <span className="font-mono text-cyan-400 font-bold uppercase text-[11px]">
                      ⚡ AI Dispatcher Mitigation Protocol:
                    </span>
                    <p className="text-slate-300 font-sans">
                      {stop.mitigationProtocol}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Train-Specific Unscheduled Stop Forecast */}
      {activeTab === "TRAIN_PREDICTION" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-rail-950 p-4 rounded-2xl border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-mono text-xs">
            <div>
              <span className="text-slate-400">Target Service:</span>{" "}
              <strong className="text-white text-sm">#{selectedTrain.id} {selectedTrain.name}</strong>
              <div className="text-[11px] text-cyan-300 mt-0.5">
                Current Injected Delay: +{injectedDelay} min · Weather Mode: {environment.weather}
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl bg-cyan-600/30 text-cyan-300 border border-cyan-400 font-bold">
              {trainPredictions.length} Potential Delay Stop(s) Forecasted
            </span>
          </div>

          {trainPredictions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-rail-900 text-center font-mono text-xs text-slate-400">
              ✅ No severe unscheduled operational stops predicted under current track conditions.
            </div>
          ) : (
            <div className="space-y-3">
              {trainPredictions.map((pred, idx) => (
                <div
                  key={idx}
                  className="bg-rail-900 border border-rail-750 p-5 rounded-2xl space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-xl bg-rail-950 border border-rose-500/40 text-rose-300 font-mono font-bold text-xs">
                        {pred.stationCode}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-white font-sans">
                          {pred.stationName} (KM {pred.chainageKm})
                        </h4>
                        <span className="text-xs text-slate-400 font-mono">
                          Category: {pred.delayFactorCategory.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold">
                        +{pred.estimatedDelayIncurredMin} min Estimated Loss
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
                        {pred.probabilityPercent}% Probability
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans">
                    {pred.predictedStopReason}
                  </p>

                  <div className="pt-2 border-t border-rail-800 text-xs font-mono text-cyan-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span><strong>Dispatcher Action:</strong> {pred.recommendedDispatcherAction}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
