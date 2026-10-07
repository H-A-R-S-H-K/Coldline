import type { JobStatus } from "./types";

/** Who's using the app and where. */
export const OWNER_NAME = process.env.NEXT_PUBLIC_OWNER_NAME || "Denise";
export const BUSINESS_NAME = process.env.NEXT_PUBLIC_BUSINESS_NAME || "Coldline";

/**
 * Denise's local timezone. "Today", "overdue" and visit times are all
 * calculated in this zone so the server (UTC on Vercel) agrees with her phone.
 */
export const BUSINESS_TZ = process.env.NEXT_PUBLIC_BUSINESS_TZ || "America/Chicago";

/**
 * Stale-job thresholds: an active job with no recorded update for this many
 * days gets flagged "Needs update". Tune freely.
 *
 * `scheduled` is null because a booked job isn't stale while it waits for its
 * visit day — once the visit date passes it shows up as overdue instead.
 */
export const STALE_AFTER_DAYS: Record<JobStatus, number | null> = {
  new: 1, // the "forgotten Friday call" — never let a new request sit
  needs_scheduling: 2,
  waiting_on_quote: 2,
  waiting_on_customer: 3,
  in_progress: 3,
  scheduled: null,
  done: null,
  lost: null,
};
