import React from "react";
import { TrainTrack, Radio, Cpu, ShieldCheck } from "lucide-react";

export type NavTab = "overview" | "traffic" | "inspector" | "stringline" | "simulator";

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-[#0B0F19]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Brand Name */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <TrainTrack className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white font-sans">
                RailRakshak
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                v2.0 AI-COA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Railway Traffic Intelligence &amp; Multi-Factor Dynamic ETA
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex rounded-lg border border-slate-800 bg-slate-900/80 p-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-md font-bold transition-all whitespace-nowrap ${
                activeTab === "overview"
                  ? "bg-cyan-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Overview &amp; ETA
            </button>
            <button
              onClick={() => setActiveTab("traffic")}
              className={`px-3 py-1.5 rounded-md font-bold transition-all whitespace-nowrap ${
                activeTab === "traffic"
                  ? "bg-cyan-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Traffic Map
            </button>
            <button
              onClick={() => setActiveTab("inspector")}
              className={`px-3 py-1.5 rounded-md font-bold transition-all whitespace-nowrap ${
                activeTab === "inspector"
                  ? "bg-cyan-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Section Inspector
            </button>
            <button
              onClick={() => setActiveTab("stringline")}
              className={`px-3 py-1.5 rounded-md font-bold transition-all whitespace-nowrap ${
                activeTab === "stringline"
                  ? "bg-cyan-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Stringline Chart
            </button>
            <button
              onClick={() => setActiveTab("simulator")}
              className={`px-3 py-1.5 rounded-md font-bold transition-all whitespace-nowrap ${
                activeTab === "simulator"
                  ? "bg-cyan-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              What-If Lab
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
