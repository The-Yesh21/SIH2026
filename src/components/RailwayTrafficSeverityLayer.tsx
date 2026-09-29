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
  isDark = true,
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b pb-5 border-slate-800/40">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Network Traffic Severity Layer (🟢🟡🟠🔴)
              </span>
              <span className={`text-xs font-mono ${textMuted}`}>
                16 Contiguous SWR Block Sections · 138.25 km
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-heading mt-1.5 tracking-tight">
              Live Corridor Traffic Severity Engine
            </h2>
            <p className={`text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed ${textMuted}`}>
              Every track section is continuously evaluated on a <strong>0 to 100 Severity Score</strong> combining density, preceding train headway, speed caps, station dwells, and signal friction.
            </p>
          </div>

          {/* Aggregate Corridor Traffic Health Index */}
          <div className="flex items-center gap-4 bg-slate-950/90 p-4 rounded-2xl border border-slate-800 shrink-0">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Corridor Traffic Index</span>
              <div className="text-2xl font-bold font-data text-white flex items-baseline gap-1.5 mt-0.5">
                <span>{avgScore}</span>
                <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </div>
            </div>
            <div className="h-10 w-[1px] bg-slate-800" />
            <div className="text-xs font-mono space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-300">{normalCount} Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-slate-300">{severeCount} Severe</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Interactive Google Traffic Style Section Visual Heat-Strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className={textMuted}>Mysuru (KM 0.0)</span>
            <span className="text-indigo-400 font-bold">16 Section Heat-Map Strip (Tap to Inspect)</span>
            <span className={textMuted}>KSR Bengaluru (KM 138.25)</span>
          </div>

          {/* Contiguous Colored Heat Strip */}
          <div className="w-full h-8 rounded-xl overflow-hidden flex shadow-lg border border-slate-800 bg-slate-950 p-0.5 gap-0.5">
            {sections.map((sec) => {
              const isSelected = sec.id === selectedSectionId;
              const widthPct = (sec.lengthKm / 138.25) * 100;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  style={{ width: `${widthPct}%`, backgroundColor: sec.colorHex }}
                  className={`h-full transition-all relative group focus:outline-none ${
                    isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-slate-950 z-10 scale-y-110 rounded-xs" : "opacity-90 hover:opacity-100"
                  }`}
                  title={`${sec.fromStationCode} ➔ ${sec.toStationCode} (Score: ${sec.totalSeverityScore}/100)`}
                />
              );
            })}
          </div>

          {/* Color Legend Scale */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>0–24: 🟢 Normal (Optimal Flow)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span>25–49: 🟡 Moderate Traffic</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>50–74: 🟠 Friction &amp; Precedence</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>75–100: 🔴 Severe Congestion</span>
            </div>
          </div>
        </div>

        {/* 3. Deep-Dive Inspection Card for Selected Section */}
        <div className={`p-5 sm:p-6 rounded-2xl border space-y-4 ${bgSubCard}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/40 pb-3">
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: selectedSection.colorHex }}
                className="w-4 h-10 rounded-full shrink-0 shadow-sm"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold font-heading">
                    {selectedSection.fromStationName} ({selectedSection.fromStationCode}) ➔ {selectedSection.toStationName} ({selectedSection.toStationCode})
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${selectedSection.badgeClass}`}>
                    {selectedSection.severityTier.replace("_", " ")}
                  </span>
                </div>
                <span className={`text-xs font-mono ${textMuted}`}>
                  KM {selectedSection.startKm.toFixed(1)} to KM {selectedSection.endKm.toFixed(1)} · Length: {selectedSection.lengthKm} km
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase block">Severity Score</span>
                <span className="text-xl font-black font-data" style={{ color: selectedSection.colorHex }}>
                  {selectedSection.totalSeverityScore} / 100
                </span>
              </div>
            </div>
          </div>

          {/* Primary Cause Alert Box */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Primary Operational Factor:</span>
              <p className="text-slate-200 mt-0.5 font-medium">{selectedSection.primaryCause}</p>
            </div>
          </div>

          {/* Breakdown Score Matrix (The 7 Pillars of Severity) */}
          <div className="space-y-2">
            <span className="text-xs font-bold font-heading block">
              Severity Score Breakdown Formula (Score = Congestion + Signal + Speed + Preceding + Dwell + History + Occupancy)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">1. Congestion</span>
                <div className="text-base font-bold text-white mt-1">{selectedSection.congestionScore} <span className="text-[10px] text-slate-400">/20</span></div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">2. Signal Friction</span>
                <div className="text-base font-bold text-white mt-1">{selectedSection.signalFrictionScore} <span className="text-[10px] text-slate-400">/15</span></div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">3. Speed Cap (PSR)</span>
                <div className="text-base font-bold text-white mt-1">{selectedSection.speedRestrictionScore} <span className="text-[10px] text-slate-400">/15</span></div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">4. Preceding Train</span>
                <div className="text-base font-bold text-white mt-1">{selectedSection.precedingInterferenceScore} <span className="text-[10px] text-slate-400">/15</span></div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">5. Station Dwell</span>
                <div className="text-base font-bold text-white mt-1">{selectedSection.stationDwellScore} <span className="text-[10px] text-slate-400">/15</span></div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">6. History Rate</span>
                <div className="text-base font-bold text-white mt-1">{selectedSection.historicalImpactScore} <span className="text-[10px] text-slate-400">/10</span></div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">7. Occupancy</span>
                <div className="text-base font-bold text-white mt-1">{selectedSection.currentOccupancyScore} <span className="text-[10px] text-slate-400">/10</span></div>
              </div>
            </div>
          </div>

          {/* Section Live Details Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-mono text-slate-400 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <Train className="w-3.5 h-3.5 text-indigo-400" />
              <span>Active Trains: <strong className="text-white">{selectedSection.activeTrainsCount > 0 ? selectedSection.activeTrainNames.join(", ") : "None (Clear Block)"}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recommended Target Speed: <strong className="text-emerald-400">{selectedSection.recommendedSpeedKmph} km/h</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
