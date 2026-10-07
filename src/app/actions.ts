"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BUSINESS_TZ } from "@/lib/config";
import { addDays, dayKey, formatDateTime, formatDayKey, todayKey, zonedLocalToIso } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, JobSource, JobStatus, Priority } from "@/lib/types";
import { JOB_SOURCES, JOB_STATUSES } from "@/lib/types";
import { DEFAULT_NEXT_ACTION, OUTCOMES, outcomesFor, SOURCE_LABELS, STATUS_META, type OutcomeKey } from "@/lib/workflow";

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export async function signIn(_prev: { error?: string } | undefined, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    // Network failures (e.g. Supabase not running) have no HTTP status.
    if (!error.status || error.status >= 500) {
      return { error: "Can't reach the database right now. Check that Supabase is running, then try again." };
    }
    return { error: "That email and password didn't match." };
  }
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Please sign in again.");
  return supabase;
}

const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const isDayKey = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

function parseMoney(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseVisit(local: unknown): string | null {
  if (typeof local !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return null;
  return zonedLocalToIso(local);
}

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/** Re-renders every screen with fresh data; the action response carries the new page. */
function refresh() {
  revalidatePath("/", "layout");
}

function fail(e: unknown): ActionResult {
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong. Try again." };
}

interface Transition {
  status: JobStatus;
  nextAction?: string | null;
  dueOn?: string | null;
  scheduledAt?: string | null;
}

/**
 * Resolves what a job should look like in its new status: every active job
 * leaves with a next action and due date; closed jobs leave with neither.
 */
function resolveTransition(t: Transition, prev?: { scheduled_at: string | null }) {
  const closed = t.status === "done" || t.status === "lost";
  if (closed) {
    return { status: t.status, next_action: null, next_action_due_on: null, closed_at: new Date().toISOString() };
  }

  if (t.status === "scheduled") {
    const visit = t.scheduledAt ?? prev?.scheduled_at ?? null;
    if (!visit) throw new Error("Pick a date and time for the visit.");
    return {
      status: t.status,
      scheduled_at: visit,
      next_action: clean(t.nextAction) ?? DEFAULT_NEXT_ACTION.scheduled!.action,
      next_action_due_on: dayKey(visit),
      closed_at: null,
    };
  }

  const fallback = DEFAULT_NEXT_ACTION[t.status]!;
  return {
    status: t.status,
    // a visit only matters while scheduled / in progress
    scheduled_at: t.status === "in_progress" ? (prev?.scheduled_at ?? null) : null,
    next_action: clean(t.nextAction) ?? fallback.action,
    next_action_due_on: isDayKey(t.dueOn) ? t.dueOn : addDays(todayKey(), fallback.dueInDays),
    closed_at: null,
  };
}

async function applyUpdate(
  jobId: string,
  build: (job: { status: JobStatus; scheduled_at: string | null; next_action: string | null }) => {
    patch: Record<string, unknown>;
    activity: { type: string; note: string | null };
    message: string;
  },
): Promise<ActionResult> {
  try {
    const supabase = await authed();
    const { data: job, error } = await supabase
      .from("jobs")
      .select("status, scheduled_at, next_action")
      .eq("id", jobId)
      .single();
    if (error || !job) throw new Error("Couldn't find that job.");

    const { patch, activity, message } = build(job);
    const now = new Date().toISOString();

    const { error: upErr } = await supabase
      .from("jobs")
      .update({ ...patch, last_updated_at: now })
      .eq("id", jobId);
    if (upErr) throw new Error(upErr.message);

    const { error: actErr } = await supabase.from("activities").insert({ job_id: jobId, ...activity });
    if (actErr) throw new Error(actErr.message);

    refresh();
    return { ok: true, message };
  } catch (e) {
    return fail(e);
  }
}

function describe(patch: { status: JobStatus; next_action?: string | null; next_action_due_on?: string | null }) {
  if (patch.status === "done") return "Marked done 🎉";
  if (patch.status === "lost") return "Marked lost";
  const when = patch.next_action_due_on ? formatDayKey(patch.next_action_due_on) : "";
  return `${STATUS_META[patch.status].label} · ${patch.next_action}${when ? ` — ${when}` : ""}`;
}

/* -------------------------------------------------------------------------- */
/* Create job                                                                  */
/* -------------------------------------------------------------------------- */

export interface CreateJobInput {
  customerName: string;
  phone: string;
  issue: string;
  status: JobStatus;
  priority?: Priority;
  source?: JobSource | null;
  estimatedValue?: string | number | null;
  nextAction?: string | null;
  dueOn?: string | null;
  /** "YYYY-MM-DDTHH:mm" wall-clock in the business timezone */
  scheduledAt?: string | null;
  notes?: string | null;
  message?: string | null;
}

/** On success this redirects to the dashboard, highlighting the new job; it only returns on failure. */
export async function createJob(input: CreateJobInput): Promise<ActionResult> {
  let jobId: string;
  try {
    const name = clean(input.customerName);
    const phone = clean(input.phone);
    const issue = clean(input.issue);
    if (!name) throw new Error("Add the customer's name.");
    if (!phone) throw new Error("Add a phone number so you can call them back.");
    if (!issue) throw new Error("Say what's wrong, even briefly.");
    if (!JOB_STATUSES.includes(input.status)) throw new Error("Pick a status.");

    const supabase = await authed();

    // Reuse the customer if we've seen this phone number (or exact name) before.
    const digits = phone.replace(/\D/g, "");
    let customerId: string | null = null;
    if (digits.length >= 7) {
      const { data } = await supabase.from("customers").select("id").eq("phone_digits", digits).limit(1);
      customerId = data?.[0]?.id ?? null;
    }
    if (!customerId) {
      const { data } = await supabase.from("customers").select("id, phone").ilike("name", name).limit(1);
      if (data?.[0]) {
        customerId = data[0].id;
        if (!data[0].phone) await supabase.from("customers").update({ phone }).eq("id", customerId);
      }
    }
    if (!customerId) {
      const { data, error } = await supabase.from("customers").insert({ name, phone }).select("id").single();
      if (error) throw new Error(error.message);
      customerId = data.id;
    }

    const transition = resolveTransition({
      status: input.status,
      nextAction: input.nextAction,
      dueOn: input.dueOn,
      scheduledAt: parseVisit(input.scheduledAt),
    });

    const source = input.source && JOB_SOURCES.includes(input.source) ? input.source : null;
    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        customer_id: customerId,
        issue,
        priority: input.priority === "urgent" ? "urgent" : "normal",
        source,
        estimated_value: parseMoney(input.estimatedValue),
        ...transition,
        closed_at: transition.closed_at,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const activities: { job_id: string; type: string; note: string | null }[] = [
      { job_id: job.id, type: "created", note: source ? `Came in via ${SOURCE_LABELS[source].toLowerCase()}.` : null },
    ];
    if (clean(input.message)) activities.push({ job_id: job.id, type: "message", note: clean(input.message) });
    if (clean(input.notes)) activities.push({ job_id: job.id, type: "note", note: clean(input.notes) });
    if (transition.status === "scheduled" && "scheduled_at" in transition && transition.scheduled_at) {
      activities.push({ job_id: job.id, type: "job_scheduled", note: `Visit ${formatDateTime(transition.scheduled_at)}` });
    }
    await supabase.from("activities").insert(activities);

    jobId = job.id;
  } catch (e) {
    return fail(e);
  }
  refresh();
  redirect(`/?added=${jobId}`);
}

/* -------------------------------------------------------------------------- */
/* "What happened?"                                                            */
/* -------------------------------------------------------------------------- */

export interface OutcomeInput {
  jobId: string;
  outcome: OutcomeKey;
  nextAction?: string | null;
  dueOn?: string | null;
  scheduledAt?: string | null;
  estimatedValue?: string | number | null;
  note?: string | null;
}

export async function recordOutcome(input: OutcomeInput): Promise<ActionResult> {
  const outcome = OUTCOMES[input.outcome];
  return applyUpdate(input.jobId, (job) => {
    if (!outcome || !outcomesFor(job.status).some((o) => o.key === outcome.key)) {
      throw new Error("That update doesn't apply to this job anymore. Refresh and try again.");
    }
    const note = clean(input.note);
    if (outcome.noteRequired && !note) throw new Error("Add a quick note about what happened.");

    const visit = parseVisit(input.scheduledAt);
    if (outcome.schedule === "required" && !visit) throw new Error("Pick a date and time for the visit.");

    let status = outcome.toStatus ?? job.status;
    if (outcome.schedule === "optional" && visit) status = "scheduled";

    const patch: Record<string, unknown> & Transition = resolveTransition(
      {
        status,
        nextAction:
          status === "scheduled"
            ? null // defaults to "Do the job" on the visit day
            : (clean(input.nextAction) ?? outcome.nextAction ?? (outcome.toStatus ? null : job.next_action)),
        dueOn: input.dueOn ?? (outcome.dueInDays !== undefined ? addDays(todayKey(), outcome.dueInDays) : null),
        scheduledAt: visit,
      },
      job,
    );
    if (job.status === "scheduled" && status !== "scheduled" && status !== "in_progress") patch.scheduled_at = null;

    const value = parseMoney(input.estimatedValue);
    if (value !== null) patch.estimated_value = value;

    const details = [
      note,
      status === "scheduled" && patch.scheduled_at ? `Visit ${formatDateTime(String(patch.scheduled_at))}` : null,
      value !== null ? `Quote ${money(value)}` : null,
      outcome.key === "snoozed" && patch.next_action_due_on ? `Check again ${formatDayKey(String(patch.next_action_due_on)).toLowerCase()}` : null,
    ].filter(Boolean);

    return {
      patch,
      activity: { type: outcome.key, note: details.join(" · ") || null },
      message: describe(patch as Transition),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Direct edits from the job page                                              */
/* -------------------------------------------------------------------------- */

export async function changeStatus(input: {
  jobId: string;
  status: JobStatus;
  nextAction?: string | null;
  dueOn?: string | null;
  scheduledAt?: string | null;
  note?: string | null;
}): Promise<ActionResult> {
  return applyUpdate(input.jobId, (job) => {
    if (!JOB_STATUSES.includes(input.status)) throw new Error("Pick a status.");
    const patch = resolveTransition(
      {
        status: input.status,
        nextAction: input.nextAction,
        dueOn: input.dueOn,
        scheduledAt: parseVisit(input.scheduledAt),
      },
      job,
    );
    const changed = job.status !== input.status;
    const line = changed
      ? `${STATUS_META[job.status].label} → ${STATUS_META[input.status].label}`
      : `Next step: ${patch.next_action}`;
    return {
      patch,
      activity: { type: "status_changed", note: [line, clean(input.note)].filter(Boolean).join(" · ") },
      message: describe(patch),
    };
  });
}

export async function addNote(input: { jobId: string; note: string }): Promise<ActionResult> {
  return applyUpdate(input.jobId, () => {
    const note = clean(input.note);
    if (!note) throw new Error("Write something first.");
    return { patch: {}, activity: { type: "note", note }, message: "Note added" };
  });
}

export async function completeJob(input: { jobId: string; note?: string | null }): Promise<ActionResult> {
  return applyUpdate(input.jobId, () => ({
    patch: resolveTransition({ status: "done" }),
    activity: { type: "job_completed", note: clean(input.note) },
    message: "Marked done 🎉",
  }));
}

export async function markLost(input: { jobId: string; reason?: string | null; note?: string | null }): Promise<ActionResult> {
  return applyUpdate(input.jobId, () => ({
    patch: resolveTransition({ status: "lost" }),
    activity: { type: "marked_lost", note: [clean(input.reason), clean(input.note)].filter(Boolean).join(" · ") || null },
    message: "Marked lost",
  }));
}

export async function reopenJob(input: { jobId: string }): Promise<ActionResult> {
  return applyUpdate(input.jobId, (job) => {
    const patch = resolveTransition({ status: "needs_scheduling" });
    return {
      patch,
      activity: { type: "reopened", note: `Was ${STATUS_META[job.status].label}` },
      message: describe(patch),
    };
  });
}

export async function updateDetails(input: {
  jobId: string;
  issue: string;
  estimatedValue?: string | number | null;
  priority: Priority;
}): Promise<ActionResult> {
  return applyUpdate(input.jobId, () => {
    const issue = clean(input.issue);
    if (!issue) throw new Error("Say what's wrong, even briefly.");
    return {
      patch: { issue, estimated_value: parseMoney(input.estimatedValue), priority: input.priority === "urgent" ? "urgent" : "normal" },
      activity: { type: "details_updated", note: null },
      message: "Saved",
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Demo                                                                        */
/* -------------------------------------------------------------------------- */

export async function resetDemoData(): Promise<ActionResult> {
  try {
    const supabase = await authed();
    const { error } = await supabase.rpc("reset_demo_data", { tz: BUSINESS_TZ });
    if (error) throw new Error(error.message);
    refresh();
    return { ok: true, message: "Demo data reset" };
  } catch (e) {
    return fail(e);
  }
}
