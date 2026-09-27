import React, { useState, useEffect, useRef } from "react";
import { TrainConfig } from "../lib/rail/types";
import { ALL_CORRIDOR_FLEET, resolveTrainAtClockTime, formatClockMinutes } from "../lib/rail/timeResolver";
import { SWR_CORRIDOR_STATIONS } from "../lib/rail/infrastructure";
import {
  PlantedHazard,
  HAZARD_PALETTE,
  calculateSimulatorKinematics,
  getClosestStationName,
} from "../lib/rail/godModeSimulator";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  CornerUpLeft,
  Eraser,
  ExternalLink,
  FastForward,
  Flame,
  Gauge,
  HelpCircle,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  MousePointerClick,
  Navigation,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Timer,
  Train,
  Trash2,
  Undo2,
  Wrench,
  X,
  Zap,
} from "lucide-react";

interface GodModeSimulatorDeckProps {
  selectedTrain: TrainConfig;
  onSelectTrain: (trainId: string) => void;
  activeClockMinutes: number;
}

export function GodModeSimulatorDeck({
  selectedTrain,
  onSelectTrain,
  activeClockMinutes,
}: GodModeSimulatorDeckProps) {
  // Simulator State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playSpeedMultiplier, setPlaySpeedMultiplier] = useState<number>(2); // 2x default speed
  const [simulatedKm, setSimulatedKm] = useState<number>(() => {
    const res = resolveTrainAtClockTime(selectedTrain, activeClockMinutes);
    return res.operatingState === "RUNNING_ON_TRACK" ? res.currentLocationKm : 8.0;
  });

  // Selected Hazard Template from palette
  const [selectedHazardTemplateIndex, setSelectedHazardTemplateIndex] = useState<number>(0);
  const [customDelayMinutes, setCustomDelayMinutes] = useState<number>(10);

  // Active Selected Hazard for on-track popup inspector
  const [inspectedHazardId, setInspectedHazardId] = useState<string | null>(null);

  // Mouse cursor hover tracking on track canvas
  const [cursorKm, setCursorKm] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isHoveringTrack, setIsHoveringTrack] = useState<boolean>(false);

  // Planted Hazards on track
  const [plantedHazards, setPlantedHazards] = useState<PlantedHazard[]>([
    {
      id: "hazard-initial-1",
      type: "WET_RAIL_SLIP",
      name: "Wet-Rail Micro-Slip / Monsoon Hydroplaning",
      category: "WEATHER",
      chainageKm: 38.0,
      locationLabel: "Yeliyur - Mandya (KM 38.0)",
      delayMinutes: 6,
      speedCapKmph: 60,
      zoneLengthKm: 6.0,
      description: "Localized heavy rain reduces wheel-rail adhesion coefficient (µ=0.08), lengthening braking curve.",
      active: true,
      icon: "🌧️",
      color: "#3B82F6",
    },
    {
      id: "hazard-initial-2",
      type: "SIGNAL_DANGER_HOLD",
      name: "Terminal Outer Signal Danger Hold",
      category: "SIGNALING",
      chainageKm: 128.5,
      locationLabel: "Kengeri - SBC Terminal Throat (KM 128.5)",
      delayMinutes: 12,
      speedCapKmph: 15,
      zoneLengthKm: 3.5,
      description: "Route interlocking conflict holding home signal at Red pending cross-overs clearance into SBC platforms.",
      active: true,
      icon: "🛑",
      color: "#EF4444",
    },
  ]);

  const trackContainerRef = useRef<HTMLDivElement>(null);

  // When train prop changes, reset simulation location
  useEffect(() => {
    const res = resolveTrainAtClockTime(selectedTrain, activeClockMinutes);
    setSimulatedKm(res.operatingState === "RUNNING_ON_TRACK" ? res.currentLocationKm : 8.0);
  }, [selectedTrain.id, activeClockMinutes]);

  // Main Simulation Loop (runs every 100ms when playing)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSimulatedKm((prevKm) => {
        if (prevKm >= 138.25) {
          setIsPlaying(false);
          return 138.25;
        }

        // Calculate current speed under hazards
        const state = calculateSimulatorKinematics({
          train: selectedTrain,
          currentKm: prevKm,
          activeClockMinutes,
          plantedHazards,
        });

        // Speed in km/h -> km per second -> km per 100ms tick * multiplier
        const currentSpeedKmph = state.currentSpeedKmph > 0 ? state.currentSpeedKmph : 40;
        const kmDeltaPerTick = (currentSpeedKmph / 3600) * 0.1 * playSpeedMultiplier;

        return Math.min(138.25, prevKm + kmDeltaPerTick);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playSpeedMultiplier, selectedTrain, activeClockMinutes, plantedHazards]);

  // Kinematic Calculations
  const simState = calculateSimulatorKinematics({
    train: selectedTrain,
    currentKm: simulatedKm,
    activeClockMinutes,
    plantedHazards,
  });

  const activeTemplate = HAZARD_PALETTE[selectedHazardTemplateIndex] || HAZARD_PALETTE[0];

  // Plant a hazard at a specific KM
  const handlePlantHazardAtKm = (km: number) => {
    const template = activeTemplate;
    const boundedKm = Math.max(0, Math.min(138, km));
    const newHazard: PlantedHazard = {
      id: `hazard-${Date.now()}-${Math.round(boundedKm * 10)}`,
      type: template.type,
      name: template.name,
      category: template.category,
      chainageKm: Math.round(boundedKm * 10) / 10,
      locationLabel: getClosestStationName(boundedKm),
      delayMinutes: customDelayMinutes || template.delayMinutes,
      speedCapKmph: template.speedCapKmph,
      zoneLengthKm: template.zoneLengthKm,
      description: template.description,
      active: true,
      icon: template.icon,
      color: template.color,
    };

    setPlantedHazards((prev) => [...prev, newHazard]);
    setInspectedHazardId(newHazard.id);
  };

  // Mouse move handler on Track Container
  const handleTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackContainerRef.current) return;
    const rect = trackContainerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const relativeY = e.clientY - rect.top;
    const clickPct = Math.max(0, Math.min(1, relativeX / rect.width));
    const km = clickPct * 138.25;

    setCursorKm(km);
    setCursorPos({ x: relativeX, y: relativeY });
    setIsHoveringTrack(true);
  };

  const handleTrackMouseLeave = () => {
    setIsHoveringTrack(false);
    setCursorKm(null);
    setCursorPos(null);
  };

  // Click on Track to Plant
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackContainerRef.current) return;
    const rect = trackContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetKm = clickPct * 138.25;
    handlePlantHazardAtKm(targetKm);
  };

  // Remove a single hazard
  const removeHazard = (id: string) => {
    setPlantedHazards((prev) => prev.filter((h) => h.id !== id));
    if (inspectedHazardId === id) setInspectedHazardId(null);
  };

  // Remove all hazards (Clear Track)
  const clearAllHazards = () => {
    setPlantedHazards([]);
    setInspectedHazardId(null);
  };

  // Undo last planted hazard
  const undoLastHazard = () => {
    setPlantedHazards((prev) => prev.slice(0, -1));
    setInspectedHazardId(null);
  };

  const toggleHazardActive = (id: string) => {
    setPlantedHazards((prev) =>
      prev.map((h) => (h.id === id ? { ...h, active: !h.active } : h))
    );
  };

  const resetSimulation = () => {
    setSimulatedKm(0);
    setIsPlaying(true);
  };

  const jumpToKm = (km: number) => {
    setSimulatedKm(km);
  };

  const openInNewTab = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "SIMULATOR");
    window.open(url.toString(), "_blank");
  };

  const isVandeBharat = selectedTrain.type.toLowerCase().includes("vande");
  const isInsideHazard = simState.hazardInZone !== null;

  return (
    <div className="w-full space-y-6 font-body">
      
      {/* 1. Masthead God-Mode Hero Banner with Separate Tab Button */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-indigo-500/30 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                GOD-MODE SIMULATOR &amp; 3D KINEMATIC ENGINE
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-500/30">
                ● Live 100ms Physical Loop
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-amber-300 bg-amber-950/70 border border-amber-500/30 flex items-center gap-1">
                <MousePointerClick className="w-3 h-3" />
                Equipped Cursor: {activeTemplate.icon} {activeTemplate.name}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <img src="/logo.svg" alt="RailRakshak Logo" className="h-9 w-9 object-contain drop-shadow" />
              <h2 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">
                Real-Time Moving Train &amp; Interactive Pain Factor Simulator
              </h2>
            </div>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Watch the train navigate the Mysuru–Bengaluru line in real-time. Use your mouse clicker to drop operational pain factors onto the track. When the train passes through them, the Dynamic ETA engine triggers instant recalculations with recovery speed recommendations.
            </p>
          </div>

          {/* Right Action Controls: Train Selector & Open in New Tab */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={openInNewTab}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-600/90 hover:bg-indigo-600 text-white font-mono text-xs font-bold transition-all shadow-lg border border-indigo-400/40"
              title="Open God-Mode Simulator in a separate standalone browser tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in New Tab</span>
            </button>

            <div className="flex items-center gap-2.5 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-700/80 font-mono text-xs shadow-lg">
              <span className="text-slate-400 font-semibold">Active Rake:</span>
              <select
                value={selectedTrain.id}
                onChange={(e) => onSelectTrain(e.target.value)}
                className="bg-slate-950 border border-indigo-500/50 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {ALL_CORRIDOR_FLEET.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} {t.name} ({t.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Pain Factor Mouse-Clicker Quick Selector Toolbelt */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <MousePointerClick className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-heading">
                Mouse Clicker Pain Factor Toolbelt
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Select a pain factor below, then click anywhere on the track schematic to drop it!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-slate-500 font-semibold">Delay Impact:</span>
            <input
              type="range"
              min="2"
              max="30"
              value={customDelayMinutes}
              onChange={(e) => setCustomDelayMinutes(Number(e.target.value))}
              className="w-28 accent-indigo-600 cursor-pointer"
            />
            <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-bold text-xs">
              +{customDelayMinutes}m
            </span>
          </div>
        </div>

        {/* Quick Toolbar Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {HAZARD_PALETTE.map((haz, idx) => {
            const isSelected = selectedHazardTemplateIndex === idx;
            return (
              <button
                key={haz.type}
                onClick={() => {
                  setSelectedHazardTemplateIndex(idx);
                  setCustomDelayMinutes(haz.delayMinutes);
                }}
                className={`p-2 rounded-2xl border transition-all flex flex-col items-center text-center gap-1 group ${
                  isSelected
                    ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <span className="text-xl group-hover:scale-125 transition-transform">{haz.icon}</span>
                <span className="text-[10px] font-bold text-slate-900 line-clamp-1 leading-tight">{haz.name.split(" ")[0]}</span>
                <span className="text-[9px] font-mono text-indigo-700 bg-indigo-100/60 px-1.5 rounded">+{haz.delayMinutes}m</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive Animated Track Canvas (Visual GUI Track Schematic with 3D Train) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        
        {/* Track Header & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                🛤️
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                SWR Corridor Track Schematic (138.25 km)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Click anywhere on the track to plant <strong className="text-indigo-600">{activeTemplate.icon} {activeTemplate.name} (+{customDelayMinutes}m)</strong>. Click planted pins to inspect or remove.
            </p>
          </div>

          {/* Track Hazard Actions: Clear All & Undo */}
          <div className="flex items-center gap-2 flex-wrap">
            {plantedHazards.length > 0 && (
              <>
                <button
                  onClick={undoLastHazard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-mono text-xs font-semibold transition-colors"
                  title="Undo last planted hazard"
                >
                  <Undo2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Undo Last</span>
                </button>

                <button
                  onClick={clearAllHazards}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-mono text-xs font-bold transition-colors shadow-xs"
                  title="Remove all planted hazards and clear the track"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All ({plantedHazards.length})</span>
                </button>
              </>
            )}

            {/* Live Telemetry Pill */}
            <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-bold flex items-center gap-1.5">
              <Train className="w-3.5 h-3.5" />
              <span>KM {simState.currentKm.toFixed(1)} · {simState.currentSpeedKmph} km/h</span>
            </div>
          </div>
        </div>

        {/* The Live Interactive Track Bar with 3D Train Model & Dynamic Mouse Clicker Hover */}
        <div className="space-y-4">
          <div
            ref={trackContainerRef}
            onClick={handleTrackClick}
            onMouseMove={handleTrackMouseMove}
            onMouseLeave={handleTrackMouseLeave}
            className="relative w-full h-40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-3 cursor-crosshair select-none overflow-hidden shadow-2xl border border-slate-800"
            title="Click anywhere on this track to drop the equipped pain factor"
          >
            {/* OHE Overhead Catenary Wire (25kV AC) */}
            <div className="absolute inset-x-0 top-3 h-[1px] bg-amber-400/40 shadow-xs pointer-events-none" />
            <div className="absolute inset-x-0 top-3 flex items-center justify-between px-4 pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-[1px] h-3 bg-amber-500/30" />
              ))}
            </div>

            {/* Concrete Sleepers & Ballast Bed */}
            <div className="absolute inset-x-0 top-[60%] -translate-y-1/2 h-6 bg-slate-950/90 border-y border-slate-700/60 flex items-center justify-between px-1 pointer-events-none">
              {Array.from({ length: 90 }).map((_, i) => (
                <div key={i} className="w-1 h-5 bg-slate-800/80 rounded-xs" />
              ))}
            </div>

            {/* Steel Dual Rails with Metallic Specular Glare */}
            <div className="absolute inset-x-0 top-[54%] h-[2.5px] bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 shadow-sm pointer-events-none" />
            <div className="absolute inset-x-0 top-[66%] h-[2.5px] bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 shadow-sm pointer-events-none" />

            {/* 17 Station Markers along track */}
            {SWR_CORRIDOR_STATIONS.map((st) => {
              const leftPct = (st.distanceFromMysKm / 138.25) * 100;
              const isPassed = simulatedKm >= st.distanceFromMysKm;
              const isStop = selectedTrain.scheduledStops.includes(st.code);

              return (
                <div
                  key={st.code}
                  style={{ left: `${leftPct}%` }}
                  className="absolute top-1 bottom-1 -translate-x-1/2 flex flex-col items-center justify-between pointer-events-none z-10"
                >
                  <span
                    className={`text-[9px] font-mono font-bold px-1 rounded transition-all ${
                      isPassed
                        ? "text-emerald-400 bg-emerald-950/80"
                        : "text-slate-400 bg-slate-900/90"
                    }`}
                  >
                    {st.code}
                  </span>

                  <div
                    className={`w-2.5 h-2.5 rounded-full border transition-all ${
                      isStop
                        ? "bg-amber-400 border-amber-200 shadow-lg shadow-amber-400/60 scale-110"
                        : isPassed
                        ? "bg-emerald-500 border-emerald-300"
                        : "bg-slate-700 border-slate-500"
                    }`}
                  />

                  <span className="text-[8px] font-mono text-slate-500">
                    {st.distanceFromMysKm.toFixed(0)}k
                  </span>
                </div>
              );
            })}

            {/* Planted Hazard Zones & Interactive Pins */}
            {plantedHazards.map((hazard) => {
              const leftPct = (hazard.chainageKm / 138.25) * 100;
              const widthPct = Math.max(3.0, (hazard.zoneLengthKm / 138.25) * 100);
              const isInspected = inspectedHazardId === hazard.id;

              return (
                <React.Fragment key={hazard.id}>
                  {/* Zone restriction band on track */}
                  <div
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className={`absolute top-2 bottom-2 rounded-xl pointer-events-none border transition-all ${
                      hazard.active
                        ? "bg-rose-500/25 border-rose-500/70 shadow-inner shadow-rose-500/20 animate-pulse"
                        : "bg-slate-500/10 border-slate-500/30 opacity-40"
                    }`}
                  />

                  {/* Hazard Flag Pin */}
                  <div
                    style={{ left: `${leftPct}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectedHazardId(isInspected ? null : hazard.id);
                    }}
                    className={`absolute -top-1 -translate-x-1/2 z-30 cursor-pointer flex flex-col items-center group transition-transform hover:scale-125 ${
                      hazard.active ? "" : "opacity-40"
                    }`}
                  >
                    <span className="text-lg filter drop-shadow-lg animate-bounce">
                      {hazard.icon}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-rose-600 text-white shadow-md whitespace-nowrap flex items-center gap-1">
                      +{hazard.delayMinutes}m
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeHazard(hazard.id);
                        }}
                        className="hover:text-amber-200 ml-0.5"
                        title="Delete hazard"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Mouse Clicker Active Hover Crosshair Guideline & Floating Tag */}
            {isHoveringTrack && cursorPos && cursorKm !== null && (
              <div
                style={{ left: `${cursorPos.x}px` }}
                className="absolute top-0 bottom-0 pointer-events-none z-40 -translate-x-1/2 flex flex-col items-center justify-between"
              >
                {/* Floating Clicker Preview Tooltip */}
                <div className="bg-indigo-900/95 text-white border border-indigo-400/80 px-2.5 py-1 rounded-xl shadow-2xl text-[10px] font-mono whitespace-nowrap flex items-center gap-1.5 animate-pulse">
                  <span>{activeTemplate.icon}</span>
                  <span className="font-bold">Plant +{customDelayMinutes}m at KM {cursorKm.toFixed(1)}</span>
                </div>

                {/* Vertical Laser Guideline */}
                <div className="w-[1.5px] h-full bg-gradient-to-b from-indigo-400 via-indigo-300 to-indigo-500 shadow-md shadow-indigo-400" />

                <span className="text-[9px] font-mono font-bold bg-slate-900/90 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/40">
                  Click to drop
                </span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3D-STYLED MOVING TRAIN MODEL WITH TRAVELLING TIME TOP HUD BADGE           */}
            {/* ========================================================================= */}
            <div
              style={{ left: `${simState.traversalProgressPct}%` }}
              className="absolute top-[60%] -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-100 flex items-center pointer-events-none"
            >
              {/* TOP OF TRAIN: FLOATING TRAVELLING TIME & KINEMATIC STATUS HUD */}
              <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30">
                <div
                  className={`px-3 py-1 rounded-2xl border text-[11px] font-mono font-bold shadow-2xl flex items-center gap-2 whitespace-nowrap transition-all ${
                    isInsideHazard
                      ? "bg-rose-950/95 border-rose-400 text-rose-200 animate-pulse shadow-rose-500/40 scale-105"
                      : "bg-slate-950/95 border-indigo-400/80 text-indigo-200 shadow-indigo-500/30"
                  }`}
                >
                  <Timer className={`w-3.5 h-3.5 ${isInsideHazard ? "text-rose-400" : "text-indigo-400"}`} />
                  <span>Travelled: <strong className="text-white">{simState.travelledTimeFormatted}</strong></span>
                  <span className="text-slate-500">|</span>
                  <span className={`${isInsideHazard ? "text-rose-300" : "text-emerald-400"}`}>
                    {simState.currentSpeedKmph} km/h
                  </span>
                  {isInsideHazard && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] uppercase tracking-wider">
                      In Hazard
                    </span>
                  )}
                </div>

                {/* Arrow Pointer downwards to train */}
                <div className="w-2 h-2 bg-slate-950 border-r border-b border-indigo-400/80 rotate-45 -mt-1" />
              </div>

              {/* Volumetric LED Headlight Beam Casting Ahead */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 w-32 h-14 bg-gradient-to-r from-amber-300/40 via-amber-300/15 to-transparent pointer-events-none rounded-r-full blur-xs" />

              {/* 3D Rendered Locomotive Body */}
              <div className="relative flex items-center filter drop-shadow-2xl">
                
                {/* Trailing Coach 2 */}
                <div className="w-10 h-7 bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950 rounded-l-md border-y border-l border-blue-400/50 shadow-md flex items-center justify-around px-1">
                  <div className="w-2 h-2.5 bg-amber-200/80 rounded-xs shadow-xs" />
                  <div className="w-2 h-2.5 bg-amber-200/80 rounded-xs shadow-xs" />
                </div>

                {/* Trailing Coach 1 */}
                <div className="w-12 h-7 bg-gradient-to-b from-blue-600 via-blue-700 to-blue-900 border-y border-blue-400/60 shadow-md flex items-center justify-around px-1">
                  <div className="w-2 h-2.5 bg-amber-200/90 rounded-xs shadow-xs" />
                  <div className="w-2 h-2.5 bg-amber-200/90 rounded-xs shadow-xs" />
                  <div className="w-2 h-2.5 bg-amber-200/90 rounded-xs shadow-xs" />
                </div>

                {/* Main 3D Locomotive Engine (WAP-7 / Vande Bharat Styling) */}
                <div
                  className={`relative w-24 h-9 rounded-r-2xl border border-white/40 shadow-xl flex items-center justify-between px-2.5 text-white ${
                    isVandeBharat
                      ? "bg-gradient-to-r from-slate-200 via-slate-100 to-blue-600 text-slate-900"
                      : "bg-gradient-to-r from-red-700 via-red-600 to-blue-700 text-white"
                  }`}
                >
                  {/* Roof Pantograph touching OHE wire */}
                  <div className="absolute -top-3 left-6 w-3 h-3 border-t-2 border-r-2 border-amber-300 -rotate-45" />
                  <div className="absolute -top-3.5 left-7 w-2 h-[2px] bg-amber-200 shadow-sm shadow-amber-300" />

                  {/* Spark effect when in hazard zone */}
                  {isInsideHazard && (
                    <div className="absolute -top-4 left-6 text-[10px] animate-ping text-amber-300">
                      ⚡
                    </div>
                  )}

                  {/* Cab side branding */}
                  <div className="font-mono font-extrabold text-[11px] tracking-tight truncate max-w-[55px] drop-shadow-sm">
                    #{selectedTrain.id}
                  </div>

                  {/* 3D Windshield Cockpit Glass with Specular Glare */}
                  <div className="w-5 h-5 rounded-r-xl bg-gradient-to-tr from-cyan-900 via-cyan-700 to-sky-300 border border-sky-200 shadow-inner flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
                  </div>
                </div>

                {/* 3D Under-Bogie Wheels */}
                <div className="absolute -bottom-2 left-2 right-2 flex justify-between px-2 pointer-events-none">
                  <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-400 shadow-sm animate-spin" />
                  <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-400 shadow-sm animate-spin" />
                  <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-400 shadow-sm animate-spin" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Station Navigation Buttons */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono overflow-x-auto pt-1 gap-2">
            <span className="text-slate-400 font-semibold shrink-0">Quick Jump:</span>
            {[
              { label: "MYS (0 km)", km: 0 },
              { label: "Mandya (45 km)", km: 45.4 },
              { label: "Ramanagaram (93 km)", km: 93.3 },
              { label: "Bidadi (108 km)", km: 108.0 },
              { label: "Kengeri (126 km)", km: 126.0 },
              { label: "SBC Terminus (138 km)", km: 138.25 },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={() => jumpToKm(btn.km)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors whitespace-nowrap"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Simulation Playback & Speed Controls */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
                isPlaying
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? "Pause Simulation" : "Start Simulation"}</span>
            </button>

            <button
              onClick={resetSimulation}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition-colors shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>

          {/* Speed Multipliers */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-slate-400 font-semibold mr-1">Speed:</span>
            {[0.5, 1, 2, 5, 10, 20].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaySpeedMultiplier(spd)}
                className={`px-2.5 py-1.5 rounded-lg border transition-all ${
                  playSpeedMultiplier === spd
                    ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Live Dynamic ETA Forensics & Kinematic Recovery Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Dynamic Reaction & Kinematic Recovery Dashboard (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Real-time Dynamic ETA & Next Station Impact Card */}
          <div className="bg-white border-2 border-indigo-500 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Intelligent Multi-Factor Dynamic ETA Reaction
                </h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                simState.hasEncounteredPainFactors
                  ? "bg-amber-50 text-amber-800 border-amber-300 animate-pulse"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                {simState.hasEncounteredPainFactors ? "⚡ Dynamic Forecast Active" : "● Nominal Green Aspect"}
              </span>
            </div>

            {/* Static Naive vs Dynamic Intelligent ETA Comparison Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 rounded-2xl text-white space-y-3 border border-indigo-500/40">
              <div className="flex items-center justify-between text-xs font-mono text-indigo-300 border-b border-indigo-500/30 pb-2">
                <span className="font-bold flex items-center gap-1.5 uppercase">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  Static Linear vs. Intelligent Dynamic Prediction
                </span>
                <span className="text-slate-400">Terminus: SBC (KM 138.25)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center font-mono">
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Naive Static ETA</div>
                  <div className="text-base font-bold text-slate-300 mt-0.5">{simState.staticNaiveSbcTime}</div>
                  <div className="text-[10px] text-rose-400 font-bold">+{simState.staticNaiveDelayMin}m (Linear Sum)</div>
                </div>

                <div className="bg-indigo-900/80 p-2.5 rounded-xl border border-indigo-400/60 ring-1 ring-indigo-400/30">
                  <div className="text-[10px] text-indigo-300 uppercase font-bold">Dynamic Predicted ETA</div>
                  <div className="text-lg font-black text-indigo-200 mt-0.5">{simState.predictedSbcTime}</div>
                  <div className="text-[10px] text-emerald-400 font-bold">+{simState.predictedSbcArrivalDelayMin}m variance</div>
                </div>

                <div className="bg-emerald-950/70 p-2.5 rounded-xl border border-emerald-500/40">
                  <div className="text-[10px] text-emerald-400 uppercase font-bold">Slack Reclaimed</div>
                  <div className="text-base font-bold text-emerald-300 mt-0.5">-{simState.slackMinutesRecovered} mins</div>
                  <div className="text-[10px] text-slate-300 font-mono">via Tractive Power</div>
                </div>
              </div>
            </div>

            {/* Next Station & Final SBC Arrival Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Immediate Next Station Forecast */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-mono text-slate-400 uppercase font-semibold flex items-center justify-between">
                  <span>Immediate Next Stop</span>
                  <span className="text-blue-600 font-bold">{simState.distanceToNextStationKm} km ahead</span>
                </div>

                <div className="text-lg font-bold text-slate-900 font-heading">
                  {simState.nextStationName} ({simState.nextStationCode})
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/60 text-xs font-mono">
                  <span className="text-slate-500">Booked: {simState.scheduledNextStationTime}</span>
                  <span className="font-bold text-slate-900">
                    Dynamic ETA: <strong className="text-blue-700">{simState.predictedNextStationTime}</strong>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-amber-600">Delay at Stop: +{simState.predictedNextStationDelayMin}m</span>
                  <span className="text-slate-500 text-[11px]">Dist: {simState.distanceToNextStationKm} km</span>
                </div>
              </div>

              {/* Physical Remaining Distance & Travel Profile */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-mono text-indigo-600 uppercase font-semibold flex items-center justify-between">
                  <span>Remaining Distance Breakdown</span>
                  <span className="text-indigo-700 font-bold">{simState.distanceRemainingKm} km total</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-slate-500 text-[10px] block">Clear Track:</span>
                    <strong className="text-emerald-700 text-sm">{simState.remainingClearDistanceKm} km</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-slate-500 text-[10px] block">Speed Capped:</span>
                    <strong className="text-rose-600 text-sm">{simState.remainingRestrictedDistanceKm} km</strong>
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-indigo-200/60 text-xs font-mono text-slate-600">
                  <span>Est. Physical Transit:</span>
                  <strong className="text-indigo-950 font-bold">{simState.estimatedPhysicalTransitTimeMin} mins</strong>
                </div>
              </div>
            </div>

            {/* Actionable Dispatcher Advice Banner */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs font-mono space-y-1.5 shadow-md">
              <div className="text-indigo-300 font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                Kinematic Dispatcher Recommendation
              </div>
              <p className="text-slate-200 leading-relaxed font-sans text-xs">
                {simState.dispatcherActionAdvice}
              </p>
            </div>
          </div>

          {/* Train Historical Recovery DNA & Locomotive Profile Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Train Recovery DNA &amp; Historical Pick-up Capability
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                {Math.round(simState.trainDNA.historicalRecoveryRate * 100)}% Recovery Exploitation
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 font-heading">
                    {simState.trainDNA.tractiveLabel}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Acceleration: {simState.trainDNA.accelerationMps2} m/s² · Nominal Cruise: {simState.trainDNA.nominalCruiseKmph} km/h · Priority Tier: {simState.trainDNA.dispatchPriorityTier}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Recommended Pace</span>
                  <span className="text-lg font-black font-mono text-indigo-600">{simState.recommendedPaceKmph} km/h</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-sans border-t border-slate-200/80 pt-2">
                {simState.trainDNA.tractiveDescription}
              </p>
            </div>
          </div>

          {/* Kinematic Recovery Speed Calculator & Optimal Achievable Delay */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Kinematic Speed &amp; Optimal Delay Recovery
                </h3>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                  simState.isRecoveryFeasible
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {simState.isRecoveryFeasible ? "✅ 100% Delay Recoverable" : `⚠️ Optimal Delay: +${simState.optimalDelayMin}m`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-center">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase">Current Velocity</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {simState.currentSpeedKmph} <span className="text-xs font-normal">km/h</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Section MPS: {simState.maxCorridorMpsKmph} km/h</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200">
                <div className="text-[10px] text-blue-600 uppercase font-bold">Pace Needed on Clear Track</div>
                <div className="text-xl font-bold text-blue-700 mt-1">
                  {simState.recommendedPaceKmph} <span className="text-xs font-normal">km/h</span>
                </div>
                <div className="text-[10px] text-blue-600 mt-0.5">Next Stop Pace: {simState.requiredNextStationRecoverySpeedKmph} km/h</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] text-emerald-600 uppercase font-bold">Slack Recoverable</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  -{simState.slackMinutesRecovered} <span className="text-xs font-normal">mins</span>
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Optimal Delay: +{simState.optimalDelayMin}m</div>
              </div>
            </div>

            <div className="text-xs text-slate-600 font-mono bg-slate-50 p-3.5 rounded-2xl border border-slate-200 leading-relaxed space-y-1">
              <div>
                <strong>Recovery Physics:</strong> To recover lost time across the remaining <strong>{simState.remainingClearDistanceKm} km</strong> of clear track, train requires <strong>{simState.recommendedPaceKmph} km/h</strong>.
              </div>
              <div className="text-slate-500 text-[11px]">
                {simState.recommendedPaceKmph <= simState.maxCorridorMpsKmph
                  ? `Target pace is within the ${simState.maxCorridorMpsKmph} km/h locomotive MPS limit. Driver can notch up to recover on-time arrival.`
                  : `Target pace exceeds ${simState.maxCorridorMpsKmph} km/h locomotive limit. Maximum permissible acceleration recovers ${simState.maxRecoverableMin}m slack, resulting in an optimal achievable arrival delay of +${simState.optimalDelayMin}m.`}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Planted Hazards & Inspection Details (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active Planted Hazards On Track & Removal Controls */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Active Planted Hazards ({plantedHazards.length})
                </h3>
              </div>

              {plantedHazards.length > 0 && (
                <button
                  onClick={clearAllHazards}
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-bold font-mono transition-colors"
                  title="Remove all hazards from the track"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove All</span>
                </button>
              )}
            </div>

            {plantedHazards.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-mono bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-2xl">🛤️</div>
                <p>Track is clear of all operational pain factors.</p>
                <p className="text-slate-500 text-[11px]">Select a pain factor from the toolbelt and click on the track to drop one!</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {plantedHazards.map((h) => (
                  <div
                    key={h.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      h.active
                        ? "bg-rose-50/60 border-rose-200 text-rose-950"
                        : "bg-slate-50 border-slate-200 opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">{h.icon}</span>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {h.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          KM {h.chainageKm.toFixed(1)} · +{h.delayMinutes}m delay · Cap {h.speedCapKmph} km/h
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleHazardActive(h.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                          h.active
                            ? "bg-rose-600 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {h.active ? "Active" : "Bypassed"}
                      </button>

                      <button
                        onClick={() => removeHazard(h.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-colors"
                        title="Delete this hazard"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Pain Factor Details & Physics Breakdown */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4 border border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs uppercase font-bold">
              <Info className="w-4 h-4" />
              <span>Equipped Pain Factor Specifications</span>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
              <span className="text-3xl">{activeTemplate.icon}</span>
              <div>
                <h4 className="font-bold text-sm text-white font-heading">{activeTemplate.name}</h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Category: {activeTemplate.category} · Speed Limit: {activeTemplate.speedCapKmph} km/h</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {activeTemplate.description}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Zone Length:</span>
                <span className="text-white font-bold">{activeTemplate.zoneLengthKm} km</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Default Delay:</span>
                <span className="text-amber-400 font-bold">+{activeTemplate.delayMinutes} mins</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
