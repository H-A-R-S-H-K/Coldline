"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createJob } from "@/app/actions";
import { Chip, DuePicker, ErrorText, inputCls, Label, VisitPicker } from "@/components/fields";
import { ChevronLeftIcon, MessageIcon } from "@/components/icons";
import { btn, cx } from "@/components/ui";
import { addDays, todayKey } from "@/lib/dates";
import { extractFromMessage } from "@/lib/extract";
import type { Customer, JobSource, JobStatus } from "@/lib/types";
import { DEFAULT_NEXT_ACTION, NEXT_ACTION_SUGGESTIONS, SOURCE_LABELS, STATUS_META } from "@/lib/workflow";

const STATUS_CHOICES: JobStatus[] = ["new", "needs_scheduling", "waiting_on_quote", "scheduled", "waiting_on_customer", "in_progress"];

export function AddJobForm({ customers }: { customers: Customer[] }) {
  const today = todayKey();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [issue, setIssue] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [status, setStatus] = useState<JobStatus>("new");
  const [nextAction, setNextAction] = useState(DEFAULT_NEXT_ACTION.new!.action);
  const [nextActionEdited, setNextActionEdited] = useState(false);
  const [dueOn, setDueOn] = useState<string | null>(today);
  const [visit, setVisit] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [source, setSource] = useState<JobSource | null>(null);
  const [notes, setNotes] = useState("");
  const [showMore, setShowMore] = useState(false);

  const [showPaste, setShowPaste] = useState(false);
  const [message, setMessage] = useState("");
  const [phoneFromMessage, setPhoneFromMessage] = useState<string | null>(null);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const knownCustomer = useMemo(
    () => customers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase()),
    [customers, name],
  );

  function pickStatus(s: JobStatus) {
    setStatus(s);
    const def = DEFAULT_NEXT_ACTION[s];
    if (def && !nextActionEdited) setNextAction(def.action);
    if (def) setDueOn(addDays(today, def.dueInDays));
  }

  function onNameChange(v: string) {
    setName(v);
    const match = customers.find((c) => c.name.toLowerCase() === v.trim().toLowerCase());
    if (match) {
      if (!phone) setPhone(match.phone);
      if (!source) setSource("repeat");
    }
  }

  function onMessageChange(text: string) {
    setMessage(text);
    // Only the phone number is read from the message; it never overwrites one Denise typed.
    const found = extractFromMessage(text).phone;
    if (found && (!phone || phone === phoneFromMessage)) {
      setPhone(found);
      setPhoneFromMessage(found);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await createJob({
        customerName: name,
        phone,
        issue,
        status,
        priority: urgent ? "urgent" : "normal",
        source: source ?? (message.trim() ? "text" : null),
        estimatedValue: value,
        nextAction: status === "scheduled" ? null : nextAction,
        dueOn: status === "scheduled" ? null : dueOn,
        scheduledAt: status === "scheduled" ? visit : null,
        notes,
        message: message.trim() || null,
      });
      // On success the action redirects to the dashboard.
      if (result && !result.ok) {
        setError(result.error);
        setPending(false);
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  const canSubmit = name.trim() && phone.trim() && issue.trim() && (status !== "scheduled" || visit);

  return (
    <form onSubmit={submit} className="pb-32">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/70 bg-canvas/90 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-lg">
        <Link href="/" className="flex h-10 items-center gap-1 rounded-xl px-2 text-[15px] font-semibold text-brand-600">
          <ChevronLeftIcon className="h-5 w-5" /> Cancel
        </Link>
        <h1 className="text-base font-bold text-slate-900">New job</h1>
        <span className="w-20" />
      </header>

      <div className="space-y-5 px-4 pt-4">
        {/* Paste a message */}
        <div className="rounded-2xl bg-brand-50 ring-1 ring-brand-100">
          <button
            type="button"
            onClick={() => setShowPaste((s) => !s)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left"
            aria-expanded={showPaste}
          >
            <MessageIcon className="h-5 w-5 text-brand-600" />
            <span className="flex-1">
              <span className="block text-sm font-semibold text-slate-900">Paste a customer message</span>
              <span className="block text-xs text-slate-500">Text, WhatsApp or email — saved to the job’s history</span>
            </span>
            <span className="text-sm font-semibold text-brand-600">{showPaste ? "Hide" : "Paste"}</span>
          </button>
          {showPaste && (
            <div className="space-y-3 px-4 pb-4">
              <textarea
                className={cx(inputCls, "min-h-28 bg-white")}
                placeholder={`"Hi Denise, our walk-in freezer stopped working, can someone come tomorrow? Call me on 555-415-7720"`}
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                aria-label="Customer message"
              />
              {message.trim() && (
                <p className="text-xs text-slate-600">
                  {phoneFromMessage && phone === phoneFromMessage
                    ? `📞 Phone number filled in from the message (${phoneFromMessage}).`
                    : !extractFromMessage(message).phone
                      ? "No phone number found in the message — add it below."
                      : null}{" "}
                  The message will be saved to the job’s history.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <Label hint={knownCustomer ? <span className="font-semibold text-emerald-600">✓ Existing customer</span> : undefined}>
            Customer
          </Label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="ABC Restaurant"
            list="customer-list"
            autoComplete="off"
            autoCapitalize="words"
            required
          />
          <datalist id="customer-list">
            {customers.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </div>

        <div>
          <Label>Phone</Label>
          <input
            className={inputCls}
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="555-123-4567"
            autoComplete="off"
            required
          />
        </div>

        <div>
          <Label>What&apos;s wrong?</Label>
          <textarea
            className={cx(inputCls, "min-h-20 resize-none")}
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            placeholder="Walk-in freezer is down"
            required
          />
          <div className="mt-2">
            <Chip active={urgent} onClick={() => setUrgent((u) => !u)} className={urgent ? "!bg-red-600" : ""}>
              {urgent ? "🚨 Urgent" : "Mark urgent"}
            </Chip>
          </div>
        </div>

        <div>
          <Label>Status</Label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_CHOICES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pickStatus(s)}
                aria-pressed={status === s}
                className={cx(
                  "flex h-12 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold ring-1 ring-inset transition active:scale-[0.98]",
                  status === s ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200",
                )}
              >
                <span className={cx("h-2 w-2 shrink-0 rounded-full", STATUS_META[s].dot)} />
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        {status === "scheduled" ? (
          <div>
            <Label>When&apos;s the visit?</Label>
            <VisitPicker value={visit} onChange={setVisit} />
          </div>
        ) : (
          <>
            <div>
              <Label>Next action</Label>
              <input
                className={inputCls}
                value={nextAction}
                onChange={(e) => {
                  setNextAction(e.target.value);
                  setNextActionEdited(true);
                }}
              />
              <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
                {NEXT_ACTION_SUGGESTIONS.filter((s) => s !== nextAction).map((s) => (
                  <Chip
                    key={s}
                    onClick={() => {
                      setNextAction(s);
                      setNextActionEdited(true);
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    {s}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <Label>Due</Label>
              <DuePicker value={dueOn} onChange={setDueOn} />
            </div>
          </>
        )}

        {/* Optional details */}
        {showMore ? (
          <div className="space-y-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
            <div>
              <Label hint="Optional">Estimated value</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">$</span>
                <input
                  className={cx(inputCls, "pl-7")}
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label hint="Optional">How did it come in?</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SOURCE_LABELS) as JobSource[]).map((s) => (
                  <Chip key={s} active={source === s} onClick={() => setSource(source === s ? null : s)} className="h-9 px-3">
                    {SOURCE_LABELS[s]}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <Label hint="Optional">Notes</Label>
              <textarea
                className={cx(inputCls, "min-h-20 resize-none")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gate code, best time to call, who referred them…"
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="w-full rounded-xl py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50"
          >
            + Value, source, notes
          </button>
        )}

        <ErrorText>{error}</ErrorText>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-lg">
        <div className="mx-auto max-w-lg px-4 py-3">
          <button type="submit" disabled={pending || !canSubmit} className={cx(btn.base, btn.primary, btn.lg, "w-full")}>
            {pending ? "Saving…" : "Create job"}
          </button>
        </div>
      </div>
    </form>
  );
}
