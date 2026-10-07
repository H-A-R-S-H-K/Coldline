import Link from "next/link";
import { SearchIcon } from "@/components/icons";
import { JobRow } from "@/components/JobCard";
import { cx, EmptyState } from "@/components/ui";
import { needsAttention, sortByAttention, withState, type JobWithState } from "@/lib/attention";
import { getAllJobs } from "@/lib/data";
import type { JobStatus } from "@/lib/types";

export const metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; match: (j: JobWithState) => boolean }[] = [
  { key: "active", label: "All active", match: (j) => j.state.bucket !== "closed" },
  { key: "attention", label: "Needs attention", match: needsAttention },
  ...(
    [
      ["new", "New"],
      ["needs_scheduling", "Needs Scheduling"],
      ["waiting_on_customer", "Waiting on Customer"],
      ["waiting_on_quote", "Waiting on Quote"],
      ["scheduled", "Scheduled"],
      ["in_progress", "In Progress"],
      ["done", "Done"],
      ["lost", "Lost"],
    ] as [JobStatus, string][]
  ).map(([status, label]) => ({ key: status, label, match: (j: JobWithState) => j.status === status })),
  { key: "all", label: "Everything", match: () => true },
];

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f = "active", q = "" } = await searchParams;
  const filter = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const all = withState(await getAllJobs());

  const query = q.trim().toLowerCase();
  const searched = query
    ? all.filter((j) => `${j.customer.name} ${j.issue} ${j.customer.phone}`.toLowerCase().includes(query))
    : all;
  const jobs = sortByAttention(searched.filter(filter.match));

  const href = (key: string) => {
    const p = new URLSearchParams();
    if (key !== "active") p.set("f", key);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/jobs?${s}` : "/jobs";
  };

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+1rem)] lg:pt-8">
      <div className="px-4 lg:flex lg:items-center lg:justify-between lg:gap-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Jobs</h1>
        <form className="relative mt-3 lg:mt-0 lg:w-96" action="/jobs">
          {f !== "active" && <input type="hidden" name="f" value={f} />}
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            type="search"
            placeholder="Search customer, problem or phone"
            className="block h-11 w-full rounded-xl border-0 bg-white pl-10 pr-3 text-base text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </form>
      </div>

      <nav className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:mt-5 lg:flex-wrap lg:overflow-visible" aria-label="Filter jobs">
        {FILTERS.map((x) => {
          const count = searched.filter(x.match).length;
          const active = x.key === filter.key;
          return (
            <Link
              key={x.key}
              href={href(x.key)}
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={cx(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition",
                active ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-inset ring-slate-200",
                x.key === "attention" && !active && count > 0 && "text-red-700 ring-red-200",
              )}
            >
              {x.label}
              <span className={cx("text-xs", active ? "text-white/60" : "text-slate-400")}>{count}</span>
            </Link>
          );
        })}
      </nav>

      <div className={cx("mt-3 space-y-2.5 px-4", jobs.length > 0 && "lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 xl:grid-cols-3")}>
        {jobs.length > 0 ? (
          jobs.map((j) => <JobRow key={j.id} job={j} />)
        ) : (
          <EmptyState
            icon={query ? "🔍" : "📭"}
            title={query ? `No jobs match “${q}”` : `No ${filter.label.toLowerCase()} jobs`}
            body={query ? "Try a different name or phone number." : "Nothing here right now."}
          />
        )}
      </div>
    </div>
  );
}
