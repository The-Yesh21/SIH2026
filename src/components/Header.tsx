import React, { useState, useEffect, useRef } from "react";
import {
  TrainTrack,
  Sliders,
  Radio,
  Clock,
  Cpu,
  CheckCircle2,
  Sparkles,
  Satellite,
  Info,
  Compass,
  Train,
  Building2,
  BarChart3,
  Flame,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Layers,
  LayoutGrid
} from "lucide-react";
import { formatClockMinutes } from "../lib/rail/timeResolver";
import { checkBackendHealth, wakeUpBackend } from "../lib/rail/apiClient";

export type NavTabId = "COCKPIT" | "OPTIMAL_ROUTE" | "SIMULATOR" | "LOCO_PILOT" | "STITCH_INSIGHT" | "PAIN_FACTORS" | "ANALYSIS";

interface HeaderProps {
  showScenarioBar: boolean;
  setShowScenarioBar: (show: boolean) => void;
  injectedDelay: number;
  weather: string;
  activeClockMinutes: number;
  setActiveClockMinutes: (mins: number) => void;
  isRealTimeSynced: boolean;
  setIsRealTimeSynced: (synced: boolean) => void;
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  onOpenCorridorBriefing?: () => void;
}

interface TabDef {
  id: NavTabId;
  label: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ElementType;
  iconColor: string;
  activeBg: string;
  desc: string;
}

const NAV_TABS: TabDef[] = [
  {
    id: "COCKPIT",
    label: "Section Controller Cockpit",
    icon: Radio,
    iconColor: "text-emerald-400",
    activeBg: "bg-blue-600 text-white shadow-sm",
    desc: "Live Indian Railways Section Controller Cockpit (Mysuru–Bengaluru)",
  },
  {
    id: "OPTIMAL_ROUTE",
    label: "Optimal Train & Route Planner",
    badge: "TIMETABLE",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: Compass,
    iconColor: "text-emerald-600",
    activeBg: "bg-emerald-600 text-white shadow-sm",
    desc: "Multi-Factor Train Timetable Optimization, Speed Comparison & Delay Recovery Planner",
  },
  {
    id: "SIMULATOR",
    label: "Disruption & Physics Simulator",
    badge: "WHAT-IF",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
    icon: Sliders,
    iconColor: "text-indigo-600",
    activeBg: "bg-indigo-600 text-white shadow-sm",
    desc: "Interactive Corridor Digital Twin Simulator for Signal Disruption, Speed Limits & Davis Physics",
  },
  {
    id: "LOCO_PILOT",
    label: "Train Driver Cab View (DAS)",
    badge: "DRIVER CAB",
    badgeColor: "bg-sky-100 text-sky-800 border-sky-300",
    icon: Train,
    iconColor: "text-sky-600",
    activeBg: "bg-sky-600 text-white shadow-sm",
    desc: "Loco Pilot In-Cab Driver Advisory System (DAS) with Real-Time Speedometer, Signals & NavIC GPS",
  },
  {
    id: "STITCH_INSIGHT",
    label: "Station Master Operations",
    badge: "STATION OPS",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    icon: Building2,
    iconColor: "text-blue-600",
    activeBg: "bg-blue-700 text-white shadow-sm",
    desc: "Station Master Operations Dashboard: Platform Allocations, Passenger Train Movements & Dwell Times",
  },
  {
    id: "PAIN_FACTORS",
    label: "Bottleneck Delay Forensics",
    icon: Flame,
    iconColor: "text-amber-500",
    activeBg: "bg-amber-600 text-white shadow-sm",
    desc: "Corridor Bottlenecks, Signal Interference & Delay Recurrence Forensics",
  },
  {
    id: "ANALYSIS",
    label: "Fleet Delay Analytics",
    icon: BarChart3,
    iconColor: "text-slate-400",
    activeBg: "bg-slate-900 text-white shadow-sm",
    desc: "24-Hour Corridor Delay Analytics & Fleet Performance Matrices",
  },
];

export function Header({
  showScenarioBar,
  setShowScenarioBar,
  injectedDelay,
  weather,
  activeClockMinutes,
  setActiveClockMinutes,
  isRealTimeSynced,
  setIsRealTimeSynced,
  activeTab,
  setActiveTab,
  onOpenCorridorBriefing,
}: HeaderProps) {
  const [pythonBackendOnline, setPythonBackendOnline] = useState<boolean>(false);
  const [isWaking, setIsWaking] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

  const tabsRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const startX = useRef<number>(0);
  const scrollLeftStart = useRef<number>(0);

  useEffect(() => {
    const probe = async () => {
      const isUp = await checkBackendHealth();
      setPythonBackendOnline(isUp);
    };
    probe();
    const interval = setInterval(probe, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleWakeUp = async () => {
    if (pythonBackendOnline || isWaking) return;
    setIsWaking(true);
    await wakeUpBackend();
    const isUp = await checkBackendHealth();
    setPythonBackendOnline(isUp);
    setIsWaking(false);
  };

  // Sync with real-time clock when in real-time mode
  useEffect(() => {
    if (!isRealTimeSynced) return;

    const updateClock = () => {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      setActiveClockMinutes(currentMins);
    };

    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, [isRealTimeSynced, setActiveClockMinutes]);

  const handlePresetClick = (mins: number) => {
    setIsRealTimeSynced(false);
    setActiveClockMinutes(mins);
  };

  const handleSyncRealTime = () => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    setActiveClockMinutes(currentMins);
    setIsRealTimeSynced(true);
  };

  // Check scroll position for scroll arrows
  const checkScroll = () => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  // Auto-scroll active tab into view
  useEffect(() => {
    const activeEl = tabsRef.current?.querySelector(`[data-tab="${activeTab}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
    checkScroll();
  }, [activeTab]);

  const scrollTabs = (offset: number) => {
    tabsRef.current?.scrollBy({ left: offset, behavior: "smooth" });
    setTimeout(checkScroll, 250);
  };

  // Mouse Drag to Scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = tabsRef.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftStart.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !tabsRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabsRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    tabsRef.current.scrollLeft = scrollLeftStart.current - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
        {/* Left: Branding & Corridor Identity */}
        <div className="flex items-center justify-between lg:justify-start gap-3.5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 flex items-center justify-center shrink-0 rounded-2xl bg-indigo-50 border border-indigo-100 p-1 shadow-xs">
              <img src="/logo.svg" alt="RailRakshak Logo" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-heading font-bold text-slate-900 tracking-tight">
                  RailRakshak
                </h1>
                {/* Python ML Backend Status Badge with One-Click Wake-Up */}
                <button
                  onClick={handleWakeUp}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-data font-semibold border transition-all cursor-pointer ${
                    pythonBackendOnline
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : isWaking
                      ? "bg-amber-50 text-amber-700 border-amber-300 animate-pulse"
                      : "bg-slate-100 text-slate-600 border-slate-300 hover:border-amber-400 hover:text-amber-700"
                  }`}
                  title={
                    pythonBackendOnline
                      ? "FastAPI Python ML Intelligence Core Active (LightGBM + SHAP)"
                      : isWaking
                      ? "Waking up Render Python server from sleep..."
                      : "Server sleeping. Click to wake up Render Python ML instance!"
                  }
                >
                  {isWaking ? (
                    <div className="w-2.5 h-2.5 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                  ) : (
                    <Cpu className="w-3 h-3" />
                  )}
                  <span>
                    {pythonBackendOnline
                      ? "Python ML Engine Online"
                      : isWaking
                      ? "Waking Cloud Engine..."
                      : "Hybrid Offline Mode (Click to Wake)"}
                  </span>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  onClick={onOpenCorridorBriefing}
                  className="text-xs font-body text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer group text-left"
                  title="Click to view Evaluator Corridor Scope Briefing"
                >
                  <span>SWR Corridor · <strong className="text-slate-900 group-hover:text-indigo-600">Mysuru (MYS) ➔ KSR Bengaluru (SBC)</strong> · 138.25 km</span>
                  <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-mono font-bold shrink-0">
                    PROTOTYPE SCOPE
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Toggle Navigation Menu"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Center: Dynamic Real-Time Time Scrubber */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-50 p-2 rounded-xl border border-slate-200 font-data text-xs">
          {/* Time Display & Real-Time Sync Toggle */}
          <div className="flex items-center justify-between sm:justify-start gap-2 px-2">
            <div className="flex items-center gap-1.5 text-slate-900 font-data font-semibold text-sm">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>{formatClockMinutes(activeClockMinutes)}</span>
            </div>

            <button
              onClick={handleSyncRealTime}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                isRealTimeSynced
                  ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                  : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {isRealTimeSynced ? "Real-Time Clock (Now)" : "Sync Real-Time"}
            </button>
          </div>

          {/* Quick Scrub Presets */}
          <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-2.5 overflow-x-auto no-scrollbar">
            {[
              { label: "Night (01:25 AM)", mins: 85 },
              { label: "Morning (07:30 AM)", mins: 450 },
              { label: "Midday (12:54 PM)", mins: 774 },
              { label: "Evening (19:00 PM)", mins: 1140 },
            ].map((p) => {
              const isActive = !isRealTimeSynced && Math.abs(activeClockMinutes - p.mins) < 30;
              return (
                <button
                  key={p.label}
                  onClick={() => handlePresetClick(p.mins)}
                  className={`px-2 py-1 rounded-md transition-all whitespace-nowrap text-xs cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                  }`}
                >
                  {p.label.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: What-If Button */}
        <div className="hidden lg:flex items-center gap-2.5">
          <button
            onClick={() => setShowScenarioBar(!showScenarioBar)}
            className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer ${
              showScenarioBar
                ? "bg-amber-100 border-amber-300 text-amber-800 shadow-xs"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-600 transition-transform group-hover:rotate-45" />
            <span>{showScenarioBar ? "Close Simulator" : "What-If Simulator"}</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/98 p-4 shadow-xl space-y-2 animate-fade-in">
          <div className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider mb-2">
            Switch Platform View
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? `${tab.activeBg} border-transparent`
                      : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : tab.iconColor}`} />
                    <span className="text-xs font-bold font-heading">{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isActive ? "bg-white/20 text-white" : tab.badgeColor || "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Primary Section Switcher Tabs (Horizontal Scroll with Controls) */}
      <div className="relative border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex items-center">
          {/* Left Scroll Chevron Arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scrollTabs(-240)}
              className="absolute left-2 sm:left-4 z-20 p-1.5 rounded-full bg-white/95 border border-slate-300 shadow-md text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer hidden sm:flex items-center justify-center"
              title="Scroll tabs left"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Scrollable Tabs Track */}
          <div
            ref={tabsRef}
            onScroll={checkScroll}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className="flex-1 flex items-center gap-1.5 overflow-x-auto py-2 no-scrollbar touch-pan-x cursor-grab active:cursor-grabbing select-none scroll-smooth"
          >
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  data-tab={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.desc}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-heading text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap shrink-0 border cursor-pointer ${
                    isActive
                      ? `${tab.activeBg} border-transparent shadow-xs`
                      : "bg-white border-slate-200/80 text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 hover:border-slate-300"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : tab.iconColor}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                        isActive
                          ? "bg-white/20 text-white"
                          : tab.badgeColor || "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Scroll Chevron Arrow */}
          {canScrollRight && (
            <button
              onClick={() => scrollTabs(240)}
              className="absolute right-2 sm:right-4 z-20 p-1.5 rounded-full bg-white/95 border border-slate-300 shadow-md text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer hidden sm:flex items-center justify-center"
              title="Scroll tabs right"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
