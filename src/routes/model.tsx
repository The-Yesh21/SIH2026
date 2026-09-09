import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { PipelineNotice } from "@/components/raileta/PipelineNotice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dataset, evaluation, model, pipelineReady, scenarios } from "@/lib/raileta/data";

export const Route = createFileRoute("/model")({
  head: () => ({
    meta: [
      { title: "ML Model — RailRakshak LightGBM section travel-time model" },
      {
        name: "description",
        content:
          "How RailRakshak's LightGBM model is trained: features, chronological splits, test metrics against the timetable baseline, and feature importance.",
      },
      { property: "og:title", content: "ML Model — RailRakshak" },
      {
        property: "og:description",
        content:
          "Training setup, honest test metrics and feature importance for RailRakshak's section travel-time model.",
      },
    ],
  }),
  component: ModelPage,
});

type Metrics = { mae?: number; rmse?: number; r2?: number; median_abs_error?: number };

function MetricGrid({ title, metrics }: { title: string; metrics: Metrics | undefined }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        {(["mae", "rmse", "median_abs_error", "r2"] as const).map((key) => (
          <div key={key}>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {key.replaceAll("_", " ")}
            </div>
            <div className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
              {typeof metrics?.[key] === "number" ? (metrics[key] as number).toFixed(3) : "—"}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ModelPage() {
  if (!pipelineReady) return <PipelineNotice />;

  const lgbm = evaluation["lightgbm"] as Metrics | undefined;
  const baseline = evaluation["baseline_scheduled_plus_delay"] as Metrics | undefined;
  const improvement = evaluation["improvement_pct_mae"] as number | null;
  const importance = (evaluation["feature_importance_gain"] ?? []) as {
    feature: string;
    gain: number;
  }[];
  const shap = (evaluation["shap_mean_abs"] ?? null) as
    | { feature: string; mean_abs_shap: number }[]
    | null;
  const params = (evaluation["model_parameters"] ?? {}) as Record<string, unknown>;
  const meta = (evaluation["model_metadata"] ?? {}) as Record<string, unknown>;
  const parity = evaluation["browser_scorer_parity_max_abs_diff"] as number | undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <Badge variant="outline" className="mb-2">
          LightGBM regressor · target: section travel time (minutes)
        </Badge>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground">
          The ML model
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          The model predicts how long a train will take to cover each section between two
          consecutive stations. Arrival times are built by chaining those section predictions
          forward. Splits are chronological — the test set is strictly the most recent dates — so
          no future information leaks into training.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricGrid title="LightGBM — held-out test set" metrics={lgbm} />
        <MetricGrid title="Baseline — scheduled time + current delay" metrics={baseline} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Headline comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-foreground">
            {typeof improvement === "number"
              ? improvement > 0
                ? `The model reduces mean absolute error by ${improvement.toFixed(2)}% versus the timetable baseline.`
                : `The model does not beat the timetable baseline on this test set (${improvement.toFixed(2)}%). This is reported as measured, not tuned away.`
              : "Improvement could not be computed on this test set."}
          </p>
          <p className="text-muted-foreground">
            Evaluated on {String(evaluation["test_records"] ?? "—")} section records from{" "}
            {JSON.stringify(evaluation["test_date_range"] ?? "—")}.{" "}
            {typeof parity === "number"
              ? `The in-browser tree scorer matches the Python booster to within ${parity} minutes.`
              : ""}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Feature importance (gain)</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={importance.slice(0, 14)}
                margin={{ left: 60, right: 12, top: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} width={140} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="gain" fill="var(--chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {shap ? "Mean |SHAP| contribution" : "Model configuration"}
            </CardTitle>
          </CardHeader>
          <CardContent className={shap ? "h-96" : ""}>
            {shap ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={shap.slice(0, 14)}
                  margin={{ left: 60, right: 12, top: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} width={140} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="mean_abs_shap" fill="var(--chart-2)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <pre className="overflow-auto font-[family-name:var(--font-mono)] text-xs text-foreground">
                {JSON.stringify(params, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Training setup</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto font-[family-name:var(--font-mono)] text-xs text-foreground">
              {JSON.stringify({ ...meta, parameters: params }, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Features used ({dataset.feature_config.features.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-1">
              {dataset.feature_config.features.map((f) => (
                <span
                  key={f}
                  className="rounded-sm bg-secondary px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-secondary-foreground"
                >
                  {f}
                </span>
              ))}
            </div>
            <p className="text-muted-foreground">
              Historical section statistics are computed only from journeys strictly earlier than
              the row being predicted, so a row never sees its own outcome or any later day.
              Weather features are{" "}
              {dataset.feature_config.weather_used ? "included" : "not included"} in this build.
            </p>
            <p className="text-muted-foreground">
              The browser scores the exact exported trees ({model.trees.length} trees) rather than
              an approximation, and parity against the Python booster is checked at export time.
            </p>
            <p className="text-muted-foreground">
              The dashboard includes a scenario library of {scenarios.length} real journey patterns
              for replay: on-time, delay recovery, delay increasing, and slow-section scenarios.
              Each scenario is a genuine recorded journey with its real delays and section times.
            </p>
          </CardContent>
        </Card>
      </div>

      {scenarios.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Scenario library — real journey patterns</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              These {scenarios.length} scenarios are automatically identified from genuine historical
              journeys based on their observed delay patterns. Select any scenario on the dashboard to
              replay that real journey and see how the model’s ETA evolves station by station.
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(scenarios.map((s) => s.label))).map((label) => {
                const count = scenarios.filter((s) => s.label === label).length;
                return (
                  <Badge key={label} variant="outline" className="text-xs">
                    {label} ({count})
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
