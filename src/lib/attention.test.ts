import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDashboard, jobState } from "./attention";
import type { Job } from "./types";

// "Now" is Tue Oct 6 2026, 10:00am in Chicago.
const NOW = new Date("2026-10-06T15:00:00Z");
const TODAY = "2026-10-06";
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

let seq = 0;
function job(overrides: Partial<Job>): Job {
  seq += 1;
  return {
    id: `job-${seq}`,
    customer_id: `c-${seq}`,
    issue: "Freezer down",
    status: "waiting_on_customer",
    priority: "normal",
    source: null,
    estimated_value: null,
    next_action: "Call customer",
    next_action_due_on: TODAY,
    scheduled_at: null,
    closed_at: null,
    last_updated_at: daysAgo(0),
    created_at: daysAgo(5),
    customer: { id: `c-${seq}`, name: `Customer ${seq}`, phone: "555-000-0000" },
    ...overrides,
  };
}

const bucketOf = (overrides: Partial<Job>) => jobState(job(overrides), TODAY, NOW).bucket;

describe("jobState", () => {
  it("flags a past due date as overdue, with how many days", () => {
    const s = jobState(job({ next_action_due_on: "2026-10-03" }), TODAY, NOW);
    expect(s.bucket).toBe("overdue");
    expect(s.overdueDays).toBe(3);
    expect(s.dueLabel).toBe("3 days overdue");
  });

  it("puts today's next action in 'today'", () => {
    expect(bucketOf({ next_action_due_on: TODAY })).toBe("today");
  });

  it("surfaces a quiet job as stale even when its due date is in the future", () => {
    // Waiting on Customer goes stale after 3 days without an update.
    expect(bucketOf({ next_action_due_on: "2026-10-09", last_updated_at: daysAgo(4) })).toBe("stale");
    expect(bucketOf({ next_action_due_on: "2026-10-09", last_updated_at: daysAgo(1) })).toBe("upcoming");
  });

  it("uses per-status thresholds: a new request goes stale after 1 day", () => {
    expect(bucketOf({ status: "new", next_action_due_on: "2026-10-08", last_updated_at: daysAgo(1) })).toBe("stale");
  });

  it("treats a job with no next step as needing an update", () => {
    const s = jobState(job({ next_action: null, next_action_due_on: null }), TODAY, NOW);
    expect(s.bucket).toBe("stale");
    expect(s.dueLabel).toBe("No next step set");
  });

  it("judges scheduled jobs by their visit date, not by quiet time", () => {
    const visitToday = { status: "scheduled" as const, scheduled_at: "2026-10-06T20:00:00Z", last_updated_at: daysAgo(9) };
    expect(bucketOf(visitToday)).toBe("scheduled_today");
    expect(bucketOf({ ...visitToday, scheduled_at: "2026-10-08T14:00:00Z" })).toBe("upcoming");
  });

  it("flags a visit that has passed but was never closed out", () => {
    const s = jobState(job({ status: "scheduled", scheduled_at: "2026-10-04T14:00:00Z" }), TODAY, NOW);
    expect(s.bucket).toBe("overdue");
    expect(s.dueLabel).toBe("Visit was Sunday");
  });

  it("takes done and lost jobs off the dashboard", () => {
    expect(bucketOf({ status: "done", next_action: null, next_action_due_on: null })).toBe("closed");
    expect(bucketOf({ status: "lost", next_action: null, next_action_due_on: null })).toBe("closed");
  });
});

describe("buildDashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("puts each job in exactly one section and counts what needs attention", () => {
    const jobs = [
      job({ next_action_due_on: "2026-10-01" }), // overdue
      job({ next_action_due_on: TODAY }), // today
      job({ next_action_due_on: "2026-10-09", last_updated_at: daysAgo(6) }), // stale
      job({ status: "scheduled", scheduled_at: "2026-10-06T20:00:00Z" }), // scheduled today
      job({ next_action_due_on: "2026-10-09" }), // upcoming
    ];
    const d = buildDashboard(jobs);
    expect([d.overdue, d.today, d.stale, d.scheduledToday, d.upcoming].map((s) => s.length)).toEqual([1, 1, 1, 1, 1]);
    expect(d.attentionCount).toBe(3);
  });

  it("lists urgent jobs first, then the most overdue", () => {
    const old = job({ next_action_due_on: "2026-10-01" });
    const recent = job({ next_action_due_on: "2026-10-05" });
    const urgent = job({ next_action_due_on: "2026-10-05", priority: "urgent" });
    expect(buildDashboard([recent, old, urgent]).overdue.map((j) => j.id)).toEqual([urgent.id, old.id, recent.id]);
  });

  it("sums the estimated value of jobs needing attention", () => {
    const d = buildDashboard([
      job({ next_action_due_on: "2026-10-01", estimated_value: 2000 }),
      job({ next_action_due_on: TODAY, estimated_value: 650 }),
      job({ next_action_due_on: "2026-10-20", estimated_value: 9999 }), // upcoming: not counted
    ]);
    expect(d.valueAtStake).toBe(2650);
  });
});
