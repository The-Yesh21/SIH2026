import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { PipelineNotice } from "@/components/raileta/PipelineNotice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dataset, dataSources, pipelineReady } from "@/lib/raileta/data";

export const Route = createFileRoute("/dataset")({
  head: () => ({
    meta: [
      { title: "Dataset & Sources — RailRakshak" },
      {
        name: "description",
        content:
          "Where RailRakshak's Bengaluru–Mysuru training data comes from: sources, collection method, record counts, cleaning decisions and known limitations.",
      },
      { property: "og:title", content: "Dataset & Sources — RailRakshak" },
      {
        property: "og:description",
        content:
          "Full provenance for the real historical railway data behind RailRakshak's ETA model.",
      },
    ],
  }),
  component: DatasetPage,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-[family-name:var(--font-mono)] text-foreground">{value}</span>
    </div>
  );
}

function DatasetPage() {
  if (!pipelineReady) return <PipelineNotice />;

  const summary = dataset.summary as Record<string, string | number>;
  const cleaning = dataset.cleaning_report as Record<string, string | number>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground">
          Dataset &amp; Sources
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Every row used to train RailRakshak is a real, publicly published observation. Nothing was
          generated, duplicated or interpolated: where the upstream feed had no record, the gap
          was dropped rather than filled.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dataset summary</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(summary).map(([k, v]) => (
              <Row key={k} label={k.replaceAll("_", " ")} value={String(v)} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cleaning report</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(cleaning).map(([k, v]) => (
              <Row key={k} label={k.replaceAll("_", " ")} value={String(v)} />
            ))}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
          Sources
        </h2>
        {dataSources.map((source) => (
          <Card key={source.source_name}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{source.source_name}</CardTitle>
                <Badge variant="secondary">{source.data_type}</Badge>
                <Badge variant="outline">{source.historical_or_current}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{source.data_description}</p>
              <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                <Row label="Records" value={source.record_count.toLocaleString("en-IN")} />
                <Row label="Date range" value={source.date_range} />
                <Row label="Collected" value={source.collection_date.slice(0, 10)} />
                <Row label="Method" value={source.extraction_method} />
              </div>
              <div className="flex flex-wrap gap-1">
                {source.fields_available.map((f) => (
                  <span
                    key={f}
                    className="rounded-sm bg-secondary px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-secondary-foreground"
                  >
                    {f}
                  </span>
                ))}
              </div>
              <p className="rounded-sm border border-accent/40 bg-accent/10 p-2 text-xs text-foreground">
                <strong>Limitations:</strong> {source.limitations}
              </p>
              <a
                className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
                href={source.source_url.replace(/\{[^}]+\}/g, "")}
                target="_blank"
                rel="noreferrer"
              >
                {source.source_url} <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trains in the dataset</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Train</th>
                  <th className="px-4 py-2 text-right">Journeys</th>
                  <th className="px-4 py-2 text-right">Section records</th>
                </tr>
              </thead>
              <tbody>
                {dataset.trains.map((t) => (
                  <tr key={t.train_id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <span className="font-[family-name:var(--font-mono)]">{t.train_id}</span>{" "}
                      {t.train_name}
                    </td>
                    <td className="px-4 py-2 text-right">{t.journeys}</td>
                    <td className="px-4 py-2 text-right">{t.sections}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Corridor sections</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[28rem] overflow-auto p-0">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary/90 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Section</th>
                  <th className="px-4 py-2 text-right">km</th>
                  <th className="px-4 py-2 text-right">Obs.</th>
                  <th className="px-4 py-2 text-right">Sched.</th>
                  <th className="px-4 py-2 text-right">Actual avg</th>
                </tr>
              </thead>
              <tbody>
                {dataset.sections
                  .slice()
                  .sort((a, b) => a.station_sequence - b.station_sequence)
                  .map((s) => (
                    <tr key={s.section_id} className="border-t border-border">
                      <td className="px-4 py-2 font-[family-name:var(--font-mono)] text-xs">
                        {s.from} → {s.to}
                      </td>
                      <td className="px-4 py-2 text-right">{s.distance_km}</td>
                      <td className="px-4 py-2 text-right">{s.observations}</td>
                      <td className="px-4 py-2 text-right">{s.scheduled_mean}</td>
                      <td className="px-4 py-2 text-right">{s.mean}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
