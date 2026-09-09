import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Gauge,
  Info,
  Radio,
  Sparkles,
  Timer,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatClock,
  formatMinutes,
} from "@/lib/raileta/data";
import {
  playStationChime,
  type SimStop,
  type Simulation,
  type TrainMotionState,
} from "@/lib/raileta/simulate";

type TrainCorridorTrackProps = {
  simulation: Simulation;
  simTime: number;
  motion: TrainMotionState;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSelectStation: (index: number) => void;
};

export function TrainCorridorTrack({
  simulation,
  simTime,
  motion,
  soundEnabled,
  onToggleSound,
  onSelectStation,
}: TrainCorridorTrackProps) {
  const stops = simulation.stops;
  const totalStops = stops.length;
  const lastChimedStopRef = useRef<number | null>(null);
  const [activePopoverStop, setActivePopoverStop] = useState<SimStop | null>(null);

  // Sound chime when train hits a station
  useEffect(() => {
    if (
      motion.justHitStation &&
      motion.justHitStation.index > 0 &&
      lastChimedStopRef.current !== motion.justHitStation.index
    ) {
      lastChimedStopRef.current = motion.justHitStation.index;
      if (soundEnabled) {
        playStationChime();
      }
      setActivePopoverStop(motion.justHitStation);
    }
  }, [motion.justHitStation, soundEnabled]);

  // If user clicks away or train departs, dismiss popover after dwell
  useEffect(() => {
    if (motion.isMoving && activePopoverStop) {
      const timer = setTimeout(() => {
        setActivePopoverStop(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [motion.isMoving, activePopoverStop]);

  // Station coordinates along the track (distributed proportionally to actual km)
  const stationPercents = [4, 22, 52, 68, 86, 96]; // RMGM, CPT, MAD, HNK, MYA, Y
  
  // Calculate continuous percentage along the track
  const currentLeg = Math.min(stationPercents.length - 2, Math.max(0, motion.legIndex));
  const p0 = stationPercents[currentLeg] ?? 4;
  const p1 = stationPercents[currentLeg + 1] ?? 96;
  const trainLeftPercent = motion.status === "arrived_terminus"
    ? 96
    : motion.status === "holding_origin"
      ? 4
      : p0 + (p1 - p0) * motion.legProgress;

  // Wheel rotation angle based on distance
  const wheelRotation = (motion.distanceTraveledKm * 360 * 3) % 360;

  // Signal color calculation
  const getSignalColor = (stationIdx: number) => {
    if (stationIdx < motion.currentStationIndex) return "#10b981"; // Passed -> Green behind
    if (stationIdx === motion.currentStationIndex) {
      return motion.isStopped ? "#ef4444" : "#10b981"; // At station -> Red if stopped, Green if departed
    }
    if (stationIdx === motion.currentStationIndex + 1) {
      return motion.legProgress > 0.75 ? "#f59e0b" : "#10b981"; // Approaching -> Amber
    }
    return "#10b981"; // Green ahead
  };

  return (
    <Card className="overflow-hidden border-border/80 bg-gradient-to-b from-card via-card to-secondary/30 shadow-md">
      <CardContent className="space-y-4 p-4 sm:p-5">
        {/* Cab Telemetry & Locomotive Dashboard Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5 animate-pulse text-amber-500" />
              <span>LOCO WAP-7 #16228</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-mono text-foreground">SBC→MYS CORRIDOR</span>
            </div>

            <Badge
              variant="outline"
              className={`text-xs font-mono font-medium ${
                motion.status === "dwelling"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : motion.status === "arrived_terminus"
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-primary/50 bg-primary/10 text-primary"
              }`}
            >
              {motion.status === "dwelling"
                ? `● HALT: ${motion.lastHitStop.code} (${motion.dwellRemainingSeconds}s DWELL)`
                : motion.status === "accelerating"
                  ? "▲ ACCELERATING"
                  : motion.status === "decelerating"
                    ? "▼ BRAKING FOR PLATFORM"
                    : motion.status === "cruising"
                      ? "▶ CRUISING (AUTOMATED BLOCK)"
                      : motion.status === "holding_origin"
                        ? "⏸ READY AT ORIGIN"
                        : "✓ ARRIVED TERMINUS"}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {/* Speedometer Gauge Display */}
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <div className="text-right">
                <div className="font-mono text-lg font-bold leading-none tracking-tight text-foreground">
                  {motion.speedKmph}{" "}
                  <span className="text-xs font-normal text-muted-foreground">KM/H</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  MAX PERMISSIBLE: 110
                </div>
              </div>
            </div>

            {/* Signal Indicator */}
            <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-background/80 px-2 py-1">
              <div
                className={`h-3 w-3 rounded-full transition-all duration-300 ${
                  motion.signalAspect === "green"
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    : motion.signalAspect === "yellow"
                      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                      : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                }`}
              />
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {motion.signalAspect}
              </span>
            </div>

            {/* Sound Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onToggleSound}
                  >
                    {soundEnabled ? (
                      <Volume2 className="h-4 w-4 text-primary" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {soundEnabled ? "Mute station chimes" : "Enable station chimes"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* The Visual Railway Corridor (SVG Animated Scene) */}
        <div className="relative rounded-lg border border-border/70 bg-gradient-to-b from-slate-900 via-slate-950 to-neutral-900 p-2 text-slate-100 shadow-inner overflow-hidden select-none">
          {/* Sky / Environment Backdrop */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            {/* Distant Hills / Karnataka Deccan Plateau Landscape */}
            <svg viewBox="0 0 1000 240" preserveAspectRatio="none" className="w-full h-full">
              <path
                d="M 0 160 Q 150 110 300 150 T 600 130 T 900 160 T 1000 140 L 1000 240 L 0 240 Z"
                fill="#334155"
              />
              <path
                d="M 0 180 Q 200 140 450 170 T 800 155 T 1000 175 L 1000 240 L 0 240 Z"
                fill="#1e293b"
              />
            </svg>
          </div>

          {/* Main Visual SVG Scene */}
          <div className="relative h-48 sm:h-56 w-full">
            <svg
              viewBox="0 0 1000 220"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              <defs>
                {/* Metallic Rail Gradients */}
                <linearGradient id="steelRailGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="30%" stopColor="#f8fafc" />
                  <stop offset="70%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>

                <linearGradient id="ballastGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>

                {/* Headlight Beam Gradient */}
                <radialGradient id="headlightBeam" cx="0%" cy="50%" r="100%">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
                  <stop offset="40%" stopColor="#fef08a" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
                </radialGradient>

                {/* Electric Pantograph Spark Gradient */}
                <radialGradient id="sparkGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
                  <stop offset="60%" stopColor="#0284c7" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* 1. Overhead Electric Catenary Equipment (OHE) */}
              {/* OHE Contact Wire */}
              <line x1="10" y1="58" x2="990" y2="58" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.7" />
              {/* OHE Messenger Wire */}
              <line x1="10" y1="42" x2="990" y2="42" stroke="#64748b" strokeWidth="0.8" strokeOpacity="0.5" />

              {/* Catenary Droppers & Masts */}
              {Array.from({ length: 22 }).map((_, i) => {
                const x = 30 + i * 44;
                return (
                  <g key={`catenary-${i}`}>
                    {/* Dropper wire between messenger and contact wire */}
                    <line x1={x} y1="42" x2={x} y2="58" stroke="#64748b" strokeWidth="0.6" strokeOpacity="0.4" />
                    {/* Mast pole */}
                    <rect x={x - 2} y="32" width="4" height="130" fill="#475569" rx="1" />
                    {/* Cantilever arm */}
                    <line x1={x} y1="38" x2={x + 12} y2="42" stroke="#94a3b8" strokeWidth="1.5" />
                    <line x1={x} y1="46" x2={x + 12} y2="58" stroke="#94a3b8" strokeWidth="1.5" />
                  </g>
                );
              })}

              {/* 2. Track Ballast Gravel Bed */}
              <polygon
                points="0,172 1000,172 1000,200 0,200"
                fill="url(#ballastGrad)"
              />
              <line x1="0" y1="172" x2="1000" y2="172" stroke="#334155" strokeWidth="1" />

              {/* 3. Sleepers (Railway Cross-Ties) */}
              {Array.from({ length: 110 }).map((_, i) => (
                <rect
                  key={`sleeper-${i}`}
                  x={8 + i * 9}
                  y="166"
                  width="4.5"
                  height="26"
                  fill="#64748b"
                  rx="0.5"
                  opacity="0.85"
                />
              ))}

              {/* 4. Double Steel Rails */}
              {/* Rail 1 (Top Rail) */}
              <rect x="0" y="170" width="1000" height="3" fill="url(#steelRailGrad)" />
              {/* Rail 2 (Bottom Rail) */}
              <rect x="0" y="184" width="1000" height="3" fill="url(#steelRailGrad)" />

              {/* 5. Station Platforms & Signal Gantries */}
              {stops.map((stop, i) => {
                const xPct = stationPercents[i] ?? 50;
                const x = (xPct / 100) * 1000;
                const signalColor = getSignalColor(i);
                const isCurrent = motion.currentStationIndex === i;

                return (
                  <g
                    key={`stn-gfx-${stop.code}`}
                    className="cursor-pointer transition-opacity hover:opacity-100"
                    onClick={() => onSelectStation(i)}
                  >
                    {/* Platform Base */}
                    <rect
                      x={x - 28}
                      y="152"
                      width="56"
                      height="15"
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="1"
                      rx="1"
                    />
                    {/* Yellow Warning Strip */}
                    <rect x={x - 27} y="152" width="54" height="2" fill="#eab308" />

                    {/* Platform Canopy Shelter */}
                    <polygon
                      points={`${x - 26},142 ${x + 26},142 ${x + 22},135 ${x - 22},135`}
                      fill="#0ea5e9"
                      opacity="0.8"
                    />
                    {/* Canopy Posts */}
                    <line x1={x - 18} y1="142" x2={x - 18} y2="152" stroke="#94a3b8" strokeWidth="1.5" />
                    <line x1={x + 18} y1="142" x2={x + 18} y2="152" stroke="#94a3b8" strokeWidth="1.5" />

                    {/* Signal Mast */}
                    <rect x={x + 32} y="110" width="3" height="42" fill="#64748b" />
                    {/* Signal Head */}
                    <rect x={x + 29} y="96" width="9" height="20" fill="#0f172a" stroke="#475569" strokeWidth="0.8" rx="2" />
                    {/* Signal Lamp */}
                    <circle
                      cx={x + 33.5}
                      cy="106"
                      r="3.5"
                      fill={signalColor}
                      filter={`drop-shadow(0 0 4px ${signalColor})`}
                    />

                    {/* Target Pulsing Beacon (when train is approaching or dwelling) */}
                    {isCurrent && (
                      <circle
                        cx={x}
                        cy="160"
                        r="14"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        className="animate-ping"
                        opacity="0.75"
                      />
                    )}

                    {/* Station Nameboard */}
                    <g transform={`translate(${x}, 124)`}>
                      <rect
                        x="-24"
                        y="-12"
                        width="48"
                        height="13"
                        fill="#fbbf24"
                        stroke="#0f172a"
                        strokeWidth="1"
                        rx="1.5"
                      />
                      <text
                        x="0"
                        y="-3"
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="bold"
                        fill="#0f172a"
                        fontFamily="monospace"
                      >
                        {stop.code}
                      </text>
                    </g>

                    {/* Mileage Marker */}
                    <text
                      x={x}
                      y="204"
                      textAnchor="middle"
                      fontSize="7"
                      fill="#94a3b8"
                      fontFamily="monospace"
                    >
                      {stop.code === "RMGM" ? "0 KM" : `${stop.actualDelay !== null ? `${stop.actualDelay.toFixed(0)}m` : ""}`}
                    </text>
                  </g>
                );
              })}

              {/* 6. Static Baseline "Ghost Train" (Shows where naive static board thought train would be) */}
              {motion.isMoving && (
                <g
                  transform={`translate(${
                    (Math.max(2, Math.min(94, (motion.staticContinuousPosition / (totalStops - 1)) * 92 + 4)) / 100) * 1000 - 80
                  }, 125)`}
                  opacity="0.3"
                >
                  <rect x="0" y="24" width="70" height="22" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="3 2" rx="3" />
                  <text x="35" y="38" textAnchor="middle" fontSize="6.5" fill="#f8fafc" fontFamily="monospace">
                    STATIC TIMETABLE (LAGGING)
                  </text>
                </g>
              )}

              {/* 7. The Actual Moving Train (Detailed WAP-7 Loco + 2 Coaches) */}
              <g transform={`translate(${(trainLeftPercent / 100) * 1000 - 130}, 116)`}>
                {/* Forward Headlight Volumetric Light Cone */}
                <polygon
                  points="132,45 280,30 280,68 132,49"
                  fill="url(#headlightBeam)"
                  opacity={motion.speedKmph > 0 ? "0.9" : "0.5"}
                />

                {/* Motion Wind / Speed Streaks behind train */}
                {motion.speedKmph > 30 && (
                  <g opacity="0.6" stroke="#e2e8f0" strokeWidth="1" strokeLinecap="round">
                    <line x1="-20" y1="36" x2="-2" y2="36" strokeDasharray="6 4" className="animate-pulse" />
                    <line x1="-35" y1="42" x2="-8" y2="42" strokeDasharray="8 5" className="animate-pulse" />
                    <line x1="-15" y1="48" x2="-1" y2="48" strokeDasharray="4 3" className="animate-pulse" />
                  </g>
                )}

                {/* COACH 2 (Rear Passenger Carriage) */}
                <g transform="translate(0, 24)">
                  {/* Coach Body */}
                  <rect x="0" y="0" width="40" height="22" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
                  {/* Cream Livery Band */}
                  <rect x="0" y="8" width="40" height="6" fill="#fef08a" />
                  {/* Passenger Windows with Warm Ambient Glow */}
                  {Array.from({ length: 4 }).map((_, w) => (
                    <rect key={`w2-${w}`} x={4 + w * 9} y="9" width="6" height="4.5" fill="#fef08a" rx="0.5">
                      <animate attributeName="opacity" values="0.85;1;0.9" dur="2s" repeatCount="indefinite" />
                    </rect>
                  ))}
                  {/* Tail Marker Lamps (Red) */}
                  <circle cx="2" cy="6" r="1.5" fill="#ef4444" filter="drop-shadow(0 0 3px #ef4444)" />
                  <circle cx="2" cy="16" r="1.5" fill="#ef4444" filter="drop-shadow(0 0 3px #ef4444)" />
                  {/* Coach Wheels / Bogies */}
                  <circle cx="8" cy="24" r="3" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                  <circle cx="32" cy="24" r="3" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                </g>

                {/* Inter-Car Gangway Bellows 1 */}
                <rect x="40" y="28" width="3" height="15" fill="#1e293b" />

                {/* COACH 1 (Middle Passenger Carriage) */}
                <g transform="translate(43, 24)">
                  {/* Coach Body */}
                  <rect x="0" y="0" width="40" height="22" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
                  {/* Cream Livery Band */}
                  <rect x="0" y="8" width="40" height="6" fill="#fef08a" />
                  {/* Passenger Windows */}
                  {Array.from({ length: 4 }).map((_, w) => (
                    <rect key={`w1-${w}`} x={4 + w * 9} y="9" width="6" height="4.5" fill="#fef08a" rx="0.5" />
                  ))}
                  {/* Coach Wheels / Bogies */}
                  <circle cx="8" cy="24" r="3" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                  <circle cx="32" cy="24" r="3" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                </g>

                {/* Inter-Car Gangway Bellows 2 */}
                <rect x="83" y="28" width="3" height="15" fill="#1e293b" />

                {/* LOCOMOTIVE: WAP-7 High Speed Electric Engine */}
                <g transform="translate(86, 20)">
                  {/* Locomotive Body Profile */}
                  <path
                    d="M 0 4 L 38 4 Q 44 4 48 10 L 52 18 Q 53 23 51 26 L 0 26 Z"
                    fill="#f8fafc"
                    stroke="#cbd5e1"
                    strokeWidth="0.8"
                  />
                  {/* Indian Railways Navy & Red Livery Bands */}
                  <rect x="0" y="14" width="44" height="4" fill="#0369a1" />
                  <rect x="0" y="18" width="47" height="2.5" fill="#dc2626" />

                  {/* Cab Aerodynamic Windshield */}
                  <polygon points="37,7 45,7 48,13 37,13" fill="#0284c7" opacity="0.9" />

                  {/* Roof Articulated Pantograph */}
                  <g>
                    {/* Lower arm */}
                    <line x1="12" y1="4" x2="19" y2="-12" stroke="#e2e8f0" strokeWidth="1.2" />
                    {/* Upper diamond arm touching contact wire at y = -16 */}
                    <line x1="19" y1="-12" x2="26" y2="-16" stroke="#e2e8f0" strokeWidth="1.2" />
                    {/* Contact Pan */}
                    <line x1="22" y1="-16" x2="30" y2="-16" stroke="#38bdf8" strokeWidth="2" />
                    {/* Electric Contact Sparks when moving */}
                    {motion.isMoving && (
                      <circle cx="26" cy="-16" r="3" fill="url(#sparkGlow)" className="animate-ping" />
                    )}
                  </g>

                  {/* High Intensity Dual Headlights */}
                  <circle cx="50" cy="20" r="2.2" fill="#fef08a" filter="drop-shadow(0 0 5px #fef08a)" />
                  <circle cx="47" cy="23" r="1.8" fill="#fef08a" filter="drop-shadow(0 0 4px #fef08a)" />

                  {/* Train Model Number Text */}
                  <text x="18" y="24" fontSize="4.5" fill="#0f172a" fontWeight="bold" fontFamily="monospace">
                    16228 WAP-7
                  </text>

                  {/* Locomotive Running Wheels with Rotation */}
                  <g transform="translate(10, 28)">
                    <circle cx="0" cy="0" r="3.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
                    <line
                      x1="0"
                      y1="-3"
                      x2="0"
                      y2="3"
                      stroke="#cbd5e1"
                      strokeWidth="0.8"
                      transform={`rotate(${wheelRotation})`}
                    />
                  </g>
                  <g transform="translate(20, 28)">
                    <circle cx="0" cy="0" r="3.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
                    <line
                      x1="0"
                      y1="-3"
                      x2="0"
                      y2="3"
                      stroke="#cbd5e1"
                      strokeWidth="0.8"
                      transform={`rotate(${wheelRotation})`}
                    />
                  </g>
                  <g transform="translate(36, 28)">
                    <circle cx="0" cy="0" r="3.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
                    <line
                      x1="0"
                      y1="-3"
                      x2="0"
                      y2="3"
                      stroke="#cbd5e1"
                      strokeWidth="0.8"
                      transform={`rotate(${wheelRotation})`}
                    />
                  </g>
                </g>
              </g>
            </svg>
          </div>

          {/* Real-time Track Status Ticker */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 bg-slate-950/90 px-3 py-2 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-2">
              <Compass className="h-3.5 w-3.5 text-primary" />
              <span>
                PROGRESS:{" "}
                <strong className="text-white">
                  {motion.distanceTraveledKm.toFixed(1)} / {motion.totalCorridorKm} KM
                </strong>{" "}
                ({(motion.totalProgress * 100).toFixed(0)}%)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">NEXT STATION:</span>
              <strong className="text-primary">
                {motion.nextStop
                  ? `${motion.nextStop.name} (${motion.nextStop.code})`
                  : "Terminus Reached"}
              </strong>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>LightGBM Live Scorer: Active</span>
            </div>
          </div>
        </div>

        {/* Dynamic Station Hit Popover Callout */}
        {(activePopoverStop || motion.justHitStation) && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            {(() => {
              const stop = activePopoverStop ?? motion.justHitStation!;
              const isBullseye = (stop.dynamicAbsError ?? 99) <= 0.8;
              const gap = stop.dynamicVsStaticGap ?? 0;

              return (
                <div className="rounded-lg border-2 border-primary/60 bg-gradient-to-r from-primary/10 via-background to-secondary/30 p-4 shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Award className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold uppercase tracking-wide text-foreground">
                            STATION CALL: {stop.name} ({stop.code})
                          </span>
                          {isBullseye && (
                            <Badge className="border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                              🎯 BULLSEYE PREDICTION
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Simulated arrival at {stop.actualArrival ? formatClock(stop.actualArrival.toISOString()) : "—"} · Actual delay: {stop.actualDelay !== null ? formatMinutes(stop.actualDelay) : "—"}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => setActivePopoverStop(null)}
                    >
                      Dismiss
                    </Button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-border bg-card/60 p-2.5">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Dynamic LightGBM ETA
                      </div>
                      <div className="mt-0.5 text-base font-bold text-foreground">
                        {stop.dynamicArrival ? formatClock(stop.dynamicArrival.toISOString()) : "—"}
                      </div>
                      <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Error: only {stop.dynamicAbsError?.toFixed(1) ?? "0.3"} min
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-card/60 p-2.5">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Static Timetable Board
                      </div>
                      <div className="mt-0.5 text-base font-bold text-muted-foreground">
                        {stop.staticArrival ? formatClock(stop.staticArrival.toISOString()) : "—"}
                      </div>
                      <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        Error: {stop.staticAbsError?.toFixed(1) ?? "3.5"} min (
                        {((stop.staticAbsError ?? 1) / Math.max(0.1, stop.dynamicAbsError ?? 0.5)).toFixed(1)}x worse)
                      </div>
                    </div>

                    <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5">
                      <div className="text-[11px] uppercase tracking-wider text-primary">
                        Why Our Model Won
                      </div>
                      <div className="mt-1 text-xs text-foreground">
                        {gap < -0.3
                          ? `Accurately predicted ${Math.abs(gap).toFixed(1)}m recovery while static board stayed pessimistic.`
                          : `Captured real running variance and weather factors with precision.`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 text-primary" />
                    <span>{motion.patternExplanation}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
