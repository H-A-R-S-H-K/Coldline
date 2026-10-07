"use client";

import { useRef, type ReactNode } from "react";
import { addDays, formatDayKey, todayKey } from "@/lib/dates";
import { cx } from "./ui";

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <span className="text-sm font-semibold text-slate-700">{children}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  );
}

export const inputCls =
  "block w-full rounded-xl border-0 bg-slate-50 px-3.5 py-3 text-base text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500";

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition active:scale-95",
        active ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

const DUE_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
];

export function DuePicker({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const today = todayKey();
  const presetMatch = DUE_PRESETS.find((p) => addDays(today, p.days) === value);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {DUE_PRESETS.map((p) => (
          <Chip key={p.label} active={presetMatch?.label === p.label} onClick={() => onChange(addDays(today, p.days))}>
            {p.label}
          </Chip>
        ))}
        <DateChip
          label={value && !presetMatch ? formatDayKey(value) : "Pick date"}
          active={Boolean(value && !presetMatch)}
          value={value}
          min={today}
          onChange={onChange}
          ariaLabel="Pick a due date"
        />
      </div>
    </div>
  );
}

/**
 * A chip that opens the native date picker on every tap. (An invisible date
 * input laid over the chip only opened when the tap hit its hidden calendar
 * icon, so it worked "sometimes".)
 */
function DateChip({
  label,
  active,
  value,
  min,
  onChange,
  ariaLabel,
}: {
  label: string;
  active: boolean;
  value: string | null;
  min: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  const input = useRef<HTMLInputElement>(null);

  function open() {
    const el = input.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      // Older browsers without showPicker(): focusing/clicking opens the native picker.
      el.focus();
      el.click();
    }
  }

  return (
    <span className="relative">
      <Chip active={active} onClick={open}>
        📅 {label}
      </Chip>
      <input
        ref={input}
        type="date"
        tabIndex={-1}
        aria-label={ariaLabel}
        className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
        value={value ?? ""}
        min={min}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </span>
  );
}

const TIME_PRESETS = [
  { label: "8 AM", value: "08:00" },
  { label: "10 AM", value: "10:00" },
  { label: "1 PM", value: "13:00" },
  { label: "3 PM", value: "15:00" },
];

/** Visit picker: a day + a time, emitted as "YYYY-MM-DDTHH:mm" (business timezone). */
export function VisitPicker({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const today = todayKey();
  const [day, time] = value ? value.split("T") : [null, null];
  const setDay = (d: string) => onChange(`${d}T${time ?? "10:00"}`);
  const setTime = (t: string) => onChange(`${day ?? addDays(today, 1)}T${t}`);
  const dayPresets = [0, 1, 2].map((n) => addDays(today, n));

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2">
        {dayPresets.map((d) => (
          <Chip key={d} active={day === d} onClick={() => setDay(d)}>
            {formatDayKey(d, today)}
          </Chip>
        ))}
        <DateChip
          label={day && !dayPresets.includes(day) ? formatDayKey(day, today) : "Other day"}
          active={Boolean(day && !dayPresets.includes(day))}
          value={day}
          min={today}
          onChange={setDay}
          ariaLabel="Pick visit date"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {TIME_PRESETS.map((t) => (
          <Chip key={t.value} active={time === t.value} onClick={() => setTime(t.value)}>
            {t.label}
          </Chip>
        ))}
        <input
          type="time"
          value={time ?? ""}
          onChange={(e) => e.target.value && setTime(e.target.value)}
          className="h-10 rounded-full bg-white px-3 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
          aria-label="Visit time"
        />
      </div>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
      {children}
    </p>
  );
}
