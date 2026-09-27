import React, { useState, useMemo } from "react";
import {
  MapPin,
  ArrowRight,
  Clock,
  CheckCircle,
  Sparkles,
  Train,
  ChevronRight,
  AlertCircle,
  Zap,
  RotateCcw,
} from "lucide-react";
import { SWR_CORRIDOR_STATIONS } from "../lib/rail/infrastructure";
import {
  findOptimalTrains,
  PerfectionQueryResult,
  OptimalTrainOption,
  getStationByCode,
} from "../lib/rail/perfectionEngine";
import { EnvironmentalConditions, DEFAULT_ENVIRONMENT } from "../lib/rail/restrictions";

interface OptimalRouteOptimizerProps {
  activeClockMinutes: number;
  setActiveClockMinutes: (mins: number) => void;
  isRealTimeSynced: boolean;
  setIsRealTimeSynced: (synced: boolean) => void;
  onSelectTrainForCockpit: (trainId: string) => void;
  onSelectTrainForSimulator: (trainId: string) => void;
  environment?: EnvironmentalConditions;
  injectedDelay?: number;
}

export function OptimalRouteOptimizer({
  activeClockMinutes,
  setActiveClockMinutes,
  isRealTimeSynced,
  setIsRealTimeSynced,
  onSelectTrainForCockpit,
  onSelectTrainForSimulator,
  environment = DEFAULT_ENVIRONMENT,
  injectedDelay = 0,
}: OptimalRouteOptimizerProps) {
  const [originCode, setOriginCode] = useState<string>("MYS");
  const [destCode, setDestCode] = useState<string>("SBC");

  // Fetch optimal trains based on From, To, and Current Time
  const result: PerfectionQueryResult = useMemo(() => {
    return findOptimalTrains({
      originCode,
      destCode,
      queryClockMinutes: activeClockMinutes,
      environment,
      injectedDelay,
      requirePassengerHaltsOnly: true,
    });
  }, [originCode, destCode, activeClockMinutes, environment, injectedDelay]);

  const originStation = getStationByCode(originCode) || SWR_CORRIDOR_STATIONS[0]!;
  const destStation = getStationByCode(destCode) || SWR_CORRIDOR_STATIONS[SWR_CORRIDOR_STATIONS.length - 1]!;

  // The single best train
  const bestTrain = result.bestChoice;
  // Other available options
  const otherTrains = result.options.filter((opt) => opt.train.id !== bestTrain?.train.id);

  // Swap From & To
  const handleSwap = () => {
    const temp = originCode;
    setOriginCode(destCode);
    setDestCode(temp);
  };

  // Sync to actual system time
  const handleSyncNow = () => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    setActiveClockMinutes(currentMins);
    setIsRealTimeSynced(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-2">
      {/* 1. Clean Title & Description */}
      <div className="text-center space-y-1.5 pb-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Optimal Train Recommendation</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Find the Best Train
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Select your departure and arrival stations. We calculate live delays, wait times, and travel speeds to give you the fastest option.
        </p>
      </div>

      {/* 2. Simple & Clean Station Picker Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
          {/* From Station */}
          <div className="md:col-span-5 space-y-1">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>From (Origin Station)</span>
            </label>
            <select
              value={originCode}
              onChange={(e) => setOriginCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium focus:border-emerald-500 focus:outline-none transition-colors"
            >
              {SWR_CORRIDOR_STATIONS.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center py-1">
            <button
              onClick={handleSwap}
              title="Swap stations"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          {/* To Station */}
          <div className="md:col-span-5 space-y-1">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>To (Destination Station)</span>
            </label>
            <select
              value={destCode}
              onChange={(e) => setDestCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none transition-colors"
            >
              {SWR_CORRIDOR_STATIONS.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Time Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>
              Checking trains for time: <strong className="text-white font-semibold">{result.queryClockStr}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isRealTimeSynced && (
              <button
                onClick={handleSyncNow}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Current Time</span>
              </button>
            )}
            <span className="text-slate-500">
              Distance: <strong className="text-slate-300">{result.corridorDistanceKm} km</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3. THE BEST OPTIMAL TRAIN CARD (Clean, High Visibility) */}
      {bestTrain ? (
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-xl space-y-5">
          {/* Top Badge & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wide border border-emerald-500/30">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Recommended Best Train</span>
              </span>
              {bestTrain.originDelayMin === 0 ? (
                <span className="text-xs text-emerald-400 font-medium">● Running On-Time</span>
              ) : (
                <span className="text-xs text-amber-400 font-medium">● {bestTrain.originDelayMin} min delay</span>
              )}
            </div>

            <span className="text-xs text-slate-400">
              Fastest total arrival at {destStation.name}
            </span>
          </div>

          {/* Train Name & Number */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Train className="w-6 h-6 text-emerald-400" />
                <span>{bestTrain.train.name}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Train #{bestTrain.train.id} · {bestTrain.train.type.replace("_", " ")}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectTrainForCockpit(bestTrain.train.id)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow"
              >
                View Live Cockpit
              </button>
              <button
                onClick={() => onSelectTrainForSimulator(bestTrain.train.id)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors"
              >
                Simulate
              </button>
            </div>
          </div>

          {/* Journey Timing Cards (From ➔ To) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {/* Departure */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Departs {originStation.name}</span>
              <div className="text-lg font-bold text-white mt-0.5">{bestTrain.predictedDepOriginStr}</div>
              <div className="text-xs text-emerald-400 mt-0.5">
                {bestTrain.waitTimeMins === 0 ? "Leaving now!" : `In ${bestTrain.waitTimeMins} mins`}
              </div>
            </div>

            {/* In-Transit Duration */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Travel Duration</span>
              <div className="text-lg font-bold text-white mt-0.5">
                {Math.floor(bestTrain.transitDurationMins / 60)}h {bestTrain.transitDurationMins % 60}m
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {bestTrain.stopsEnRoute.length === 0
                  ? "Non-Stop direct"
                  : `${bestTrain.stopsEnRoute.length} stops (${bestTrain.stopsEnRoute.join(", ")})`}
              </div>
            </div>

            {/* Arrival */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Arrives {destStation.name}</span>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">{bestTrain.predictedArrDestStr}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Total time: {Math.floor(bestTrain.totalJourneyMins / 60)}h {bestTrain.totalJourneyMins % 60}m
              </div>
            </div>
          </div>

          {/* Why this train explanation */}
          <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-800/40 p-3 rounded-lg border border-slate-800">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Why this train:</strong> {bestTrain.aiDecisionReason}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Direct Trains Found Between These Stops</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try selecting a major station along the corridor (e.g. Mysuru Jn, Mandya, Ramanagaram, or Bengaluru).
          </p>
        </div>
      )}

      {/* 4. OTHER UPCOMING TRAINS (Clean, Simple Card List) */}
      {otherTrains.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-semibold text-slate-300">
            Other Trains on this Route ({otherTrains.length})
          </h4>

          <div className="space-y-2">
            {otherTrains.map((opt) => (
              <div
                key={opt.train.id}
                className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 rounded-xl p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Train Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {opt.train.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      #{opt.train.id}
                    </span>
                    {opt.originDelayMin > 0 ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        +{opt.originDelayMin}m delay
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        On Time
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    Departs: <strong className="text-slate-200">{opt.predictedDepOriginStr}</strong> (in {opt.waitTimeMins}m) ➔ Arrives: <strong className="text-slate-200">{opt.predictedArrDestStr}</strong> · Duration: {Math.floor(opt.transitDurationMins / 60)}h {opt.transitDurationMins % 60}m
                  </div>
                </div>

                {/* Select Button */}
                <button
                  onClick={() => onSelectTrainForCockpit(opt.train.id)}
                  className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors shrink-0"
                >
                  Select Train
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
