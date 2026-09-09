/**
 * Today's scheduled train timetable types and parsing helpers.
 *
 * The actual data is fetched server-side from the backend's /today-schedule
 * endpoint (which reads the Python-scraped data/raw/corridor_trains.json).
 * This module keeps the types, the parse helpers, and the pure transform
 * functions so the dashboard can render the schedule without importing a
 * JSON file directly (which triggers TS2307 under the current tsconfig).
 */

/** eRail stores times as HH.MM (dot separator, leading zeros optional). */
export type RawErailTrain = {
  train_id: string;
  train_name: string;
  origin_of_service: string;
  terminus_of_service: string;
  sched_dep_sbc: string;
  sched_arr_mys: string;
  sched_duration: string;
  run_days_bitmap: string;
};

export type TodayTrain = {
  train_id: string;
  train_name: string;
  origin_of_service: string;
  terminus_of_service: string;
  sched_dep_sbc: string; // HH:MM
  sched_arr_mys: string; // HH:MM
  sched_duration: string; // HH:MM
  run_days_bitmap: string;
  runs_today: boolean;
};

type TodayScheduleInternal = {
  fetched_at: string;
  date: string;
  weekday: string;
  trains: TodayTrain[];
};
export type TodaySchedule = TodayScheduleInternal;

/** Parse eRail HH.MM → "HH:MM". */
export function parseErailTime(raw: string): string {
  const parts = raw.split(".").map((s) => s.trim());
  const hh = String(Number(parts[0] ?? "0")).padStart(2, "0");
  const mm = String(Number(parts[1] ?? "0")).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Convert eRail HH.MM into minutes since midnight. */
export function erailTimeToMinutes(raw: string): number {
  const parts = raw.split(".").map((s) => Number(s.trim()) || 0);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Transform raw eRail trains into the TodaySchedule shape (server-side use). */
export function buildTodaySchedule(rawTrains: RawErailTrain[]): TodaySchedule {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const weekday = WEEKDAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];

  const trains: TodayTrain[] = rawTrains
    .map((t) => ({
      train_id: t.train_id,
      train_name: t.train_name,
      origin_of_service: t.origin_of_service,
      terminus_of_service: t.terminus_of_service,
      sched_dep_sbc: parseErailTime(t.sched_dep_sbc),
      sched_arr_mys: parseErailTime(t.sched_arr_mys),
      sched_duration: parseErailTime(t.sched_duration),
      run_days_bitmap: t.run_days_bitmap,
      runs_today: false,
    }))
    .sort((a, b) => erailTimeToMinutes(a.sched_dep_sbc) - erailTimeToMinutes(b.sched_dep_sbc));

  const result = {
    fetched_at: new Date().toISOString() as string,
    date,
    weekday,
    trains,
  };
  return result as TodaySchedule;
}

/** Trains actually running today, given the eRail run_days_bitmap. */
export function trainsRunningToday(schedule: TodaySchedule): TodayTrain[] {
  const todayIndex = new Date().getDay(); // Sun=0 .. Sat=6
  const bitmapIndex = todayIndex === 0 ? 6 : todayIndex - 1; // Mon→0
  return schedule.trains.filter((t) => t.run_days_bitmap[bitmapIndex] === "1");
}

/** Mark which trains run today (call after buildTodaySchedule). */
export function markRunsToday(schedule: TodaySchedule): TodaySchedule {
  const todayIndex = new Date().getDay();
  const bitmapIndex = todayIndex === 0 ? 6 : todayIndex - 1;
  return {
    ...schedule,
    trains: schedule.trains.map((t) => ({
      ...t,
      runs_today: t.run_days_bitmap[bitmapIndex] === "1",
    })),
  };
}
