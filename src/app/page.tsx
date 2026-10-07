import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { AddedNotice } from "@/components/AddedNotice";
import { ChevronRightIcon } from "@/components/icons";
import { AttentionCard, JobRow, VisitRow } from "@/components/JobCard";
import { btn, cx, EmptyState, SectionHeader, type Tone } from "@/components/ui";
import { buildDashboard } from "@/lib/attention";
import { OWNER_NAME } from "@/lib/config";
import { getActiveJobs } from "@/lib/data";
import { formatLongToday, greeting } from "@/lib/dates";

export const dynamic = "force-dynamic";

const SECTION_NAMES = {
  overdue: "Overdue",
  today: "Due today",
  stale: "Needs an update",
  scheduled_today: "Scheduled today",
  upcoming: "Coming up",
  closed: "Closed",
} as const;

export default async function Home({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const { added } = await searchParams;
  const jobs = await getActiveJobs();
  const d = buildDashboard(jobs);
  const addedJob = added ? [...d.overdue, ...d.today, ...d.stale, ...d.scheduledToday, ...d.upcoming].find((j) => j.id === added) : undefined;
  // Make sure a just-added job is visible even if it would be past the "coming up" preview.
  const upcomingPreview = d.upcoming.filter((j, i) => i < 4 || j.id === added);
  const hl = (id: string) => id === added;

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] lg:pt-8">
      {addedJob && (
        <AddedNotice
          key={addedJob.id}
          text={`Added ${addedJob.customer.name} → ${SECTION_NAMES[addedJob.state.bucket]}${addedJob.next_action ? ` · ${addedJob.next_action}` : ""}`}
        />
      )}
      {/* Greeting + the 5-second answer: stacked on phones, side by side on desktop. */}
      <div className="lg:flex lg:items-center lg:justify-between lg:gap-8">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{formatLongToday()}</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 xl:text-3xl">
              {greeting()}, {OWNER_NAME}
            </h1>
          </div>
          {/* On desktop the account menu lives in the top bar. */}
          <div className="lg:hidden">
            <AccountMenu />
          </div>
        </header>

        <section
          className={cx(
            "mt-5 rounded-3xl p-5 text-white shadow-lg lg:mt-0 lg:flex lg:items-center lg:gap-6 lg:px-6 lg:py-4",
            d.attentionCount > 0
              ? "bg-gradient-to-br from-slate-900 to-slate-800 shadow-slate-900/20"
              : "bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-emerald-700/20",
          )}
        >
          {d.attentionCount > 0 ? (
            <>
              <div className="lg:shrink-0">
                <p className="text-[15px] font-medium text-white/70">Needs your attention</p>
                <p className="mt-0.5 text-4xl font-bold tracking-tight lg:text-3xl">
                  {d.attentionCount} job{d.attentionCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[13px] font-semibold lg:mt-0">
                {d.overdue.length > 0 && <Pill className="bg-red-500/90">{d.overdue.length} overdue</Pill>}
                {d.today.length > 0 && <Pill className="bg-orange-500/90">{d.today.length} due today</Pill>}
                {d.stale.length > 0 && <Pill className="bg-amber-400/90 text-amber-950">{d.stale.length} need an update</Pill>}
                {d.valueAtStake > 0 && (
                  <Pill className="bg-white/15">${d.valueAtStake.toLocaleString("en-US")} on the line</Pill>
                )}
              </div>
            </>
          ) : (
            <div>
              <p className="text-[15px] font-medium text-white/80">Needs your attention</p>
              <p className="mt-0.5 text-3xl font-bold tracking-tight">All caught up ✓</p>
              <p className="mt-1 text-sm text-white/80">Nothing overdue, due today or going stale.</p>
            </div>
          )}
        </section>
      </div>

      {/* What needs her today: one list on phones, three columns on desktop. */}
      <div className="mt-7 space-y-8 lg:mt-8 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6 lg:space-y-0">
        <Column tone="red" title="Overdue" count={d.overdue.length} empty="Nothing overdue 🎉">
          {d.overdue.map((j) => (
            <AttentionCard key={j.id} job={j} highlight={hl(j.id)} />
          ))}
        </Column>
        <Column tone="orange" title="Due today" count={d.today.length} empty="Nothing else due today">
          {d.today.map((j) => (
            <AttentionCard key={j.id} job={j} highlight={hl(j.id)} />
          ))}
        </Column>
        <Column tone="amber" title="Needs an update" count={d.stale.length} hint="Gone quiet" empty="Every job is up to date">
          {d.stale.map((j) => (
            <AttentionCard key={j.id} job={j} highlight={hl(j.id)} />
          ))}
        </Column>
      </div>

      {/* Today's visits and what's next: below on phones, side by side on desktop. */}
      <div className="mt-8 space-y-8 lg:mt-10 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <section>
          <SectionHeader tone="teal" title="Scheduled today" count={d.scheduledToday.length} />
          {d.scheduledToday.length > 0 ? (
            <div className="space-y-2.5">
              {d.scheduledToday.map((j) => (
                <VisitRow key={j.id} job={j} highlight={hl(j.id)} />
              ))}
            </div>
          ) : (
            <Placeholder>No visits booked for today.</Placeholder>
          )}
        </section>

        <section className={cx(upcomingPreview.length === 0 && "hidden lg:block")}>
          <SectionHeader tone="slate" title="Coming up" count={d.upcoming.length} />
          {upcomingPreview.length > 0 ? (
            <div className="space-y-2.5">
              {upcomingPreview.map((j) => (
                <JobRow key={j.id} job={j} highlight={hl(j.id)} />
              ))}
            </div>
          ) : (
            <Placeholder>Nothing scheduled after today.</Placeholder>
          )}
          {d.upcoming.length > upcomingPreview.length && (
            <Link href="/jobs" className="mt-3 flex items-center justify-center gap-1 py-2 text-sm font-semibold text-brand-600">
              See all {d.upcoming.length} <ChevronRightIcon className="h-4 w-4" />
            </Link>
          )}
        </section>
      </div>

      <div className={cx(jobs.length === 0 && "mt-8")}>
        {jobs.length === 0 && (
          <EmptyState
            icon="🧊"
            title="No active jobs"
            body="When a call, text or form comes in, add it here so it can't slip through the cracks."
            action={
              <Link href="/jobs/new" className={cx(btn.base, btn.primary, btn.lg)}>
                Add a job
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}

/** A dashboard section. Empty ones disappear on phones but keep their column on desktop. */
function Column({
  tone,
  title,
  count,
  hint,
  empty,
  children,
}: {
  tone: Tone;
  title: string;
  count: number;
  hint?: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cx(count === 0 && "hidden lg:block")}>
      <SectionHeader tone={tone} title={title} count={count} hint={hint} />
      {count > 0 ? <div className="space-y-3">{children}</div> : <Placeholder>{empty}</Placeholder>}
    </section>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-white/70 px-4 py-4 text-sm text-slate-500 ring-1 ring-slate-200/70">{children}</p>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cx("rounded-full px-2.5 py-1", className)}>{children}</span>;
}
