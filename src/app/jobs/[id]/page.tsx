import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, ChevronLeftIcon, MessageIcon } from "@/components/icons";
import { CallButton, toUpdatable } from "@/components/JobCard";
import { btn, cx, Money, StatusBadge, UrgentBadge } from "@/components/ui";
import { UpdateButton } from "@/components/UpdateSheet";
import { withState } from "@/lib/attention";
import { getJob } from "@/lib/data";
import { formatDateTime, formatShortDate, formatTime, timeAgo } from "@/lib/dates";
import { activityIcon, activityLabel, SOURCE_LABELS } from "@/lib/workflow";
import { JobActions } from "./JobActions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getJob(id).catch(() => null);
  return { title: data?.job.customer.name ?? "Job" };
}

const NEXT_TONE = {
  overdue: "bg-red-50 ring-red-200",
  today: "bg-orange-50 ring-orange-200",
  stale: "bg-amber-50 ring-amber-200",
  scheduled_today: "bg-teal-50 ring-teal-200",
  upcoming: "bg-white ring-slate-200",
  closed: "bg-white ring-slate-200",
} as const;

const DUE_TEXT = {
  overdue: "text-red-700",
  today: "text-orange-700",
  stale: "text-amber-800",
  scheduled_today: "text-teal-800",
  upcoming: "text-slate-600",
  closed: "text-slate-600",
} as const;

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getJob(id);
  if (!data) notFound();

  const [job] = withState([data.job]);
  const { state } = job;
  const closed = state.bucket === "closed";
  const phoneHref = job.customer.phone.replace(/[^\d+]/g, "");

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center border-b border-slate-200/70 bg-canvas/90 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-lg">
        <Link href="/" className="flex h-10 items-center gap-1 rounded-xl px-2 text-[15px] font-semibold text-brand-600">
          <ChevronLeftIcon className="h-5 w-5" /> Today
        </Link>
      </header>

      <div className="px-4 pt-4">
        {/* What is this job? */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{job.customer.name}</h1>
            <p className="mt-1 text-[15px] text-slate-600">{job.issue}</p>
          </div>
          <Money value={job.estimated_value} className="shrink-0 pt-1 text-lg font-bold text-slate-800" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={job.status} />
          {job.priority === "urgent" && !closed && <UrgentBadge />}
        </div>

        {/* What should I do next, and when? */}
        {!closed ? (
          <section className={cx("mt-5 rounded-2xl p-4 ring-1 ring-inset", NEXT_TONE[state.bucket])}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Next step</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900">
              <ArrowRightIcon className="h-5 w-5 shrink-0 text-brand-600" />
              {job.next_action ?? "No next step set"}
            </p>
            {(state.dueLabel || job.scheduled_at) && (
              <p className={cx("mt-1 text-sm font-semibold", DUE_TEXT[state.bucket])}>
                {job.status === "scheduled" && job.scheduled_at
                  ? `Visit ${formatDateTime(job.scheduled_at)}`
                  : state.dueLabel}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <UpdateButton job={toUpdatable(job)} className={cx(btn.base, btn.primary, btn.lg, "flex-1")} />
            </div>
          </section>
        ) : (
          <section className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-inset ring-slate-200">
            <p className="text-sm text-slate-600">
              {job.status === "done" ? "✅ Completed" : "✖️ Lost"} {timeAgo(job.closed_at ?? job.last_updated_at)}.
              It&apos;s off your list but kept here for history.
            </p>
          </section>
        )}

        {/* Contact */}
        <section className="mt-4 flex gap-2">
          <CallButton phone={job.customer.phone} className="h-12 flex-1" />
          {phoneHref && (
            <a href={`sms:${phoneHref}`} className={cx(btn.base, btn.secondary, "h-12 flex-1 px-3.5 text-sm")}>
              <MessageIcon className="h-4 w-4" /> Text
            </a>
          )}
        </section>

        {/* Facts */}
        <dl className="mt-4 divide-y divide-slate-100 rounded-2xl bg-white px-4 ring-1 ring-slate-200/70">
          <Fact label="Phone" value={job.customer.phone || "—"} />
          {job.scheduled_at && (job.status === "scheduled" || job.status === "in_progress") && (
            <Fact label="Visit" value={`${formatShortDate(job.scheduled_at)}, ${formatTime(job.scheduled_at)}`} />
          )}
          <Fact label="Last updated" value={timeAgo(job.last_updated_at)} />
          <Fact label="Came in" value={`${formatShortDate(job.created_at)}${job.source ? ` · ${SOURCE_LABELS[job.source]}` : ""}`} />
        </dl>

        <JobActions
          job={{
            id: job.id,
            status: job.status,
            issue: job.issue,
            priority: job.priority,
            estimatedValue: job.estimated_value,
            nextAction: job.next_action,
            dueOn: job.next_action_due_on,
          }}
        />

        {/* History */}
        <section className="mt-8">
          <h2 className="mb-3 px-1 text-[13px] font-bold uppercase tracking-wider text-slate-500">Activity</h2>
          {data.activities.length === 0 ? (
            <p className="px-1 text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ol className="relative space-y-4 pl-1">
              <span className="absolute bottom-3 left-[18px] top-3 w-px bg-slate-200" aria-hidden />
              {data.activities.map((a) => (
                <li key={a.id} className="relative flex gap-3">
                  <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-base ring-1 ring-slate-200">
                    {activityIcon(a.type)}
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{activityLabel(a.type)}</p>
                      <time className="shrink-0 text-xs text-slate-400" dateTime={a.created_at} title={formatDateTime(a.created_at)}>
                        {formatShortDate(a.created_at)}
                      </time>
                    </div>
                    {a.note && (
                      <p
                        className={cx(
                          "mt-0.5 whitespace-pre-line text-sm text-slate-600",
                          a.type === "message" && "mt-1.5 rounded-xl rounded-tl-sm bg-slate-100 px-3 py-2 italic",
                        )}
                      >
                        {a.note}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={cx("text-right text-sm font-medium text-slate-900", tone)}>{value}</dd>
    </div>
  );
}
