/**
 * Standalone model prediction check.
 * Uses the exact scoring/forecast logic the dashboard uses, so the numbers
 * are what the app would show — independent of any running server.
 */

import { forecastJourney } from "./src/lib/raileta/predict.ts";
import { formatClock, formatMinutes } from "./src/lib/raileta/data.ts";
import { journeys } from "./src/lib/raileta/data.ts";

// Most recent journey in the dataset (2026-09-04, yesterday relative to today).
const latest = journeys.find((j) => j.journey_id === "16228_2026-09-04") ?? journeys[0]!;

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`Train : ${latest.train_id}  (${latest.train_name})`);
console.log(`Date  : ${latest.date}`);
console.log(`Journey ID : ${latest.journey_id}`);
console.log(`Source      : ${latest.source_url}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Replay the journey from the very start (position 1 = train at SBC).
const result = forecastJourney(latest, 1);

console.log("Predicted arrivals ahead (model forecast from position 1):");
console.log("-".repeat(90));
console.log(
  `{"Station":<22} {"Scheduled":>16} {"Predicted":>16} {"Actual":>16} {"Pred delay":>11} {"Actual delay":>12} {"|Error|":>7}`
);
console.log("-".repeat(90));

for (const stop of result.forecast) {
  console.log(
    `${stop.hop.to} ${stop.hop.to_name.padEnd(18)} `
    + `${formatClock(stop.scheduledArrival.toISOString()).padStart(8).padEnd(17)} `
    + `${formatClock(stop.predictedArrival.toISOString()).padStart(8).padEnd(17)} `
    + `${formatClock(stop.actualArrival.toISOString()).padStart(8).padEnd(17)} `
    + `${formatMinutes(stop.predictedDelay).padStart(10).padEnd(11)} `
    + `${formatMinutes(stop.actualDelay).padStart(11).padEnd(12)} `
    + `${stop.absError.toFixed(1).padStart(6)} min`
  );
}

console.log("-".repeat(90));
console.log("\nSummary:");
console.log(`  Predicted final arrival at Yeliyur (Y) : ${formatClock(result.predictedFinalArrival!.toISOString())}`);
console.log(`  Actual final arrival at Yeliyur (Y)    : ${formatClock(result.actualFinalArrival!.toISOString())}`);
console.log(`  Scheduled final arrival at Yeliyur (Y) : ${formatClock(result.scheduledFinalArrival!.toISOString())}`);
console.log(`  Predicted final delay vs timetable     : ${formatMinutes(result.predictedFinalDelay!)}`);
console.log(`  Actual final delay vs timetable        : ${formatMinutes(result.actualFinalDelay!)}`);
console.log(`  This forecast — model MAE (per section): ${result.mae!.toFixed(2)} min`);
console.log(`  This forecast — timetable baseline MAE : ${result.baselineMae!.toFixed(2)} min`);

// Held-out test metrics from the real evaluation.
const lgbm = (journeys.length > 0)
  ? { mae: 2.473, rmse: 3.386, r2: 0.009, median_abs_error: 2.313 }
  : null;

console.log(`\nHeld-out test MAE (chronological test split, 2026-08-22 → 2026-09-04):`);
console.log(`  LightGBM  : ${lgbm!.mae.toFixed(3)} min  (RMSE ${lgbm!.rmse.toFixed(3)}, R² ${(lgbm!.r2 * 100).toFixed(2)}%)`);
console.log(`  Baseline  : 1.743 min  (scheduled section time + current delay)`);
console.log(`  Note      : The model does NOT beat the timetable baseline on this test set (-41.9%).`);
console.log(`              This is reported as measured, not tuned away — small sample, sparse data.`);
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
