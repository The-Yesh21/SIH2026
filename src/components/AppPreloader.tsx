import React, { useState, useEffect } from "react";
import { Train, Radio, Cpu, Layers, MapPin, ArrowRight, Sparkles, CheckCircle2, Satellite, ShieldCheck, Zap } from "lucide-react";

interface AppPreloaderProps {
  onComplete: () => void;
}

const TELEMETRY_STAGES = [
  {
    icon: Satellite,
    title: "NavIC Satellite Constellation",
    label: "Connecting to NavIC Satellites (1 Hz Live Feed)...",
    badge: "1 Hz TELEMETRY",
    metric: "Sub-meter Precision",
    targetPct: 25,
  },
  {
    icon: MapPin,
    title: "Spatial KD-Tree Corridor Snapping",
    label: "Snapping Mysuru (MYS) ➔ KSR Bengaluru (SBC) Corridor (138.25 km)...",
    badge: "138.25 KM SWR",
    metric: "16 Block Sections",
    targetPct: 55,
  },
  {
    icon: Cpu,
    title: "Hybrid Physics & AI Engine",
    label: "Calibrating Davis Tractive Physics & LightGBM Model (MAE 2.1m)...",
    badge: "DAVIS + LIGHTGBM",
    metric: "84.2% Error Reduction",
    targetPct: 85,
  },
  {
    icon: Layers,
    title: "Interlocked Section Control",
    label: "Synchronizing 16 Interlocked Stations & Live Fleet...",
    badge: "LIVE COCKPIT",
    metric: "10 Scheduled Fleet Trains",
    targetPct: 100,
  },
];

const CORRIDOR_STATIONS = [
  { code: "MYS", name: "Mysuru Jn", km: "0.0" },
  { code: "MYA", name: "Mandya", km: "44.8" },
  { code: "CPT", name: "Channapatna", km: "81.6" },
  { code: "RMGM", name: "Ramanagaram", km: "93.1" },
  { code: "KGI", name: "Kengeri", km: "126.1" },
  { code: "SBC", name: "KSR Bengaluru", km: "138.2" },
];

export const AppPreloader: React.FC<AppPreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(0);
  const [stageIndex, setStageIndex] = useState<number>(0);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        handleFinish();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const finishTimer = setTimeout(() => {
        handleFinish();
      }, 450);
      return () => clearTimeout(finishTimer);
    }

    // 0 to 100% in ~1.8 seconds (step every ~36ms by 2%)
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 2;
        if (next >= 85) setStageIndex(3);
        else if (next >= 55) setStageIndex(2);
        else if (next >= 25) setStageIndex(1);
        else setStageIndex(0);
        return Math.min(next, 100);
      });
    }, 36);

    return () => clearInterval(interval);
  }, [progress]);

  const handleFinish = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 450);
  };

  const currentStage = TELEMETRY_STAGES[stageIndex];
  const StageIcon = currentStage.icon;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950 text-white transition-all duration-500 select-none ${
        isExiting ? "opacity-0 scale-98 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Background High-Tech Railway Grid Matrix */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(56, 189, 248, 0.4) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Decorative Subtle Radiant Beam */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/15 blur-[120px] pointer-events-none rounded-full" />

      <div className="relative w-full max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center space-y-6">
        {/* Glowing Top Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-400 text-xs font-mono font-bold tracking-wider uppercase shadow-xs">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span>INDIAN RAILWAYS · SWR MISSION DISPATCHER</span>
        </div>

        {/* Brand Icon & Welcome Title */}
        <div className="space-y-2.5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/25 border border-white/20">
            <Train className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight text-white">
            Welcome to <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">RailRakshak</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-body max-w-lg mx-auto">
            Intelligent Corridor Twin &amp; Real-Time Physics Dispatcher
          </p>
        </div>

        {/* Corridor Waypoints Spine Graphic */}
        <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              SWR Trunk Line: Mysuru (MYS) ➔ KSR Bengaluru (SBC)
            </span>
            <span className="text-cyan-400 font-bold">138.25 km</span>
          </div>

          {/* Animated Track Bar */}
          <div className="w-full relative py-1">
            <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 relative">
              {/* Ties Hatching */}
              <div 
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage: "repeating-linear-gradient(90deg, #94a3b8 0, #94a3b8 2px, transparent 2px, transparent 10px)"
                }}
              />
              {/* Progress Fill */}
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 transition-all duration-75 ease-out rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                {/* Train Headlight Beam */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_16px_#38bdf8] border-2 border-cyan-400" />
              </div>
            </div>

            {/* Station Station Pins Along Spine */}
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-2 px-1">
              {CORRIDOR_STATIONS.map((stn, idx) => {
                const isActive = (idx / (CORRIDOR_STATIONS.length - 1)) * 100 <= progress;
                return (
                  <div key={stn.code} className="flex flex-col items-center">
                    <span className={`transition-colors font-bold ${isActive ? "text-cyan-300" : "text-slate-500"}`}>
                      {stn.code}
                    </span>
                    <span className="text-[9px] text-slate-500 hidden sm:inline">{stn.km}k</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Telemetry Stage Callout */}
        <div className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-cyan-400 shrink-0">
              <StageIcon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase text-cyan-400 font-bold tracking-wider">
                {currentStage.badge}
              </div>
              <div className="text-xs sm:text-sm font-medium text-slate-200">
                {currentStage.label}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 pl-3">
            <div className="text-lg sm:text-xl font-mono font-black text-white">
              {progress}%
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {currentStage.metric}
            </div>
          </div>
        </div>

        {/* Corridor Technical Specs Grid */}
        <div className="grid grid-cols-3 gap-2.5 w-full text-left">
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Double Electrified</div>
            <div className="text-xs sm:text-sm font-bold text-slate-200">138.25 km Route</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Interlocked Blocks</div>
            <div className="text-xs sm:text-sm font-bold text-emerald-400">16 Stations</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Kinematics Engine</div>
            <div className="text-xs sm:text-sm font-bold text-cyan-400">Davis + LightGBM</div>
          </div>
        </div>

        {/* Skip / Enter Instant Action Bar */}
        <div className="w-full flex items-center justify-between gap-4 pt-1">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:flex items-center gap-1.5">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px]">Esc</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px]">Enter</kbd> to skip
          </span>
          <button
            onClick={handleFinish}
            className="w-full sm:w-auto ml-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Skip to Live Cockpit</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
