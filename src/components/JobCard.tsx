import Link from "next/link";
import type { JobWithState } from "@/lib/attention";
import { formatTime, timeAgo } from "@/lib/dates";
import { ArrowRightIcon, ChevronRightIcon, PhoneIcon } from "./icons";
import { btn, cx, Money, StatusBadge, UrgentBadge } from "./ui";
import { UpdateButton, type UpdatableJob } from "./UpdateSheet";

export function toUpdatable(job: JobWithState): UpdatableJob {
  return {
    id: job.id,
    customerName: job.customer.name,
    status: job.status,
    nextAction: job.next_action,
    dueOn: job.next_action_due_on,
    estimatedValue: job.estimated_value,
  };
}

const ACCENT = {
  overdue: "before:bg-red-500",
  today: "before:bg-orange-400",
  stale: "before:bg-amber-400",
  scheduled_today: "before:bg-teal-500",
  upcoming: "before:bg-slate-200",
  closed: "before:bg-slate-200",
} as const;

const DUE_TONE = {
  overdue: "text-red-600",
  today: "text-orange-600",
  stale: "text-slate-500",
  scheduled_today: "text-teal-700",
  upcoming: "text-slate-500",
  closed: "text-slate-500",
} as const;

export function CallButton({ phone, className }: { phone: string; className?: string }) {
  if (!phone) return null;
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
      className={cx(btn.base, btn.secondary, btn.md, "px-3.5", className)}
      aria-label={`Call ${phone}`}
    >
      <PhoneIcon className="h-4 w-4" />
      Call
    </a>
  );
}

/** Dashboard card: what is it, where is it, what's next, when — plus the actions. */
export function AttentionCard({ job, highlight }: { job: JobWithState; highlight?: boolean }) {
  const { state } = job;
  return (
    <article
      id={highlight ? "added-job" : undefined}
      className={cx(
        "relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70",
        highlight && "outline-2 outline-offset-2 outline-brand-500",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        ACCENT[state.bucket],
      )}
    >
      <Link href={`/jobs/${job.id}`} prefetch={false} className="block px-4 pb-3 pt-3.5 active:bg-slate-50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[17px] font-bold text-slate-900">{job.customer.name}</h3>
              {job.priority === "urgent" && <UrgentBadge />}
            </div>
            <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{job.issue}</p>
          </div>
          <Money value={job.estimated_value} className="shrink-0 pt-0.5 text-sm font-semibold text-slate-700" />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={job.status} />
          {state.dueLabel && <span className={cx("text-sm font-semibold", DUE_TONE[state.bucket])}>{state.dueLabel}</span>}
        </div>

        {job.next_action && (
          <p className="mt-2.5 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <ArrowRightIcon className="h-4 w-4 shrink-0 text-brand-600" />
            {job.next_action}
          </p>
        )}

      </Link>

      <div className="flex gap-2 border-t border-slate-100 px-3 py-2.5">
        <CallButton phone={job.customer.phone} />
        <UpdateButton job={toUpdatable(job)} />
      </div>
    </article>
  );
}

/** Today's visit, shown as a time row. */
export function VisitRow({ job, highlight }: { job: JobWithState; highlight?: boolean }) {
  return (
    <div
      id={highlight ? "added-job" : undefined}
      className={cx(
        "flex items-stretch gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70",
        highlight && "outline-2 outline-offset-2 outline-brand-500",
      )}
    >
      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-teal-50 text-teal-800">
        <span className="text-[15px] font-bold leading-tight">{job.scheduled_at ? formatTime(job.scheduled_at).replace(/ (AM|PM)/, "") : "—"}</span>
        <span className="text-[11px] font-semibold">{job.scheduled_at ? formatTime(job.scheduled_at).slice(-2) : ""}</span>
      </div>
      <Link href={`/jobs/${job.id}`} prefetch={false} className="min-w-0 flex-1 py-0.5">
        <p className="truncate text-[15px] font-bold text-slate-900">{job.customer.name}</p>
        <p className="line-clamp-1 text-sm text-slate-500">{job.issue}</p>
      </Link>
      <div className="flex shrink-0 items-center">
        <UpdateButton
          job={toUpdatable(job)}
          label="Update"
          className={cx(btn.base, btn.secondary, btn.sm)}
        />
      </div>
    </div>
  );
}

/** Compact row for the jobs list and "coming up". */
export function JobRow({ job, highlight }: { job: JobWithState; highlight?: boolean }) {
  const { state } = job;
  const closed = state.bucket === "closed";
  return (
    <Link
      href={`/jobs/${job.id}`}
      prefetch={false}
      id={highlight ? "added-job" : undefined}
      className={cx(
        highlight && "outline-2 outline-offset-2 outline-brand-500",
        "relative flex items-center gap-3 overflow-hidden rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200/70 active:bg-slate-50",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        ACCENT[state.bucket],
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cx("truncate text-[15px] font-bold", closed ? "text-slate-600" : "text-slate-900")}>
            {job.customer.name}
          </p>
          {job.priority === "urgent" && !closed && <UrgentBadge />}
        </div>
        <p className="line-clamp-1 text-sm text-slate-500">{job.issue}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge status={job.status} />
          {!closed && job.next_action && (
            <span className="text-[13px] font-medium text-slate-700">
              {job.next_action}
              {state.dueLabel && (
                <>
                  {" · "}
                  <span className={cx("font-semibold", DUE_TONE[state.bucket])}>
                    {state.bucket === "scheduled_today" && job.scheduled_at ? formatTime(job.scheduled_at) : state.dueLabel}
                  </span>
                </>
              )}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {closed ? "Closed" : "Last updated"} {timeAgo(job.last_updated_at)}
        </p>
      </div>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
    </Link>
  );
}
