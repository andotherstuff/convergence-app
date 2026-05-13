import type { ScheduleDay } from "@/hooks/useEventDetails";

/**
 * Pure time-matching utilities for the "Now happening" banner. Kept apart
 * from React so they can be unit-tested without rendering anything.
 */

export interface FlatScheduleItem {
  /** Date (YYYY-MM-DD) the item falls on in the schedule's timezone. */
  date: string;
  /** Start minutes since 00:00 in the schedule's timezone. */
  startMinutes: number;
  /** End minutes since 00:00 in the schedule's timezone. */
  endMinutes: number;
  /** Human-readable time string, e.g. "09:00–10:00". */
  time: string;
  /** Event label. */
  event: string;
  /** Day label, e.g. "Day 1 — Friday, May 29". */
  day: string;
}

/**
 * Snapshot of "what time is it in the event's timezone right now?". Derived
 * from the current `Date` using `Intl.DateTimeFormat` with the schedule's
 * IANA timezone, so the answer is independent of the user's own timezone.
 */
export interface ZonedNow {
  /** ISO date (YYYY-MM-DD) in the schedule's timezone. */
  date: string;
  /** Minutes elapsed since 00:00 in the schedule's timezone. */
  minutes: number;
  /** Absolute epoch ms (for raw comparisons / countdowns). */
  epochMs: number;
}

/**
 * Result of matching `ZonedNow` against the schedule.
 *
 *  - `"before"` — event hasn't started yet; `next` points at the first item.
 *  - `"current"` — `current` is an item that's currently running.
 *  - `"upcoming"` — between items; `next` points at the next item.
 *  - `"after"` — event is over.
 */
export type NowState =
  | { state: "before"; next: FlatScheduleItem; minutesUntilStart: number }
  | { state: "current"; current: FlatScheduleItem; minutesUntilEnd: number; next: FlatScheduleItem | null }
  | { state: "upcoming"; next: FlatScheduleItem; minutesUntilNext: number }
  | { state: "after" };

function parseHHMM(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Parse "09:00–10:00" or "09:00-10:00" into start/end minutes. Used when
 * the worker hasn't filled in the parsed `start`/`end` fields (e.g.,
 * during the backward-compatibility window).
 */
function parseTimeRange(value: string): { start: number; end: number } | null {
  const cleaned = value.replace(/[–—]/g, "-");
  const parts = cleaned.split("-").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const start = parseHHMM(parts[0]);
  const end = parseHHMM(parts[1]);
  if (start == null || end == null) return null;
  return { start, end };
}

/**
 * Flatten the schedule into a sorted list of items with absolute date +
 * minute offsets. Items missing `date` are dropped because we can't place
 * them on a real timeline.
 */
export function flattenSchedule(
  schedule: ScheduleDay[],
): FlatScheduleItem[] {
  const items: FlatScheduleItem[] = [];
  for (const day of schedule) {
    if (!day.date) continue;
    for (const item of day.items) {
      const start = parseHHMM(item.start);
      const end = parseHHMM(item.end);

      let startMinutes = start;
      let endMinutes = end;

      if (startMinutes == null || endMinutes == null) {
        const parsed = parseTimeRange(item.time);
        if (!parsed) continue;
        startMinutes = parsed.start;
        endMinutes = parsed.end;
      }

      items.push({
        date: day.date,
        startMinutes,
        endMinutes,
        time: item.time,
        event: item.event,
        day: day.day,
      });
    }
  }

  // Sort chronologically by (date, startMinutes).
  items.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.startMinutes - b.startMinutes;
  });

  return items;
}

/**
 * Compute "what time is it right now in the event's timezone?". Uses
 * `Intl.DateTimeFormat` so we never pull in a tz library for one calc.
 */
export function getZonedNow(now: Date, timezone: string): ZonedNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";

  // `en-CA` gives us YYYY-MM-DD-friendly numeric parts. `hour` may come
  // back as `"24"` at midnight under some implementations — normalize.
  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = Number(get("hour"));
  const minute = Number(get("minute"));
  if (hour === 24) hour = 0;

  return {
    date: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
    epochMs: now.getTime(),
  };
}

function compareDateAndMinutes(
  a: { date: string; minutes: number },
  b: { date: string; minutes: number },
): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.minutes - b.minutes;
}

/**
 * Match `zonedNow` against the flattened schedule and return the current
 * `NowState`. Pure: no React, no clock access.
 */
export function matchNow(
  zonedNow: ZonedNow,
  items: FlatScheduleItem[],
): NowState {
  if (items.length === 0) return { state: "after" };

  const first = items[0];
  const last = items[items.length - 1];

  // Before the first item.
  if (
    compareDateAndMinutes(zonedNow, {
      date: first.date,
      minutes: first.startMinutes,
    }) < 0
  ) {
    const minutesUntilStart = minutesBetween(zonedNow, {
      date: first.date,
      minutes: first.startMinutes,
    });
    return { state: "before", next: first, minutesUntilStart };
  }

  // After the last item.
  if (
    compareDateAndMinutes(zonedNow, {
      date: last.date,
      minutes: last.endMinutes,
    }) >= 0
  ) {
    return { state: "after" };
  }

  // Look for an item currently in progress.
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const startsAtOrBefore =
      compareDateAndMinutes(zonedNow, {
        date: item.date,
        minutes: item.startMinutes,
      }) >= 0;
    const endsAfter =
      compareDateAndMinutes(zonedNow, {
        date: item.date,
        minutes: item.endMinutes,
      }) < 0;

    if (startsAtOrBefore && endsAfter) {
      const minutesUntilEnd = minutesBetween(zonedNow, {
        date: item.date,
        minutes: item.endMinutes,
      });
      const next = items[i + 1] ?? null;
      return { state: "current", current: item, minutesUntilEnd, next };
    }
  }

  // Between items: find the next one in the future.
  for (const item of items) {
    if (
      compareDateAndMinutes(zonedNow, {
        date: item.date,
        minutes: item.startMinutes,
      }) < 0
    ) {
      const minutesUntilNext = minutesBetween(zonedNow, {
        date: item.date,
        minutes: item.startMinutes,
      });
      return { state: "upcoming", next: item, minutesUntilNext };
    }
  }

  return { state: "after" };
}

/**
 * Minutes from `from` to `to`, both expressed as zoned `{date, minutes}`
 * pairs. Negative if `to` is in the past relative to `from`.
 *
 * Implemented as a date-arithmetic helper that doesn't depend on the user's
 * local timezone (we treat the ISO date + minutes as a wall-clock instant
 * in the event's timezone — DST transitions during the three event days are
 * not a concern since the event sits entirely within CEST in late May).
 */
function minutesBetween(
  from: { date: string; minutes: number },
  to: { date: string; minutes: number },
): number {
  const fromMs = wallClockToMs(from.date, from.minutes);
  const toMs = wallClockToMs(to.date, to.minutes);
  return Math.round((toMs - fromMs) / 60000);
}

function wallClockToMs(date: string, minutes: number): number {
  const [y, m, d] = date.split("-").map((s) => Number(s));
  // Construct as UTC; the difference between two wall-clock instants in
  // the same timezone is what we care about, so the absolute zero point
  // is irrelevant.
  return Date.UTC(y, m - 1, d, 0, 0, 0, 0) + minutes * 60_000;
}
