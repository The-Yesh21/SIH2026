import React from "react";
import { TrainConfig } from "../lib/rail/types";
import { SWR_CORRIDOR_STATIONS } from "../lib/rail/infrastructure";
import { CORRIDOR_ACTIVE_TRAINS } from "../lib/rail/trains";
import { LineChart, Clock, Zap } from "lucide-react";

interface TimeDistanceStringlineProps {
  selectedTrain: TrainConfig;
}

export function TimeDistanceStringline({ selectedTrain }: TimeDistanceStringlineProps) {
  // SVG Canvas dimensions
  const width = 800;
  const height = 450;
  const padding = { top: 30, right: 30, bottom: 40, left: 70 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Time range: 06:00 to 20:00 (in total minutes from midnight: 360 to 1200)
  const timeMin = 360;
  const timeMax = 1200;

  const getX = (minutes: number) => {
    return padding.left + ((minutes - timeMin) / (timeMax - timeMin)) * plotWidth;
  };

  const getY = (distKm: number) => {
    // MYS = 0.0 (top) to SBC = 138.250 (bottom)
    return padding.top + (distKm / 138.250) * plotHeight;
  };

  const parseTimeToMin = (tStr: string) => {
    const [h, m] = tStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Major station markers along Y-axis
  const majorStations = SWR_CORRIDOR_STATIONS.filter((s) => s.isMajorJunction);

  // Time grid markers every 2 hours
  const timeHours = [6, 8, 10, 12, 14, 16, 18, 20];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
          <LineChart className="h-4 w-4 text-cyan-400" />
          Dispatcher Stringline Diagram (Time-Distance Graph)
        </h3>
        <span className="text-[10px] font-mono text-slate-400">
          Indian Railways COA Stringline Standard
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[500px]">
          {/* Background Grid Lines (Time X-axis) */}
          {timeHours.map((h) => {
            const x = getX(h * 60);
            return (
              <g key={h}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="#1f2937"
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 18}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {String(h).padStart(2, "0")}:00
                </text>
              </g>
            );
          })}

          {/* Station Horizontal Lines (Distance Y-axis) */}
          {majorStations.map((station) => {
            const y = getY(station.distanceFromMysKm);
            return (
              <g key={station.code}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1e293b"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {station.code} ({station.distanceFromMysKm.toFixed(0)}k)
                </text>
              </g>
            );
          })}

          {/* Train Trajectory Lines */}
          {CORRIDOR_ACTIVE_TRAINS.map((train) => {
            const depMins = parseTimeToMin(train.scheduledDep);
            const arrMins = parseTimeToMin(train.scheduledArr);

            const x1 = getX(depMins);
            const y1 = getY(0); // MYS
            const x2 = getX(arrMins);
            const y2 = getY(138.250); // SBC

            const isSelected = train.id === selectedTrain.id;
            const isVande = train.type === "VANDE_BHARAT";

            return (
              <g key={train.id}>
                {/* Trajectory Stringline */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={
                    isSelected
                      ? "#06B6D4"
                      : isVande
                      ? "#F59E0B"
                      : "#64748B"
                  }
                  strokeWidth={isSelected ? 3.5 : isVande ? 2.5 : 1.5}
                  strokeDasharray={train.type === "FREIGHT_BOXN" ? "4 4" : undefined}
                />

                {/* Train Label */}
                <text
                  x={(x1 + x2) / 2 + 5}
                  y={(y1 + y2) / 2}
                  fill={isSelected ? "#22D3EE" : isVande ? "#FBBF24" : "#94A3B8"}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight={isSelected ? "bold" : "normal"}
                >
                  {train.id} {train.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 bg-cyan-400 inline-block rounded-sm" /> Selected Service
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 bg-amber-400 inline-block rounded-sm" /> Vande Bharat
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 bg-slate-500 inline-block rounded-sm" /> Standard Express / Freight
          </span>
        </div>
        <span>Slope indicates line speed gradient (km/h)</span>
      </div>
    </div>
  );
}
