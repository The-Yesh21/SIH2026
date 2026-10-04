import React, { useState } from "react";
import { computeNetworkTrafficSeverity, SectionSeverityData } from "../lib/rail/sectionSeverityEngine";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT } from "../lib/rail/restrictions";
import {
  Activity,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Train,
  Gauge,
  Clock,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";

interface RailwayTrafficSeverityLayerProps {
  activeClockMinutes: number;
  environment?: EnvironmentalConditions;
  injectedDelay?: number;
  isDark?: boolean;
}

export function RailwayTrafficSeverityLayer({
  activeClockMinutes,
  environment = DEFAULT_ENVIRONMENT,
  injectedDelay = 0,
  isDark = false,
}: RailwayTrafficSeverityLayerProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>("MYA-HNK");
  const [filterTier, setFilterTier] = useState<string>("ALL");

  const sections = computeNetworkTrafficSeverity(activeClockMinutes, environment, injectedDelay);
  const selectedSection = sections.find((s) => s.id === selectedSectionId) || sections[0]!;

  const filteredSections = sections.filter((s) => {
    if (filterTier === "ALL") return true;
    return s.severityTier === filterTier;
  });

  // Calculate Corridor Aggregate Statistics
  const avgScore = Math.round(
    sections.reduce((acc, s) => acc + s.totalSeverityScore, 0) / sections.length
  );
  const severeCount = sections.filter((s) => s.severityTier === "SEVERE_CONGESTION").length;
  const highCount = sections.filter((s) => s.severityTier === "HIGH_FRICTION").length;
  const moderateCount = sections.filter((s) => s.severityTier === "MODERATE").length;
  const normalCount = sections.filter((s) => s.severityTier === "NORMAL").length;

  const bgCard = isDark ? "bg-slate-900/90 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm";
  const bgSubCard = isDark ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-200";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* 1. Header Banner & Google-Traffic Color Legend */}
      <div className={`rounded-3xl p-6 sm:p-8 border space-y-6 ${bgCard}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b pb-5 border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Railway Traffic Severity Layer (🟢🟡🟠🔴)
              </span>
              <span className={`text-xs font-mono ${textMuted}`}>
                16 Contiguous SWR Block Sections · 138.25 km
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-heading mt-1.5 tracking-tight text-slate-900">
              Live Corridor Traffic Severity Engine
            </h2>
            <p className={`text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed ${textMuted}`}>
              Every track section is continuously evaluated on a <strong>0 to 100 Severity Score</strong> combining density, preceding train headway, speed caps, station dwells, and signal friction.
            </p>
          </div>

          {/* Aggregate Corridor Traffic Health Index */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 shrink-0 shadow-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Corridor Traffic Index</span>
              <div className="text-2xl font-bold font-data text-slate-900 flex items-baseline gap-1.5 mt-0.5">
                <span>{avgScore}</span>
                <span className="text-xs text-slate-500 font-normal">/ 100</span>
              </div>
            </div>
            <div className="h-10 w-[1px] bg-slate-200" />
            <div className="text-xs font-mono space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-700 font-medium">{normalCount} Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-slate-700 font-medium">{severeCount} Severe</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Google-Maps Style Contiguous Traffic Heat-Strip */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-heading text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Real-Time Contiguous Route Heat-Strip</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Mysuru (KM 0.0) ➔ KSR Bengaluru (KM 138.25)
            </span>
          </div>

          {/* Interactive Block Sections Bar */}
          <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 p-2 rounded-2xl bg-slate-100 border border-slate-200">
            {sections.map((sec) => {
              const isSelected = sec.id === selectedSectionId;
              let bgClass = "bg-emerald-500 hover:bg-emerald-600 text-white";
              if (sec.severityTier === "SEVERE_CONGESTION") bgClass = "bg-red-500 hover:bg-red-600 text-white";
              else if (sec.severityTier === "HIGH_FRICTION") bgClass = "bg-amber-500 hover:bg-amber-600 text-white";
              else if (sec.severityTier === "MODERATE") bgClass = "bg-yellow-400 hover:bg-yellow-500 text-slate-900";

              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  title={`${sec.fromStationCode} ➔ ${sec.toStationCode}: Score ${sec.totalSeverityScore}/100 (${sec.severityTier})`}
                  className={`h-14 rounded-xl flex flex-col items-center justify-center transition-all relative ${bgClass} ${
                    isSelected ? "ring-3 ring-indigo-600 shadow-md scale-105 z-10" : "opacity-90 hover:opacity-100"
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold leading-none">{sec.fromStationCode}</span>
                  <span className="text-[9px] opacity-80 leading-none mt-0.5">➔{sec.toStationCode}</span>
                  <span className="text-[10px] font-black font-data mt-1">{sec.totalSeverityScore}</span>
                </button>
              );
            })}
          </div>

          {/* Severity Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-1">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>🟢 0–24 Normal</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span>🟡 25–49 Moderate</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>🟠 50–74 High Friction</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span>🔴 75–100 Severe Congestion</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Click any section to inspect root cause forensics
            </span>
          </div>
        </div>

        {/* 3. Deep-Dive Section Forensics Inspector */}
        <div className={`p-5 sm:p-6 rounded-2xl border ${bgSubCard}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs text-sm"
                style={{ backgroundColor: selectedSection.colorHex }}
              >
                {selectedSection.totalSeverityScore}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900">
                    Section {selectedSection.fromStationName} ({selectedSection.fromStationCode}) ➔ {selectedSection.toStationName} ({selectedSection.toStationCode})
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                    selectedSection.severityTier === 'SEVERE_CONGESTION'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : selectedSection.severityTier === 'HIGH_FRICTION'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : selectedSection.severityTier === 'MODERATE'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {selectedSection.severityTier.replace("_", " ")}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${textMuted}`}>
                  KM {selectedSection.startKm} to KM {selectedSection.endKm} ({selectedSection.lengthKm} km double track)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-500 block text-[10px]">Recommended Speed</span>
                <span className="font-bold text-slate-900 text-sm">{selectedSection.recommendedSpeedKmph} km/h</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-500 block text-[10px]">Headway Gap</span>
                <span className="font-bold text-slate-900 text-sm">{selectedSection.headwayMinutes} min</span>
              </div>
            </div>
          </div>

          {/* Primary Cause Alert Box */}
          <div className="my-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-2.5 text-xs">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-blue-900 font-semibold">Primary Bottleneck Cause: </strong>
              <span className="text-blue-800">{selectedSection.primaryCause}</span>
            </div>
          </div>

          {/* 7-Factor Severity Breakdown Bars */}
          <div className="space-y-2.5 pt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Severity Factor Breakdown (Formula: Congestion + Signal + Speed + Preceding + Dwell + History + Occupancy)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>1. Density &amp; Congestion</span>
                  <span className="font-bold text-slate-900">{selectedSection.congestionScore}/20</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(selectedSection.congestionScore / 20) * 100}%` }} />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>2. Signal Aspect Friction</span>
                  <span className="font-bold text-slate-900">{selectedSection.signalFrictionScore}/15</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(selectedSection.signalFrictionScore / 15) * 100}%` }} />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>3. Speed Restriction (PSR)</span>
                  <span className="font-bold text-slate-900">{selectedSection.speedRestrictionScore}/15</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(selectedSection.speedRestrictionScore / 15) * 100}%` }} />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>4. Preceding Interference</span>
                  <span className="font-bold text-slate-900">{selectedSection.precedingInterferenceScore}/15</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${(selectedSection.precedingInterferenceScore / 15) * 100}%` }} />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>5. Station Dwell Turnaround</span>
                  <span className="font-bold text-slate-900">{selectedSection.stationDwellScore}/15</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full" style={{ width: `${(selectedSection.stationDwellScore / 15) * 100}%` }} />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>6. Historical Delay Recurrence</span>
                  <span className="font-bold text-slate-900">{selectedSection.historicalImpactScore}/10</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(selectedSection.historicalImpactScore / 10) * 100}%` }} />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>7. Track Occupancy State</span>
                  <span className="font-bold text-slate-900">{selectedSection.currentOccupancyScore}/10</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${(selectedSection.currentOccupancyScore / 10) * 100}%` }} />
                </div>
              </div>

              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Active Trains in Block</span>
                <span className="text-xs font-bold text-slate-900 font-sans">
                  {selectedSection.activeTrainsCount > 0 ? selectedSection.activeTrainNames.join(", ") : "No Rakes in Block"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
