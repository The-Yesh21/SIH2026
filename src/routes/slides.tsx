import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  ArrowLeft,
  ArrowRight,
  Database,
  Gauge,
  LineChart as LineChartIcon,
  Target,
  TrainFront,
  Workflow,
} from "lucide-react";

import { PipelineNotice } from "@/components/raileta/PipelineNotice";
import { Badge } from "@/components/ui/badge";
import {
  dataset,
  evaluation,
  formatClock,
  formatMinutes,
  journeys,
  pipelineReady,
} from "@/lib/raileta/data";
import { forecastJourney } from "@/lib/raileta/predict";

export const Route = createFileRoute("/slides")({
  head: () => ({
    meta: [
      { title: "RailRakshak — presentation slides" },
      {
        name: "description",
        content:
          "RailRakshak slide deck: real Bengaluru–Mysuru running data, LightGBM ETA prediction and measured accuracy.",
      },
      { property: "og:title", content: "RailRakshak — Bengaluru → Mysuru ETA prediction" },
      {
        property: "og:description",
        content:
          "A presentation of the data, the model and the measured accuracy behind RailRakshak's dynamic ETA predictions.",
      },
    ],
  }),
  component: SlidesPage,
});

const ACCENT = "#f59e0b"; // signal amber
const EMERALD = "#34d399";
const SLATE = "#94a3b8";

function MetricCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string | undefined;
  tone?: "default" | "good" | "warn";
}) {
  const color =
    tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : "text-slate-100";
  return (
    <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className={`mt-1 font-[family-name:var(--font-display)] text-3xl font-bold ${color}`}>
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

function SlideShell({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-8 py-10 sm:px-12">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.24em] text-amber-400">{kicker}</div>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          {title}
        </h2>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

type SlideDef = {
  id: string;
  label: string;
  node: React.ReactNode;
};

function SlidesPage() {
  const [index, setIndex] = useState(0);

  const slides = useMemo<SlideDef[]>(() => {
    if (!pipelineReady) return [];

    const summary = dataset.summary as Record<string, string | number | string[]>;
    const trains = dataset.trains;
    const sections = dataset.sections
      .slice()
      .sort((a, b) => a.station_sequence - b.station_sequence);
    const lgbm = (evaluation["lightgbm"] ?? {}) as Record<string, number>;
    const baseline = (evaluation["baseline_scheduled_plus_delay"] ?? {}) as Record<
      string,
      number
    >;
    const improvement = evaluation["improvement_pct_mae"] as number | undefined;
    const importance = (evaluation["feature_importance_gain"] ?? []) as {
      feature: string;
      gain: number;
    }[];
    const parity = evaluation["browser_scorer_parity_max_abs_diff"] as number | undefined;
    const delayErr = (evaluation["mean_absolute_delay_prediction_error"] ?? {}) as Record<
      string,
      number
    >;
    const metadata = (evaluation["model_metadata"] ?? {}) as Record<string, unknown>;
    const trainedOn = String(metadata["training_date"] ?? "").slice(0, 10);

    // Real journey demo: observe hop 0, forecast the rest with the trained model.
    const demoJourney = journeys[0]!;
    const demo = forecastJourney(demoJourney, 1);
    const chartData = [...demo.observed, ...demo.forecast].map((stop) => ({
      station: stop.hop.to,
      predicted: Number(stop.predictedMinutes.toFixed(1)),
      scheduled: stop.scheduledMinutes,
      actual: Number(stop.actualMinutes.toFixed(1)),
    }));

    const compareData = [
      {
        name: "MAE",
        model: Number(lgbm["mae"]?.toFixed(2) ?? 0),
        baseline: Number(baseline["mae"]?.toFixed(2) ?? 0),
      },
      {
        name: "RMSE",
        model: Number(lgbm["rmse"]?.toFixed(2) ?? 0),
        baseline: Number(baseline["rmse"]?.toFixed(2) ?? 0),
      },
      {
        name: "Median abs.",
        model: Number(lgbm["median_abs_error"]?.toFixed(2) ?? 0),
        baseline: Number(baseline["median_abs_error"]?.toFixed(2) ?? 0),
      },
      {
        name: "Delay err.",
        model: Number(delayErr["lightgbm"]?.toFixed(2) ?? 0),
        baseline: Number(delayErr["baseline"]?.toFixed(2) ?? 0),
      },
    ];

    const totalStationRecords = Number(summary["station_records"] ?? 0).toLocaleString("en-IN");
    const totalJourneys = Number(summary["journeys"] ?? 0).toLocaleString("en-IN");
    const cleanSections = Number(summary["clean_sections"] ?? 0).toLocaleString("en-IN");

    return [
      {
        id: "overview",
        label: "Overview",
        node: (
          <SlideShell kicker="01 · Project overview" title="RailRakshak">
            <div className="flex h-full flex-col justify-between gap-10">
              <div>
                <div className="flex items-center gap-3">
                  <Badge className="border-amber-400/40 bg-amber-400/10 text-amber-300">
                    Bengaluru → Mysuru corridor
                  </Badge>
                  <Badge className="border-slate-700 bg-slate-900 text-slate-300">
                    SBC · Kengeri · Ramanagaram · Maddur · Mandya · MYS
                  </Badge>
                </div>
                <p className="mt-8 max-w-3xl text-lg leading-relaxed text-slate-300">
                  <span className="font-[family-name:var(--font-display)] font-semibold text-slate-100">
                    RailRakshak
                  </span>{" "}
                  predicts station-by-station arrival times — and dynamic ETAs — for trains on the
                  Bengaluru–Mysuru line, using a{" "}
                  <span className="text-amber-300">LightGBM model</span> trained on{" "}
                  <span className="text-emerald-300">real, publicly published running data</span>.
                  Every number on screen is either an observed record or a genuine model prediction —
                  nothing is simulated.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard
                  label="Station records"
                  value={totalStationRecords}
                  sub="observed, not generated"
                />
                <MetricCard label="Journeys" value={totalJourneys} sub="Jun 7 → Sep 4, 2026" />
                <MetricCard
                  label="Clean sections"
                  value={cleanSections}
                  sub={`${summary["unique_sections"] ?? 9} corridor sections`}
                />
                <MetricCard
                  label="Test records"
                  value={String(evaluation["test_records"] ?? 117)}
                  sub="chronologically held out"
                />
              </div>
              <p className="text-sm text-slate-500">
                Press <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-slate-300">→</kbd>{" "}
                to advance · <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-slate-300">←</kbd> to go back
              </p>
            </div>
          </SlideShell>
        ),
      },
      {
        id: "data",
        label: "The data",
        node: (
          <SlideShell kicker="02 · Real data" title="The data behind the predictions">
            <div className="grid h-full gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5">
                  <div className="mb-3 flex items-center gap-2 text-slate-300">
                    <Database className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium">Dataset summary</span>
                  </div>
                  <dl className="space-y-2 text-sm">
                    {[
                      ["Station records", totalStationRecords],
                      ["Journeys", totalJourneys],
                      ["Unique trains", String(summary["unique_trains"] ?? "—")],
                      ["Clean section records", cleanSections],
                      ["Unique sections", String(summary["unique_sections"] ?? "—")],
                      [
                        "Date range",
                        Array.isArray(summary["date_range"])
                          ? (summary["date_range"] as string[]).join(" → ")
                          : String(summary["date_range"] ?? "—"),
                      ],
                      [
                        "Missing actual arrivals",
                        `${String(summary["missing_actual_arrival_pct"] ?? 0)}% — gaps dropped, never filled`,
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between gap-4 border-b border-slate-800 pb-1.5 last:border-0"
                      >
                        <dt className="text-slate-400">{label}</dt>
                        <dd className="text-right font-[family-name:var(--font-mono)] text-slate-100">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5 text-sm">
                  <div className="mb-2 font-medium text-slate-300">Cleaning report</div>
                  <p className="text-slate-400">
                    806 raw section records → <span className="text-emerald-300">744 clean</span>.
                    25 dropped for non-positive travel time, 37 for impossible speeds. Removed
                    records stay removed — nothing is regenerated.
                  </p>
                </div>
              </div>
              <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5">
                <div className="mb-3 flex items-center gap-2 text-slate-300">
                  <TrainFront className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium">Trains modelled</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Train</th>
                        <th className="px-3 py-2 text-right">Journeys</th>
                        <th className="px-3 py-2 text-right">Sections</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trains.map((t) => (
                        <tr key={t.train_id} className="border-t border-slate-800">
                          <td className="px-3 py-2">
                            <span className="font-[family-name:var(--font-mono)] text-amber-300">
                              {t.train_id}
                            </span>{" "}
                            <span className="text-slate-300">{t.train_name}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)] text-slate-300">
                            {t.journeys}
                          </td>
                          <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)] text-slate-300">
                            {t.sections}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-xs leading-relaxed text-slate-500">
                  {sections.length} corridor sections from KSR Bengaluru to Mysuru Jn, each with
                  observed mean/median/variance travel times and weather matched by date and time.
                  Sources: RailRadar live running API and eRail timetable — no fabricated rows.
                </div>
              </div>
            </div>
          </SlideShell>
        ),
      },
      {
        id: "prediction",
        label: "The prediction",
        node: (
          <SlideShell kicker="03 · The prediction" title="Forecasting the journey, section by section">
            <div className="grid h-full gap-6 lg:grid-cols-5">
              <div className="flex flex-col gap-4 lg:col-span-2">
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5 text-sm leading-relaxed text-slate-300">
                  <p>
                    The model predicts the travel time of every inter-station{" "}
                    <span className="text-amber-300">section</span>, then chains those predictions
                    into station-by-station ETAs.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-slate-400">
                    <li>
                      <span className="text-slate-200">22 features</span> — current &amp; previous
                      delay, distance, historical section statistics, time-of-day/week, weather
                    </li>
                    <li>
                      <span className="text-slate-200">Chronological split</span> — 481 train / 146
                      validation / 117 test records, by journey date
                    </li>
                    <li>
                      <span className="text-slate-200">Leak-free</span> — a prediction never sees
                      the journey&apos;s own future
                    </li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dataset.feature_config.features.slice(0, 12).map((f) => (
                    <span
                      key={f}
                      className="rounded-sm border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-slate-400"
                    >
                      {f}
                    </span>
                  ))}
                  <span className="rounded-sm border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-amber-300">
                    +{dataset.feature_config.features.length - 12} more
                  </span>
                </div>
              </div>
              <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5 lg:col-span-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    Replay — {demoJourney.train_name}
                  </span>
                  <Badge className="border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
                    real journey · {demoJourney.date}
                  </Badge>
                </div>
                <div className="mb-2 text-xs text-slate-500">
                  Predicted from hop 1 onward using only information known at that moment; recorded
                  actuals shown for comparison.
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="station" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} angle={-30} height={50} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} unit="m" />
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a",
                          border: "1px solid #334155",
                          fontSize: 12,
                          color: "#e2e8f0",
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: "#cbd5e1" }} />
                      <Line type="monotone" dataKey="actual" stroke={EMERALD} strokeWidth={2} dot={false} name="Actual" />
                      <Line type="monotone" dataKey="predicted" stroke={ACCENT} strokeWidth={2} dot={false} name="Predicted" />
                      <Line type="monotone" dataKey="scheduled" stroke={SLATE} strokeDasharray="4 3" dot={false} name="Scheduled" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Scheduled</div>
                    <div className="font-[family-name:var(--font-mono)] text-lg text-slate-300">
                      {demo.scheduledFinalArrival ? formatClock(demo.scheduledFinalArrival.toISOString()) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-amber-400">Predicted ETA</div>
                    <div className="font-[family-name:var(--font-mono)] text-lg text-amber-300">
                      {demo.predictedFinalArrival ? formatClock(demo.predictedFinalArrival.toISOString()) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-400">Actual</div>
                    <div className="font-[family-name:var(--font-mono)] text-lg text-emerald-300">
                      {demo.actualFinalArrival ? formatClock(demo.actualFinalArrival.toISOString()) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SlideShell>
        ),
      },
      {
        id: "accuracy",
        label: "The accuracy",
        node: (
          <SlideShell kicker="04 · The accuracy" title="Measured on a held-out test set">
            <div className="grid h-full gap-6 lg:grid-cols-5">
              <div className="flex flex-col gap-4 lg:col-span-2">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="MAE"
                    value={`${Number(lgbm["mae"]?.toFixed(2) ?? 0)} min`}
                    sub="mean absolute error per section"
                  />
                  <MetricCard
                    label="RMSE"
                    value={`${Number(lgbm["rmse"]?.toFixed(2) ?? 0)} min`}
                    sub="root mean squared error"
                  />
                  <MetricCard
                    label="Median abs. error"
                    value={`${Number(lgbm["median_abs_error"]?.toFixed(2) ?? 0)} min`}
                    sub="robust to outliers"
                  />
                  <MetricCard
                    label="Delay pred. error"
                    value={`${Number(delayErr["lightgbm"]?.toFixed(2) ?? 0)} min`}
                    sub="mean abs. delay error"
                  />
                </div>
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-4 text-sm leading-relaxed">
                  <div className="mb-1 flex items-center gap-2 font-medium text-slate-200">
                    <Gauge className="h-4 w-4 text-amber-400" />
                    Honest headline
                  </div>
                  <p className="text-slate-400">
                    On this 117-record test set the LightGBM model scores{" "}
                    <span className="text-slate-200">{Number(lgbm["mae"]?.toFixed(2) ?? 0)} min MAE</span>{" "}
                    versus the timetable baseline&apos;s{" "}
                    <span className="text-slate-200">{Number(baseline["mae"]?.toFixed(2) ?? 0)} min</span>{" "}
                    — the model does not yet beat the baseline here (
                    {typeof improvement === "number" ? `${improvement.toFixed(1)}%` : "n/a"}). Reported
                    as measured, not tuned away.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4 lg:col-span-3">
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5">
                  <div className="mb-2 text-sm font-medium text-slate-200">
                    Model vs timetable baseline
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={compareData} margin={{ top: 8, right: 8, bottom: 8, left: -18 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} unit="m" />
                        <Tooltip
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid #334155",
                            fontSize: 12,
                            color: "#e2e8f0",
                          }}
                          labelStyle={{ color: "#94a3b8" }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, color: "#cbd5e1" }} />
                        <Bar dataKey="model" fill={ACCENT} name="LightGBM" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="baseline" fill="#475569" name="Baseline (sched + delay)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5">
                  <div className="mb-2 text-sm font-medium text-slate-200">
                    What drives the prediction — top features by gain
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={importance.slice(0, 6)}
                        margin={{ left: 12, right: 12, top: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis
                          type="category"
                          dataKey="feature"
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          width={150}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid #334155",
                            fontSize: 12,
                            color: "#e2e8f0",
                          }}
                          labelStyle={{ color: "#94a3b8" }}
                        />
                        <Bar dataKey="gain" fill={ACCENT} radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </SlideShell>
        ),
      },
      {
        id: "pipeline",
        label: "The pipeline",
        node: (
          <SlideShell kicker="05 · The pipeline" title="From raw API feed to in-browser prediction">
            <div className="grid h-full gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5">
                  <div className="mb-4 flex items-center gap-2 text-slate-200">
                    <Workflow className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium">End-to-end, reproducible</span>
                  </div>
                  <ol className="space-y-2 text-sm">
                    {[
                      ["Scrape", "RailRadar live running API + eRail timetable"],
                      ["Clean", "drop duplicates, impossible times, broken records"],
                      ["Features", "section stats, delays, weather matched by date/time"],
                      ["Train", "LightGBM regression on section travel time"],
                      ["Export", "trees + metrics as static JSON — no database needed"],
                      ["Score", "browser walks the exact exported trees"],
                    ].map(([step, desc], i) => (
                      <li key={step} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-amber-400/40 bg-amber-400/10 font-[family-name:var(--font-mono)] text-[10px] text-amber-300">
                          {i + 1}
                        </span>
                        <div>
                          <span className="font-medium text-slate-200">{step}</span>{" "}
                          <span className="text-slate-400">{desc}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5 text-sm leading-relaxed">
                  <div className="mb-2 flex items-center gap-2 font-medium text-slate-200">
                    <Target className="h-4 w-4 text-emerald-400" />
                    Parity you can verify
                  </div>
                  <p className="text-slate-400">
                    The in-browser scorer runs the same trees the Python model produced.{" "}
                    {typeof parity === "number" ? (
                      <>
                        The exported scorer matches the Python booster to within{" "}
                        <span className="font-[family-name:var(--font-mono)] text-emerald-300">
                          {parity.toExponential(2)} min
                        </span>{" "}
                        on the test set.
                      </>
                    ) : null}
                  </p>
                  <p className="mt-3 text-slate-400">
                    Model: <span className="text-slate-200">LightGBM regression</span>, trained{" "}
                    <span className="font-[family-name:var(--font-mono)] text-slate-200">
                      {trainedOn}
                    </span>
                    , target = section travel time (minutes). Dataset version and training date are
                    committed with the artifacts.
                  </p>
                </div>
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5 text-xs leading-relaxed text-slate-500">
                  RailRakshak is an independent research project, not affiliated with Indian
                  Railways. Metrics come from a small, chronologically held-out test set and are
                  indicative rather than production-grade. Predictions are statistical estimates and
                  must not be used for operational or safety decisions.
                </div>
              </div>
            </div>
          </SlideShell>
        ),
      },
    ];
  }, []);

  const total = slides.length;
  const go = useCallback(
    (dir: number) => {
      setIndex((i) => Math.min(Math.max(i + dir, 0), total - 1));
    },
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") {
        setIndex(0);
      } else if (e.key === "End") {
        setIndex(total - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total]);

  if (!pipelineReady || slides.length === 0) return <PipelineNotice />;

  const current = slides[index]!;

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col bg-slate-950 text-slate-100">
      {/* progress bar */}
      <div className="h-0.5 w-full bg-slate-800">
        <div
          className="h-full bg-amber-400 transition-all duration-300"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <div key={current.id} className="min-h-0 flex-1 animate-in fade-in duration-300">
        {current.node}
      </div>

      {/* nav bar */}
      <div className="flex items-center justify-between gap-4 border-t border-slate-800 px-6 py-3 sm:px-12">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <LineChartIcon className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">RailRakshak · presentation</span>
        </div>
        <div className="flex items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}: ${s.label}`}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-amber-400" : "w-2 bg-slate-700 hover:bg-slate-600"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-mono)] text-xs text-slate-500">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => go(-1)}
              disabled={index === 0}
              aria-label="Previous slide"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => go(1)}
              disabled={index === total - 1}
              aria-label="Next slide"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}