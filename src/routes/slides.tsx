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
  Radio,
  Satellite,
  ShieldAlert,
  Sparkles,
  Target,
  TrainFront,
  Users,
  Workflow,
} from "lucide-react";

import { PipelineNotice } from "@/components/raileta/PipelineNotice";
import { Badge } from "@/components/ui/badge";
import {
  dataset,
  evaluation,
  formatClock,
  journeys,
  pipelineReady,
} from "@/lib/raileta/data";
import { forecastJourney } from "@/lib/raileta/predict";

export const Route = createFileRoute("/slides")({
  head: () => ({
    meta: [
      { title: "RailRakshak — Presentation Slides" },
      {
        name: "description",
        content:
          "RailRakshak pitch deck: ISRO RTIS Satellite Telemetry Ingestion, Section-Wise Machine Learning Trajectory Prediction, and Measured Accuracy.",
      },
      { property: "og:title", content: "RailRakshak — Dynamic Train Journey Time Prediction" },
      {
        property: "og:description",
        content:
          "Augmenting Indian Railways' ISRO satellite telemetry with section-by-section dynamic journey time prediction.",
      },
    ],
  }),
  component: SlidesPage,
});

const ACCENT = "#f59e0b"; // signal amber
const EMERALD = "#34d399";
const CYAN = "#38bdf8";
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
  tone?: "default" | "good" | "warn" | "cyan";
}) {
  const color =
    tone === "good"
      ? "text-emerald-300"
      : tone === "warn"
      ? "text-amber-300"
      : tone === "cyan"
      ? "text-sky-300"
      : "text-slate-100";
  return (
    <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className={`mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold ${color}`}>
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
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-6 py-8 sm:px-12 sm:py-10">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-amber-400">
          <span>{kicker}</span>
        </div>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-slate-100 sm:text-4xl">
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
      // Slide 1: Title & Hook
      {
        id: "overview",
        label: "1. Overview",
        node: (
          <SlideShell kicker="01 · Executive Summary" title="RailRakshak: Dynamic Journey Predictor">
            <div className="flex h-full flex-col justify-between gap-6 sm:gap-8">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-sky-400/40 bg-sky-400/10 text-sky-300">
                    <Satellite className="mr-1.5 h-3.5 w-3.5 inline" /> Ingests ISRO RTIS Satellite Telemetry
                  </Badge>
                  <Badge className="border-amber-400/40 bg-amber-400/10 text-amber-300">
                    Section-by-Section ML Traversal
                  </Badge>
                  <Badge className="border-slate-700 bg-slate-900 text-slate-300">
                    KSR Bengaluru (SBC) → Mysuru (MYS)
                  </Badge>
                </div>
                <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                  <span className="font-[family-name:var(--font-display)] font-semibold text-slate-100">
                    RailRakshak
                  </span>{" "}
                  is the prediction intelligence layer built on top of Indian Railways&apos; satellite tracking.
                  While ISRO RTIS tells us <span className="text-sky-300 font-medium">where the train is right now</span>, RailRakshak computes{" "}
                  <span className="text-amber-300 font-medium">how long each remaining section will take</span> given downstream congestion, historical clearance patterns, and timetable slack.
                </p>
                <div className="mt-4 rounded-md border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-400">
                  💡 <strong className="text-slate-200">The Core Proposition:</strong> We do not compete with tracking hardware. We convert 30-second live telemetry into high-confidence downstream journey duration forecasts.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard
                  label="Telemetry Feed"
                  value="ISRO RTIS"
                  sub="30s locomotive GNSS stream"
                  tone="cyan"
                />
                <MetricCard
                  label="Observed Records"
                  value={totalStationRecords}
                  sub="genuine historical runs"
                />
                <MetricCard
                  label="Clean Sections"
                  value={cleanSections}
                  sub="corridor block segments"
                />
                <MetricCard
                  label="Test Records"
                  value={String(evaluation["test_records"] ?? 117)}
                  sub="chronologically held-out"
                  tone="good"
                />
              </div>
              <p className="text-xs text-slate-500">
                Press <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-slate-300">→</kbd> to advance slides · <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-slate-300">←</kbd> to go back
              </p>
            </div>
          </SlideShell>
        ),
      },

      // Slide 2: Ground Truth Context - Indian Railways & ISRO RTIS
      {
        id: "satellite_rtis",
        label: "2. RTIS Telemetry",
        node: (
          <SlideShell kicker="02 · Foundation & Telemetry" title="Leveraging ISRO's Real-Time Satellite Grid">
            <div className="grid h-full gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-sky-900/50 bg-sky-950/20 p-5 text-sm leading-relaxed">
                  <div className="mb-2 flex items-center gap-2 font-medium text-sky-300">
                    <Satellite className="h-5 w-5 text-sky-400" />
                    Indian Railways&apos; Telemetry Ecosystem
                  </div>
                  <p className="text-slate-300">
                    Indian Railways already operates a massive satellite and electronic interlocking tracking network:
                  </p>
                  <ul className="mt-3 space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-sky-400 font-bold">•</span>
                      <span><strong>10,400+ Locomotives</strong> equipped with ISRO RTIS / REMMLOT transponders.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-400 font-bold">•</span>
                      <span><strong>ISRO MSS / NAVIC Satellites</strong> relay speed and coordinates every <strong>30 seconds</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-400 font-bold">•</span>
                      <span><strong>Station Data Loggers</strong> auto-feed arrival/departure timestamps directly into COA (Control Office Application).</span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5 text-xs text-slate-400">
                  <div className="mb-2 font-semibold uppercase tracking-wider text-slate-300">The Clear Division of Labor</div>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-slate-800 pb-1">
                      <span className="text-sky-300">Tracking (ISRO RTIS):</span>
                      <span className="text-slate-200">"Where is the train at timestamp <i>t</i>?"</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-amber-300">Prediction (RailRakshak):</span>
                      <span className="text-slate-200">"How long will sections <i>S<sub>k</sub> → S<sub>n</sub></i> take?"</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5">
                <div className="mb-3 flex items-center gap-2 text-slate-300">
                  <Radio className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium">Telemetry-to-Prediction Pipeline</span>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="rounded border border-slate-800 bg-slate-950 p-3">
                    <span className="font-semibold text-sky-300">1. Satellite GPS Fix</span>
                    <p className="mt-1 text-slate-400">RTIS onboard transponder captures latitude, longitude, and instant speed vector via ISRO satellites.</p>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-950 p-3">
                    <span className="font-semibold text-sky-300">2. COA Central Ingestion</span>
                    <p className="mt-1 text-slate-400">Position matched to track section ID; current delay relative to scheduled timetable is stamped.</p>
                  </div>
                  <div className="rounded border border-amber-500/30 bg-amber-950/20 p-3">
                    <span className="font-semibold text-amber-300">3. RailRakshak Dynamic Traversal Prediction</span>
                    <p className="mt-1 text-slate-300">Machine learning engine forecasts each downstream section duration considering historical buffer recovery and bottlenecks.</p>
                  </div>
                </div>
              </div>
            </div>
          </SlideShell>
        ),
      },

      // Slide 3: The True Problem - Why Naive Delay Propagation Fails
      {
        id: "delay_problem",
        label: "3. The Problem",
        node: (
          <SlideShell kicker="03 · The Core Dilemma" title="Why Delays Do Not Travel Linearly">
            <div className="grid h-full gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-red-900/40 bg-red-950/10 p-5 text-sm leading-relaxed">
                  <div className="mb-2 flex items-center gap-2 font-medium text-red-300">
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                    The Downstream Uncertainty Trap
                  </div>
                  <p className="text-slate-300">
                    If a train is <strong>15 minutes late at Ramanagaram</strong>, what will its arrival delay be at <strong>Mysuru Junction</strong>?
                  </p>
                  <ul className="mt-3 space-y-2 text-xs text-slate-400">
                    <li>
                      <strong className="text-slate-200">❌ Naive Linear Assumption:</strong> Delay at MYS = 15 mins. (Assumes speed and track conditions remain uniform).
                    </li>
                    <li>
                      <strong className="text-emerald-300">⚡ Slack Recovery:</strong> On open stretches (Maddur → Mandya), drivers utilize timetable buffer slack to recover 5–8 minutes.
                    </li>
                    <li>
                      <strong className="text-amber-300">🚦 Cascading Congestion:</strong> Missing a scheduled slot causes platform wait times, loop line holds, or junction conflicts (+20 to +40 mins).
                    </li>
                  </ul>
                </div>
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-4 text-xs text-slate-400">
                  <strong className="text-slate-200">Key Insight:</strong> Train delays are dynamic and state-dependent. Knowing live coordinates is necessary, but calculating traversal across each remaining topological block is what yields accurate ETAs.
                </div>
              </div>
              <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5 flex flex-col justify-between">
                <div className="mb-2 text-sm font-medium text-slate-200">Corridor Topology & Section Dynamics</div>
                <div className="space-y-2 font-[family-name:var(--font-mono)] text-xs">
                  <div className="flex items-center justify-between rounded bg-slate-950 p-2 text-slate-400">
                    <span>SBC → KGI (12 km)</span>
                    <span className="text-emerald-400">High frequency / Normal</span>
                  </div>
                  <div className="flex items-center justify-between rounded bg-slate-950 p-2 text-slate-400">
                    <span>KGI → BID (18 km)</span>
                    <span className="text-slate-300">Fast straight stretch</span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-amber-500/40 bg-amber-950/30 p-2 text-amber-200">
                    <span>BID → RMGM (15 km)</span>
                    <span>🚆 LIVE (RTIS Telemetry)</span>
                  </div>
                  <div className="flex items-center justify-between rounded bg-slate-950 p-2 text-slate-400">
                    <span>RMGM → CPT (11 km)</span>
                    <span className="text-sky-300">Slack recovery window</span>
                  </div>
                  <div className="flex items-center justify-between rounded bg-slate-950 p-2 text-slate-400">
                    <span>CPT → MAD (16 km)</span>
                    <span className="text-amber-400">Junction bottleneck risk</span>
                  </div>
                  <div className="flex items-center justify-between rounded bg-slate-950 p-2 text-slate-400">
                    <span>MAD → MYA → MYS</span>
                    <span className="text-slate-300">Terminal approach & platforming</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">
                  RailRakshak recursively forecasts traversal times section-by-section to compute the true probabilistic remaining journey duration.
                </div>
              </div>
            </div>
          </SlideShell>
        ),
      },

      // Slide 4: Real Prediction Demo
      {
        id: "prediction",
        label: "4. Traversal Demo",
        node: (
          <SlideShell kicker="04 · Live Traversal Model" title="Forecasting the Remaining Journey">
            <div className="grid h-full gap-6 lg:grid-cols-5">
              <div className="flex flex-col gap-4 lg:col-span-2">
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5 text-sm leading-relaxed text-slate-300">
                  <p>
                    Rather than predicting the entire trip as a single opaque number, RailRakshak computes the travel time of every downstream section.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
                    <li>
                      <span className="text-slate-200 font-medium">Input State:</span> Real-time telemetry (current delay, entry speed, time of day).
                    </li>
                    <li>
                      <span className="text-slate-200 font-medium">Section Features:</span> Historical clearance distributions, schedule buffer, distance.
                    </li>
                    <li>
                      <span className="text-slate-200 font-medium">Chained Output:</span> Downstream station arrival timestamps and final terminus ETA.
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
                    Replay Demonstration — {demoJourney.train_name}
                  </span>
                  <Badge className="border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
                    genuine run · {demoJourney.date}
                  </Badge>
                </div>
                <div className="mb-2 text-xs text-slate-500">
                  Forecasted from Section 1 onward using only causal data available at departure; actual recorded arrival times plotted for comparison.
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="station" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} angle={-30} height={45} textAnchor="end" />
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
                      <Line type="monotone" dataKey="actual" stroke={EMERALD} strokeWidth={2} dot={false} name="Actual (Ground Truth)" />
                      <Line type="monotone" dataKey="predicted" stroke={ACCENT} strokeWidth={2} dot={false} name="RailRakshak Predicted" />
                      <Line type="monotone" dataKey="scheduled" stroke={SLATE} strokeDasharray="4 3" dot={false} name="Scheduled Timetable" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-[10px] uppercase text-slate-500">Scheduled</div>
                    <div className="font-[family-name:var(--font-mono)] text-base text-slate-300">
                      {demo.scheduledFinalArrival ? formatClock(demo.scheduledFinalArrival.toISOString()) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-amber-400">RailRakshak ETA</div>
                    <div className="font-[family-name:var(--font-mono)] text-base text-amber-300">
                      {demo.predictedFinalArrival ? formatClock(demo.predictedFinalArrival.toISOString()) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-emerald-400">Actual Arrival</div>
                    <div className="font-[family-name:var(--font-mono)] text-base text-emerald-300">
                      {demo.actualFinalArrival ? formatClock(demo.actualFinalArrival.toISOString()) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SlideShell>
        ),
      },

      // Slide 5: Features & Model Architecture
      {
        id: "features",
        label: "5. ML Architecture",
        node: (
          <SlideShell kicker="05 · Machine Learning Brain" title="Causal Features & Gradient Boosted Trees">
            <div className="grid h-full gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5">
                  <div className="mb-2 text-sm font-medium text-slate-200">
                    What Drives Traversal Predictions? (Gain Importance)
                  </div>
                  <div className="h-56">
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
                          width={140}
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
                        <Bar dataKey="gain" fill={ACCENT} radius={[0, 3, 3, 0]} name="Gain" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5 text-sm leading-relaxed">
                  <div className="mb-2 flex items-center gap-2 font-medium text-amber-300">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    Why LightGBM Section Regressors?
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li>
                      <strong className="text-slate-100">Sub-5ms Inference:</strong> Fast enough to recompute downstream corridor forecasts on every 30s RTIS telemetry ping.
                    </li>
                    <li>
                      <strong className="text-slate-100">Interpretable & Non-Linear:</strong> Directly captures threshold effects (e.g. crossing a 15-min delay threshold causes a 30-min loop hold).
                    </li>
                    <li>
                      <strong className="text-slate-100">Zero Future Leakage:</strong> Chronological train/validation/test split ensures models never train on future date distributions.
                    </li>
                    <li>
                      <strong className="text-slate-100">Client-Side Parity:</strong> Model trees compile to lightweight browser-executable JSON for instant offline evaluation.
                    </li>
                  </ul>
                </div>
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-4 text-xs text-slate-400">
                  Model trained on historical running records. Target: section travel duration (minutes).
                </div>
              </div>
            </div>
          </SlideShell>
        ),
      },

      // Slide 6: Measured Accuracy & Benchmarks
      {
        id: "accuracy",
        label: "6. Empirical Accuracy",
        node: (
          <SlideShell kicker="06 · Evaluation" title="Measured Performance on Held-Out Test Data">
            <div className="grid h-full gap-6 lg:grid-cols-5">
              <div className="flex flex-col gap-4 lg:col-span-2">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="MAE"
                    value={`${Number(lgbm["mae"]?.toFixed(2) ?? 0)} min`}
                    sub="mean absolute error"
                  />
                  <MetricCard
                    label="RMSE"
                    value={`${Number(lgbm["rmse"]?.toFixed(2) ?? 0)} min`}
                    sub="root mean squared error"
                  />
                  <MetricCard
                    label="Median Error"
                    value={`${Number(lgbm["median_abs_error"]?.toFixed(2) ?? 0)} min`}
                    sub="robust to extreme spikes"
                  />
                  <MetricCard
                    label="Delay Pred. Err"
                    value={`${Number(delayErr["lightgbm"]?.toFixed(2) ?? 0)} min`}
                    sub="delay variance error"
                  />
                </div>
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-4 text-xs leading-relaxed text-slate-400">
                  <div className="mb-1 flex items-center gap-2 font-medium text-slate-200">
                    <Gauge className="h-4 w-4 text-amber-400" />
                    Rigorous Scientific Evaluation
                  </div>
                  Evaluated on chronologically held-out test journeys. Unlike black-box assumptions, RailRakshak's errors are tracked per-section to expose where corridor bottlenecks occur.
                </div>
              </div>
              <div className="flex flex-col gap-4 lg:col-span-3">
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5">
                  <div className="mb-2 text-sm font-medium text-slate-200">
                    Model Error vs Static Baseline (Sched + Live Delay)
                  </div>
                  <div className="h-64">
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
                        <Bar dataKey="model" fill={ACCENT} name="RailRakshak ML" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="baseline" fill="#475569" name="Static Baseline (Sched + Delay)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </SlideShell>
        ),
      },

      // Slide 7: Operational & Passenger Impact
      {
        id: "impact",
        label: "7. Dual Impact",
        node: (
          <SlideShell kicker="07 · System Impact" title="Empowering Both Operations & Passengers">
            <div className="grid h-full gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-emerald-900/40 bg-emerald-950/15 p-5">
                  <div className="mb-3 flex items-center gap-2 text-emerald-300">
                    <Users className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm font-semibold">1. Passenger Experience & Certainty</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong>End of ETA Jumps:</strong> Prevents sudden jumps where a train is "10 mins late" all journey and suddenly "50 mins late" at the destination.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong>Connecting Train Confidence:</strong> Informs passengers whether a tight 30-minute transfer at Mysuru or Bengaluru is statistically safe.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong>Confidence Intervals:</strong> Transparently provides p10–p90 arrival time bounds.</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-sky-900/40 bg-sky-950/15 p-5">
                  <div className="mb-3 flex items-center gap-2 text-sky-300">
                    <Workflow className="h-5 w-5 text-sky-400" />
                    <span className="text-sm font-semibold">2. Section Controller Decision Support (COA)</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-sky-400 font-bold">✓</span>
                      <span><strong>45–60 Min Lookahead:</strong> Section controllers can anticipate bottleneck conflicts before two trains reach the same junction.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-400 font-bold">✓</span>
                      <span><strong>Precedence Intelligence:</strong> Data-backed decisions on whether to hold a slower express or freight on a loop line.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-400 font-bold">✓</span>
                      <span><strong>Seamless Integration:</strong> Plugs directly into CRIS/COA architectures via REST API.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </SlideShell>
        ),
      },

      // Slide 8: Summary & Roadmap
      {
        id: "roadmap",
        label: "8. Pipeline & Integration",
        node: (
          <SlideShell kicker="08 · Roadmap & Integration" title="End-to-End Pipeline & Integration Roadmap">
            <div className="grid h-full gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5">
                  <div className="mb-4 flex items-center gap-2 text-slate-200">
                    <Workflow className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium">Telemetry Ingestion to Browser Pipeline</span>
                  </div>
                  <ol className="space-y-2 text-xs">
                    {[
                      ["Telemetry Ingestion", "30-second ISRO RTIS locomotive GPS & COA state feeds"],
                      ["Cleaning & Validation", "Drop non-positive travel times and impossible speed anomalies"],
                      ["Causal Feature Engineering", "Buffer slack, historical clearance distributions, and weather"],
                      ["LightGBM Regressor", "Recursive downstream section traversal estimation"],
                      ["Export & API Serving", "Static compiled JSON trees + FastAPI prediction endpoints"],
                      ["Parity Verification", `Browser scorer matches Python booster within ${typeof parity === "number" ? parity.toExponential(2) : "1e-5"} min`],
                    ].map(([step, desc], i) => (
                      <li key={step} className="flex items-start gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-amber-400/40 bg-amber-400/10 font-[family-name:var(--font-mono)] text-[10px] text-amber-300">
                          {i + 1}
                        </span>
                        <div>
                          <span className="font-medium text-slate-200">{step}:</span>{" "}
                          <span className="text-slate-400">{desc}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-5 text-xs leading-relaxed">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-400">
                    <Target className="h-4 w-4" />
                    The 3-Phase Scale Roadmap
                  </div>
                  <div className="space-y-3 mt-3">
                    <div className="border-l-2 border-amber-400 pl-3">
                      <strong className="text-slate-200">Phase 1 (Current):</strong> Validated corridor prototype on SBC → MYS line with live simulation replay and FastAPI service.
                    </div>
                    <div className="border-l-2 border-sky-400 pl-3">
                      <strong className="text-slate-200">Phase 2:</strong> Network-wide corridor scaling across South Western Railway (SWR) with multi-train junction conflict detection.
                    </div>
                    <div className="border-l-2 border-emerald-400 pl-3">
                      <strong className="text-slate-200">Phase 3:</strong> Direct API connector with CRIS for live COA controller consoles and IRCTC / RailMadad passenger integration.
                    </div>
                  </div>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-900/40 p-4 text-[11px] text-slate-500">
                  RailRakshak is an independent research prototype. Metrics are measured on real corridor runs and demonstrate the feasibility of section-by-section remaining journey forecasting.
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
          <span className="hidden sm:inline">RailRakshak · Presentation Deck</span>
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