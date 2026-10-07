export const JOB_STATUSES = [
  "new",
  "needs_scheduling",
  "scheduled",
  "waiting_on_quote",
  "waiting_on_customer",
  "in_progress",
  "done",
  "lost",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const ACTIVE_STATUSES: JobStatus[] = JOB_STATUSES.filter(
  (s) => s !== "done" && s !== "lost",
);

export const JOB_SOURCES = ["phone", "website", "repeat", "referral", "text", "other"] as const;
export type JobSource = (typeof JOB_SOURCES)[number];

export type Priority = "normal" | "urgent";

export interface Customer {
  id: string;
  name: string;
  phone: string;
}

export interface Job {
  id: string;
  customer_id: string;
  issue: string;
  status: JobStatus;
  priority: Priority;
  source: JobSource | null;
  estimated_value: number | null;
  next_action: string | null;
  /** YYYY-MM-DD in the business timezone */
  next_action_due_on: string | null;
  scheduled_at: string | null;
  closed_at: string | null;
  last_updated_at: string;
  created_at: string;
  customer: Customer;
}

export interface Activity {
  id: string;
  job_id: string;
  type: string;
  note: string | null;
  created_at: string;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
