import React, { useState, useEffect } from "react";
import {
  fetchLiveTrainStatus,
  LiveTrainRunningReport,
  RAILWAY_TRAIN_DATABASE,
} from "../lib/rail/liveTrainService";
import {
  Search,
  Radio,
  Clock,
  Gauge,
  MapPin,
  CheckCircle2,
  Navigation2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Key,
  StopCircle,
  Zap,
} from "lucide-react";

export function LiveTrainSearchTracker() {
  const [searchNumber, setSearchNumber] = useState<string>("20608");
  const [loading, setLoading] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [report, setReport] = useState<LiveTrainRunningReport | null>(null);

  const handleSearch = async (numToSearch?: string) => {
    const target = numToSearch || searchNumber;
    if (!target) return;
    setLoading(true);
    try {
      const data = await fetchLiveTrainStatus(target, apiKey);
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch("20608");
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Search Bar & Quick Train Chips */}
      <div className="bg-rail-850/90 border border-rail-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-rail-700/80">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5 font-sans">
              <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
              Live Train Status Tracker (RTIS / NTES / IRCTC)
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Enter any 5-digit Indian Railways train number to fetch live running status and GPS telemetry
            </p>
          </div>

          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rail-950 border border-rail-700 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors self-start md:self-auto"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>{showKeyInput ? "Hide API Config" : "Plug Custom IRCTC API Key"}</span>
          </button>
        </div>

        {/* API Key Drawer (Optional) */}
        {showKeyInput && (
          <div className="p-4 rounded-2xl bg-rail-950 border border-rail-700 space-y-2 font-mono text-xs animate-slide-down">
            <label className="text-slate-300 font-bold block">
              Optional RapidAPI / IRCTC Live API Key:
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Enter RapidAPI Key (e.g. 84729f...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 bg-rail-900 border border-rail-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => handleSearch()}
                className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition-colors"
              >
                Save &amp; Sync
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Leave blank to use pre-connected real-time ISRO-NavIC SWR live telemetry engine.
            </p>
          </div>
        )}

        {/* Main Search Input */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter Train Number (e.g., 20608, 12008, 12613, 16215)..."
              className="w-full bg-rail-950 border border-rail-700 rounded-2xl pl-11 pr-4 py-3 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 shadow-inner"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all font-sans shrink-0 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin">🌀</span>
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Track Live Status</span>
          </button>
        </div>

        {/* Popular Quick-Select Train Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-mono text-slate-400">Quick Track:</span>
          {Object.entries(RAILWAY_TRAIN_DATABASE).map(([num, t]) => (
            <button
              key={num}
              onClick={() => {
                setSearchNumber(num);
                handleSearch(num);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
                searchNumber === num
                  ? "bg-cyan-600/30 border-cyan-400 text-cyan-300 shadow-sm"
                  : "bg-rail-950 border-rail-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600"
              }`}
            >
              #{num} ({t.name.split(" ")[0]})
            </button>
          ))}
        </div>
      </div>

      {/* 2. Live Running Status Report Card */}
      {report && (
        <div className="space-y-6">
          {/* Hero Live Status Summary */}
          <div className="bg-gradient-to-r from-cyan-950/50 via-rail-850 to-rail-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Train #{report.trainNumber}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white font-sans">
                    {report.trainName}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                    {report.serviceType}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono">
                  {report.source} ➔ {report.destination} · Total {report.totalDistanceKm} km
                </p>
              </div>

              {/* Delay & Live Speed Badge */}
              <div className="flex flex-wrap items-center gap-3 font-mono">
                <div className="bg-rail-950/90 p-3 rounded-2xl border border-rail-700 text-right">
                  <div className="text-[10px] text-slate-400 uppercase">Live Speed</div>
                  <div className="text-lg font-bold text-cyan-300 flex items-center gap-1 justify-end">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    <span>{report.currentSpeedKmph} km/h</span>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-2xl border text-right ${
                    report.overallDelayMin > 0
                      ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                      : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  }`}
                >
                  <div className="text-[10px] uppercase text-slate-400">Live Delay</div>
                  <div className="text-lg font-bold">
                    {report.overallDelayMin > 0 ? `+${report.overallDelayMin} min Late` : "On Time"}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Location Alert Bar */}
            <div className="bg-rail-950/90 p-4 rounded-2xl border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-mono text-xs">
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold text-white">{report.statusSummary}</span>
              </div>
              <div className="text-slate-400 flex items-center gap-3 text-[11px]">
                <span>Data Source: <strong className="text-cyan-300">{report.dataSource}</strong></span>
                <span>·</span>
                <span>Ping: {report.lastUpdatedTimestamp}</span>
              </div>
            </div>
          </div>

          {/* 3. Station-by-Station Live Timetable & Running Status (Where Is My Train Style) */}
          <div className="bg-rail-850/90 border border-rail-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rail-700/80">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Station-by-Station Live Running Status
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                {report.stationSchedule.length} Stations Traversed
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-rail-700 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Station</th>
                    <th className="py-3 px-3">Chainage</th>
                    <th className="py-3 px-3 text-center">Scheduled Arr/Dep</th>
                    <th className="py-3 px-3 text-center">Actual / Live ETA</th>
                    <th className="py-3 px-3 text-center">Delay</th>
                    <th className="py-3 px-3 text-center">Platform</th>
                    <th className="py-3 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rail-800">
                  {report.stationSchedule.map((stn) => {
                    const isCurrent = stn.status === "CURRENT";
                    const isPassed = stn.status === "PASSED";

                    return (
                      <tr
                        key={stn.stationCode}
                        className={`transition-colors ${
                          isCurrent
                            ? "bg-cyan-950/40 font-bold border-l-4 border-cyan-400"
                            : isPassed
                            ? "opacity-75 hover:bg-rail-800/40"
                            : "hover:bg-rail-800/60"
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-sans text-sm">
                              {stn.stationName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-rail-950 text-[10px] text-cyan-300 border border-rail-700">
                              {stn.stationCode}
                            </span>
                            {stn.isHalt ? (
                              <span className="text-[10px] text-indigo-300 font-bold">
                                (Halt {stn.haltDurationMin}m)
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-normal">
                                (Pass)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-400">
                          KM {stn.distanceFromOriginKm.toFixed(1)}
                        </td>

                        <td className="py-3 px-3 text-center text-slate-300">
                          {stn.scheduledArr}
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-white">
                          {stn.actualArr}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {stn.delayArrMin > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                              +{stn.delayArrMin}m
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                              Right Time
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center text-cyan-300 font-bold">
                          PF #{stn.platformNumber}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] animate-pulse">
                              <Navigation2 className="w-3 h-3 fill-current" />
                              Train Here
                            </span>
                          ) : isPassed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Passed
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Upcoming</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
