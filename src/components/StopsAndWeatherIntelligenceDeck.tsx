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
        return <CloudRain className="w-5 h-5 text-chalk" />;
      case "DENSE_FOG":
        return <CloudFog className="w-5 h-5 text-chalk" />;
      case "LIGHT_RAIN":
        return <Cloud className="w-5 h-5 text-chalk" />;
      case "CLEAR":
      default:
        return <CloudSun className="w-5 h-5 text-chalk" />;
    }
  };

  return (
    <section className="bg-surface border border-graphite rounded-xl p-5 space-y-5 animate-fade-in selection:bg-signal-green/30 selection:text-chalk">
      {/* 1. Header & Section Selector Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-graphite pb-4">
        <div>
          <h2 className="text-lg font-heading font-semibold text-chalk">
            Corridor Weather &amp; Operational Unscheduled Stops Intelligence
          </h2>
          <p className="text-xs text-steel font-body mt-1">
            Micro-climate sensors across 5 sectors &amp; 17-station delay factor detention profiling
          </p>
        </div>

        {/* Sub Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-raised rounded-lg p-2 border border-graphite">
          {[
            { id: "WEATHER", label: "Micro-Climate Sensors" },
            { id: "STOPS", label: "Operational Stops & Gaps" },
            { id: "TRAIN_PREDICTION", label: `Train #${selectedTrain.id} Forecast` },
          ].map((tab) => {
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-md text-sm font-body transition-all ${
                  isAct
                    ? "bg-surface-overlay text-chalk font-semibold border-b-2 border-chalk"
                    : "bg-surface-raised hover:bg-surface-overlay text-steel hover:text-chalk"
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface-raised rounded-lg p-2 border border-graphite text-sm font-body">
            <span className="text-chalk font-medium px-2">
              Simulate Track Weather Condition:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "CLEAR", label: "Clear Track (130k)" },
                { id: "LIGHT_RAIN", label: "Light Rain (90k)" },
                { id: "HEAVY_MONSOON", label: "Monsoon (60k)" },
                { id: "DENSE_FOG", label: "Winter Fog (30k)" },
              ].map((w) => {
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
                    className={`px-3 py-1.5 rounded-md text-sm font-body transition-all ${
                      isAct
                        ? "bg-surface-overlay text-chalk font-semibold border-b-2 border-chalk"
                        : "bg-surface-raised hover:bg-surface-overlay text-steel hover:text-chalk"
                    }`}
                  >
                    {w.label.split(" ")[0]}
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
                className="bg-surface-raised border border-graphite rounded-xl p-4 space-y-4 flex flex-col justify-between"
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-heading font-semibold text-chalk">
                      {zone.zoneId}
                    </span>
                    <span className="text-xs font-data text-steel">{zone.chainageKm}</span>
                  </div>
                  <h3 className="font-medium text-sm text-chalk mt-2 font-body">
                    {zone.zoneName}
                  </h3>
                  <div className="text-xs text-steel-light font-body mt-0.5">
                    Nodes: {zone.stationsCovered.join(" ➔ ")}
                  </div>
                </div>

                {/* Telemetry Sensor Grid */}
                <div className="grid grid-cols-2 gap-3 bg-surface p-3 rounded-lg border border-graphite">
                  <div className="flex items-center justify-between">
                    <span className="text-steel text-sm font-body">Air:</span>
                    <strong className="text-chalk font-data text-sm">{zone.ambientTempC}°C</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-steel text-sm font-body">Rail:</span>
                    <strong className="text-chalk font-data text-sm">{zone.railTempC}°C</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-steel text-sm font-body">Hum:</span>
                    <strong className="text-chalk font-data text-sm">{zone.humidityPercent}%</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-steel text-sm font-body">Wind:</span>
                    <strong className="text-chalk font-data text-sm">{zone.windSpeedKmph}k {zone.windDirection}</strong>
                  </div>
                </div>

                {/* Speed Limit & Braking Factor */}
                <div className="space-y-2 text-sm font-body">
                  <div className="flex items-center justify-between">
                    <span className="text-steel">Max Sectional MPS:</span>
                    <span className="font-semibold text-chalk font-data">{zone.speedCeilingKmph} km/h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-steel">Braking Distance Mult:</span>
                    <span className="font-semibold text-chalk font-data">{zone.brakingDistanceMultiplier}x normal</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-steel">Adhesion Coeff:</span>
                    <span className="font-semibold text-chalk font-data">{zone.adhesionCoefficient} μ</span>
                  </div>

                  {zone.activeCautionOrder && (
                    <div className="mt-2 text-xs text-signal-amber font-body">
                      {zone.activeCautionOrder}
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
          <div className="flex flex-wrap items-center gap-3 bg-surface-raised rounded-lg p-2 border border-graphite">
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
                  className={`px-3 py-1.5 rounded-md text-sm font-body transition-all ${
                    stopFilter === b.id
                      ? "bg-surface-overlay text-chalk font-semibold border-b-2 border-chalk"
                      : "bg-surface-raised hover:bg-surface-overlay text-steel hover:text-chalk"
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
                className="bg-surface border border-graphite p-4 rounded-xl space-y-3"
              >
                {/* Top Row: Station Code, Name & Stop Type Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-heading font-semibold text-chalk">
                      {stop.stationCode}
                    </span>
                    <div>
                      <h3 className="font-medium text-sm text-chalk font-body">
                        {stop.stationName}
                      </h3>
                      <span className="text-xs text-steel font-body">
                        KM <span className="font-data">{stop.chainageFromMysKm.toFixed(1)}</span> from Mysuru · Asset: {stop.infrastructureAsset}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-body text-steel-light">
                      {stop.isScheduledCommercial ? "Scheduled Commercial Halt" : "Operational / Loop Siding Stop"}
                    </span>

                    <span
                      className={`text-xs font-body font-medium ${
                        stop.riskTier === "CRITICAL"
                          ? "text-signal-red"
                          : stop.riskTier === "HIGH"
                          ? "text-signal-amber"
                          : "text-steel"
                      }`}
                    >
                      {stop.riskTier} RISK (<span className="font-data">{stop.historicalDetentionLikelihoodPercent}</span>% Prob)
                    </span>
                  </div>
                </div>

                {/* Primary Delay Factors & Secondary Triggers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-surface-raised p-3 rounded-lg border border-graphite space-y-1">
                    <span className="font-body text-steel font-medium text-xs">
                      Primary Delay Factor
                    </span>
                    <p className="text-chalk-dim font-body">
                      {stop.primaryDelayFactor}
                    </p>
                  </div>

                  <div className="bg-surface-raised p-3 rounded-lg border border-graphite space-y-1">
                    <span className="font-body text-steel font-medium text-xs">
                      AI Dispatcher Mitigation Protocol
                    </span>
                    <p className="text-chalk-dim font-body">
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
          <div className="bg-surface-raised p-4 rounded-xl border border-graphite flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-body text-sm">
            <div>
              <span className="text-steel">Target Service:</span>{" "}
              <strong className="text-chalk">#{selectedTrain.id} {selectedTrain.name}</strong>
              <div className="text-xs text-steel-light mt-0.5">
                Current Injected Delay: +<span className="font-data">{injectedDelay}</span> min · Weather Mode: {environment.weather}
              </div>
            </div>
            <span className="font-medium text-chalk">
              {trainPredictions.length} Potential Delay Stop(s) Forecasted
            </span>
          </div>

          {trainPredictions.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface border border-graphite text-center font-body text-sm text-steel">
              No severe unscheduled operational stops predicted under current track conditions.
            </div>
          ) : (
            <div className="space-y-3">
              {trainPredictions.map((pred, idx) => (
                <div
                  key={idx}
                  className="bg-surface border border-graphite p-5 rounded-xl space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-heading font-semibold text-chalk">
                        {pred.stationCode}
                      </span>
                      <div>
                        <h4 className="font-medium text-sm text-chalk font-body">
                          {pred.stationName} (KM <span className="font-data">{pred.chainageKm}</span>)
                        </h4>
                        <span className="text-xs text-steel font-body">
                          Category: {pred.delayFactorCategory.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-data font-semibold text-signal-red">
                        +{pred.estimatedDelayIncurredMin} min Estimated Loss
                      </span>
                      <span className="text-sm font-data font-medium text-signal-amber">
                        {pred.probabilityPercent}% Probability
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-chalk-dim font-body">
                    {pred.predictedStopReason}
                  </p>

                  <div className="pt-2 border-t border-graphite text-sm font-body text-chalk flex items-center gap-1.5">
                    <span className="font-semibold">Dispatcher Action:</span> {pred.recommendedDispatcherAction}
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
