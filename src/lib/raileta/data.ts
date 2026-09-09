/**
 * Typed access to the artifacts exported from the real Python pipeline.
 *
 * Every value here comes from ml/export_artifacts.py, which reads the cleaned
 * dataset and the trained booster. Nothing is generated in the browser.
 */

import datasetJson from "@/data/dataset.json";
import evaluationJson from "@/data/evaluation.json";
import journeysJson from "@/data/journeys.json";
import modelJson from "@/data/model.json";
import scenariosJson from "@/data/scenarios.json";
import sourcesJson from "@/data/sources.json";
import type { ModelDump } from "./scorer";

export type Scenario = {
  label: string;
  train_id: string;
  train_name: string;
  date: string;
  source_url: string;
  journey_id: string;
  starting_delay_minutes: number;
  maximum_delay_minutes: number;
  final_delay_minutes: number;
  delay_change_minutes: number;
  sections_affected: string[];
  total_sections: number;
  reason: string;
};

export type SectionStat = {
  section_id: string;
  from: string;
  from_name: string;
  to: string;
  to_name: string;
  observations: number;
  mean: number;
  median: number;
  variance: number;
  scheduled_mean: number;
  distance_km: number;
  remaining_km: number;
  station_sequence: number;
};

export type Station = { code: string; name: string; lat: number; lng: number };

export type TrainSummary = {
  train_id: string;
  train_name: string;
  journeys: number;
  sections: number;
};

export type Hop = {
  from: string;
  from_name: string;
  to: string;
  to_name: string;
  section_id: string;
  station_sequence: number;
  section_distance_km: number;
  remaining_distance_km: number;
  scheduled_departure: string;
  actual_departure: string;
  scheduled_arrival_next: string;
  actual_arrival_next: string;
  scheduled_section_travel_time: number;
  actual_section_travel_time: number;
  departure_delay_minutes: number;
  next_arrival_delay_minutes: number | null;
  features: Record<string, number>;
};

export type Journey = {
  journey_id: string;
  train_id: string;
  train_name: string;
  date: string;
  source_url: string;
  hops: Hop[];
};

export type DatasetSummary = Record<string, unknown> & { status?: string };

export type Dataset = {
  summary: DatasetSummary;
  cleaning_report: Record<string, unknown>;
  trains: TrainSummary[];
  sections: SectionStat[];
  stations: Station[];
  feature_config: {
    features: string[];
    fill_values: Record<string, number>;
    train_codes: Record<string, number>;
    section_codes: Record<string, number>;
    weather_used: boolean;
  };
};

export type Evaluation = Record<string, unknown> & { status?: string };

export type DataSource = {
  source_name: string;
  source_url: string;
  data_description: string;
  data_type: string;
  historical_or_current: string;
  date_range: string;
  fields_available: string[];
  extraction_method: string;
  record_count: number;
  limitations: string;
  collection_date: string;
};

export const model = modelJson as unknown as ModelDump;
export const dataset = datasetJson as unknown as Dataset;
export const evaluation = evaluationJson as unknown as Evaluation;
export const journeys = journeysJson as unknown as Journey[];
export const scenarios = scenariosJson as unknown as Scenario[];
export const dataSources = sourcesJson as unknown as DataSource[];

/** True once the real scrape + training pipeline has been run and exported. */
export const pipelineReady =
  model.trees.length > 0 && journeys.length > 0 && dataset.sections.length > 0;

export const sectionById = new Map(dataset.sections.map((s) => [s.section_id, s]));

export function formatMinutes(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  return h > 0 ? `${sign}${h}h ${m}m` : `${sign}${m}m`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}
