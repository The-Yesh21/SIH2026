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
import { Activity, Clock, Gauge, Target, TrainFront } from "lucide-react";

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
} from "@/lib/raileta/data";
import { forecastJourney, type JourneyForecast } from "@/lib/raileta/predict";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      {
        title: "RailRakshak Demo — Talaguppa Express: predicted vs actual delay",
      },
      {
        name: "description",
        content:
          "Station-by-station demo of the LightGBM ETA model on the Talaguppa Express: the delay gap actually recorded at each stop, next to what the model predicted.",
      },
    ],
  }),
  component: DemoPage,
});

/** The train we captured: 16228 Talaguppa - Mysuru Express. */
const DEMO_TRAIN_ID = "16228";

type DemoRow = {
  sectionId: string;
  station: string;
  stationName: string;
  scheduled: Date;
  predicted: Date;
  actual: Date;
  gapMinutes: number;
  predictedDelay: number;
  absDelayError: number;
  status: "done" | "ahead";
};

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

function DemoPage() {
  // All captured journeys for the demo train, newest first.
  const demoJourneys = useMemo(
    () =>
      journeys
        .filter((j) => j.train_id === DEMO_TRAIN_ID)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [],
  );

  const [journeyId, setJourneyId] = useState(
    demoJourneys[0]?.journey_id ?? "",
  );

  const journey = useMemo(
    () =>
      demoJourneys.find((j) => j.journey_id === journeyId) ?? demoJourneys[0],
    [demoJourneys, journeyId],
  );

  const maxIndex = journey ? journey.hops.length : 0;
  const [position, setPosition] = useState(1);
  const atIndex = Math.min(position, maxIndex);

  const result: JourneyForecast | null = useMemo(
    () => (journey ? forecastJourney(journey, atIndex) : null),
    [journey, atIndex],
  );

  if (!pipelineReady || !journey || !result) return <PipelineNotice />;

  // Rows for table/charts: hops already run (model score from recorded
  // features) plus stations ahead (causal forecast from the replay point).
  const rows: DemoRow[] = [
    ...result.observed.map<DemoRow>((stop) => ({
      sectionId: stop.hop.section_id,
      station: stop.hop.to,
      stationName: stop.hop.to_name,
      scheduled: stop.scheduledArrival,
      predicted: stop.predictedArrival,
      actual: stop.actualArrival,
      gapMinutes: stop.actualDelay,
      predictedDelay: stop.predictedDelay,
      absDelayError: Math.abs(stop.predictedDelay - stop.actualDelay),
      status: "done",
    })),
    ...result.forecast.map<DemoRow>((stop) => ({
      sectionId: stop.hop.section_id,
      station: stop.hop.to,
      stationName: stop.hop.to_name,
      scheduled: stop.scheduledArrival,
      predicted: stop.predictedArrival,
      actual: stop.actualArrival,
      gapMinutes: stop.actualDelay,
      predictedDelay: stop.predictedDelay,
      absDelayError: Math.abs(stop.predictedDelay - stop.actualDelay),
      status: "ahead",
    })),
  ];

  // Accuracy stats are computed over the stations AHEAD of the train —
  // the model's forward-looking predictions, comparable against what was
  // later recorded on this real run.
  const ahead = rows.filter((r) => r.status === "ahead");
  const modelDelayMae =
    ahead.length > 0
      ? ahead.reduce((sum, r) => sum + r.absDelayError, 0) / ahead.length
      : null;
  const avgPredictedDelay =
    ahead.length > 0
      ? ahead.reduce((sum, r) => sum + r.predictedDelay, 0) / ahead.length
      : null;
  const avgActualGap =
    ahead.length > 0
      ? ahead.reduce((sum, r) => sum + r.gapMinutes, 0) / ahead.length
      : null;

  const testMae = (evaluation["lightgbm"] as { mae?: number } | undefined)?.mae;

  const chartData = rows.map((r) => ({
    station: r.station,
    "Actual gap (min)": Number(r.gapMinutes.toFixed(1)),
    "Model predicted (min)": Number(r.predictedDelay.toFixed(1)),
  }));

  const arrivalChartData = rows.map((r) => ({
    station: r.station,
    scheduled: r.scheduled.getTime(),
    predicted: r.predicted.getTime(),
    actual: r.actual.getTime(),
  }));

  const firstHop = journey.hops[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge
            variant="outline"
            className="mb-2 border-accent text-accent-foreground"
          >
            LIVE DEMO — REAL CAPTURED JOURNEYS
          </Badge>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground">
            {journey.train_name} ({journey.train_id})
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Station-by-station delay demo on the Bengaluru → Mysuru corridor.
            For every stop we show the delay gap the train actually recorded
            (actual arrival vs timetable) next to the delay our LightGBM model
            predicted from the timetable, running history and weather. Move the
            train along the run and watch the predictions absorb each newly
            observed delay.
          </p>
        </div>
      </div>

      {/* Journey picker */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <TrainFront className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Pick a captured run of this train
            </CardTitle>
            <Badge
              variant="outline"
              className="ml-auto border-muted text-muted-foreground"
            >
              {demoJourneys.length} recorded journeys
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <Select value={journey?.journey_id ?? ""} onValueChange={setJourneyId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {demoJourneys.map((j) => (
                <SelectItem key={j.journey_id} value={j.journey_id}>
                  {j.date} — {j.hops.length} stations
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {firstHop
              ? `${firstHop.from_name} → ${journey.hops[journey.hops.length - 1]?.to_name}`
              : ""}
          </span>
          <a
            className="ml-auto inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
            href={journey.source_url}
            target="_blank"
            rel="noreferrer"
          >
            Source record
          </a>
        </CardContent>
      </Card>

      {/* Train position */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Train position — departing station {atIndex} of {maxIndex}
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
          <p className="text-xs text-muted-foreground">
            The model forecasts every remaining station using only what was
            knowable at this point: the delays recorded up to here, the
            timetable, historical section times and the day&apos;s weather.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Recorded delay gap"
          value={avgActualGap !== null ? formatMinutes(avgActualGap) : "—"}
          hint="avg actual lateness at the stations ahead (recorded later)"
        />
        <StatCard
          icon={Target}
          label="Model's predicted delay"
          value={
            avgPredictedDelay !== null
              ? formatMinutes(avgPredictedDelay)
              : "—"
          }
          hint="avg prediction at the stations ahead"
        />
        <StatCard
          icon={Gauge}
          label="Prediction error"
          value={modelDelayMae !== null ? `${modelDelayMae.toFixed(1)} min` : "—"}
          hint="mean |predicted − actual| delay, stations ahead"
        />
        <StatCard
          icon={Clock}
          label="Held-out test MAE"
          value={typeof testMae === "number" ? `${testMae.toFixed(2)} min` : "—"}
          hint="measured on the chronological test split"
        />
      </div>

      {/* Delay gap chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Delay gap at each station — what happened vs what the model predicted
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
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
                dataKey="Actual gap (min)"
                fill="var(--chart-1)"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="Model predicted (min)"
                fill="var(--chart-2)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Arrival times chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Arrival time at each station — timetable vs model vs what actually happened
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={arrivalChartData}
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
                labelFormatter={(label: string) => `Station ${label}`}
                formatter={(value: number, name: string) => [
                  formatClock(new Date(value).toISOString()),
                  name,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="scheduled"
                stroke="var(--chart-3)"
                strokeDasharray="4 3"
                dot={false}
                name="Scheduled"
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Model predicted"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Actual"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Station table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Station-by-station detail
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Station</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Scheduled</th>
                <th className="px-4 py-2 text-right">Predicted</th>
                <th className="px-4 py-2 text-right">Actual</th>
                <th className="px-4 py-2 text-right">Actual gap</th>
                <th className="px-4 py-2 text-right">Predicted delay</th>
                <th className="px-4 py-2 text-right">Prediction error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sectionId} className="border-t border-border">
                  <td className="px-4 py-2">
                    <span className="font-[family-name:var(--font-mono)]">
                      {r.station}
                    </span>{" "}
                    <span className="text-muted-foreground">{r.stationName}</span>
                  </td>
                  <td className="px-4 py-2">
                    <Badge
                      variant="outline"
                      className={
                        r.status === "done"
                          ? "border-muted text-muted-foreground"
                          : "border-primary/40 bg-primary/10 text-foreground"
                      }
                    >
                      {r.status === "done" ? "ran" : "ahead"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-muted-foreground">
                    {formatClock(r.scheduled.toISOString())}
                  </td>
                  <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)] text-foreground">
                    {formatClock(r.predicted.toISOString())}
                  </td>
                  <td className="px-4 py-2 text-right font-[family-name:var(--font-mono)]">
                    {formatClock(r.actual.toISOString())}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatMinutes(r.gapMinutes)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatMinutes(r.predictedDelay)}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {r.absDelayError.toFixed(1)} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Provenance */}
      <p className="text-xs leading-relaxed text-muted-foreground">
        All numbers come from real captured journeys of train {journey.train_id}{" "}
        ({journey.train_name}) recorded via RailRadar on {journey.date}. The
        model&apos;s predictions use only information available at each station
        departure — no future data leaks into the forecast. The corridor data
        covers {dataset.stations.length} stations between KSR Bengaluru and
        Mysuru Jn. This demo replays completed runs; Indian Railways publishes
        no free live-position API.
      </p>
    </div>
  );
}
