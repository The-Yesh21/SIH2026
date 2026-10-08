import React, { useState } from "react";
import { 
  Train, 
  MapPin, 
  Zap, 
  Activity, 
  Sparkles, 
  ArrowRight, 
  X, 
  Info, 
  Sliders, 
  Compass, 
  CheckCircle2, 
  TrendingUp, 
  Cpu, 
  Radio, 
  Layers, 
  Satellite,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface WelcomeLandingBannerProps {
  onOpenSimulator: () => void;
  onOpenOptimizer: () => void;
  onOpenBriefing: () => void;
  onReplayPreloader?: () => void;
}

export const WelcomeLandingBanner: React.FC<WelcomeLandingBannerProps> = ({
  onOpenSimulator,
  onOpenOptimizer,
  onOpenBriefing,
  onReplayPreloader,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  if (isDismissed) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-700/60 shadow-md mb-6 animate-fade-in">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-cyan-300">
            <Train className="w-3.5 h-3.5" />
          </div>
          <span className="font-heading font-bold text-xs sm:text-sm text-white">
            Welcome to RailRakshak
          </span>
          <span className="text-[11px] font-mono text-cyan-300 hidden md:inline">
            · SWR Mysuru–Bengaluru High-Density Corridor Dispatch Twin (138.25 km)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onReplayPreloader && (
            <button
              onClick={onReplayPreloader}
              className="text-[11px] font-mono text-cyan-300 hover:text-white bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer hidden sm:inline"
            >
              Calibrate Telemetry
            </button>
          )}
          <button
            onClick={() => setIsDismissed(false)}
            className="text-xs font-mono font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Expand Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/60 rounded-3xl p-5 sm:p-7 shadow-xl mb-7 animate-fade-in select-none">
      {/* Subtle Background Pattern & Light Beam */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(99, 102, 241, 0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute -top-12 -right-12 w-80 h-80 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

      {/* Dismiss / Minimize Action */}
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
        title="Minimize Welcome Card"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left Column: Welcome Heading, Details and Subtext */}
        <div className="space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-cyan-300 text-[11px] font-mono font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>INDIAN RAILWAYS · SWR CORRIDOR DIGITAL TWIN</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">
            Welcome to <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">RailRakshak</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-body">
            Real-time physics-informed delay propagation, spatial NavIC satellite ingestion, and explainable LightGBM dynamic ETA forecasting calibrated for the <strong className="text-white">Mysuru (MYS) ➔ KSR Bengaluru (SBC)</strong> high-density double-line electrified corridor.
          </p>

          {/* SWR Mysore–Bengaluru High-Density Corridor Overview Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-indigo-900/60 flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Trunk Route</div>
                <div className="text-xs sm:text-sm font-bold text-white">138.25 km</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-indigo-900/60 flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Block Posts</div>
                <div className="text-xs sm:text-sm font-bold text-emerald-400">16 Stations</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-indigo-900/60 flex items-center gap-2.5">
              <Train className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Fleet Services</div>
                <div className="text-xs sm:text-sm font-bold text-indigo-300">10 Trains</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-indigo-900/60 flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">ML Accuracy</div>
                <div className="text-xs sm:text-sm font-bold text-emerald-300">84.2% Error Cut</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Action Launchpad */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full lg:w-auto shrink-0">
          <button
            onClick={onOpenSimulator}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-between gap-3 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-300" />
              <span>Run Disruption Simulation</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={onOpenOptimizer}
            className="px-4 py-2.5 rounded-xl bg-indigo-900/70 hover:bg-indigo-800/90 text-white border border-indigo-500/40 font-bold text-xs shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-300" />
              <span>Optimal Route Finder</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </button>

          <div className="flex items-center gap-2 w-full">
            <button
              onClick={onOpenBriefing}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700 font-semibold text-xs transition-all flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Prototype Scope</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">SWR JURY</span>
            </button>

            {onReplayPreloader && (
              <button
                onClick={onReplayPreloader}
                className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-cyan-300 border border-slate-700 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                title="Re-run the initial telemetry calibration sequence"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-[11px] hidden sm:inline">Telemetry</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
