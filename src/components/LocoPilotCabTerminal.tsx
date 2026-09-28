import React, { useState, useEffect, useRef } from "react";
import {
  Radio,
  Satellite,
  Gauge,
  MapPin,
  ShieldAlert,
  Zap,
  Play,
  Pause,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Compass,
  Battery,
  Flame,
  Send,
  Sliders,
  Sparkles,
  Train,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ALL_CORRIDOR_FLEET } from "../lib/rail/timeResolver";
import { SWR_GPS_WAYPOINTS, snapGpsToCorridor, interpolateGpsFromChainageKm } from "../lib/rail/gpsTrackSnapper";
import { streamGpsPacket, reportDriverIncident, TelemetryPacket } from "../lib/rail/telemetryClient";

interface LocoPilotCabTerminalProps {
  onBackToMissionControl?: () => void;
}

export function LocoPilotCabTerminal({ onBackToMissionControl }: LocoPilotCabTerminalProps) {
  // Duty & Train selection
  const [selectedTrainId, setSelectedTrainId] = useState<string>("20608");
  const [driverId, setDriverId] = useState<string>("SWR-LP-4821");
  const [locoNumber, setLocoNumber] = useState<string>("Trainset EMU #20608");

  // Telemetry Transmission State
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamMode, setStreamMode] = useState<"DEVICE_GPS" | "SIMULATED_DRIVE">("SIMULATED_DRIVE");
  const [packetsTransmitted, setPacketsTransmitted] = useState<number>(0);
  const [lastServerAck, setLastServerAck] = useState<string>("Standby");
  const [transmissionLatencyMs, setTransmissionLatencyMs] = useState<number>(14);

  // Live Telemetry Readings
  const [latitude, setLatitude] = useState<number>(12.3164);
  const [longitude, setLongitude] = useState<number>(76.6498);
  const [gpsSpeedKmph, setGpsSpeedKmph] = useState<number>(0.0);
  const [headingDeg, setHeadingDeg] = useState<number>(48.0);
  const [accuracyMeters, setAccuracyMeters] = useState<number>(3.2);
  const [altitudeMeters, setAltitudeMeters] = useState<number>(680.0);
  const [batteryPct, setBatteryPct] = useState<number>(94);

  // Simulator Drive State (For testing on PC/Laptop)
  const [simDriveKm, setSimDriveKm] = useState<number>(45.36); // Starting around Mandya
  const [simThrottleNotch, setSimThrottleNotch] = useState<number>(6); // Notch 1 - 8

  // Incident Notification
  const [incidentBanner, setIncidentBanner] = useState<string | null>(null);

  const selectedTrain =
    ALL_CORRIDOR_FLEET.find((t) => t.id === selectedTrainId) || ALL_CORRIDOR_FLEET[0]!;

  // Snapped corridor status
  const snapped = snapGpsToCorridor(latitude, longitude);

  // Target Throttle Recommendation
  const mps = selectedTrain.sectionalMpsKmph || 110;
  const targetThrottleKmph = Math.min(mps, Math.max(45, Math.round(gpsSpeedKmph > 10 ? gpsSpeedKmph * 1.05 : mps * 0.85)));

  // 1. Device GPS Geolocation Watcher
  useEffect(() => {
    if (!isStreaming || streamMode !== "DEVICE_GPS") return;

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. Switching to Simulation Mode.");
      setStreamMode("SIMULATED_DRIVE");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const rawSpeed = position.coords.speed !== null ? position.coords.speed * 3.6 : 0;
        const speed = Math.round(rawSpeed);
        const heading = position.coords.heading || 48.0;
        const accuracy = position.coords.accuracy || 4.0;
        const alt = position.coords.altitude || 680.0;

        setLatitude(lat);
        setLongitude(lon);
        setGpsSpeedKmph(speed);
        setHeadingDeg(heading);
        setAccuracyMeters(accuracy);
        setAltitudeMeters(alt);

        // Push packet to FastAPI backend
        sendPacket({
          train_id: selectedTrain.id,
          train_name: selectedTrain.name,
          loco_id: locoNumber,
          driver_id: driverId,
          latitude: lat,
          longitude: lon,
          gps_speed_kmph: speed,
          heading_deg: heading,
          accuracy_meters: accuracy,
          altitude_meters: alt,
          battery_level_pct: batteryPct,
          is_live_satellite: true,
        });
      },
      (error) => {
        console.warn("GPS watchPosition error:", error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isStreaming, streamMode, selectedTrain, locoNumber, driverId, batteryPct]);

  // 2. Simulated Drive Engine (Runs every 1 second when in SIMULATED_DRIVE mode)
  useEffect(() => {
    if (!isStreaming || streamMode !== "SIMULATED_DRIVE") return;

    const interval = setInterval(() => {
      // Calculate speed based on notch
      const notchSpeedMap = [0, 20, 45, 65, 85, 100, 115, 125, 130];
      const targetSpeed = Math.min(mps, notchSpeedMap[simThrottleNotch] || 80);

      setGpsSpeedKmph((prevSpeed) => {
        if (prevSpeed < targetSpeed) return Math.min(targetSpeed, prevSpeed + 4);
        if (prevSpeed > targetSpeed) return Math.max(targetSpeed, prevSpeed - 6);
        return targetSpeed;
      });

      setSimDriveKm((prevKm) => {
        const nextKm = prevKm + (gpsSpeedKmph / 3600) * 1.0;
        const clampedKm = Math.min(138.25, nextKm);

        // Update synthetic GPS coordinates
        const coords = interpolateGpsFromChainageKm(clampedKm);
        setLatitude(coords.lat);
        setLongitude(coords.lon);

        // Push packet
        sendPacket({
          train_id: selectedTrain.id,
          train_name: selectedTrain.name,
          loco_id: locoNumber,
          driver_id: driverId,
          latitude: coords.lat,
          longitude: coords.lon,
          gps_speed_kmph: gpsSpeedKmph,
          heading_deg: 48.0,
          accuracy_meters: 2.8,
          altitude_meters: 680.0,
          battery_level_pct: batteryPct,
          is_live_satellite: false,
        });

        return clampedKm;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming, streamMode, simThrottleNotch, gpsSpeedKmph, mps, selectedTrain, locoNumber, driverId, batteryPct]);

  const sendPacket = async (packet: TelemetryPacket) => {
    const t0 = performance.now();
    const res = await streamGpsPacket(packet);
    const latency = Math.round(performance.now() - t0);
    setTransmissionLatencyMs(latency);

    if (res.success) {
      setPacketsTransmitted((p) => p + 1);
      setLastServerAck(`KM ${res.data?.snapped_chainage_km} · ${res.data?.nearest_station} (Ack in ${latency}ms)`);
    } else {
      setLastServerAck(`Ingest Offline (${res.error})`);
    }
  };

  const handleReportIncident = async (type: string, label: string) => {
    const success = await reportDriverIncident({
      train_id: selectedTrain.id,
      driver_id: driverId,
      incident_type: type,
      reported_text: `Loco-Pilot reported: ${label} near ${snapped.nearestStationName} (KM ${snapped.snappedChainageKm})`,
    });

    if (success) {
      setIncidentBanner(`🚨 Incident Broadcasted: "${label}" logged to Central Dispatch.`);
      setTimeout(() => setIncidentBanner(null), 5000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in font-body pb-10">
      {/* 1. Header Banner & Satellite Lock Status */}
      <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
              <Satellite className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono font-bold uppercase">
                  ISRO NavIC / RTIS Cab Terminal
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  SWR Corridor · Mysuru ➔ SBC
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-heading mt-0.5">
                Loco-Pilot Satellite Telemetry Cockpit
              </h2>
            </div>
          </div>

          {/* Master Stream Toggle Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg ${
                isStreaming
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 animate-pulse"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30"
              }`}
            >
              {isStreaming ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{isStreaming ? "Stop Satellite Feed" : "Start Satellite GPS Stream"}</span>
            </button>
          </div>
        </div>

        {/* Incident Alert Banner */}
        {incidentBanner && (
          <div className="bg-rose-950/80 border border-rose-500/60 p-3.5 rounded-2xl text-rose-200 text-xs font-mono flex items-center gap-2.5 animate-bounce">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{incidentBanner}</span>
          </div>
        )}

        {/* Duty Configuration Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          {/* Train Selector */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Assigned Duty Train</span>
            <select
              value={selectedTrainId}
              onChange={(e) => setSelectedTrainId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
            >
              {ALL_CORRIDOR_FLEET.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.id} {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Loco & Rake */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Locomotive Unit</span>
            <input
              type="text"
              value={locoNumber}
              onChange={(e) => setLocoNumber(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
            />
          </div>

          {/* Driver ID */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Driver Staff ID</span>
            <input
              type="text"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
            />
          </div>
        </div>

        {/* Telemetry Stream Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Stream Source:</span>
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setStreamMode("SIMULATED_DRIVE")}
                className={`px-3 py-1 rounded-lg font-mono text-xs transition-all ${
                  streamMode === "SIMULATED_DRIVE"
                    ? "bg-indigo-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🎮 Simulator Testing Drive
              </button>
              <button
                onClick={() => setStreamMode("DEVICE_GPS")}
                className={`px-3 py-1 rounded-lg font-mono text-xs transition-all ${
                  streamMode === "DEVICE_GPS"
                    ? "bg-emerald-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🛰️ Live Device GPS (Real-Time)
              </button>
            </div>
          </div>

          {/* Satellite Telemetry Health Badges */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Wifi className={`w-3.5 h-3.5 ${isStreaming ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
              <span>Packets: <strong className="text-white">{packetsTransmitted}</strong></span>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ping: <strong className="text-emerald-400">{transmissionLatencyMs}ms</strong></span>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
              <span>{batteryPct}%</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. CAB INSTRUMENT CLUSTER: Digital Speedometer & Throttle HUD */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Giant Speedometer & AI Pacing Meter (7 Cols) */}
        <div className="md:col-span-7 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border-2 border-indigo-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between gap-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <span>Digital Ground Speedometer</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              MPS: {mps} km/h
            </span>
          </div>

          {/* Speed Display */}
          <div className="text-center py-3 sm:py-4 space-y-1 sm:space-y-2">
            <div className="text-6xl sm:text-7xl md:text-8xl font-black font-data tracking-tight text-white drop-shadow-2xl">
              {gpsSpeedKmph}
            </div>
            <div className="text-xs sm:text-sm font-mono font-bold text-slate-400 tracking-widest uppercase">
              Kilometers Per Hour (km/h)
            </div>
          </div>

          {/* AI Recommended Target Throttle Banner */}
          <div className="bg-indigo-900/40 border border-indigo-500/40 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-indigo-300">
              <span className="flex items-center gap-1.5 font-bold uppercase">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>AI Green Wave Throttle Advisory</span>
              </span>
              <span className="text-emerald-400 font-bold">Target: {targetThrottleKmph} km/h</span>
            </div>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              {gpsSpeedKmph >= targetThrottleKmph - 5
                ? `● Maintain ${targetThrottleKmph} km/h cruising speed. Clear green wave through ${snapped.nextStationName}.`
                : `● Notch up to ${targetThrottleKmph} km/h to recover schedule buffer and prevent yellow signal deceleration.`}
            </p>
          </div>

          {/* Testing Notch Controller (Only active in Simulator Mode) */}
          {streamMode === "SIMULATED_DRIVE" && (
            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Locomotive Throttle Notch:</span>
                <strong className="text-emerald-400">Notch {simThrottleNotch} / 8</strong>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                value={simThrottleNotch}
                onChange={(e) => setSimThrottleNotch(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Idle (0)</span>
                <span>P2 (45k)</span>
                <span>P4 (85k)</span>
                <span>P6 (115k)</span>
                <span>Max Notch 8 (130k)</span>
              </div>
            </div>
          )}
        </div>

        {/* SWR Corridor Navigation & Track-Snapping Radar (5 Cols) */}
        <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-indigo-400" />
                <span>Track Radar &amp; Chainage</span>
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">
                KM {snapped.snappedChainageKm.toFixed(1)} / 138.25
              </span>
            </div>

            {/* Current & Next Station Callouts */}
            <div className="space-y-3 pt-4">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Nearest Station</span>
                <div className="text-base font-bold text-white font-heading mt-0.5">
                  {snapped.nearestStationName} ({snapped.nearestStationCode})
                </div>
                <div className="text-xs font-mono text-emerald-400 mt-0.5">
                  Track Offset: ±{snapped.crossTrackOffsetMeters}m (Snapped)
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Next Station Ahead</span>
                <div className="text-base font-bold text-indigo-300 font-heading mt-0.5">
                  {snapped.nextStationName} ({snapped.nextStationCode})
                </div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">
                  Distance Remaining: <strong className="text-white">{snapped.distanceToNextStationKm} km</strong>
                </div>
              </div>

              {/* Raw Coordinates Box */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 font-mono text-xs space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>GPS Latitude:</span>
                  <strong className="text-slate-200">{latitude.toFixed(5)}° N</strong>
                </div>
                <div className="flex justify-between">
                  <span>GPS Longitude:</span>
                  <strong className="text-slate-200">{longitude.toFixed(5)}° E</strong>
                </div>
                <div className="flex justify-between">
                  <span>Sat Accuracy:</span>
                  <strong className="text-emerald-400">±{accuracyMeters}m</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Jump for Simulation */}
          {streamMode === "SIMULATED_DRIVE" && (
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-500 block w-full">Quick Station Jump:</span>
              {[
                { name: "MYS (0k)", km: 0.0 },
                { name: "Mandya (45k)", km: 45.4 },
                { name: "Ramanagaram (93k)", km: 93.8 },
                { name: "SBC (138k)", km: 138.25 },
              ].map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => setSimDriveKm(loc.km)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors"
                >
                  {loc.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. LOCO-PILOT 1-TAP INCIDENT & HAZARD REPORTING BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white font-heading">
              1-Tap Loco-Pilot Track Incident &amp; Signal Detention Logger
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Broadcasts instant alert to Mission Control</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { type: "SIGNAL_HOLD", label: "🛑 Red Signal Hold", color: "hover:border-rose-500 text-rose-300" },
            { type: "WET_RAIL", label: "🌧️ Wheel Adhesion Slip", color: "hover:border-blue-500 text-blue-300" },
            { type: "CATTLE_RUN", label: "🐄 Cattle on Track", color: "hover:border-amber-500 text-amber-300" },
            { type: "OHE_VOLTAGE_SAG", label: "⚡ OHE Voltage Drop", color: "hover:border-purple-500 text-purple-300" },
          ].map((btn) => (
            <button
              key={btn.type}
              onClick={() => handleReportIncident(btn.type, btn.label)}
              className={`p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 font-mono text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${btn.color}`}
            >
              <span>{btn.label.split(" ")[0]}</span>
              <span>{btn.label.split(" ").slice(1).join(" ")}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. REAL-TIME SERVER ACKNOWLEDGMENT & DATABASE ENGINE CONSOLE */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-slate-400">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-emerald-400" />
          <span>Last Server Telemetry Ack: <strong className="text-white">{lastServerAck}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-mono font-bold">
            Database: SQLite Time-Series + In-Memory Stream Buffer
          </span>
          <span className="text-slate-500">
            FastAPI (:8000/api/telemetry/stream)
          </span>
        </div>
      </div>
    </div>
  );
}
