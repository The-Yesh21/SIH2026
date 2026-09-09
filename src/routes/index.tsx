import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Clock,
  Gauge,
  MapPin,
  TrainFront,
  Calendar,
  TrendingUp,
  Waves,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import { PipelineNotice } from "@/components/raileta/PipelineNotice";
import { Badge } from "@/components/ui/badge";
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
  dataset,
  evaluation,
  formatClock,
  formatMinutes,
  journeys,
  pipelineReady,
  scenarios,
} from "@/lib/raileta/data";
import {
  forecastJourney,
  type JourneyForecast,
} from "@/lib/raileta/predict";
import {
  buildTodaySchedule,
  markRunsToday,
  trainsRunningToday,
  type TodaySchedule,
} from "@/lib/raileta/today_trains";
import { scoreFeatures } from "@/lib/raileta/scorer";
import { model } from "@/lib/raileta/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "RailRakshak — Bengaluru → Mysuru: today's schedule + historical replay",
      },
      {
        name: "description",
        content:
          "Today's scheduled SBC→MYS trains from eRail, plus historical replay of real journeys with LightGBM-predicted ETAs.",
      },
      {
        property: "og:title",
        content: "RailRakshak — Bengaluru → Mysuru ETA prediction",
      },
      {
        property: "og:description",
        content:
          "Today's timetable and station-by-station arrival predictions from a LightGBM model trained on real historical running data.",
      },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint?: string | undefined;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-sm bg-secondary text-secondary-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
            {value}
          </div>
          {hint ? (
            <div className="text-xs text-muted-foreground">{hint}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function TodayTrainsPanel({ schedule }: { schedule: TodaySchedule }) {
  const running = trainsRunningToday(schedule);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            Today&apos;s scheduled trains — {schedule.date} ({schedule.weekday})
          </CardTitle>
          <Badge
            variant="outline"
            className="ml-auto border-muted text-muted-foreground"
          >
            Schedule only · eRail
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          From eRail&apos;s public timetable. These are scheduled
          departure/arrival times only — no live position and no model
          prediction. Indian Railways does not publish a free open
          live-position API, so the dashboard replays completed journeys for
          actual arrival data.
        </p>

        {running.length === 0 ? (
          <p className="text-muted-foreground">
            No trains scheduled to run today on this corridor.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Train</th>
                  <th className="px-4 py-2 text-right">Departs SBC</th>
                  <th className="px-4 py-2 text-right">Arrives MYS</th>
                  <th className="px-4 py-2 text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {running.map((t) => (
                  <tr key={t.train_id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <span className="font-[family-name:var(--font-mono)]">
                        {t.train_id}
                      </span>{" "}
                      {t.train_name}
                      <span className="text-muted-foreground text-xs">
                        {" "}
                        · {t.origin_of_service} → {t.terminus_of_service}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)]">
                      {t.sched_dep_sbc}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)]">
                      {t.sched_arr_mys}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-muted-foreground">
                      {t.sched_duration}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to="/demo"
            className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
          >
            Demo — Talaguppa Express delays
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            to="/dataset"
            className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
          >
            View dataset & sources
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            to="/model"
            className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
          >
            View ML model
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            to="/slides"
            className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
          >
            Slides
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function JourneySelector({
  selectedJourneyId,
  onSelect,
}: {
  selectedJourneyId: string;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all"
    ? journeys
    : journeys.filter((j) => j.train_id === filter);

  const trainOptions = [
    { value: "all", label: "All trains" },
    ...Array.from(new Set(journeys.map((j) => j.train_id))).map((tid) => {
      const j = journeys.find((x) => x.train_id === tid)!;
      return { value: tid, label: `${tid} — ${j.train_name}` };
    }),
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Select a real journey to replay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {trainOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {filtered.map((j) => (
            <button
              key={j.journey_id}
              onClick={() => onSelect(j.journey_id)}
              className={`w-full text-left rounded-sm border px-3 py-2 text-sm transition-colors ${
                j.journey_id === selectedJourneyId
                  ? "border-primary bg-primary/10 text-foreground font-medium"
                  : "border-border hover:bg-secondary/50 text-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-mono)] font-medium">
                  {j.train_id}
                </span>
                <span className="text-xs text-muted-foreground">
                  {j.date}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {j.train_name} · {j.hops.length} stations · {j.hops[0]?.from} → {j.hops[j.hops.length - 1]?.to}
              </div>
            </button>
          ))}
        </div>

        <a
          className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
          href={journeys[0]?.source_url}
          target="_blank"
          rel="noreferrer"
        >
          View provenance
        </a>
      </CardContent>
    </Card>
  );
}

function ScenarioSelector({
  selectedJourneyId,
  onSelect,
}: {
  selectedJourneyId: string;
  onSelect: (id: string) => void;
}) {
  if (scenarios.length === 0) return null;

  const scenarioOptions = [
    { label: "All scenarios", value: "all" },
    ...Array.from(new Set(scenarios.map((s) => s.label))).map((label) => ({
      label,
      value: label,
    })),
  ];

  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all"
      ? scenarios
      : scenarios.filter((s) => s.label === filter);

  const scenarioBadgeColor: Record<string, string> = {
    "On-time journey": "border-green-500/40 bg-green-500/10 text-green-500",
    "Delay recovery": "border-blue-500/40 bg-blue-500/10 text-blue-500",
    "Delay increasing": "border-red-500/40 bg-red-500/10 text-red-500",
    "Slow section": "border-amber-500/40 bg-amber-500/10 text-amber-500",
    "Long station dwell": "border-purple-500/40 bg-purple-500/10 text-purple-500",
    "Irregular journey": "border-muted text-muted-foreground",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            Scenario library — real journey patterns
          </CardTitle>
          <Badge variant="outline" className="ml-auto border-muted text-muted-foreground">
            {scenarios.length} scenarios
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select
            value={filter}
            onValueChange={setFilter}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scenarioOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {filtered.map((sc) => {
            const badgeColor =
              scenarioBadgeColor[sc.label] ||
              "border-muted text-muted-foreground";
            return (
              <button
                key={sc.journey_id}
                onClick={() => onSelect(sc.journey_id)}
                className={`w-full text-left rounded-sm border px-3 py-2 text-sm transition-colors ${
                  sc.journey_id === selectedJourneyId
                    ? "border-primary bg-primary/10 text-foreground font-medium"
                    : "border-border hover:bg-secondary/50 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${badgeColor}`}
                  >
                    {sc.label}
                  </Badge>
                  <span className="font-[family-name:var(--font-mono)] text-xs">
                    {sc.train_id}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {sc.date} · started {formatMinutes(sc.starting_delay_minutes)}
                  {sc.delay_change_minutes > 0 ? ` → +${formatMinutes(sc.delay_change_minutes)}` :
                   sc.delay_change_minutes < 0 ? ` → ${formatMinutes(sc.delay_change_minutes)}` :
                   ""}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {sc.reason}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DynamicETATimeline({
  result,
  atIndex,
  journey,
}: {
  result: JourneyForecast;
  atIndex: number;
  journey: typeof journeys[0];
}) {
  if (!result || result.forecast.length === 0) return null;

  const timeline = result.forecast.map((stop, i) => {
    const prevStop = i > 0 ? result.forecast[i - 1] : null;
    const etaChange =
      prevStop && stop.predictedArrival.getTime() !== prevStop.predictedArrival.getTime()
        ? stop.predictedArrival.getTime() - prevStop.predictedArrival.getTime()
        : 0;

    return {
      station: stop.hop.to,
      station_name: stop.hop.to_name,
      section_id: stop.hop.section_id,
      scheduled: stop.scheduledArrival,
      predicted: stop.predictedArrival,
      actual: stop.actualArrival,
      predictedDelay: stop.predictedDelay,
      actualDelay: stop.actualDelay,
      predictedMinutes: stop.predictedMinutes,
      scheduledMinutes: stop.scheduledMinutes,
      actualMinutes: stop.actualMinutes,
      etaChangeMinutes: etaChange / 60000,
      absError: stop.absError,
    };
  });

  const firstPredicted = timeline[0];
  const currentEtas = timeline.map((t) => ({
    station: t.station,
    station_name: t.station_name,
    predicted_arrival: t.predicted,
    eta_change: t.etaChangeMinutes,
    predicted_delay: t.predictedDelay,
    actual_delay: t.actualDelay,
  }));

  return (
    <div className="space-y-4">
      {/* ETA Timeline Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Dynamic ETA timeline — predicted arrival at each station
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={currentEtas.map((t) => {
                const hop = journey.hops.find((h) => h.to === t.station);
                return {
                  station: t.station,
                  predicted: new Date(t.predicted_arrival).getTime(),
                  scheduled: hop ? new Date(hop.scheduled_arrival_next).getTime() : 0,
                };
              })}
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
                domain={["dataMin - 300000", "dataMax + 300000"]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
                formatter={(value: number) => [
                  formatClock(new Date(value).toISOString()),
                  "Predicted arrival",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Predicted arrival"
              />
              <Line
                type="monotone"
                dataKey="scheduled"
                stroke="var(--chart-3)"
                strokeDasharray="4 3"
                dot={false}
                name="Scheduled arrival"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ETA Change Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            ETA evolution — how the prediction changes at each station
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Station</th>
                <th className="px-4 py-2 text-right">At this point</th>
                <th className="px-4 py-2 text-right">Predicted MYS ETA</th>
                <th className="px-4 py-2 text-right">ETA change</th>
                <th className="px-4 py-2 text-right">Predicted delay</th>
                <th className="px-4 py-2 text-right">Actual delay</th>
                <th className="px-4 py-2 text-right">Pred. error</th>
              </tr>
            </thead>
            <tbody>
              {currentEtas.map((t, i) => {
                const hop = journey.hops.find(
                  (h) => h.to === t.station
                );
                return (
                  <tr
                    key={t.station}
                    className="border-t border-border"
                  >
                    <td className="px-4 py-2">
                      <span className="font-[family-name:var(--font-mono)]">
                        {t.station}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {t.station_name}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                      Section {i + atIndex}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)]">
                      {formatClock(t.predicted_arrival.toISOString())}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-[family-name:var(--font-mono)] ${
                        t.eta_change > 0
                          ? "text-red-500"
                          : t.eta_change < 0
                          ? "text-green-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {t.eta_change !== 0
                        ? `${t.eta_change > 0 ? "+" : ""}${formatMinutes(t.eta_change)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)]">
                      {formatMinutes(t.predicted_delay)}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-muted-foreground">
                      {formatMinutes(t.actual_delay)}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {hop ? (timeline.find((tl) => tl.station === t.station)?.absError ?? 0).toFixed(1) : "—"} min
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StaticVsDynamicComparison({
  result,
  baselineMae,
}: {
  result: JourneyForecast;
  baselineMae: number | null;
}) {
  if (!result || result.forecast.length === 0) return null;

  const comparisons = result.forecast.map((stop) => ({
    station: stop.hop.to,
    station_name: stop.hop.to_name,
    staticETA: stop.scheduledArrival,
    dynamicETA: stop.predictedArrival,
    actualETA: stop.actualArrival,
    staticError: stop.baselineAbsError,
    dynamicError: stop.absError,
  }));

  const totalStaticError = comparisons.reduce(
    (sum, c) => sum + c.staticError,
    0
  );
  const totalDynamicError = comparisons.reduce(
    (sum, c) => sum + c.dynamicError,
    0
  );
  const improvement =
    totalStaticError > 0
      ? ((totalStaticError - totalDynamicError) / totalStaticError) * 100
      : 0;

  return (
    <div className="space-y-4">
      {/* Comparison Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Static (timetable) vs Dynamic (LightGBM) ETA — per station error
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={comparisons.map((c) => ({
                station: c.station,
                static: c.staticError,
                dynamic: c.dynamicError,
              }))}
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
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)} min`,
                  name === "static" ? "Static (timetable) error" : "Dynamic (model) error",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="static" fill="var(--chart-3)" name="Static error" />
              <Bar dataKey="dynamic" fill="var(--chart-2)" name="Dynamic error" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Waves}
          label="Total static error"
          value={`${totalStaticError.toFixed(1)} min`}
          hint={`${comparisons.length} sections, timetable baseline`}
        />
        <StatCard
          icon={Gauge}
          label="Total dynamic error"
          value={`${totalDynamicError.toFixed(1)} min`}
          hint={`${comparisons.length} sections, LightGBM model`}
        />
        <StatCard
          icon={TrendingUp}
          label="Improvement"
          value={`${improvement > 0 ? "+" : ""}${improvement.toFixed(1)}%`}
          hint={
            improvement > 0
              ? "Model beats timetable"
              : improvement < 0
              ? "Timetable beats model"
              : "Equal"
          }
        />
      </div>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Station-by-station: static vs dynamic ETA
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Station</th>
                <th className="px-4 py-2 text-right">Scheduled arrival</th>
                <th className="px-4 py-2 text-right">Dynamic ETA</th>
                <th className="px-4 py-2 text-right">Actual arrival</th>
                <th className="px-4 py-2 text-right">Static error</th>
                <th className="px-4 py-2 text-right">Dynamic error</th>
                <th className="px-4 py-2 text-right">Better?</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c) => {
                const staticBetter = c.staticError < c.dynamicError;
                return (
                  <tr key={c.station} className="border-t border-border">
                    <td className="px-4 py-2">
                      <span className="font-[family-name:var(--font-mono)]">
                        {c.station}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {c.station_name}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)]">
                      {formatClock(c.staticETA.toISOString())}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-foreground">
                      {formatClock(c.dynamicETA.toISOString())}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-muted-foreground">
                      {formatClock(c.actualETA.toISOString())}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-muted-foreground">
                      {c.staticError.toFixed(1)} min
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)]">
                      {c.dynamicError.toFixed(1)} min
                    </td>
                    <td className="px-4 py-2 text-right">
                      {staticBetter ? (
                        <span className="text-muted-foreground">Timetable</span>
                      ) : (
                        <span className="text-green-500">Model</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ReplayMode({
  journey,
  atIndex,
  result,
}: {
  journey: typeof journeys[0];
  atIndex: number;
  result: JourneyForecast;
}) {
  const currentStation = journey.hops[Math.max(0, atIndex - 1)] ?? journey.hops[0]!;
  const nextStation = journey.hops[atIndex];
  const lastForecast = result.forecast[result.forecast.length - 1];

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrainFront}
          label="Train"
          value={journey.train_id}
          hint={journey.train_name}
        />
        <StatCard
          icon={MapPin}
          label="Currently at"
          value={currentStation.from}
          hint={currentStation.from_name}
        />
        <StatCard
          icon={Clock}
          label="Predicted arrival MYS"
          value={lastForecast && result.forecast.length > 0
              ? formatClock(lastForecast.predictedArrival.toISOString())
              : "—"
          }
          hint={lastForecast && result.forecast.length > 0 && lastForecast?.predictedDelay !== null
              ? `${formatMinutes(lastForecast.predictedDelay)} vs timetable`
              : undefined
          }
        />
        <StatCard
          icon={Gauge}
          label="Actual arrival MYS"
          value={
            result.actualFinalArrival
              ? formatClock(result.actualFinalArrival.toISOString())
              : "—"
          }
          hint={result.actualFinalArrival && result.actualFinalDelay !== null
              ? `${formatMinutes(result.actualFinalDelay)} vs timetable`
              : undefined
          }
        />
      </div>

      {/* Dynamic ETA Timeline */}
      <DynamicETATimeline
        result={result}
        atIndex={atIndex}
        journey={journey}
      />

      {/* Static vs Dynamic Comparison */}
      <StaticVsDynamicComparison
        result={result}
        baselineMae={result.baselineMae}
      />

      {/* Observed sections (already passed) */}
      {result.observed.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Observed — sections already completed
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Section</th>
                  <th className="px-4 py-2 text-right">Scheduled</th>
                  <th className="px-4 py-2 text-right">Predicted</th>
                  <th className="px-4 py-2 text-right">Actual</th>
                  <th className="px-4 py-2 text-right">Error</th>
                </tr>
              </thead>
              <tbody>
                {result.observed.map((stop) => (
                  <tr key={stop.hop.section_id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <span className="font-[family-name:var(--font-mono)]">
                        {stop.hop.from} → {stop.hop.to}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)]">
                      {formatClock(stop.scheduledArrival.toISOString())}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-muted-foreground">
                      {formatClock(stop.predictedArrival.toISOString())}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)]">
                      {formatClock(stop.actualArrival.toISOString())}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {stop.absError.toFixed(1)} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FullRouteView({ journey }: { journey: typeof journeys[0] }) {
  // Build the full SBC→MYS corridor from dataset stations (ordered by station_sequence)
  const corridorStations = useMemo(() => {
    return [...dataset.stations]
      .sort((a, b) => {
        const sa = dataset.sections.find((s) => s.from === a.code);
        const sb = dataset.sections.find((s) => s.from === b.code);
        return (sa?.station_sequence ?? 99) - (sb?.station_sequence ?? 99);
      });
  }, []);

  // Build full route sections in order
  const corridorSections = useMemo(() => {
    return [...dataset.sections].sort((a, b) => a.station_sequence - b.station_sequence);
  }, []);

  // For the selected journey, map actual delays to each station in the corridor
  const routeWithDelays = useMemo(() => {
    const delays: Record<string, { actual: number | null; predicted: number | null; scheduled: number | null }> = {};

    // Initialize all stations with null values
    for (const station of corridorStations) {
      delays[station.code] = { actual: null, predicted: null, scheduled: null };
    }

    // Map journey hops to stations
    if (journey) {
      for (const hop of journey.hops) {
        // Arrival delay at the destination station
        delays[hop.to] = {
          actual: hop.next_arrival_delay_minutes ?? null,
          scheduled: null,
          predicted: null,
        };
        // Departure delay from the origin station
        if (delays[hop.from]) {
          delays[hop.from] = {
            ...delays[hop.from]!,
            actual: hop.departure_delay_minutes,
          };
        }
      }
    }

    // Calculate predicted values for each section using the model
    // We'll predict from SBC with no initial delay for the "full route prediction"
    if (journey) {
      let cumulativeDelay = 0;
      let prevSectionTime: number | null = null;

      for (const section of corridorSections) {
        const fromStation = section.from;
        const toStation = section.to;

        // Use model to predict this section's travel time
        const fills = dataset.feature_config.fill_values;
        const features: Record<string, number> = {
          train_code: dataset.feature_config.train_codes[journey.train_id] ?? 0,
          section_code: dataset.feature_config.section_codes[section.section_id] ?? 0,
          station_sequence: section.station_sequence,
          section_distance_km: section.distance_km,
          remaining_distance_km: section.remaining_km,
          scheduled_section_travel_time: section.scheduled_mean,
          day_of_week: 1, // Default to Monday
          is_weekend: 0,
          hour: 6,
          month: 9,
          current_delay: cumulativeDelay,
          previous_station_delay: cumulativeDelay,
          ['previous_section_travel_time']: prevSectionTime ?? fills['previous_section_travel_time'] ?? 7,
          time_since_departure: 0,
          hist_mean_section_time: section.mean,
          hist_median_section_time: section.median,
          hist_section_variance: section.variance,
          ['temperature_c']: fills['temperature_c'] ?? 23,
          ['precipitation_mm']: fills['precipitation_mm'] ?? 0,
          ['humidity_pct']: fills['humidity_pct'] ?? 85,
          ['wind_speed_kmph']: fills['wind_speed_kmph'] ?? 10.1,
          ['visibility_m']: fills['visibility_m'] ?? 0,
        };

        const predictedMinutes = scoreFeatures(model, features);
        const scheduledMinutes = section.scheduled_mean;
        const predictedDelay = cumulativeDelay + (predictedMinutes - scheduledMinutes);

        if (delays[toStation]) {
          delays[toStation] = {
            ...delays[toStation]!,
            predicted: predictedDelay,
            scheduled: 0, // Scheduled arrival is on time at departure
          };
        }

        cumulativeDelay = predictedDelay;
        prevSectionTime = predictedMinutes;
      }
    }

    return corridorStations.map((station) => ({
      station,
      delays: delays[station.code] ?? { actual: null, predicted: null, scheduled: null },
      section: corridorSections.find((s) => s.to === station.code),
    }));
  }, [journey, corridorStations, corridorSections]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            Full route: SBC → MYS — all stations with delays
          </CardTitle>
          <Badge variant="outline" className="ml-auto border-muted text-muted-foreground">
            Complete corridor view
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          The complete Bengaluru → Mysuru corridor shows every station and the delay at each point.
          Green = early/on-time, Red = delayed. Model prediction shows what the LightGBM model expects
          for a fresh journey from SBC.
        </p>

        {/* Full route delay chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={routeWithDelays.filter((r) => r.section).map((r) => ({
                station: r.station.code,
                station_name: r.station.name,
                actualDelay: r.delays.actual ?? 0,
                predictedDelay: r.delays.predicted ?? 0,
                hasActual: r.delays.actual !== null,
              }))}
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
                formatter={(value: number, name: string) => [
                  `${value > 0 ? "+" : ""}${value.toFixed(1)} min`,
                  name === "actualDelay" ? "Actual delay" : "Predicted delay",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="actualDelay"
                fill="var(--chart-1)"
                name="Actual delay"
                fillOpacity={0.8}
              />
              <Bar
                dataKey="predictedDelay"
                fill="var(--chart-2)"
                name="Predicted delay (model)"
                fillOpacity={0.5}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Full route table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Station</th>
                <th className="px-4 py-2 text-right">Seq</th>
                <th className="px-4 py-2 text-right">Distance (km)</th>
                <th className="px-4 py-2 text-right">Actual delay</th>
                <th className="px-4 py-2 text-right">Predicted delay</th>
                <th className="px-4 py-2 text-right">Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {routeWithDelays.map((r) => {
                const delays = r.delays;
                const isDelayed = delays.actual !== null && delays.actual > 0;
                const isPredictedDelayed = delays.predicted !== null && delays.predicted > 0;
                return (
                  <tr key={r.station.code} className="border-t border-border">
                    <td className="px-4 py-2">
                      <span className="font-[family-name:var(--font-mono)]">
                        {r.station.code}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {r.station.name}
                      </span>
                      {r.station.code === "SBC" && (
                        <span className="ml-2 text-[10px] text-primary">Origin</span>
                      )}
                      {r.station.code === "MYS" && (
                        <span className="ml-2 text-[10px] text-primary">Terminus</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-muted-foreground">
                      {r.section?.station_sequence ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-muted-foreground">
                      {r.section?.distance_km ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)]">
                      {delays.actual !== null ? (
                        <span className={isDelayed ? "text-red-500" : "text-green-500"}>
                          {delays.actual > 0 ? "+" : ""}{delays.actual.toFixed(1)} min
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)]">
                      {delays.predicted !== null ? (
                        <span className={isPredictedDelayed ? "text-amber-500" : "text-green-500"}>
                          {delays.predicted > 0 ? "+" : ""}{delays.predicted.toFixed(1)} min
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-muted-foreground">
                      {delays.scheduled !== null ? delays.scheduled.toFixed(1) : "—"} min
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary stats */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={Clock}
            label="Final actual delay"
            value={
              (() => {
                const mys = routeWithDelays.find((r) => r.station.code === "MYS");
                return mys && mys.delays.actual !== null
                  ? `${mys.delays.actual.toFixed(1)} min`
                  : "—";
              })()
            }
            hint="Delay at MYS (actual arrival)"
          />
          <StatCard
            icon={Gauge}
            label="Final predicted delay"
            value={
              (() => {
                const mys = routeWithDelays.find((r) => r.station.code === "MYS");
                return mys && mys.delays.predicted !== null
                  ? `${mys.delays.predicted.toFixed(1)} min`
                  : "—";
              })()
            }
            hint="Model prediction from SBC"
          />
          <StatCard
            icon={TrendingUp}
            label="Delay accumulation"
            value={
              (() => {
                const finalActual = routeWithDelays.find((r) => r.station.code === "MYS")?.delays.actual ?? 0;
                const startActual = routeWithDelays.find((r) => r.station.code === "SBC")?.delays.actual ?? 0;
                const diff = finalActual - startActual;
                return `${diff > 0 ? "+" : ""}${diff.toFixed(1)} min`;
              })()
            }
            hint="Delay gained/lost along route"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [journeyId, setJourneyId] = useState(journeys[0]?.journey_id ?? "");
  const journey = journeys.find((j) => j.journey_id === journeyId) ?? journeys[0];
  const maxIndex = journey ? journey.hops.length : 0;
  const [position, setPosition] = useState(1);
  const atIndex = Math.min(position, maxIndex);

  const result = useMemo(
    () => (journey ? forecastJourney(journey, atIndex) : null),
    [journey, atIndex]
  );

  if (!pipelineReady || !journey || !result) return <PipelineNotice />;

  const testMae = (evaluation["lightgbm"] as { mae?: number } | undefined)?.mae;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge
            variant="outline"
            className="mb-2 border-accent text-accent-foreground"
          >
            HISTORICAL JOURNEY REPLAY — REAL DATA
          </Badge>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground">
            Bengaluru → Mysuru dynamic ETA
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pick a real journey and move the train along the corridor. From
            that point the LightGBM model predicts every remaining section using
            only information available at that moment; the recorded actuals are
            shown alongside for comparison.
          </p>
        </div>
      </div>

      {/* Journey and Scenario selectors */}
      <div className="grid gap-4 lg:grid-cols-2">
        <JourneySelector
          selectedJourneyId={journeyId}
          onSelect={setJourneyId}
        />
        <ScenarioSelector
          selectedJourneyId={journeyId}
          onSelect={setJourneyId}
        />
      </div>

      {/* Full route view - complete SBC→MYS corridor */}
      <FullRouteView journey={journey} />

      {/* Replay visualization */}
      <ReplayMode journey={journey} atIndex={atIndex} result={result} />

      {/* Section slider */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Train position — section {atIndex} of {maxIndex}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={[atIndex]}
            min={1}
            max={maxIndex}
            step={1}
            onValueChange={(v) => setPosition(v[0] ?? 1)}
          />
          <ol className="flex flex-wrap gap-1 text-xs">
            {journey.hops.map((hop, i) => (
              <li
                key={hop.section_id}
                className={`rounded-sm border px-2 py-1 font-[family-name:var(--font-mono)] ${
                  i < atIndex
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
                title={hop.to_name}
              >
                {hop.to}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Forecast table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Predicted arrivals ahead
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Station</th>
                <th className="px-4 py-2 text-right">Scheduled</th>
                <th className="px-4 py-2 text-right">Predicted</th>
                <th className="px-4 py-2 text-right">Actual</th>
                <th className="px-4 py-2 text-right">Predicted delay</th>
                <th className="px-4 py-2 text-right">Error</th>
              </tr>
            </thead>
            <tbody>
              {result.forecast.map((stop) => (
                <tr key={stop.hop.section_id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <span className="font-[family-name:var(--font-mono)]">
                      {stop.hop.to}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {stop.hop.to_name}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)]">
                    {formatClock(stop.scheduledArrival.toISOString())}
                  </td>
                  <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-foreground">
                    {formatClock(stop.predictedArrival.toISOString())}
                  </td>
                  <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-muted-foreground">
                    {formatClock(stop.actualArrival.toISOString())}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatMinutes(stop.predictedDelay)}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {stop.absError.toFixed(1)} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Section travel time chart */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Section travel time — predicted vs scheduled vs actual
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={[...result.observed, ...result.forecast].map((stop) => ({
                  station: stop.hop.to,
                  predicted: Number(stop.predictedMinutes.toFixed(1)),
                  scheduled: stop.scheduledMinutes,
                  actual: stop.actualMinutes,
                }))}
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
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  name="Actual"
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                  name="Predicted"
                />
                <Line
                  type="monotone"
                  dataKey="scheduled"
                  stroke="var(--chart-3)"
                  strokeDasharray="4 3"
                  dot={false}
                  name="Scheduled"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Delay at each remaining station (minutes)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={result.forecast.map((stop) => ({
                  station: stop.hop.to,
                  predictedDelay: Number(stop.predictedDelay.toFixed(1)),
                  actualDelay: Number(stop.actualDelay.toFixed(1)),
                }))}
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
                <Bar
                  dataKey="predictedDelay"
                  fill="var(--chart-2)"
                  name="Predicted delay"
                />
                <Bar
                  dataKey="actualDelay"
                  fill="var(--chart-1)"
                  name="Actual delay"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Metrics */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Gauge}
          label="This forecast — model MAE"
          value={result.mae !== null ? `${result.mae.toFixed(1)} min` : "—"}
          hint="mean absolute error per section, this journey"
        />
        <StatCard
          icon={Gauge}
          label="This forecast — timetable baseline"
          value={
            result.baselineMae !== null
              ? `${result.baselineMae.toFixed(1)} min`
              : "—"
          }
          hint="scheduled section time as the prediction"
        />
        <StatCard
          icon={Gauge}
          label="Held-out test MAE"
          value={typeof testMae === "number" ? `${testMae.toFixed(2)} min` : "—"}
          hint="measured on the chronological test split"
        />
      </div>

      {/* Provenance */}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Provenance: this journey was recorded by{" "}
        {journey.source_url ? "the RailRadar API" : "the data source"}{" "}
        on {journey.date}.{" "}
        <a
          className="underline underline-offset-2"
          href={journey.source_url}
          target="_blank"
          rel="noreferrer"
        >
          Source record
        </a>
        . The remaining-section predictions you see here are produced by a
        LightGBM model trained on real historical running data for this
        corridor. No live feed is used: Indian Railways does not publish a free
        open live-position API, so the dashboard replays genuine completed
        journeys rather than simulating live movement. Today&apos;s scheduled
        timetable is from eRail. The corridor covers {dataset.stations.length}{" "}
        stations between KSR Bengaluru and Mysuru Jn.
      </p>
    </div>
  );
}
