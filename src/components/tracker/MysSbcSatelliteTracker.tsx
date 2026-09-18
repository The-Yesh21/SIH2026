import React, { useState, useMemo } from "react";
import {
  Satellite,
  Radio,
  TrainFront,
  Plane,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Compass,
  Zap,
  MapPin,
  RefreshCw,
  Sliders,
  Car,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export interface MysSbcTrain {
  id: string;
  name: string;
  type: "Vande Bharat" | "Shatabdi" | "Superfast" | "Express" | "MEMU";
  locoNumber: string;
  origin: string;
  destination: string;
  scheduledDep: string;
  scheduledArr: string;
  currentStopIndex: number;
  currentProgressPct: number; // 0 to 100
  speedKmph: number;
  baseDelayMin: number;
  lat: number;
  lng: number;
  heading: string;
}

export interface CorridorStop {
  code: string;
  name: string;
  km: number;
  scheduledTime: string;
  isMajorHalt: boolean;
  airportFeederAvailable?: boolean;
}

export const MYS_SBC_STOPS: CorridorStop[] = [
  { code: "MYS", name: "Mysuru Junction", km: 0, scheduledTime: "06:45", isMajorHalt: true },
  { code: "NHY", name: "Naganahalli", km: 8.5, scheduledTime: "06:55", isMajorHalt: false },
  { code: "PANP", name: "Pandavapura", km: 19.3, scheduledTime: "07:07", isMajorHalt: false },
  { code: "MYA", name: "Mandya", km: 45.2, scheduledTime: "07:31", isMajorHalt: true },
  { code: "MAD", name: "Maddur", km: 64.1, scheduledTime: "07:49", isMajorHalt: true },
  { code: "CPT", name: "Channapatna", km: 82.5, scheduledTime: "08:06", isMajorHalt: false },
  { code: "RMGM", name: "Ramanagaram", km: 93.8, scheduledTime: "08:18", isMajorHalt: true },
  { code: "BID", name: "Bidadi", km: 108.2, scheduledTime: "08:33", isMajorHalt: false },
  { code: "KGI", name: "Kengeri", km: 126.0, scheduledTime: "08:52", isMajorHalt: true, airportFeederAvailable: true },
  { code: "NYH", name: "Nayandahalli", km: 131.2, scheduledTime: "09:02", isMajorHalt: false },
  { code: "SBC", name: "KSR Bengaluru", km: 138.3, scheduledTime: "09:25", isMajorHalt: true, airportFeederAvailable: true },
];

export const MYS_SBC_TRAINS: MysSbcTrain[] = [
  {
    id: "16215",
    name: "Chamundi Express",
    type: "Express",
    locoNumber: "WAP-7 #30482 (RTIS-ISRO Active)",
    origin: "MYS (06:45)",
    destination: "SBC (09:25)",
    scheduledDep: "06:45",
    scheduledArr: "09:25",
    currentStopIndex: 6, // Ramanagaram
    currentProgressPct: 68,
    speedKmph: 76.5,
    baseDelayMin: 14,
    lat: 12.7214,
    lng: 77.2812,
    heading: "058° ENE",
  },
  {
    id: "20608",
    name: "Vande Bharat Express",
    type: "Vande Bharat",
    locoNumber: "Trainset #20608 (ISRO MSS Transponder)",
    origin: "MYS (13:05)",
    destination: "SBC (14:50)",
    scheduledDep: "13:05",
    scheduledArr: "14:50",
    currentStopIndex: 3, // Mandya
    currentProgressPct: 34,
    speedKmph: 112.0,
    baseDelayMin: 3,
    lat: 12.5241,
    lng: 76.8972,
    heading: "054° NE",
  },
  {
    id: "12008",
    name: "Shatabdi Express",
    type: "Shatabdi",
    locoNumber: "WAP-7 #37012 (RTIS-ISRO Active)",
    origin: "MYS (14:15)",
    destination: "SBC (16:15)",
    scheduledDep: "14:15",
    scheduledArr: "16:15",
    currentStopIndex: 4, // Maddur
    currentProgressPct: 48,
    speedKmph: 92.4,
    baseDelayMin: 8,
    lat: 12.5841,
    lng: 77.0425,
    heading: "056° NE",
  },
  {
    id: "06560",
    name: "MYS-SBC MEMU Commuter",
    type: "MEMU",
    locoNumber: "MEMU-3 Phase #1104",
    origin: "MYS (15:30)",
    destination: "SBC (18:45)",
    scheduledDep: "15:30",
    scheduledArr: "18:45",
    currentStopIndex: 5, // Channapatna
    currentProgressPct: 59,
    speedKmph: 54.0,
    baseDelayMin: 22,
    lat: 12.6512,
    lng: 77.2014,
    heading: "055° NE",
  },
];

export interface SurroundingTrafficTrain {
  id: string;
  name: string;
  direction: "Inbound (MYS→SBC)" | "Outbound (SBC→MYS)";
  location: string;
  speedKmph: number;
  status: "Clear Running" | "Preceding Slow Traffic" | "Opposing Line Crossing" | "Held on Loop Line";
  signalAspect: "Green" | "Double Yellow" | "Yellow" | "Red";
  impactOnSubjectTrain: string;
}

export const SURROUNDING_TRAFFIC: SurroundingTrafficTrain[] = [
  {
    id: "BOXN-Freight #58219",
    name: "Automobile Cargo Goods",
    direction: "Inbound (MYS→SBC)",
    location: "Bidadi (BID) Section Block 5",
    speedKmph: 42,
    status: "Preceding Slow Traffic",
    signalAspect: "Double Yellow",
    impactOnSubjectTrain: "Preceding headway limitation between RMGM & BID (+3 min caution speed)",
  },
  {
    id: "12614",
    name: "Wodeyar Superfast Exp",
    direction: "Outbound (SBC→MYS)",
    location: "Approaching Ramanagaram (RMGM)",
    speedKmph: 88,
    status: "Opposing Line Crossing",
    signalAspect: "Green",
    impactOnSubjectTrain: "Normal passing on Down-line (No conflict on automated double-track)",
  },
  {
    id: "06560",
    name: "MEMU Passenger",
    direction: "Inbound (MYS→SBC)",
    location: "Ramanagaram Loop Line 3",
    speedKmph: 0,
    status: "Held on Loop Line",
    signalAspect: "Red",
    impactOnSubjectTrain: "Controller precedence active: Express gets priority clearance",
  },
];

export function MysSbcSatelliteTracker() {
  const [selectedTrainId, setSelectedTrainId] = useState<string>("16215");
  const [delayModifier, setDelayModifier] = useState<number>(0);
  const [flightDepartureTimeStr, setFlightDepartureTimeStr] = useState<string>("11:30");
  const [transitMode, setTransitMode] = useState<"sbc_taxi" | "kgeri_taxi" | "vayu_vajra">("sbc_taxi");

  const train = useMemo(() => {
    return MYS_SBC_TRAINS.find((t) => t.id === selectedTrainId) || MYS_SBC_TRAINS[0];
  }, [selectedTrainId]);

  const currentLiveDelay = train.baseDelayMin + delayModifier;

  // Compute section-by-section dynamic delay propagation to SBC
  const stopsCalculated = useMemo(() => {
    let runningDelay = currentLiveDelay;
    return MYS_SBC_STOPS.map((stop, idx) => {
      const isPast = idx < train.currentStopIndex;
      const isCurrent = idx === train.currentStopIndex;
      const isFuture = idx > train.currentStopIndex;

      let sectionPredictedDelay = runningDelay;
      let slackRecovery = 0;
      let bottleneckPenalty = 0;

      if (isFuture) {
        // Section Slack & Bottleneck modeling
        if (stop.code === "BID") {
          // Open section: slight buffer recovery
          slackRecovery = 2;
          runningDelay = Math.max(0, runningDelay - slackRecovery);
        } else if (stop.code === "KGI") {
          // Suburban boundary: stable
          slackRecovery = 1;
          runningDelay = Math.max(0, runningDelay - slackRecovery);
        } else if (stop.code === "NYH") {
          // Inner junction approach
          bottleneckPenalty = 1;
          runningDelay += bottleneckPenalty;
        } else if (stop.code === "SBC") {
          // Terminus platform reception wait if delayed
          bottleneckPenalty = runningDelay > 10 ? 4 : 1;
          runningDelay += bottleneckPenalty;
        }
        sectionPredictedDelay = runningDelay;
      }

      // Convert "06:45" + delay into predicted clock
      const [hStr, mStr] = stop.scheduledTime.split(":");
      const schedMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
      const appliedDelay = isPast ? Math.min(train.baseDelayMin, idx * 2) : sectionPredictedDelay;
      const predictedTotalMins = schedMins + appliedDelay;
      const predHours = Math.floor(predictedTotalMins / 60) % 24;
      const predMinutes = predictedTotalMins % 60;
      const predictedClockStr = `${String(predHours).padStart(2, "0")}:${String(predMinutes).padStart(2, "0")}`;

      return {
        ...stop,
        isPast,
        isCurrent,
        isFuture,
        appliedDelay,
        predictedClockStr,
        slackRecovery,
        bottleneckPenalty,
      };
    });
  }, [train, currentLiveDelay]);

  // Terminal Arrival Prediction at SBC
  const sbcStop = stopsCalculated[stopsCalculated.length - 1];
  const kgiStop = stopsCalculated.find((s) => s.code === "KGI") || sbcStop;

  // Airport Transfer Calculation
  const airportIntel = useMemo(() => {
    // Transit durations from stations to KIA (Kempegowda Int'l Airport)
    const transitTimeMins =
      transitMode === "sbc_taxi" ? 75 : transitMode === "kgeri_taxi" ? 85 : 95; // Vayu Vajra bus

    const arrivalAtStationMins =
      transitMode === "kgeri_taxi"
        ? parseInt(kgiStop.predictedClockStr.split(":")[0], 10) * 60 +
          parseInt(kgiStop.predictedClockStr.split(":")[1], 10)
        : parseInt(sbcStop.predictedClockStr.split(":")[0], 10) * 60 +
          parseInt(sbcStop.predictedClockStr.split(":")[1], 10);

    const airportArrivalTotalMins = arrivalAtStationMins + transitTimeMins;
    const airportArrH = Math.floor(airportArrivalTotalMins / 60) % 24;
    const airportArrM = airportArrivalTotalMins % 60;
    const airportArrivalClockStr = `${String(airportArrH).padStart(2, "0")}:${String(airportArrM).padStart(2, "0")}`;

    const [fltH, fltM] = flightDepartureTimeStr.split(":");
    const flightMins = parseInt(fltH || "11", 10) * 60 + parseInt(fltM || "30", 10);
    const flightBufferMins = flightMins - airportArrivalTotalMins;

    const riskLevel: "SAFE" | "TIGHT" | "CRITICAL" =
      flightBufferMins >= 60 ? "SAFE" : flightBufferMins >= 30 ? "TIGHT" : "CRITICAL";

    return {
      transitTimeMins,
      airportArrivalClockStr,
      flightBufferMins,
      riskLevel,
    };
  }, [transitMode, sbcStop, kgiStop, flightDepartureTimeStr]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Satellite Telemetry Heartbeat */}
      <div className="rounded-lg border border-sky-900/60 bg-gradient-to-r from-sky-950/40 via-slate-900/90 to-slate-950 p-5 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
              <Badge className="border-sky-400/40 bg-sky-950/80 text-sky-300">
                <Satellite className="mr-1.5 h-3.5 w-3.5 inline text-sky-400" /> ISRO RTIS Live Satellite Feed
              </Badge>
              <Badge className="border-amber-400/40 bg-amber-950/80 text-amber-300">
                Corridor: Mysuru (MYS) → Bengaluru (SBC)
              </Badge>
            </div>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
              "Where is the Train?" — Real-Time Telemetry &amp; Airport Delay Propagation
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Live GNSS transponder tracking synchronized with section-by-section dynamic delay forecasting for inbound Bengaluru &amp; KIA Airport connections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-md border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-right font-[family-name:var(--font-mono)] text-xs">
              <div className="text-[10px] uppercase text-sky-400">30s Telemetry Lock</div>
              <div className="text-slate-200">NAVIC / MSS Active (8 Sats)</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Train Selector & Live Telemetry Cockpit */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Train Card Selector */}
        <Card className="border-slate-800 bg-slate-900/80 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-slate-200">
              <span className="flex items-center gap-2">
                <TrainFront className="h-4 w-4 text-amber-400" />
                Select Inbound Train
              </span>
              <span className="text-[11px] text-slate-400 font-normal">MYS → SBC</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {MYS_SBC_TRAINS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTrainId(t.id);
                  setDelayModifier(0);
                }}
                className={`w-full rounded-md border p-3 text-left transition-all ${
                  t.id === selectedTrainId
                    ? "border-amber-400 bg-amber-950/30 text-amber-100 shadow-sm"
                    : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-[family-name:var(--font-mono)] font-bold text-slate-100">
                    {t.id} {t.name}
                  </span>
                  <Badge variant="outline" className="border-slate-700 text-[10px] text-slate-300">
                    {t.type}
                  </Badge>
                </div>
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>Dep: {t.scheduledDep} MYS</span>
                  <span>Arr: {t.scheduledArr} SBC</span>
                </div>
              </button>
            ))}

            {/* Delay Sandbox Slider */}
            <div className="mt-4 rounded-md border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Sliders className="h-3.5 w-3.5 text-amber-400" /> Inject Incident Delay
                </span>
                <span className="font-[family-name:var(--font-mono)] text-amber-300">
                  +{delayModifier} min
                </span>
              </div>
              <Slider
                value={[delayModifier]}
                onValueChange={(vals) => setDelayModifier(vals[0] ?? 0)}
                min={0}
                max={45}
                step={5}
                className="mt-2"
              />
              <div className="mt-1 text-[10px] text-slate-500">
                Simulate track obstruction, signal halt, or weather slowing on the corridor.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Satellite Position Cockpit */}
        <Card className="border-sky-900/60 bg-slate-900/80 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-sky-300">
                <Satellite className="h-4 w-4 text-sky-400" />
                Live ISRO RTIS Position &amp; Kinematics
              </div>
              <Badge className="border-emerald-500/40 bg-emerald-950/60 text-emerald-300 text-xs">
                Transponder ID: {train.locoNumber}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-[family-name:var(--font-mono)]">
              <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
                <div className="text-[10px] uppercase text-slate-400">Current Location</div>
                <div className="text-base font-bold text-slate-100">
                  {MYS_SBC_STOPS[train.currentStopIndex].name}
                </div>
                <div className="text-[10px] text-slate-500">
                  {MYS_SBC_STOPS[train.currentStopIndex].km} km from MYS
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
                <div className="text-[10px] uppercase text-slate-400">Instant Speed</div>
                <div className="text-base font-bold text-sky-300">{train.speedKmph} km/h</div>
                <div className="text-[10px] text-slate-500">Heading: {train.heading}</div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
                <div className="text-[10px] uppercase text-slate-400">GNSS Coordinates</div>
                <div className="text-xs font-bold text-slate-200">
                  {train.lat.toFixed(4)}° N
                </div>
                <div className="text-xs text-slate-400">{train.lng.toFixed(4)}° E</div>
              </div>

              <div className="rounded border border-amber-900/40 bg-amber-950/20 p-2.5">
                <div className="text-[10px] uppercase text-amber-400">Live Delay</div>
                <div className="text-base font-bold text-amber-300">
                  +{currentLiveDelay} min
                </div>
                <div className="text-[10px] text-slate-400">vs Timetable</div>
              </div>
            </div>

            {/* Visual Corridor Bar */}
            <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
              <div className="mb-1.5 flex justify-between text-xs text-slate-400 font-medium">
                <span>Origin: Mysuru (0 km)</span>
                <span className="text-amber-300 font-bold">
                  🚆 Train {train.id} ({train.currentProgressPct}% completed)
                </span>
                <span>Terminus: KSR Bengaluru (138 km)</span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-sky-400 to-amber-400 transition-all duration-500"
                  style={{ width: `${train.currentProgressPct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                <span>MYS</span>
                <span>PANP</span>
                <span>MYA</span>
                <span>MAD</span>
                <span>CPT</span>
                <span className="text-amber-300 font-bold">RMGM (LIVE)</span>
                <span>BID</span>
                <span>KGI</span>
                <span>SBC</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Stop-by-Stop Section Trajectory Table */}
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Compass className="h-4 w-4 text-amber-400" />
              Stop-by-Stop Delay Propagation &amp; Downstream Predictions (MYS → SBC)
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Passed
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-ping" /> Current Live
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400" /> RailRakshak ML Forecast
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/70 uppercase text-[10px] text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Station</th>
                  <th className="py-2.5 px-2">Distance</th>
                  <th className="py-2.5 px-2">Scheduled</th>
                  <th className="py-2.5 px-3">Status / Telemetry</th>
                  <th className="py-2.5 px-3 text-right">Predicted ETA</th>
                  <th className="py-2.5 px-3 text-right">Expected Delay</th>
                  <th className="py-2.5 px-3 text-right">Section Dynamics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-[family-name:var(--font-mono)]">
                {stopsCalculated.map((stop) => (
                  <tr
                    key={stop.code}
                    className={`transition-colors ${
                      stop.isCurrent
                        ? "bg-amber-950/30 font-semibold text-amber-200"
                        : stop.isPast
                        ? "text-slate-400 bg-slate-950/20"
                        : "text-slate-200 hover:bg-slate-800/30"
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold flex items-center gap-1.5">
                        {stop.isCurrent && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
                        {stop.name} ({stop.code})
                        {stop.airportFeederAvailable && (
                          <Badge variant="outline" className="ml-1.5 border-sky-400/40 text-[9px] text-sky-300">
                            ✈️ KIA Feeder
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-slate-400">{stop.km} km</td>
                    <td className="py-2.5 px-2 text-slate-300">{stop.scheduledTime}</td>
                    <td className="py-2.5 px-3">
                      {stop.isPast ? (
                        <span className="text-emerald-400 font-sans text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 inline" /> Cleared
                        </span>
                      ) : stop.isCurrent ? (
                        <span className="text-amber-300 font-sans text-[11px] font-bold flex items-center gap-1">
                          <Radio className="h-3.5 w-3.5 inline animate-pulse text-amber-400" /> RTIS Live Beacon
                        </span>
                      ) : (
                        <span className="text-sky-300 font-sans text-[11px]">
                          🔮 ML Traversal Forecast
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                      {stop.predictedClockStr}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {stop.appliedDelay > 0 ? (
                        <span className="text-amber-300">+{stop.appliedDelay} min</span>
                      ) : (
                        <span className="text-emerald-400">On Time</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans text-[11px]">
                      {stop.slackRecovery > 0 ? (
                        <span className="text-emerald-300">Slack Recovery: -{stop.slackRecovery}m</span>
                      ) : stop.bottleneckPenalty > 0 ? (
                        <span className="text-amber-400">Junction Queue: +{stop.bottleneckPenalty}m</span>
                      ) : (
                        <span className="text-slate-500">Normal Run</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Surrounding Traffic & Network Conflict Density */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Zap className="h-4 w-4 text-amber-400" />
              Surrounding Corridor Traffic &amp; Headway Density
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-400">
              Real-time block occupancy of neighboring trains around Train {train.id} on the MYS–SBC line:
            </p>
            <div className="space-y-2.5">
              {SURROUNDING_TRAFFIC.map((tf) => (
                <div key={tf.id} className="rounded-md border border-slate-800 bg-slate-950 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-[family-name:var(--font-mono)] text-slate-200">
                      {tf.name} ({tf.id})
                    </span>
                    <Badge
                      className={`text-[10px] ${
                        tf.signalAspect === "Green"
                          ? "border-emerald-500/40 bg-emerald-950 text-emerald-300"
                          : tf.signalAspect === "Double Yellow"
                          ? "border-amber-500/40 bg-amber-950 text-amber-300"
                          : "border-red-500/40 bg-red-950 text-red-300"
                      }`}
                    >
                      Signal: {tf.signalAspect}
                    </Badge>
                  </div>
                  <div className="mt-1 flex justify-between text-slate-400">
                    <span>📍 {tf.location}</span>
                    <span>Speed: {tf.speedKmph} km/h</span>
                  </div>
                  <div className="mt-2 rounded bg-slate-900/80 p-1.5 text-[11px] text-slate-300 border border-slate-800/80">
                    <strong>Traffic Effect:</strong> {tf.impactOnSubjectTrain}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 5. Bengaluru Airport (KIA) Connection & Delay Propagation Monitor */}
        <Card className="border-sky-900/60 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-sky-300">
                <Plane className="h-4 w-4 text-sky-400" />
                Bengaluru Airport (KIA) Connection Risk Analyzer
              </CardTitle>
              <Badge
                className={`text-xs ${
                  airportIntel.riskLevel === "SAFE"
                    ? "border-emerald-500/40 bg-emerald-950 text-emerald-300"
                    : airportIntel.riskLevel === "TIGHT"
                    ? "border-amber-500/40 bg-amber-950 text-amber-300"
                    : "border-red-500/40 bg-red-950 text-red-300"
                }`}
              >
                {airportIntel.riskLevel === "SAFE" ? "✓ SAFE CONNECTION" : airportIntel.riskLevel === "TIGHT" ? "⚠️ TIGHT BUFFER" : "🚨 HIGH RISK OF MISSING"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Inbound MYS→SBC passengers connecting to flights at Kempegowda International Airport require accurate delay forecasting to plan cab/bus transfers.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs font-[family-name:var(--font-mono)]">
              <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
                <div className="text-[10px] text-slate-400 uppercase">Target Flight Departure</div>
                <div className="text-base font-bold text-slate-100">{flightDepartureTimeStr} AM</div>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="time"
                    value={flightDepartureTimeStr}
                    onChange={(e) => setFlightDepartureTimeStr(e.target.value)}
                    className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
                <div className="text-[10px] text-slate-400 uppercase">Est. Arrival at KIA Airport</div>
                <div className="text-base font-bold text-sky-300">{airportIntel.airportArrivalClockStr} AM</div>
                <div className="text-[10px] text-slate-400">Includes {airportIntel.transitTimeMins}m road transit</div>
              </div>
            </div>

            {/* Transfer Option Buttons */}
            <div className="space-y-1.5">
              <div className="text-xs text-slate-400 font-medium">Transfer Hub &amp; Mode:</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => setTransitMode("sbc_taxi")}
                  className={`rounded border p-2 text-center transition-all ${
                    transitMode === "sbc_taxi"
                      ? "border-sky-400 bg-sky-950/60 text-sky-200 font-bold"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <Car className="h-3.5 w-3.5 mx-auto mb-1 text-sky-400" />
                  SBC Taxi (~75m)
                </button>
                <button
                  onClick={() => setTransitMode("kgeri_taxi")}
                  className={`rounded border p-2 text-center transition-all ${
                    transitMode === "kgeri_taxi"
                      ? "border-sky-400 bg-sky-950/60 text-sky-200 font-bold"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 mx-auto mb-1 text-amber-400" />
                  Alight Kengeri (~85m)
                </button>
                <button
                  onClick={() => setTransitMode("vayu_vajra")}
                  className={`rounded border p-2 text-center transition-all ${
                    transitMode === "vayu_vajra"
                      ? "border-sky-400 bg-sky-950/60 text-sky-200 font-bold"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5 mx-auto mb-1 text-emerald-400" />
                  Vayu Vajra Bus (~95m)
                </button>
              </div>
            </div>

            {/* Actionable Strategy Recommendation */}
            <div className="rounded-md border border-slate-800 bg-slate-950/90 p-3 text-xs leading-relaxed text-slate-300">
              <div className="font-semibold text-slate-100 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                RailRakshak Dynamic Advice:
              </div>
              {currentLiveDelay > 20 ? (
                <p className="text-amber-300">
                  ⚠️ Heavy delay on corridor (+{currentLiveDelay} min). <strong>Recommendation:</strong> Alight at <strong>Kengeri (KGI)</strong> at {kgiStop.predictedClockStr} and take NICE Road expressway cab directly to KIA Airport to bypass SBC city center congestion and save 25 minutes!
                </p>
              ) : (
                <p className="text-slate-300">
                  ✓ Train is making good progress. Remaining airport buffer: <strong>{airportIntel.flightBufferMins} minutes</strong> before flight departure. Normal transit via SBC terminus is safe.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
