import type { JobSource, JobStatus } from "./types";

/* -------------------------------------------------------------------------- */
/* Statuses                                                                    */
/* -------------------------------------------------------------------------- */

export const STATUS_META: Record<JobStatus, { label: string; badge: string; dot: string }> = {
  new: { label: "New", badge: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  needs_scheduling: {
    label: "Needs Scheduling",
    badge: "bg-violet-50 text-violet-800 ring-violet-200",
    dot: "bg-violet-500",
  },
  scheduled: { label: "Scheduled", badge: "bg-teal-50 text-teal-800 ring-teal-200", dot: "bg-teal-500" },
  waiting_on_quote: {
    label: "Waiting on Quote",
    badge: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200",
    dot: "bg-fuchsia-500",
  },
  waiting_on_customer: {
    label: "Waiting on Customer",
    badge: "bg-blue-50 text-blue-800 ring-blue-200",
    dot: "bg-blue-500",
  },
  in_progress: { label: "In Progress", badge: "bg-cyan-50 text-cyan-800 ring-cyan-200", dot: "bg-cyan-500" },
  done: { label: "Done", badge: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  lost: { label: "Lost", badge: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};

/** What the next step usually is when a job lands in a status. */
export const DEFAULT_NEXT_ACTION: Record<JobStatus, { action: string; dueInDays: number } | null> = {
  new: { action: "Call customer back", dueInDays: 0 },
  needs_scheduling: { action: "Schedule the job", dueInDays: 0 },
  scheduled: { action: "Do the job", dueInDays: 0 }, // due date = visit day
  waiting_on_quote: { action: "Send quote", dueInDays: 1 },
  waiting_on_customer: { action: "Follow up with customer", dueInDays: 2 },
  in_progress: { action: "Check on progress", dueInDays: 1 },
  done: null,
  lost: null,
};

export const NEXT_ACTION_SUGGESTIONS = [
  "Call customer back",
  "Schedule the job",
  "Send quote",
  "Follow up with customer",
  "Order parts",
];

export const SOURCE_LABELS: Record<JobSource, string> = {
  phone: "Phone call",
  website: "Website",
  repeat: "Repeat customer",
  referral: "Referral",
  text: "Text / WhatsApp",
  other: "Other",
};

export const LOST_REASONS = [
  "Went with someone else",
  "Too expensive",
  "Never heard back",
  "Fixed it themselves",
];

/* -------------------------------------------------------------------------- */
/* "What happened?" outcomes                                                   */
/* -------------------------------------------------------------------------- */

export type OutcomeKey =
  | "called_back"
  | "job_scheduled"
  | "quote_needed"
  | "quote_sent"
  | "customer_approved"
  | "customer_declined"
  | "needs_more_time"
  | "no_response"
  | "job_completed"
  | "work_started"
  | "waiting_on_parts"
  | "reschedule"
  | "snoozed"
  | "other";

export interface Outcome {
  key: OutcomeKey;
  label: string;
  icon: string;
  tone: "good" | "bad" | "neutral";
  /** null = status stays the same */
  toStatus: JobStatus | null;
  nextAction?: string;
  dueInDays?: number;
  /** visit date/time: required, optional (approved → can book straight away), or not asked */
  schedule?: "required" | "optional";
  askValue?: boolean;
  noteRequired?: boolean;
}

export const OUTCOMES: Record<OutcomeKey, Outcome> = {
  called_back: {
    key: "called_back",
    label: "Talked — needs a visit",
    icon: "📞",
    tone: "good",
    toStatus: "needs_scheduling",
    nextAction: "Schedule the job",
    dueInDays: 0,
  },
  job_scheduled: {
    key: "job_scheduled",
    label: "Visit booked",
    icon: "📅",
    tone: "good",
    toStatus: "scheduled",
    nextAction: "Do the job",
    schedule: "required",
  },
  quote_needed: {
    key: "quote_needed",
    label: "Needs a quote",
    icon: "🧾",
    tone: "neutral",
    toStatus: "waiting_on_quote",
    nextAction: "Send quote",
    dueInDays: 1,
  },
  quote_sent: {
    key: "quote_sent",
    label: "Quote sent",
    icon: "📨",
    tone: "good",
    toStatus: "waiting_on_customer",
    nextAction: "Follow up on quote",
    dueInDays: 2,
    askValue: true,
  },
  customer_approved: {
    key: "customer_approved",
    label: "Customer approved",
    icon: "👍",
    tone: "good",
    toStatus: "needs_scheduling",
    nextAction: "Schedule the job",
    dueInDays: 0,
    schedule: "optional",
  },
  customer_declined: {
    key: "customer_declined",
    label: "Customer declined",
    icon: "👎",
    tone: "bad",
    toStatus: "lost",
  },
  needs_more_time: {
    key: "needs_more_time",
    label: "Needs more time",
    icon: "⏳",
    tone: "neutral",
    toStatus: null,
    nextAction: "Follow up with customer",
    dueInDays: 3,
  },
  no_response: {
    key: "no_response",
    label: "No answer / left message",
    icon: "📵",
    tone: "neutral",
    toStatus: null,
    nextAction: "Try calling again",
    dueInDays: 1,
  },
  job_completed: {
    key: "job_completed",
    label: "Job completed",
    icon: "✅",
    tone: "good",
    toStatus: "done",
  },
  work_started: {
    key: "work_started",
    label: "Visited — needs more work",
    icon: "🔧",
    tone: "neutral",
    toStatus: "in_progress",
    nextAction: "Check on progress",
    dueInDays: 1,
  },
  waiting_on_parts: {
    key: "waiting_on_parts",
    label: "Waiting on parts",
    icon: "📦",
    tone: "neutral",
    toStatus: "in_progress",
    nextAction: "Check if part arrived",
    dueInDays: 2,
  },
  reschedule: {
    key: "reschedule",
    label: "Needs rescheduling",
    icon: "↩️",
    tone: "neutral",
    toStatus: "needs_scheduling",
    nextAction: "Reschedule the job",
    dueInDays: 0,
  },
  snoozed: {
    key: "snoozed",
    label: "No change — check later",
    icon: "💤",
    tone: "neutral",
    toStatus: null,
    dueInDays: 2,
  },
  other: {
    key: "other",
    label: "Something else",
    icon: "✏️",
    tone: "neutral",
    toStatus: null,
    noteRequired: true,
  },
};

/** Which answers make sense for each status, most likely first. */
const OUTCOMES_BY_STATUS: Record<JobStatus, OutcomeKey[]> = {
  new: ["called_back", "job_scheduled", "quote_needed", "no_response", "customer_declined"],
  needs_scheduling: ["job_scheduled", "no_response", "needs_more_time", "customer_declined"],
  scheduled: ["job_completed", "work_started", "reschedule", "customer_declined"],
  waiting_on_quote: ["quote_sent", "customer_declined"],
  waiting_on_customer: ["customer_approved", "customer_declined", "needs_more_time", "no_response"],
  in_progress: ["job_completed", "waiting_on_parts", "job_scheduled"],
  done: [],
  lost: [],
};

/** Status-specific wording, e.g. a declined *scheduled* job is a cancellation. */
const LABEL_OVERRIDES: Partial<Record<JobStatus, Partial<Record<OutcomeKey, string>>>> = {
  scheduled: { customer_declined: "Customer cancelled" },
  in_progress: { job_scheduled: "Return visit booked" },
};

export function outcomesFor(status: JobStatus): Outcome[] {
  const keys = OUTCOMES_BY_STATUS[status];
  if (keys.length === 0) return [];
  return [...keys, "snoozed" as const, "other" as const].map((k) => ({
    ...OUTCOMES[k],
    label: LABEL_OVERRIDES[status]?.[k] ?? OUTCOMES[k].label,
  }));
}

/* -------------------------------------------------------------------------- */
/* Activity labels                                                             */
/* -------------------------------------------------------------------------- */

const ACTIVITY_LABELS: Record<string, string> = {
  created: "Job created",
  note: "Note",
  message: "Customer message",
  status_changed: "Status changed",
  visit_done: "Site visit",
  marked_lost: "Marked lost",
  reopened: "Reopened",
  details_updated: "Details updated",
  snoozed: "Checked — no change",
};

export function activityLabel(type: string): string {
  return ACTIVITY_LABELS[type] ?? OUTCOMES[type as OutcomeKey]?.label ?? type.replace(/_/g, " ");
}

export function activityIcon(type: string): string {
  const map: Record<string, string> = {
    created: "✨",
    note: "📝",
    message: "💬",
    status_changed: "🔀",
    visit_done: "🔧",
    marked_lost: "✖️",
    reopened: "↩️",
    details_updated: "✏️",
  };
  return map[type] ?? OUTCOMES[type as OutcomeKey]?.icon ?? "•";
}
