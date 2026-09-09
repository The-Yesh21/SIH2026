import { AlertTriangle } from "lucide-react";

/**
 * Shown when the Python pipeline has not been run in this checkout, so no real
 * model or dataset artifacts exist. Nothing is invented to fill the gap.
 */
export function PipelineNotice() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="rounded-md border border-accent/50 bg-accent/10 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
          <div className="space-y-3 text-sm">
            <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
              No trained model in this build
            </h1>
            <p className="text-muted-foreground">
              This page only ever displays real collected data and predictions from the trained
              LightGBM model. The data collection and training pipeline has not been run in this
              checkout, so there is nothing genuine to show yet — and nothing is simulated to
              fill the gap.
            </p>
            <pre className="overflow-x-auto rounded-sm bg-card p-3 font-[family-name:var(--font-mono)] text-xs text-foreground">
              {`export RAILRADAR_API_KEY=...\nbash scripts/run_all.sh`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
