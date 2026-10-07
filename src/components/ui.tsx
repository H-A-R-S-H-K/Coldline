import type { ReactNode } from "react";
import type { JobStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/workflow";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export const btn = {
  base: "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none",
  primary: "bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700",
  dark: "bg-slate-900 text-white hover:bg-slate-800",
  secondary: "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  danger: "bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  lg: "h-12 px-5 text-[15px]",
  md: "h-11 px-4 text-sm",
  sm: "h-9 px-3 text-sm",
};

export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap",
        meta.badge,
        className,
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function UrgentBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
      Urgent
    </span>
  );
}

export function Money({ value, className }: { value: number | null; className?: string }) {
  if (value === null || value === 0) return null;
  return (
    <span className={cx("tabular-nums", className)}>
      ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
    </span>
  );
}

const TONES = {
  red: { dot: "bg-red-500", text: "text-red-700" },
  orange: { dot: "bg-orange-500", text: "text-orange-700" },
  amber: { dot: "bg-amber-400", text: "text-amber-700" },
  teal: { dot: "bg-teal-500", text: "text-teal-700" },
  slate: { dot: "bg-slate-400", text: "text-slate-600" },
} as const;

export type Tone = keyof typeof TONES;

export function SectionHeader({
  tone,
  title,
  count,
  hint,
}: {
  tone: Tone;
  title: string;
  count?: number;
  hint?: string;
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between px-1">
      <h2 className={cx("flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider", TONES[tone].text)}>
        <span className={cx("h-2 w-2 rounded-full", TONES[tone].dot)} />
        {title}
        {count !== undefined && <span className="font-semibold text-slate-400">{count}</span>}
      </h2>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {body && <p className="mt-1 max-w-xs text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl bg-slate-200/70", className)} />;
}
