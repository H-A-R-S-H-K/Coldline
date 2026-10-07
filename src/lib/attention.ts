import { STALE_AFTER_DAYS } from "./config";
import { dayKey, daysSince, diffDays, formatDayKey, todayKey } from "./dates";
import type { Job } from "./types";

/**
 * Decides where every job belongs on the dashboard. This is the heart of the
 * app: it never assumes a quiet job is fine — overdue, stale and
 * missing-next-step jobs are all surfaced for Denise to confirm.
 */

export type Bucket = "overdue" | "today" | "stale" | "scheduled_today" | "upcoming" | "closed";

export interface JobState {
  bucket: Bucket;
  /** true when no one has recorded anything on the job for longer than its threshold */
  isStale: boolean;
  daysSinceUpdate: number;
  overdueDays: number;
  /** Short line explaining why the job is where it is, e.g. "3 days overdue". */
  dueLabel: string | null;
}

export function jobState(job: Job, today = todayKey(), now = new Date()): JobState {
  const daysSinceUpdate = daysSince(job.last_updated_at, now);
  const base = { daysSinceUpdate, overdueDays: 0, isStale: false, dueLabel: null };

  if (job.status === "done" || job.status === "lost") return { ...base, bucket: "closed" };

  const threshold = STALE_AFTER_DAYS[job.status];
  const isStale = threshold !== null && daysSinceUpdate >= threshold;
  const dueText = (key: string) => `Due ${formatDayKey(key, today).replace(/^(Today|Tomorrow)$/, (w) => w.toLowerCase())}`;

  // Booked visits are driven by the visit date, not a follow-up date.
  if (job.status === "scheduled") {
    const visitDay = job.scheduled_at ? dayKey(job.scheduled_at) : job.next_action_due_on;
    if (!visitDay) {
      return { ...base, bucket: "stale", isStale: true, dueLabel: "No visit time set" };
    }
    const delta = diffDays(today, visitDay);
    if (delta < 0) {
      return {
        ...base,
        bucket: "overdue",
        overdueDays: -delta,
        isStale: true,
        dueLabel: `Visit was ${formatDayKey(visitDay, today).replace("Yesterday", "yesterday")}`,
      };
    }
    if (delta === 0) return { ...base, bucket: "scheduled_today", dueLabel: "Today" };
    return { ...base, bucket: "upcoming", dueLabel: formatDayKey(visitDay, today) };
  }

  if (!job.next_action || !job.next_action_due_on) {
    return { ...base, bucket: "stale", isStale: true, dueLabel: "No next step set" };
  }

  const delta = diffDays(today, job.next_action_due_on);
  if (delta < 0) {
    return {
      ...base,
      bucket: "overdue",
      overdueDays: -delta,
      isStale,
      dueLabel: -delta === 1 ? "1 day overdue" : `${-delta} days overdue`,
    };
  }
  if (delta === 0) return { ...base, bucket: "today", isStale, dueLabel: "Due today" };
  if (isStale) {
    return { ...base, bucket: "stale", isStale, dueLabel: dueText(job.next_action_due_on) };
  }
  return { ...base, bucket: "upcoming", dueLabel: dueText(job.next_action_due_on) };
}

export interface JobWithState extends Job {
  state: JobState;
}

export interface Dashboard {
  overdue: JobWithState[];
  today: JobWithState[];
  stale: JobWithState[];
  scheduledToday: JobWithState[];
  upcoming: JobWithState[];
  attentionCount: number;
  valueAtStake: number;
}

const value = (j: Job) => j.estimated_value ?? 0;
const urgentFirst = (a: Job, b: Job) => Number(b.priority === "urgent") - Number(a.priority === "urgent");

export function withState(jobs: Job[]): JobWithState[] {
  const today = todayKey();
  const now = new Date();
  return jobs.map((j) => ({ ...j, state: jobState(j, today, now) }));
}

export function buildDashboard(jobs: Job[]): Dashboard {
  const all = withState(jobs);
  const pick = (b: Bucket) => all.filter((j) => j.state.bucket === b);

  const overdue = pick("overdue").sort(
    (a, b) => urgentFirst(a, b) || b.state.overdueDays - a.state.overdueDays || value(b) - value(a),
  );
  const today = pick("today").sort((a, b) => urgentFirst(a, b) || value(b) - value(a));
  const stale = pick("stale").sort((a, b) => b.state.daysSinceUpdate - a.state.daysSinceUpdate);
  const scheduledToday = pick("scheduled_today").sort((a, b) =>
    (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""),
  );
  const upcoming = pick("upcoming").sort((a, b) =>
    (a.next_action_due_on ?? "").localeCompare(b.next_action_due_on ?? ""),
  );

  const attention = [...overdue, ...today, ...stale];
  return {
    overdue,
    today,
    stale,
    scheduledToday,
    upcoming,
    attentionCount: attention.length,
    valueAtStake: attention.reduce((sum, j) => sum + value(j), 0),
  };
}

export const needsAttention = (j: JobWithState) =>
  j.state.bucket === "overdue" || j.state.bucket === "today" || j.state.bucket === "stale";

/** Sort order for job lists: most urgent attention first, closed last. */
const BUCKET_RANK: Record<Bucket, number> = {
  overdue: 0,
  today: 1,
  stale: 2,
  scheduled_today: 3,
  upcoming: 4,
  closed: 5,
};

export function sortByAttention(jobs: JobWithState[]): JobWithState[] {
  return [...jobs].sort(
    (a, b) =>
      BUCKET_RANK[a.state.bucket] - BUCKET_RANK[b.state.bucket] ||
      (a.state.bucket === "closed"
        ? (b.closed_at ?? b.last_updated_at).localeCompare(a.closed_at ?? a.last_updated_at)
        : (a.next_action_due_on ?? "9999").localeCompare(b.next_action_due_on ?? "9999")),
  );
}
