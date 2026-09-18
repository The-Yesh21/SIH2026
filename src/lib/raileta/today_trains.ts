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

export const DEFAULT_RAW_TRAINS: RawErailTrain[] = [
  {
    train_id: "16216",
    train_name: "CHAMUNDI EXP",
    origin_of_service: "Ksr Bengaluru",
    terminus_of_service: "Mysore Jn",
    sched_dep_sbc: "18.25",
    sched_arr_mys: "21.10",
    sched_duration: "02.45",
    run_days_bitmap: "1111111",
  },
  {
    train_id: "12614",
    train_name: "WODEYAR SF EXP",
    origin_of_service: "Ksr Bengaluru",
    terminus_of_service: "Mysore Jn",
    sched_dep_sbc: "15.15",
    sched_arr_mys: "17.45",
    sched_duration: "02.30",
    run_days_bitmap: "1111111",
  },
  {
    train_id: "12785",
    train_name: "KCG AP SF EXP",
    origin_of_service: "Kacheguda",
    terminus_of_service: "Ashokapuram",
    sched_dep_sbc: "06.20",
    sched_arr_mys: "09.30",
    sched_duration: "03.10",
    run_days_bitmap: "1111111",
  },
  {
    train_id: "16220",
    train_name: "TPTY CMNR EXP",
    origin_of_service: "Tirupati",
    terminus_of_service: "Chamarajanagar",
    sched_dep_sbc: "04.30",
    sched_arr_mys: "07.25",
    sched_duration: "02.55",
    run_days_bitmap: "1111111",
  },
  {
    train_id: "16228",
    train_name: "TLGP MYS EXP",
    origin_of_service: "Talguppa",
    terminus_of_service: "Mysore Jn",
    sched_dep_sbc: "05.05",
    sched_arr_mys: "08.20",
    sched_duration: "03.15",
    run_days_bitmap: "1111111",
  },
  {
    train_id: "16231",
    train_name: "CUPJ MYS EXP",
    origin_of_service: "Cuddalore Port Jn",
    terminus_of_service: "Mysore Jn",
    sched_dep_sbc: "05.40",
    sched_arr_mys: "08.35",
    sched_duration: "02.55",
    run_days_bitmap: "1111111",
  },
  {
    train_id: "16316",
    train_name: "TVCN MYS EXP",
    origin_of_service: "Thiruvananthapuram North",
    terminus_of_service: "Mysore Jn",
    sched_dep_sbc: "08.30",
    sched_arr_mys: "11.45",
    sched_duration: "03.15",
    run_days_bitmap: "1111111",
  },
  {
    train_id: "56232",
    train_name: "SMVB-MYS PASSENGER",
    origin_of_service: "Smvt Bengaluru",
    terminus_of_service: "Mysore Jn",
    sched_dep_sbc: "00.10",
    sched_arr_mys: "04.00",
    sched_duration: "03.50",
    run_days_bitmap: "1111111",
  },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Transform raw eRail trains into the TodaySchedule shape (server-side use). */
export function buildTodaySchedule(rawTrains: RawErailTrain[] = DEFAULT_RAW_TRAINS): TodaySchedule {
  const list = Array.isArray(rawTrains) && rawTrains.length > 0 ? rawTrains : DEFAULT_RAW_TRAINS;
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const weekday = WEEKDAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];

  const trains: TodayTrain[] = list
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
  return markRunsToday(result as TodaySchedule);
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
