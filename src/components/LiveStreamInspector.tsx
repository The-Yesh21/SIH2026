import React, { useState, useEffect } from "react";
import { TrainConfig } from "../lib/rail/types";
import { generateLiveRtisPacket, RtisLivePacket } from "../lib/rail/liveStreamData";
import {
  Radio,
  Navigation,
  Activity,
  Satellite,
  Copy,
  Check,
  Zap,
  Clock,
  Gauge,
  MapPin,
  Cpu,
  Layers,
  ShieldCheck,
  Signal,
} from "lucide-react";

interface LiveStreamInspectorProps {
  selectedTrain: TrainConfig;
  injectedDelay: number;
}

export function LiveStreamInspector({
  selectedTrain,
  injectedDelay,
}: LiveStreamInspectorProps) {
  const [packet, setPacket] = useState<RtisLivePacket>(() =>
    generateLiveRtisPacket(selectedTrain, injectedDelay)
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [streamActive, setStreamActive] = useState<boolean>(true);
  const [lastPingSec, setLastPingSec] = useState<number>(0);

  // Live Packet Stream Interval (generates live packet heartbeat)
  useEffect(() => {
    setPacket(generateLiveRtisPacket(selectedTrain, injectedDelay));
    setLastPingSec(0);

    const interval = setInterval(() => {
      setPacket(generateLiveRtisPacket(selectedTrain, injectedDelay));
      setLastPingSec(0);
    }, 3000);

    const ticker = setInterval(() => {
      setLastPingSec((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(ticker);
    };
  }, [selectedTrain, injectedDelay]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(packet, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-rail-850/90 border border-rail-700/80 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6 animate-fade-in">
      {/* Header: Stream Status & Transponder Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-rail-700/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Satellite className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white font-sans">
                Live RTIS-NavIC Telemetry Data Stream
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Stream Connected
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Transponder ID: <strong className="text-slate-200">{packet.gnssSensors.locoTransponderId}</strong> · Last ping {lastPingSec}s ago
            </p>
          </div>
        </div>

        {/* Copy Raw Payload Button */}
        <button
          onClick={handleCopyJson}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rail-950 hover:bg-rail-800 border border-rail-700 text-xs font-mono text-slate-300 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Payload Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span>Copy Live JSON Payload</span>
            </>
          )}
        </button>
      </div>

      {/* 4 Telemetry Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        {/* Card 1: GPS Coordinates */}
        <div className="bg-rail-950/80 p-4 rounded-2xl border border-rail-700/80 space-y-2">
          <div className="text-[10px] uppercase text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" /> GNSS Geographic Coordinates
          </div>
          <div className="text-base font-bold text-white tracking-wide">
            {packet.telemetry.latitude}° N
          </div>
          <div className="text-xs text-slate-300">
            {packet.telemetry.longitude}° E
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-rail-800 flex justify-between">
            <span>Altitude: {packet.telemetry.altitudeMeters}m MSL</span>
            <span className="text-emerald-400 font-semibold">{packet.gnssSensors.fixType}</span>
          </div>
        </div>

        {/* Card 2: Track Chainage */}
        <div className="bg-rail-950/80 p-4 rounded-2xl border border-rail-700/80 space-y-2">
          <div className="text-[10px] uppercase text-slate-400 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-indigo-400" /> SWR Track Chainage
          </div>
          <div className="text-base font-bold text-white tracking-wide">
            KM {packet.telemetry.chainageFromMysKm.toFixed(3)}
          </div>
          <div className="text-xs text-slate-300">
            Distance from MYS (0.000)
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-rail-800 flex justify-between">
            <span>To SBC: {packet.telemetry.chainageFromSbcKm.toFixed(3)} km</span>
            <span className="text-cyan-300 font-semibold">{packet.signaling.currentBlockSection}</span>
          </div>
        </div>

        {/* Card 3: Traction & Speed */}
        <div className="bg-rail-950/80 p-4 rounded-2xl border border-rail-700/80 space-y-2">
          <div className="text-[10px] uppercase text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-amber-400" /> Kinematic Speed &amp; Traction
          </div>
          <div className="text-base font-bold text-white tracking-wide">
            {packet.telemetry.speedKmph.toFixed(1)} km/h
          </div>
          <div className="text-xs text-slate-300">
            Sanctioned MPS: {packet.telemetry.sanctionedSpeedKmph} km/h
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-rail-800 flex justify-between">
            <span>25kV AC ({packet.telemetry.catenaryVoltageKv} kV)</span>
            <span className="text-amber-300 font-semibold">{packet.telemetry.tractionCurrentAmps} A</span>
          </div>
        </div>

        {/* Card 4: Satellite Constellation */}
        <div className="bg-rail-950/80 p-4 rounded-2xl border border-rail-700/80 space-y-2">
          <div className="text-[10px] uppercase text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" /> NavIC Dual-Band GNSS
          </div>
          <div className="text-base font-bold text-emerald-300 tracking-wide">
            {packet.gnssSensors.satellitesTracked} Satellites
          </div>
          <div className="text-xs text-slate-300">
            HDOP Accuracy: {packet.gnssSensors.hdop}
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-rail-800 flex justify-between">
            <span>GSM: {packet.gnssSensors.gsmSignalDbm} dBm</span>
            <span className="text-emerald-400 font-semibold">{packet.gnssSensors.packetLatencyMs}ms Latency</span>
          </div>
        </div>
      </div>

      {/* Live Raw JSON Payload Stream Box */}
      <div className="space-y-2 font-mono">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Live RTIS JSON Telemetry Payload (RFC 8259 Stream)
          </span>
          <span className="text-[10px] text-slate-500">
            Packet ID: {packet.packetId}
          </span>
        </div>

        <pre className="p-4 rounded-2xl bg-rail-950 border border-rail-700/80 text-[11px] text-cyan-300 font-mono overflow-x-auto max-h-56 leading-relaxed selection:bg-cyan-600 selection:text-white">
          {JSON.stringify(packet, null, 2)}
        </pre>
      </div>
    </div>
  );
}
