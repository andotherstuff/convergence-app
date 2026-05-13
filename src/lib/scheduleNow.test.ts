import { describe, expect, it } from "vitest";
import {
  flattenSchedule,
  getZonedNow,
  matchNow,
} from "@/lib/scheduleNow";
import type { ScheduleDay } from "@/hooks/useEventDetails";

const SCHEDULE: ScheduleDay[] = [
  {
    day: "Day 1 — Friday, May 29",
    date: "2026-05-29",
    subtitle: "Orientation & Open Space",
    items: [
      {
        time: "09:00–10:00",
        start: "09:00",
        end: "10:00",
        event: "Arrival & Breakfast",
      },
      {
        time: "10:00–11:00",
        start: "10:00",
        end: "11:00",
        event: "Opening Session",
      },
      {
        time: "12:30–13:30",
        start: "12:30",
        end: "13:30",
        event: "Lunch",
      },
    ],
  },
  {
    day: "Day 2 — Saturday, May 30",
    date: "2026-05-30",
    subtitle: "Hackathon Launch",
    items: [
      {
        time: "09:00–09:30",
        start: "09:00",
        end: "09:30",
        event: "Coffee & Breakfast",
      },
      {
        time: "09:30–10:30",
        start: "09:30",
        end: "10:30",
        event: "Hackathon Kickoff",
      },
    ],
  },
];

describe("flattenSchedule", () => {
  it("flattens days into a sorted item list", () => {
    const items = flattenSchedule(SCHEDULE);
    expect(items.map((i) => i.event)).toEqual([
      "Arrival & Breakfast",
      "Opening Session",
      "Lunch",
      "Coffee & Breakfast",
      "Hackathon Kickoff",
    ]);
  });

  it("skips days without a date", () => {
    const items = flattenSchedule([
      { day: "x", subtitle: "y", items: [{ time: "09:00–10:00", event: "z" }] },
    ]);
    expect(items).toEqual([]);
  });

  it("parses the time range when start/end aren't pre-parsed", () => {
    const items = flattenSchedule([
      {
        day: "Day 1",
        date: "2026-05-29",
        subtitle: "x",
        items: [{ time: "09:00–10:00", event: "Arrival" }],
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].startMinutes).toBe(9 * 60);
    expect(items[0].endMinutes).toBe(10 * 60);
  });
});

describe("matchNow", () => {
  const items = flattenSchedule(SCHEDULE);

  it("returns 'before' when the event has not started yet", () => {
    const result = matchNow(
      { date: "2026-05-28", minutes: 12 * 60, epochMs: 0 },
      items,
    );
    expect(result.state).toBe("before");
    if (result.state === "before") {
      expect(result.next.event).toBe("Arrival & Breakfast");
      expect(result.minutesUntilStart).toBe(21 * 60); // 24h - 3h
    }
  });

  it("returns 'current' when an item is in progress", () => {
    // 10:30 on Day 1 — Opening Session runs 10:00–11:00.
    const result = matchNow(
      { date: "2026-05-29", minutes: 10 * 60 + 30, epochMs: 0 },
      items,
    );
    expect(result.state).toBe("current");
    if (result.state === "current") {
      expect(result.current.event).toBe("Opening Session");
      expect(result.minutesUntilEnd).toBe(30);
      expect(result.next?.event).toBe("Lunch");
    }
  });

  it("returns 'upcoming' between items on the same day", () => {
    // 11:30 on Day 1 — between Opening (ends 11:00) and Lunch (starts 12:30).
    const result = matchNow(
      { date: "2026-05-29", minutes: 11 * 60 + 30, epochMs: 0 },
      items,
    );
    expect(result.state).toBe("upcoming");
    if (result.state === "upcoming") {
      expect(result.next.event).toBe("Lunch");
      expect(result.minutesUntilNext).toBe(60);
    }
  });

  it("treats the overnight gap as 'upcoming' towards next day", () => {
    // 22:00 Day 1, after Lunch ends but before Day 2 starts.
    const result = matchNow(
      { date: "2026-05-29", minutes: 22 * 60, epochMs: 0 },
      items,
    );
    expect(result.state).toBe("upcoming");
    if (result.state === "upcoming") {
      expect(result.next.event).toBe("Coffee & Breakfast");
      // 22:00 Day 1 → 09:00 Day 2 = 11h.
      expect(result.minutesUntilNext).toBe(11 * 60);
    }
  });

  it("returns 'after' once the final item has ended", () => {
    const result = matchNow(
      { date: "2026-05-31", minutes: 18 * 60, epochMs: 0 },
      items,
    );
    expect(result.state).toBe("after");
  });

  it("treats the exact start instant as 'current'", () => {
    const result = matchNow(
      { date: "2026-05-29", minutes: 10 * 60, epochMs: 0 },
      items,
    );
    expect(result.state).toBe("current");
    if (result.state === "current") {
      expect(result.current.event).toBe("Opening Session");
    }
  });

  it("treats the exact end instant as no longer 'current'", () => {
    // 11:00 — Opening Session ends; should be 'upcoming' towards Lunch.
    const result = matchNow(
      { date: "2026-05-29", minutes: 11 * 60, epochMs: 0 },
      items,
    );
    expect(result.state).toBe("upcoming");
    if (result.state === "upcoming") {
      expect(result.next.event).toBe("Lunch");
    }
  });

  it("returns 'after' when the schedule is empty", () => {
    expect(matchNow({ date: "2026-05-29", minutes: 0, epochMs: 0 }, []))
      .toEqual({ state: "after" });
  });
});

describe("getZonedNow", () => {
  it("returns the Oslo wall-clock for a known UTC instant", () => {
    // 2026-05-29T08:30:00Z = 10:30 in Europe/Oslo (CEST, UTC+2).
    const result = getZonedNow(
      new Date("2026-05-29T08:30:00Z"),
      "Europe/Oslo",
    );
    expect(result.date).toBe("2026-05-29");
    expect(result.minutes).toBe(10 * 60 + 30);
  });

  it("crosses date boundaries correctly", () => {
    // 2026-05-29T22:30:00Z = 00:30 next day in Oslo.
    const result = getZonedNow(
      new Date("2026-05-29T22:30:00Z"),
      "Europe/Oslo",
    );
    expect(result.date).toBe("2026-05-30");
    expect(result.minutes).toBe(30);
  });
});
