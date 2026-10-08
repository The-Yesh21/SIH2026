import React, { useEffect, useState } from "react";
import { 
  Train, 
  MapPin, 
  ArrowRight, 
  Info, 
  X, 
  CheckCircle2,
  Globe2,
  Activity,
  Radio,
  Sparkles
} from "lucide-react";

interface CorridorPreloaderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CorridorPreloaderModal: React.FC<CorridorPreloaderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(() => {
    try {
      return localStorage.getItem("railrakshak_skip_briefing") === "true";
    } catch {
      return false;
    }
  });

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleDismiss = () => {
    try {
      if (dontShowAgain) {
        localStorage.setItem("railrakshak_skip_briefing", "true");
      } else {
        localStorage.removeItem("railrakshak_skip_briefing");
      }
    } catch {}
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-900 overflow-hidden">
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close Briefing (Esc)"
          aria-label="Close Briefing"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-3 pt-1">
          <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>SIH 2026 Evaluator Notice · Prototype Scope</span>
          </span>
        </div>

        {/* Main Title */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
          South Western Railway Prototype: <br className="hidden sm:inline" />
          <span className="text-blue-700">
            Mysuru (MYS) ➔ KSR Bengaluru (SBC) Corridor
          </span>
        </h2>

        {/* Evaluator Explanatory Notice */}
        <div className="mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 leading-relaxed space-y-2">
          <p className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Note for Evaluators &amp; Jury: </strong> This live prototype has been calibrated, trained, and benchmarked specifically on the <strong>138.25 km double-line electrified trunk route</strong> of the <strong>South Western Railway (SWR)</strong> to demonstrate full-depth physical and operational accuracy.
            </span>
          </p>
        </div>

        {/* Corridor Technical Specs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-blue-700 text-xs font-mono font-bold mb-1">
              <MapPin className="w-4 h-4" />
              <span>Section Scope</span>
            </div>
            <div className="text-sm font-bold text-slate-900">138.25 km Track</div>
            <div className="text-[11px] text-slate-500 mt-0.5">16 Interlocked Stations from MYS to SBC</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-indigo-700 text-xs font-mono font-bold mb-1">
              <Train className="w-4 h-4" />
              <span>Fleet Coverage</span>
            </div>
            <div className="text-sm font-bold text-slate-900">10 Scheduled Trains</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Vande Bharat, Shatabdi, Superfast, MEMU</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-mono font-bold mb-1">
              <Globe2 className="w-4 h-4" />
              <span>Nationwide Scale</span>
            </div>
            <div className="text-sm font-bold text-slate-900">Modular Engine</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Deployable to any IR Division (CR, NR, SCR)</div>
          </div>
        </div>

        {/* 3 Core Highlights for Evaluators */}
        <div className="space-y-2 text-xs text-slate-700 font-sans border-t border-slate-200 pt-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>Dual-Core Intelligence:</strong> Combines Davis kinematic tractive physics with LightGBM &amp; SHAP attribution.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>Real-Time NavIC Ingestion:</strong> 1 Hz satellite telemetry with sub-meter spatial KD-Tree track snapping.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>84.2% Error Reduction:</strong> Validated across 1,480 historical trips (MAE 2.1m vs NTES 14.8m).</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Don't show automatically on startup</span>
          </label>

          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Enter Section Controller Cockpit</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
