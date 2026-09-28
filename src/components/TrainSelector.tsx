import React, { useState } from "react";
import { TrainConfig } from "../lib/rail/types";
import {
  ALL_CORRIDOR_FLEET,
  resolveTrainAtClockTime,
  ResolvedLiveTrain,
} from "../lib/rail/timeResolver";
import { Search } from "lucide-react";

interface TrainSelectorProps {
  selectedTrainId: string;
  onSelectTrain: (train: TrainConfig) => void;
  activeClockMinutes: number;
}

export function TrainSelector({
  selectedTrainId,
  onSelectTrain,
  activeClockMinutes,
}: TrainSelectorProps) {
  const [searchInput, setSearchInput] = useState<string>("");

  const resolvedFleet: ResolvedLiveTrain[] = ALL_CORRIDOR_FLEET.map((train) =>
    resolveTrainAtClockTime(train, activeClockMinutes)
  );

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    const matched = resolvedFleet.find(
      (t) =>
        t.config.id.toLowerCase().includes(val.toLowerCase()) ||
        t.config.name.toLowerCase().includes(val.toLowerCase())
    );
    if (matched) {
      onSelectTrain(matched.config);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <h2 className="text-base font-heading font-semibold text-chalk">
          Corridor fleet & delay factor analysis
        </h2>

        {/* Inline Train Number Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-steel absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by Train # (e.g. 12613, 20608)..."
            className="w-full bg-surface border border-graphite rounded-lg pl-9 pr-3 py-2 text-sm text-chalk font-body placeholder:text-steel focus:outline-none focus:border-chalk-dim"
          />
        </div>
      </div>

      {/* Grid of Train Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {resolvedFleet.map((resolved) => {
          const train = resolved.config;
          const isSelected = selectedTrainId === train.id;

          const renderStatusBadge = () => {
            switch (resolved.operatingState) {
              case "RUNNING_ON_TRACK":
                return (
                  <span className="flex items-center gap-1.5 text-signal-green font-data text-xs">
                    <span className="signal-pip-green" />
                    RUNNING (KM {resolved.currentLocationKm.toFixed(0)})
                  </span>
                );
              case "TRIP_COMPLETED":
                return (
                  <span className="text-steel font-data text-xs">
                    ARRIVED (At SBC)
                  </span>
                );
              case "NOT_STARTED_YET":
                return (
                  <span className="text-steel-light font-data text-xs">
                    UPCOMING ({train.scheduledDep})
                  </span>
                );
            }
          };

          return (
            <button
              key={train.id}
              onClick={() => {
                onSelectTrain(train);
                setSearchInput(train.id);
              }}
              className={`group text-left p-4 rounded-xl border transition-colors relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? "bg-surface-raised border-chalk/40"
                  : "bg-surface hover:bg-surface-raised border-graphite"
              }`}
            >
              {/* Header: Number & Live Operating State */}
              <div className="flex items-center justify-between gap-1">
                <span className="font-data font-semibold text-chalk text-sm">
                  #{train.id}
                </span>
                {renderStatusBadge()}
              </div>

              {/* Train Name */}
              <div className="my-2">
                <div className="font-heading font-semibold text-sm text-chalk line-clamp-1">
                  {train.name}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-data text-xs text-steel">
                    {train.scheduledDep} ➔ {train.scheduledArr}
                  </span>
                  <span className="font-body text-xs text-steel-light">
                    {train.scheduledStops.length === 2 ? "Non-Stop" : `${train.scheduledStops.length} Stops`}
                  </span>
                </div>
              </div>

              {/* Footer: Predicted State */}
              <div className="pt-2 border-t border-graphite flex items-center justify-between">
                <span>
                  {resolved.operatingState === "RUNNING_ON_TRACK" ? (
                    <span className="font-data text-xs text-signal-green">{resolved.currentSpeedKmph} km/h</span>
                  ) : resolved.operatingState === "TRIP_COMPLETED" ? (
                    <span className="font-data text-xs text-steel">Trip Finished</span>
                  ) : (
                    <span className="font-data text-xs text-steel">At Mysuru (MYS)</span>
                  )}
                </span>
                <span className="font-body text-xs text-steel">
                  {train.type.replace("_", " ")}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
