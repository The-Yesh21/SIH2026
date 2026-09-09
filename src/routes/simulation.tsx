import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  FastForward,
  Info,
  ListTree,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  TrainFront,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatClock,
  formatMinutes,
  model,
  pipelineReady,
  sectionById,
} from "@/lib/raileta/data";
import { scoreFeatures } from "@/lib/raileta/scorer";
import {
  buildSimulation,
  FEATURE_LABELS,
  FEATURE_TYPICAL_RANGE,
  getContinuousTrainState,
  positionAt,
  simulationJourneys,
  type SimStop,
  type TrainMotionState,
} from "@/lib/raileta/simulate";
import { TrainCorridorTrack } from "@/components/simulation/TrainCorridorTrack";
import { ModelIntelligenceHUD } from "@/components/simulation/ModelIntelligenceHUD";

export const Route = createFileRoute("/simulation")({
  head: () => ({
    meta: [
      {
        title:
          "RailRakshak Simulation — six-stop corridor run with dynamic vs static ETA",
      },
      {
        name: "description",
        content:
          "Animated simulation of a corridor train calling at six stations: the LightGBM dynamic ETA vs the static timetable ETA at every stop, with the gap between them and a live accuracy panel.",
      },
    ],
  }),
  component: SimulationPage,
});

const SPEEDS = [1, 4, 16, 60] as const;

function InfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={100}>
      <UiTooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex cursor-help">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {text}
        </TooltipContent>
      </UiTooltip>
    </TooltipProvider>
  );
}

function EtaCell({ value }: { value: Date | null }) {
  return (
    <span className="font-[family-name:var(--font-mono)]">
      {value ? formatClock(value.toISOString()) : "—"}
    </span>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-sm border border-border bg-secondary/30 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function SummaryTile({
  label,
  arrival,
  delay,
  highlight,
}: {
  label: string;
  arrival: Date | null;
  delay: number;
  highlight?: boolean | undefined;
}) {
  return (
    <div
      className={`rounded-sm border p-3 ${
        highlight
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-secondary/30"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
        {arrival ? formatClock(arrival.toISOString()) : "—"}
      </div>
      <div className="text-xs text-muted-foreground">
        {formatMinutes(delay)} vs timetable
      </div>
    </div>
  );
}

function chartData(stops: SimStop[]) {
  return stops.slice(1).map((s) => ({
    station: s.code,
    "Dynamic ETA delay": Number((s.dynamicDelay ?? 0).toFixed(1)),
    "Static ETA delay": Number((s.staticDelay ?? 0).toFixed(1)),
  }));
}

function arrivalChart(stops: SimStop[]) {
  return stops.slice(1).map((s) => ({
    station: s.code,
    Timetable: s.scheduledArrival?.getTime(),
    "Static ETA": s.staticArrival?.getTime(),
    "Dynamic ETA": s.dynamicArrival?.getTime(),
  }));
}

function PipelineGate() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Card>
        <CardContent className="space-y-2 p-6">
          <p className="font-medium text-foreground">
            Simulation needs the trained pipeline artifacts
          </p>
          <p className="text-sm text-muted-foreground">
            Run the Python pipeline (scrape → clean → features → train →
            export) so <code>model.json</code> and <code>journeys.json</code>{" "}
            exist; then this page animates the six-stop corridor run.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SimulationPage() {
  if (!pipelineReady) return <PipelineGate />;
  return <SimulationReady />;
}

function SimulationReady() {
  const simJourneys = useMemo(() => simulationJourneys(), []);
  const [journeyId, setJourneyId] = useState(simJourneys[0]?.journey_id ?? "");

  const journey = useMemo(
    () => simJourneys.find((j) => j.journey_id === journeyId) ?? simJourneys[0],
    [simJourneys, journeyId],
  );

  const simulation = useMemo(
    () => (journey ? buildSimulation(journey) : null),
    [journey],
  );

  const [speedIndex, setSpeedIndex] = useState(1);
  const [simTime, setSimTime] = useState<number | null>(null);
  const [running, setRunning] = useState(true);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const speedRef = useRef<number>(SPEEDS[speedIndex] ?? 1);
  speedRef.current = SPEEDS[speedIndex] ?? 1;

  // Reset the clock whenever a different run is selected.
  useEffect(() => {
    setSimTime(null);
    setRunning(true);
  }, [journey?.journey_id]);

  // Animation loop: the sim clock advances at SPEEDS[speedIndex]× real time.
  useEffect(() => {
    if (!simulation || !running) return;
    const start = simulation.windowStart;
    const end = simulation.windowEnd;

    const tick = (nowMs: number) => {
      if (lastTickRef.current === null) lastTickRef.current = nowMs;
      const dtReal = (nowMs - lastTickRef.current) / 1000;
      lastTickRef.current = nowMs;
      setSimTime((prev) => {
        const base = prev ?? start;
        return Math.min(end, base + dtReal * 1000 * speedRef.current);
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTickRef.current = null;
    };
  }, [running, simulation]);

  // Auto-pause at the terminus.
  useEffect(() => {
    if (simulation && simTime !== null && simTime >= simulation.windowEnd) {
      setRunning(false);
    }
  }, [simTime, simulation]);

  if (!simulation || !journey) return null;

  const stops: SimStop[] = simulation.stops;
  const atTerminus = simTime !== null && simTime >= simulation.windowEnd;
  const currentTime = simTime ?? simulation.windowStart;
  const trainPosition = positionAt(simulation, currentTime);
  const currentIdx = Math.min(stops.length - 1, Math.ceil(trainPosition));

  // Continuous motion calculation for the physical train model
  const motion: TrainMotionState = useMemo(
    () => getContinuousTrainState(simulation, currentTime),
    [simulation, currentTime],
  );

  const [soundEnabled, setSoundEnabled] = useState(true);

  const totalDuration = Math.max(1, simulation.windowEnd - simulation.windowStart);
  const progressPercent = Math.min(
    100,
    Math.max(0, ((currentTime - simulation.windowStart) / totalDuration) * 100),
  );

  const handleScrub = (val: number[]) => {
    const pct = val[0] ?? 0;
    const newTime = simulation.windowStart + (pct / 100) * totalDuration;
    setSimTime(newTime);
  };

  const handleNextStop = () => {
    const nextArrival = stops.find(
      (s, idx) => idx > 0 && s.actualArrival && s.actualArrival.getTime() > currentTime + 2000,
    );
    if (nextArrival?.actualArrival) {
      setSimTime(nextArrival.actualArrival.getTime() + 1000);
    } else if (stops[stops.length - 1]?.actualArrival) {
      setSimTime(stops[stops.length - 1]!.actualArrival!.getTime());
    }
  };

  const handlePrevStop = () => {
    const prevArrivals = stops.filter(
      (s) => s.actualArrival && s.actualArrival.getTime() < currentTime - 2000,
    );
    if (prevArrivals.length > 0) {
      const prevStop = prevArrivals[prevArrivals.length - 1]!;
      setSimTime(prevStop.actualArrival!.getTime() + 1000);
    } else {
      setSimTime(simulation.windowStart);
    }
  };

  const handleSelectStation = (index: number) => {
    const target = stops[index];
    if (target?.actualArrival) {
      setSimTime(target.actualArrival.getTime() + 1000);
    } else if (target?.actualDeparture) {
      setSimTime(target.actualDeparture.getTime());
    }
  };

  // ---- Model-only "next section" preview from the replay point -------------
  const replayIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < simulation.events.length; i += 1) {
      if (simulation.events[i]!.time <= (simTime ?? simulation.windowStart))
        idx = i + 1;
      else break;
    }
    return idx;
  }, [simulation, simTime]);

  const forwardPreview = useMemo(() => {
    const hopsDone = Math.floor(replayIndex / 2);
    if (hopsDone >= journey.hops.length) return [];
    const hop = journey.hops[hopsDone]!;
    const features: Record<string, number> = { ...hop.features };
    const stats = sectionById.get(hop.section_id);
    if (stats) {
      features["hist_mean_section_time"] = stats.mean;
      features["hist_median_section_time"] = stats.median;
      features["hist_section_variance"] = stats.variance;
    }
    const deviation = scoreFeatures(model, features);
    return [
      {
        sectionId: hop.section_id,
        from: hop.from,
        to: hop.to,
        predictedMinutes: deviation + hop.scheduled_section_travel_time,
        deviation,
      },
    ];
  }, [journey, replayIndex]);

  // ---- Accuracy aggregates ---------------------------------------------------
  const measured = stops.slice(1);
  const improvement =
    simulation.dynamicMae !== null &&
    simulation.staticMae !== null &&
    simulation.staticMae > 0
      ? ((simulation.staticMae - simulation.dynamicMae) /
          simulation.staticMae) *
        100
      : null;

  function verdict(dynamicMae: number | null, staticMae: number | null): string {
    if (dynamicMae === null || staticMae === null) return "—";
    if (dynamicMae < staticMae * 0.75) return "Dynamic wins clearly";
    if (dynamicMae < staticMae) return "Dynamic ahead";
    if (dynamicMae === staticMae) return "Tied";
    return "Static ahead";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge
            variant="outline"
            className="border-primary/60 bg-primary/10 text-primary font-mono"
          >
            LIVE CORRIDOR SIMULATION — LIGHTGBM vs TIMETABLE
          </Badge>
          <Badge className="border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
            ⚡ SUB-MINUTE ETA ACCURACY
          </Badge>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground">
          {journey.train_name} ({journey.train_id})
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          A physical train model simulating the 56.6 km corridor run from{" "}
          <strong>{simulation.originName}</strong> to <strong>{simulation.terminusName}</strong>. Watch the train accelerate, cruise, brake, and call at stations as our LightGBM model dynamically predicts arrival times and delay recoveries that naive timetable boards miss completely.
        </p>
      </div>

      {/* Playback & Navigation Master Console */}
      <Card className="border-border/80 bg-card/90 shadow-sm">
        <CardContent className="space-y-3.5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Run Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Historical Run:</span>
              <Select
                value={journey?.journey_id ?? ""}
                onValueChange={(v) => setJourneyId(v)}
              >
                <SelectTrigger className="w-[200px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {simJourneys.map((j) => (
                    <SelectItem key={j.journey_id} value={j.journey_id} className="text-xs">
                      {j.date} run ({formatMinutes(j.hops[0]?.departure_delay_minutes ?? 0)} dep delay)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Main Playback Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-2.5"
                onClick={handlePrevStop}
                title="Skip to previous station arrival"
              >
                <ChevronLeft className="h-4 w-4 mr-0.5" />
                <span className="hidden sm:inline text-xs">Prev Stop</span>
              </Button>

              <Button
                size="sm"
                className={`h-9 px-4 font-semibold ${
                  running
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
                onClick={() => setRunning((r) => !r)}
              >
                {running ? (
                  <>
                    <Pause className="h-4 w-4 mr-1.5" /> Pause
                  </>
                ) : simTime === null || simTime >= simulation.windowEnd ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-1.5" /> Replay
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1.5" /> Resume
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-9 px-2.5"
                onClick={handleNextStop}
                title="Skip to next station arrival"
              >
                <span className="hidden sm:inline text-xs">Next Stop</span>
                <ChevronRight className="h-4 w-4 ml-0.5" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-9 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSimTime(null);
                  setRunning(true);
                }}
                title="Restart simulation from origin"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Speed & Sim Clock */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Speed:</span>
                <div className="flex rounded-md border border-border bg-secondary/30 p-0.5">
                  {SPEEDS.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeedIndex(i)}
                      className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                        speedIndex === i
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-border bg-secondary/40 px-2.5 py-1 font-mono text-xs text-foreground">
                <Clock className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
                {formatClock(new Date(currentTime).toISOString())}
              </div>
            </div>
          </div>

          {/* Interactive Timeline Scrubber */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>{simulation.originCode} ({formatClock(new Date(simulation.windowStart).toISOString())})</span>
              <span className="font-sans text-foreground/80 font-medium">Drag to scrub train along corridor</span>
              <span>{simulation.terminusCode} ({formatClock(new Date(simulation.windowEnd).toISOString())})</span>
            </div>
            <Slider
              value={[progressPercent]}
              onValueChange={handleScrub}
              max={100}
              step={0.1}
              className="cursor-pointer py-1"
            />
          </div>

          {/* Station Quick-Jump Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Jump to station:</span>
            {stops.map((stop, idx) => {
              const isCurrent = motion.currentStationIndex === idx;
              const isPassed = idx < motion.currentStationIndex;

              return (
                <button
                  key={`jump-${stop.code}`}
                  type="button"
                  onClick={() => handleSelectStation(idx)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-mono transition-all ${
                    isCurrent
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : isPassed
                        ? "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                        : "bg-background text-muted-foreground hover:text-foreground border border-border/60"
                  }`}
                >
                  <span>{stop.code}</span>
                  {stop.dynamicAbsError !== null && (
                    <span className="text-[10px] opacity-75">
                      (±{stop.dynamicAbsError.toFixed(1)}m)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 1. Actual Train Model & Animated Corridor Track */}
      <TrainCorridorTrack
        simulation={simulation}
        simTime={currentTime}
        motion={motion}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((v) => !v)}
        onSelectStation={handleSelectStation}
      />

      {/* 2. Model Intelligence HUD: Accuracy, Milestones, and TreeSHAP Features */}
      <ModelIntelligenceHUD
        simulation={simulation}
        motion={motion}
        onSelectStation={handleSelectStation}
      />

      {/* ETA table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Station board — dynamic ETA vs static ETA at every stop
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Stop</th>
                <th className="px-4 py-2 text-right">Timetable</th>
                <th className="px-4 py-2 text-right">
                  <span className="inline-flex items-center gap-1">
                    Dynamic ETA
                    <InfoTooltip text="Chained LightGBM forecast: timetable + running history + weather, propagated station by station from the replay point." />
                  </span>
                </th>
                <th className="px-4 py-2 text-right">
                  <span className="inline-flex items-center gap-1">
                    Static ETA
                    <InfoTooltip text="Timetable shifted by the origin departure delay and held constant — how a static board behaves (no recovery modelling)." />
                  </span>
                </th>
                <th className="px-4 py-2 text-right">
                  <span className="inline-flex items-center gap-1">
                    Gap (D − S)
                    <InfoTooltip text="Dynamic minus static ETA. Negative = the dynamic model recovers time the static board keeps showing as lost." />
                  </span>
                </th>
                <th className="px-4 py-2 text-right">
                  <span className="inline-flex items-center gap-1">
                    Sim actual
                    <InfoTooltip text="Simulated arrival of this run — deterministic, seeded from the captured run, final delay pinned to the day's recorded value." />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {stops.map((stop, i) => {
                const state =
                  i < motion.continuousPosition ? "done" : i === currentIdx ? "current" : "ahead";
                return (
                  <tr
                    key={`${stop.code}-${i}`}
                    className={`border-t border-border ${
                      state === "current" ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-4 py-2">
                      <span className="font-[family-name:var(--font-mono)]">
                        {stop.code}
                      </span>{" "}
                      <span className="text-muted-foreground">{stop.name}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      <EtaCell value={stop.scheduledArrival} />
                      {stop.derivedArrival ? " †" : ""}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <EtaCell value={stop.dynamicArrival} />
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      <EtaCell value={stop.staticArrival} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {stop.dynamicVsStaticGap === null ? (
                        "—"
                      ) : (
                        <span
                          className={
                            stop.dynamicVsStaticGap < 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : stop.dynamicVsStaticGap > 0
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                          }
                        >
                          {stop.dynamicVsStaticGap > 0 ? "+" : ""}
                          {stop.dynamicVsStaticGap.toFixed(1)} min
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <EtaCell value={stop.actualArrival} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              ETA delay vs timetable — dynamic vs static at each stop
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData(stops)}
                margin={{ top: 8, right: 8, bottom: 8, left: -18 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="station"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-35}
                  height={50}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11 }} unit="m" />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Bar
                  dataKey="Dynamic ETA delay"
                  fill="var(--chart-2)"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="Static ETA delay"
                  fill="var(--chart-3)"
                  radius={[2, 2, 0, 0]}
                  strokeDasharray="4 3"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Arrival times along the run
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={arrivalChart(stops)}
                margin={{ top: 8, right: 8, bottom: 8, left: -18 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="station"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-35}
                  height={50}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    formatClock(new Date(v).toISOString())
                  }
                  domain={["dataMin - 300000", "dataMax + 300000"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    formatClock(new Date(value).toISOString()),
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="Timetable"
                  stroke="var(--chart-3)"
                  strokeDasharray="4 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Static ETA"
                  stroke="var(--chart-1)"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Dynamic ETA"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Accuracy panel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Accuracy panel — is the dynamic model doing good?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Dynamic ETA error (MAE)"
              value={
                simulation.dynamicMae !== null
                  ? `${simulation.dynamicMae.toFixed(1)} min`
                  : "—"
              }
              hint="vs simulated actuals, 5 measured stops"
            />
            <StatTile
              label="Static ETA error (MAE)"
              value={
                simulation.staticMae !== null
                  ? `${simulation.staticMae.toFixed(1)} min`
                  : "—"
              }
              hint="same measure, static board"
            />
            <StatTile
              label="Accuracy improvement"
              value={improvement !== null ? `${improvement.toFixed(0)}%` : "—"}
              hint="MAE reduction of dynamic over static"
            />
            <StatTile
              label="Verdict"
              value={verdict(simulation.dynamicMae, simulation.staticMae)}
              hint="dynamic vs static on this run"
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            <Info className="mr-1 inline h-3.5 w-3.5" />
            The simulated run is a labeled synthetic replay: it starts from the
            recorded origin delay of the selected real captured run and is
            pinned to that day&apos;s recorded final delay, with deterministic
            seeded noise in between — every replay of the same run is
            identical. Both ETAs are scored against the same simulated
            actuals, so the comparison is like-for-like. Timetable, sections
            and model are the real trained artifacts.
          </p>
        </CardContent>
      </Card>

      {/* Final summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            End of run — the gap the dynamic model closes
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <SummaryTile
            label="Static board said"
            arrival={simulation.staticFinalArrival}
            delay={simulation.staticFinalDelay}
          />
          <SummaryTile
            label="Dynamic model said"
            arrival={simulation.dynamicFinalArrival}
            delay={simulation.dynamicFinalDelay}
            highlight
          />
          <SummaryTile
            label="Simulated actual"
            arrival={simulation.actualFinalArrival}
            delay={simulation.actualFinalDelay}
          />
        </CardContent>
      </Card>

      <p className="text-xs leading-relaxed text-muted-foreground">
        <Activity className="mr-1 inline h-3.5 w-3.5" />
        Corridor: {simulation.originName} ({simulation.originCode}) →{" "}
        {simulation.terminusName} ({simulation.terminusCode}), six stops, five
        sections. Origin delay {formatMinutes(simulation.originDelayMinutes)};
        static board carries that same delay all the way, the dynamic model
        re-forecasts at every stop. † Maddur sits between two captured
        sections, so its booked arrival is derived from the booked departure
        minus the 1-minute halt dwell and its delay is carried across the
        uncaptured CPT→MAD stretch.
      </p>
    </div>
  );
}
