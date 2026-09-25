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
  FastForward,
  Flame,
  Gauge,
  HelpCircle,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  ShieldAlert,
  Sparkles,
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
    return res.operatingState === "RUNNING_ON_TRACK" ? res.currentLocationKm : 12.0;
  });

  // Selected Hazard Template from palette
  const [selectedHazardTemplateIndex, setSelectedHazardTemplateIndex] = useState<number>(0);
  const [customDelayMinutes, setCustomDelayMinutes] = useState<number>(8);

  // Active Selected Hazard for on-track popup inspector
  const [inspectedHazardId, setInspectedHazardId] = useState<string | null>(null);

  // Planted Hazards on track
  const [plantedHazards, setPlantedHazards] = useState<PlantedHazard[]>([
    {
      id: "hazard-initial-1",
      type: "OHE_VOLTAGE_SAG",
      name: "OHE 25kV Voltage Sag / Tripping",
      category: "TRACTION",
      chainageKm: 48.0,
      locationLabel: "Mandya Outer (KM 48.0)",
      delayMinutes: 8,
      speedCapKmph: 45,
      zoneLengthKm: 4.5,
      description: "Substation feeder overload drops catenary voltage from 25kV to 17kV, halving acceleration torque.",
      active: true,
      icon: "⚡",
      color: "#F59E0B",
    },
    {
      id: "hazard-initial-2",
      type: "SIGNAL_DANGER_HOLD",
      name: "Terminal Outer Signal Danger Hold",
      category: "SIGNALING",
      chainageKm: 132.5,
      locationLabel: "SBC Terminal Throat (KM 132.5)",
      delayMinutes: 14,
      speedCapKmph: 15,
      zoneLengthKm: 3.0,
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
    setSimulatedKm(res.operatingState === "RUNNING_ON_TRACK" ? res.currentLocationKm : 10.0);
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

  // Plant a hazard at a specific KM
  const handlePlantHazardAtKm = (km: number) => {
    const template = HAZARD_PALETTE[selectedHazardTemplateIndex];
    const newHazard: PlantedHazard = {
      id: `hazard-${Date.now()}-${Math.round(km)}`,
      type: template.type,
      name: template.name,
      category: template.category,
      chainageKm: Math.round(km * 10) / 10,
      locationLabel: getClosestStationName(km),
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

  const isVandeBharat = selectedTrain.type.toLowerCase().includes("vande");
  const isFreight = selectedTrain.type.toLowerCase().includes("freight");

  return (
    <div className="w-full space-y-6 font-body">
      
      {/* 1. Masthead God-Mode Hero Banner */}
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
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold font-heading mt-2 tracking-tight">
              Real-Time Moving Train &amp; Interactive Pain Factor Simulator
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Watch the 3D-styled locomotive navigate the SWR corridor in real-time. Plant or remove any operational pain factor on the track ahead to observe instant dynamic ETA reactions, next-station delays, and tractive recovery speeds.
            </p>
          </div>

          {/* Train Selector Dropdown */}
          <div className="flex items-center gap-2.5 bg-slate-900/90 p-3 rounded-2xl border border-slate-700/80 font-mono text-xs shrink-0 shadow-lg">
            <span className="text-slate-400 font-semibold">Active Rake:</span>
            <select
              value={selectedTrain.id}
              onChange={(e) => onSelectTrain(e.target.value)}
              className="bg-slate-950 border border-indigo-500/50 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
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

      {/* 2. Interactive Animated Track Canvas (Visual GUI Track Schematic with 3D Train) */}
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
              Click anywhere along the track to plant a hazard. Click on hazard pins to remove or inspect.
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
            <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-bold">
              KM {simState.currentKm.toFixed(1)} · {simState.currentSpeedKmph} km/h
            </div>
          </div>
        </div>

        {/* The Live Interactive Track Bar with 3D Train Model */}
        <div className="space-y-4">
          <div
            ref={trackContainerRef}
            onClick={handleTrackClick}
            className="relative w-full h-32 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-3 cursor-crosshair select-none overflow-hidden shadow-2xl border border-slate-800"
            title="Click anywhere on this track to plant the selected pain factor hazard"
          >
            {/* OHE Overhead Catenary Wire (25kV AC) */}
            <div className="absolute inset-x-0 top-3 h-[1px] bg-amber-400/40 shadow-xs pointer-events-none" />
            <div className="absolute inset-x-0 top-3 flex items-center justify-between px-4 pointer-events-none">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="w-[1px] h-3 bg-amber-500/30" />
              ))}
            </div>

            {/* Concrete Sleepers & Ballast Bed */}
            <div className="absolute inset-x-0 top-[55%] -translate-y-1/2 h-6 bg-slate-950/90 border-y border-slate-700/60 flex items-center justify-between px-1 pointer-events-none">
              {Array.from({ length: 80 }).map((_, i) => (
                <div key={i} className="w-1 h-5 bg-slate-800/80 rounded-xs" />
              ))}
            </div>

            {/* Steel Dual Rails with Metallic Specular Glare */}
            <div className="absolute inset-x-0 top-[48%] h-[2.5px] bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 shadow-sm pointer-events-none" />
            <div className="absolute inset-x-0 top-[62%] h-[2.5px] bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 shadow-sm pointer-events-none" />

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
              const widthPct = Math.max(2.5, (hazard.zoneLengthKm / 138.25) * 100);
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

            {/* ========================================================================= */}
            {/* 3D-STYLED MOVING TRAIN MODEL (Isometric / Orthographic High-Gloss Rake)  */}
            {/* ========================================================================= */}
            <div
              style={{ left: `${simState.traversalProgressPct}%` }}
              className="absolute top-[55%] -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-100 flex items-center pointer-events-none"
            >
              {/* Volumetric LED Headlight Beam Casting Ahead */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 w-28 h-12 bg-gradient-to-r from-amber-300/40 via-amber-300/15 to-transparent pointer-events-none rounded-r-full blur-xs" />

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
                  {simState.hazardInZone && (
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
                  <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-400 shadow-sm" />
                  <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-400 shadow-sm" />
                  <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-400 shadow-sm" />
                </div>
              </div>

              {/* Floating Speedometer HUD Tag */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border border-blue-400/50 shadow-md whitespace-nowrap">
                {simState.currentSpeedKmph} km/h
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
                    ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Live Dynamic ETA Forensics & Kinematic Recovery Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Dynamic Reaction & Kinematic Recovery Dashboard (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Real-time Dynamic ETA & Next Station Impact Card */}
          <div className="bg-white border-2 border-indigo-500 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Real-Time Dynamic ETA Reaction
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 font-mono border border-indigo-200">
                Auto-Recalculating
              </span>
            </div>

            {/* Next Station & Final SBC Arrival Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Next Station Forecast */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-mono text-slate-400 uppercase font-semibold flex items-center justify-between">
                  <span>Immediate Next Station</span>
                  <span className="text-blue-600 font-bold">{simState.distanceToNextStationKm} km ahead</span>
                </div>

                <div className="text-lg font-bold text-slate-900 font-heading">
                  {simState.nextStationName} ({simState.nextStationCode})
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/60 text-xs font-mono">
                  <span className="text-slate-500">Booked: {simState.scheduledNextStationTime}</span>
                  <span className="font-bold text-slate-900">
                    Predicted: <strong className="text-blue-700">{simState.predictedNextStationTime}</strong>
                  </span>
                </div>

                <div className="text-xs font-mono font-bold text-amber-600">
                  Delay at Next Stop: +{simState.predictedNextStationDelayMin} mins
                </div>
              </div>

              {/* Final Terminus SBC Dynamic ETA */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-mono text-indigo-600 uppercase font-semibold flex items-center justify-between">
                  <span>KSR Bengaluru (SBC) Arrival</span>
                  <span className="text-indigo-700 font-bold">{simState.distanceRemainingKm} km left</span>
                </div>

                <div className="text-2xl font-bold text-indigo-950 font-heading">
                  {simState.predictedSbcTime}
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-indigo-200/60 text-xs font-mono">
                  <span className="text-slate-500">Booked: {simState.scheduledSbcTime}</span>
                  <span className="font-bold text-indigo-700">
                    +{simState.predictedSbcArrivalDelayMin} min variance
                  </span>
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

          {/* Kinematic Recovery Speed Calculator */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Kinematic Recovery Speed Calculator
                </h3>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                  simState.isRecoveryFeasible
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {simState.isRecoveryFeasible ? "✅ Recovery Achievable" : "🚨 Delay Unrecoverable"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-center">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase">Current Velocity</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {simState.currentSpeedKmph} <span className="text-xs font-normal">km/h</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200">
                <div className="text-[10px] text-blue-600 uppercase font-bold">Speed Needed to Recover</div>
                <div className="text-xl font-bold text-blue-700 mt-1">
                  {simState.requiredRecoverySpeedKmph} <span className="text-xs font-normal">km/h</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] text-emerald-600 uppercase font-bold">Max Slack Recoverable</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  -{simState.maxRecoverableMin} <span className="text-xs font-normal">mins</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-mono bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              <strong>Corridor Tractive Limits:</strong> Maximum permissible speed (MPS) on SWR Mysuru–Bengaluru line is <strong>110 km/h</strong> (130 km/h for Vande Bharat). Over the remaining <strong>{simState.distanceRemainingKm} km</strong>, the maximum kinetic buffer is <strong>{simState.maxRecoverableMin} minutes</strong>.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: "God Hand" Pain Factor Palette & Active Hazards List (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Pain Factor Arsenal / Palette */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Pain Factor "God Hand" Arsenal
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Select &amp; Plant</span>
            </div>

            {/* Custom Delay Slider */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600 font-bold">Detention Severity:</span>
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold">
                  +{customDelayMinutes} mins delay
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                value={customDelayMinutes}
                onChange={(e) => setCustomDelayMinutes(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Hazard Templates Grid */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {HAZARD_PALETTE.map((haz, idx) => {
                const isSelected = selectedHazardTemplateIndex === idx;

                return (
                  <div
                    key={haz.type}
                    onClick={() => {
                      setSelectedHazardTemplateIndex(idx);
                      setCustomDelayMinutes(haz.delayMinutes);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">{haz.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{haz.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Category: {haz.category} · Speed Cap: {haz.speedCapKmph} km/h
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Plant 10 km ahead of current train position
                        const plantKm = Math.min(135, simState.currentKm + 12);
                        handlePlantHazardAtKm(plantKm);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-mono font-bold shrink-0 transition-colors shadow-xs"
                      title="Plant this hazard 12 km ahead of the moving train"
                    >
                      Plant Ahead ➔
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

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
              <div className="text-center py-6 text-xs text-slate-400 font-mono bg-slate-50 rounded-2xl border border-slate-200">
                Track is clear. Click anywhere on the track schematic or use the Arsenal above to plant a hazard.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
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

        </div>

      </div>
    </div>
  );
}
