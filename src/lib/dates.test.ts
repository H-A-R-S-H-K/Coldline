import { describe, expect, it } from "vitest";
import { addDays, dayKey, diffDays, formatDayKey, isoToZonedLocal, zonedLocalToIso } from "./dates";

// Business timezone is America/Chicago (see vitest.config.ts).

describe("zonedLocalToIso", () => {
  it("converts Chicago wall-clock time to UTC in summer (CDT, UTC-5)", () => {
    expect(zonedLocalToIso("2026-10-06T15:00")).toBe("2026-10-06T20:00:00.000Z");
  });

  it("converts Chicago wall-clock time to UTC in winter (CST, UTC-6)", () => {
    expect(zonedLocalToIso("2026-12-01T09:00")).toBe("2026-12-01T15:00:00.000Z");
  });

  it("handles the days clocks change", () => {
    expect(zonedLocalToIso("2026-03-08T12:00")).toBe("2026-03-08T17:00:00.000Z");
    expect(zonedLocalToIso("2026-11-01T12:00")).toBe("2026-11-01T18:00:00.000Z");
  });

  it("round-trips with isoToZonedLocal", () => {
    expect(isoToZonedLocal(zonedLocalToIso("2026-10-06T08:30"))).toBe("2026-10-06T08:30");
  });
});

describe("day keys", () => {
  it("uses Denise's calendar day, not UTC's", () => {
    // 11:30pm in Chicago is already the next day in UTC.
    expect(dayKey("2026-10-07T04:30:00Z")).toBe("2026-10-06");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts whole calendar days, even across a clock change", () => {
    expect(diffDays("2026-03-07", "2026-03-09")).toBe(2);
    expect(diffDays("2026-10-06", "2026-10-03")).toBe(-3);
  });

  it("formats relative day names", () => {
    const today = "2026-10-06"; // a Tuesday
    expect(formatDayKey("2026-10-06", today)).toBe("Today");
    expect(formatDayKey("2026-10-07", today)).toBe("Tomorrow");
    expect(formatDayKey("2026-10-05", today)).toBe("Yesterday");
    expect(formatDayKey("2026-10-08", today)).toBe("Thursday");
    expect(formatDayKey("2026-10-04", today)).toBe("Sunday");
    expect(formatDayKey("2026-10-20", today)).toBe("Oct 20");
  });
});
