import React from "react";
import { Radio, Satellite, Train, Activity } from "lucide-react";

/**
 * TrackPulseLoader: Animated SVG railway track sleepers with moving train light
 */
export interface TrackPulseLoaderProps {
  label?: string;
  sublabel?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const TrackPulseLoader: React.FC<TrackPulseLoaderProps> = ({
  label = "Calibrating Corridor Signal Blocks...",
  sublabel = "NavIC 1 Hz Live Feed · 138.25 km SWR Line",
  size = "md",
  className = "",
}) => {
  const heightClass = size === "sm" ? "h-6" : size === "lg" ? "h-12" : "h-9";

  return (
    <div className={`flex flex-col items-center justify-center p-4 text-center select-none ${className}`}>
      {/* Animated Track Container */}
      <div className={`w-full max-w-md ${heightClass} relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700/80 shadow-inner flex items-center px-2`}>
        {/* Upper and Lower Rails */}
        <div className="absolute top-1.5 left-0 right-0 h-0.5 bg-slate-600 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
        <div className="absolute bottom-1.5 left-0 right-0 h-0.5 bg-slate-600 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />

        {/* Cross Sleepers (Ties) */}
        <div 
          className="absolute inset-x-0 top-1 bottom-1 opacity-40 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, #94a3b8 0, #94a3b8 2px, transparent 2px, transparent 14px)",
          }}
        />

        {/* Moving High-Speed Train Light Pulse */}
        <div className="relative w-full h-full flex items-center">
          <div className="absolute w-20 h-full bg-gradient-to-r from-transparent via-cyan-400/40 to-blue-500 rounded-full blur-xs animate-[pulse_1.5s_ease-in-out_infinite]" />
          
          {/* Active Train Head Icon with Glow */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-[0_0_12px_rgba(56,189,248,0.8)] border border-cyan-300/40 animate-[bounce_2s_infinite]">
            <Train className="w-3.5 h-3.5 text-white" />
            <span className="text-[10px] font-mono font-bold text-white tracking-widest uppercase hidden sm:inline">
              LIVE 138.25 KM
            </span>
          </div>

          {/* Signal Indicator Pips along Track */}
          <div className="ml-auto flex items-center gap-2 pr-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          </div>
        </div>
      </div>

      {label && (
        <div className="mt-2.5 text-xs font-mono font-bold text-slate-800 flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span>{label}</span>
        </div>
      )}
      {sublabel && (
        <div className="text-[11px] text-slate-500 font-data mt-0.5">
          {sublabel}
        </div>
      )}
    </div>
  );
};

/**
 * TelemetrySpinner: Crisp dual-ring radar spinner with station lock indicator
 */
export interface TelemetrySpinnerProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const TelemetrySpinner: React.FC<TelemetrySpinnerProps> = ({
  label = "Locking Block Telemetry...",
  size = "md",
  className = "",
}) => {
  const dim = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-16 h-16" : "w-12 h-12";
  const iconDim = size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-6 h-6" : "w-4 h-4";

  return (
    <div className={`inline-flex flex-col items-center justify-center gap-2 select-none ${className}`}>
      <div className={`relative ${dim} flex items-center justify-center`}>
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-slate-200 border-t-blue-600 border-r-indigo-500 animate-spin" style={{ animationDuration: "1.2s" }} />
        
        {/* Counter-rotating Inner Ring */}
        <div className="absolute inset-1 rounded-full border border-dashed border-slate-300 border-b-cyan-500 animate-spin" style={{ animationDuration: "2.4s", animationDirection: "reverse" }} />
        
        {/* Center Satellite / Train Pip */}
        <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 shadow-xs">
          <Satellite className={`${iconDim} animate-pulse`} />
        </div>
      </div>

      {label && (
        <span className="text-xs font-mono font-medium text-slate-600 text-center">
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * SectionDataSkeleton: Shimmering skeleton cards for data tables and charts
 */
export interface SectionDataSkeletonProps {
  rows?: number;
  type?: "card" | "table" | "chart";
  className?: string;
}

export const SectionDataSkeleton: React.FC<SectionDataSkeletonProps> = ({
  rows = 3,
  type = "card",
  className = "",
}) => {
  if (type === "chart") {
    return (
      <div className={`w-full bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-pulse space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 bg-slate-200 rounded-md" />
          <div className="h-3 w-20 bg-slate-200 rounded-md" />
        </div>
        <div className="h-44 w-full bg-slate-100 rounded-xl flex items-end justify-between p-3 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-200 rounded-t-md w-full"
              style={{ height: `${25 + (i * 11) % 70}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between pt-1">
          <div className="h-2.5 w-16 bg-slate-200 rounded" />
          <div className="h-2.5 w-16 bg-slate-200 rounded" />
          <div className="h-2.5 w-16 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className={`w-full bg-white rounded-2xl border border-slate-200 p-4 shadow-xs animate-pulse space-y-3 ${className}`}>
        <div className="h-4 w-48 bg-slate-200 rounded-md mb-3" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200" />
              <div className="space-y-1">
                <div className="h-3.5 w-24 bg-slate-200 rounded" />
                <div className="h-2.5 w-16 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-3.5 w-20 bg-slate-200 rounded" />
            <div className="h-3.5 w-14 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Default: card skeleton
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-28 bg-slate-200 rounded" />
            <div className="h-3.5 w-8 bg-slate-200 rounded-full" />
          </div>
          <div className="h-7 w-20 bg-slate-200 rounded-md" />
          <div className="h-2.5 w-full bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
};
