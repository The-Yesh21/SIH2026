import React, { useState } from "react";
import { CORRIDOR_SECTIONS, CorridorSectionRecord } from "../lib/rail/corridorDataset";
import { TrainConfig } from "../lib/rail/types";
import { EnvironmentalConditions } from "../lib/rail/restrictions";
import {
  Layers,
  Gauge,
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  MapPin,
  Clock,
  Radio,
  Sparkles,
} from "lucide-react";

interface SectionFactorInspectorProps {
  train: TrainConfig;
  environment: EnvironmentalConditions;
  injectedDelay: number;
}

export function SectionFactorInspector({
  train,
  environment,
  injectedDelay,
}: SectionFactorInspectorProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>("SEC-12"); // Default to RMGM-BID (Bidadi)

  const activeSection =
    CORRIDOR_SECTIONS.find((s) => s.sectionId === selectedSectionId) || CORRIDOR_SECTIONS[0]!;

  // Check if active train is currently traversing this section
  const isTrainInSection =
    train.currentLocationKm >= activeSection.startKm &&
    train.currentLocationKm <= activeSection.endKm;

  // Calculate dynamic allowed speed in this specific section
  let allowedSpeed = activeSection.sanctionedMpsKmph;
  if (activeSection.hasPsr && activeSection.psrSpeedKmph) {
    allowedSpeed = Math.min(allowedSpeed, activeSection.psrSpeedKmph);
  }
  if (environment.maintenanceBlockActive && activeSection.sectionId === "SEC-10") {
    allowedSpeed = Math.min(allowedSpeed, environment.maintenanceTsrKmph);
  }
  if (environment.weather === "DENSE_FOG") {
    allowedSpeed = Math.min(allowedSpeed, 30);
  } else if (environment.weather === "HEAVY_MONSOON") {
    allowedSpeed = Math.min(allowedSpeed, 60);
  }

  // Calculate section delay dynamics
  const speedPenalty =
    allowedSpeed < activeSection.sanctionedMpsKmph
      ? (activeSection.sanctionedMpsKmph - allowedSpeed) * 0.04
      : 0;

  const commuterPenalty =
    activeSection.commuterSurgeRisk === "HIGH" && environment.commuterSurgeMultiplier > 1.0
      ? 2.8
      : activeSection.commuterSurgeRisk === "MEDIUM" && environment.commuterSurgeMultiplier > 1.0
      ? 1.4
      : 0;

  const lcPenalty = activeSection.hasLcGate && environment.lcGateIncidentDelayMin > 0 ? 3.5 : 0;

  const recoverableSlack =
    allowedSpeed >= 110 && !activeSection.hasPsr
      ? Math.min(activeSection.bufferSlackAllocatedMin, 2.0)
      : 0;

  const netSectionDelayDelta = Math.round((speedPenalty + commuterPenalty + lcPenalty - recoverableSlack) * 10) / 10;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          Source-to-Destination Delay Factor Inspector (Section-by-Section)
        </h3>
        <span className="text-[10px] font-mono text-slate-400">
          Click any section to inspect localized factors
        </span>
      </div>

      {/* Horizontal Interactive Corridor Chainage Ribbon */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 pt-1 font-mono text-[10px]">
        {CORRIDOR_SECTIONS.map((sec, idx) => {
          const isSelected = sec.sectionId === selectedSectionId;
          const isTrainHere =
            train.currentLocationKm >= sec.startKm && train.currentLocationKm <= sec.endKm;

          return (
            <button
              key={sec.sectionId}
              onClick={() => setSelectedSectionId(sec.sectionId)}
              className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                isSelected
                  ? "border-cyan-400 bg-cyan-950/80 text-cyan-200 font-bold shadow-sm ring-1 ring-cyan-500/30"
                  : isTrainHere
                  ? "border-amber-500/60 bg-amber-950/40 text-amber-300"
                  : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-1">
                {isTrainHere && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
                <span>
                  {sec.fromStationCode}→{sec.toStationCode}
                </span>
              </div>
              <div className="text-[8px] text-slate-500">
                {sec.lengthKm.toFixed(1)} km
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Section Deep-Dive Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                {activeSection.sectionId}
              </span>
              <h4 className="font-mono font-bold text-sm text-slate-100">
                {activeSection.fromStationName} ({activeSection.fromStationCode}) ➔{" "}
                {activeSection.toStationName} ({activeSection.toStationCode})
              </h4>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Chainage: km {activeSection.startKm.toFixed(1)} to {activeSection.endKm.toFixed(1)} ({activeSection.lengthKm.toFixed(2)} km span)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1 ${
                netSectionDelayDelta < 0
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                  : netSectionDelayDelta > 0
                  ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                  : "bg-slate-900 text-slate-300 border border-slate-700"
              }`}
            >
              {netSectionDelayDelta < 0 ? (
                <>
                  <TrendingDown className="h-3.5 w-3.5" />
                  Slack Recovered: {netSectionDelayDelta} min
                </>
              ) : netSectionDelayDelta > 0 ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5" />
                  Section Delay: +{netSectionDelayDelta} min
                </>
              ) : (
                <>✓ Pure Nominal Running (0.0m)</>
              )}
            </span>
          </div>
        </div>

        {/* 4-Column Metric Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          {/* 1. Speed Restrictions (PSR/TSR) */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-1.5">
            <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center justify-between">
              <span>Speed Boundary</span>
              <Gauge className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-black text-cyan-300">
              {allowedSpeed} <span className="text-xs text-slate-400 font-normal">km/h</span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans">
              Sanctioned: {activeSection.sanctionedMpsKmph} km/h
              {activeSection.hasPsr && (
                <span className="text-amber-400 block font-mono text-[10px] mt-0.5">
                  ⚠️ PSR {activeSection.psrSpeedKmph}k: {activeSection.psrReason}
                </span>
              )}
            </div>
          </div>

          {/* 2. Commuter & Dwell Surge */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-1.5">
            <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center justify-between">
              <span>Commuter Dwell Surge</span>
              <MapPin className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-black text-amber-300">
              {activeSection.commuterSurgeRisk === "HIGH"
                ? "HIGH RISK"
                : activeSection.commuterSurgeRisk === "MEDIUM"
                ? "MODERATE"
                : "LOW"}
            </div>
            <div className="text-[11px] text-slate-400 font-sans">
              {commuterPenalty > 0
                ? `Peak rush dwell extension: +${commuterPenalty} min`
                : "Nominal scheduled 2-min halt dwell"}
            </div>
          </div>

          {/* 3. Level Crossing Gate & Interlock */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-1.5">
            <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center justify-between">
              <span>Level Crossing (LC)</span>
              <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-slate-200">
              {activeSection.hasLcGate ? activeSection.lcGateId : "GRADE SEPARATED"}
            </div>
            <div className="text-[11px] text-slate-400 font-sans">
              {activeSection.hasLcGate
                ? "Interlocked Gate: Normal 90-120s road closure"
                : "No road crossing interference (ROB / RUB)"}
            </div>
          </div>

          {/* 4. Timetable Buffer Slack Allocation */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-1.5">
            <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center justify-between">
              <span>WTT Buffer Slack</span>
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-emerald-300">
              {activeSection.bufferSlackAllocatedMin} <span className="text-xs text-slate-400 font-normal">min</span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans">
              {recoverableSlack > 0
                ? `Kinematic absorption active: -${recoverableSlack.toFixed(1)}m recovered`
                : "Standard sectional runtime schedule"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
