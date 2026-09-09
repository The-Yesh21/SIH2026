/**
 * ETA prediction for a corridor journey, using the trained LightGBM model.
 *
 * Forecasting rule: only information available at the prediction moment is
 * used. For the section the train is about to run, the recorded (leak-free)
 * feature vector is used as-is. For every section further down the line the
 * running-state features (current delay, previous section time, elapsed time,
 * within-journey overage so far) are replaced by the model's own predicted
 * values, so no future actual leaks into a forecast.
 *
 * Timetable-aware delay propagation: captured sections are not adjacent —
 * between one recorded hop and the next the train runs through halt stations
 * and dwells at platforms. Chaining bare section times would drift the
 * predicted clock tens of minutes early. Instead, the train departs each
 * recorded station at its booked departure time shifted by the running delay
 * estimate, and never earlier than its predicted arrival there plus a minimal
 * dwell. The resulting departure delay is exactly the `current_delay` feature
 * the model was trained on.
 */

import { dataset, sectionById, type Hop, type Journey } from "./data";
import { model } from "./data";
import { scoreFeatures } from "./scorer";

export type PredictedStop = {
  hop: Hop;
  predictedMinutes: number;
  scheduledMinutes: number;
  actualMinutes: number;
  predictedArrival: Date;
  scheduledArrival: Date;
  actualArrival: Date;
  predictedDelay: number;
  actualDelay: number;
  absError: number;
  baselineAbsError: number;
};

export type JourneyForecast = {
  observed: PredictedStop[];
  forecast: PredictedStop[];
  predictedFinalArrival: Date | null;
  actualFinalArrival: Date | null;
  scheduledFinalArrival: Date | null;
  predictedFinalDelay: number | null;
  actualFinalDelay: number | null;
  mae: number | null;
  baselineMae: number | null;
};

function minutesBetween(a: string | Date, b: string | Date): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60000;
}

function buildStop(
  hop: Hop,
  predictedMinutes: number,
  departure: Date,
): PredictedStop {
  const predictedArrival = new Date(departure.getTime() + predictedMinutes * 60000);
  const scheduledArrival = new Date(hop.scheduled_arrival_next);
  const actualArrival = new Date(hop.actual_arrival_next);
  return {
    hop,
    predictedMinutes,
    scheduledMinutes: hop.scheduled_section_travel_time,
    actualMinutes: hop.actual_section_travel_time,
    predictedArrival,
    scheduledArrival,
    actualArrival,
    predictedDelay: minutesBetween(scheduledArrival, predictedArrival),
    actualDelay: minutesBetween(scheduledArrival, actualArrival),
    absError: Math.abs(predictedMinutes - hop.actual_section_travel_time),
    baselineAbsError: Math.abs(
      hop.scheduled_section_travel_time - hop.actual_section_travel_time,
    ),
  };
}

/**
 * Predict a journey from the position `atIndex` (the train has completed hops
 * before it, and is departing the station at the start of hop `atIndex`).
 */
export function forecastJourney(journey: Journey, atIndex: number): JourneyForecast {
  const fills = dataset.feature_config.fill_values;
  const observed: PredictedStop[] = [];
  const forecast: PredictedStop[] = [];
  // Realized (or, ahead of the replay point, predicted) section overages of
  // this journey, used to build the journey_overage_so_far feature causally.
  const overages: number[] = [];

  for (let i = 0; i < Math.min(atIndex, journey.hops.length); i += 1) {
    const hop = journey.hops[i]!;
    // The model predicts the DEVIATION from schedule; reconstruct the
    // absolute section time as scheduled + predicted deviation.
    const minutes = scoreFeatures(model, hop.features) + hop.scheduled_section_travel_time;
    observed.push(buildStop(hop, minutes, new Date(hop.actual_departure)));
    overages.push(hop.actual_section_travel_time - hop.scheduled_section_travel_time);
  }

  if (atIndex < journey.hops.length) {
    let cursor = new Date(journey.hops[atIndex]!.actual_departure);
    let delay = journey.hops[atIndex]!.departure_delay_minutes;
    let previousSectionTime: number | null =
      atIndex > 0 ? journey.hops[atIndex - 1]!.actual_section_travel_time : null;
    const origin = new Date(journey.hops[0]!.actual_departure);

    for (let i = atIndex; i < journey.hops.length; i += 1) {
      const hop = journey.hops[i]!;
      const stats = sectionById.get(hop.section_id);
      const features: Record<string, number> = { ...hop.features };

      // Departure moment for this section. The first forecast hop departs at
      // its recorded actual time (that is the replay "now"). For every later
      // hop the departure is not known yet: the train leaves at its booked
      // time shifted by the running delay, but never before it has actually
      // (predicted) arrived plus a minimal dwell.
      if (i > atIndex) {
        const scheduledDeparture = new Date(hop.scheduled_departure).getTime();
        const propagated =
          scheduledDeparture + Math.max(0, delay) * 60000;
        const earliest = cursor.getTime() + 60000; // ~1 min minimum dwell
        cursor = new Date(Math.max(propagated, earliest));
        delay = (cursor.getTime() - scheduledDeparture) / 60000;
      }

      // Replace running-state features with values known at forecast time.
      if ("current_delay" in features) features["current_delay"] = delay;
      if ("previous_station_delay" in features) features["previous_station_delay"] = delay;
      if ("previous_section_travel_time" in features) {
        features["previous_section_travel_time"] =
          previousSectionTime ?? fills["previous_section_travel_time"] ?? 0;
      }
      if ("time_since_departure" in features) {
        features["time_since_departure"] = minutesBetween(origin, cursor);
      }
      if ("journey_overage_so_far" in features) {
        // Running-state feature: replace the recorded value (which was built
        // from the completed actual run and would leak the future) with the
        // mean overage accumulated so far on this simulated journey.
        features["journey_overage_so_far"] = overages.length
          ? overages.reduce((a, b) => a + b, 0) / overages.length
          : (fills["journey_overage_so_far"] ?? 0);
      }
      if (stats) {
        if ("hist_mean_section_time" in features)
          features["hist_mean_section_time"] = stats.mean;
        if ("hist_median_section_time" in features)
          features["hist_median_section_time"] = stats.median;
        if ("hist_section_variance" in features)
          features["hist_section_variance"] = stats.variance;
      }

      const minutes = scoreFeatures(model, features) + hop.scheduled_section_travel_time;
      const stop = buildStop(hop, minutes, cursor);
      forecast.push(stop);
      cursor = stop.predictedArrival;
      delay = stop.predictedDelay;
      previousSectionTime = minutes;
      overages.push(minutes - hop.scheduled_section_travel_time);
    }
  }

  const errors = forecast.map((s) => s.absError);
  const baseErrors = forecast.map((s) => s.baselineAbsError);
  const last = journey.hops[journey.hops.length - 1];
  const lastForecast = forecast[forecast.length - 1];

  return {
    observed,
    forecast,
    predictedFinalArrival: lastForecast?.predictedArrival ?? null,
    actualFinalArrival: last ? new Date(last.actual_arrival_next) : null,
    scheduledFinalArrival: last ? new Date(last.scheduled_arrival_next) : null,
    predictedFinalDelay: lastForecast?.predictedDelay ?? null,
    actualFinalDelay: last
      ? minutesBetween(last.scheduled_arrival_next, last.actual_arrival_next)
      : null,
    mae: errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : null,
    baselineMae: baseErrors.length
      ? baseErrors.reduce((a, b) => a + b, 0) / baseErrors.length
      : null,
  };
}
