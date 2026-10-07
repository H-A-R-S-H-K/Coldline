"use client";

import { useState } from "react";
import { recordOutcome } from "@/app/actions";
import { addDays, formatDayKey, todayKey } from "@/lib/dates";
import type { JobStatus } from "@/lib/types";
import { LOST_REASONS, NEXT_ACTION_SUGGESTIONS, outcomesFor, STATUS_META, type Outcome } from "@/lib/workflow";
import { Chip, DuePicker, ErrorText, inputCls, Label, VisitPicker } from "./fields";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { Sheet } from "./Sheet";
import { btn, cx } from "./ui";
import { useAction } from "./useAction";

export interface UpdatableJob {
  id: string;
  customerName: string;
  status: JobStatus;
  nextAction: string | null;
  dueOn: string | null;
  estimatedValue: number | null;
}

/** The "What happened?" button + sheet. The main way Denise moves a job forward. */
export function UpdateButton({
  job,
  label = "What happened?",
  className,
}: {
  job: UpdatableJob;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? cx(btn.base, btn.primary, btn.md, "flex-1")}>
        {label}
      </button>
      {open && <UpdateSheet job={job} onClose={() => setOpen(false)} />}
    </>
  );
}

function UpdateSheet({ job, onClose }: { job: UpdatableJob; onClose: () => void }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const outcomes = outcomesFor(job.status);

  return (
    <Sheet
      open
      onClose={onClose}
      title={outcome ? `${outcome.icon} ${outcome.label}` : "What happened?"}
      subtitle={
        <>
          <span className="font-medium text-slate-700">{job.customerName}</span>
          {" · "}
          {STATUS_META[job.status].label}
        </>
      }
    >
      {outcome ? (
        <OutcomeForm key={outcome.key} job={job} outcome={outcome} onBack={() => setOutcome(null)} onDone={onClose} />
      ) : (
        <div className="space-y-2 pb-2">
          {job.nextAction && (
            <p className="mb-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
              Next step was <span className="font-semibold text-slate-800">{job.nextAction}</span>
              {job.dueOn && <> · {formatDayKey(job.dueOn).toLowerCase()}</>}
            </p>
          )}
          {outcomes.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setOutcome(o)}
              className={cx(
                "flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 ring-inset transition active:scale-[0.99]",
                o.tone === "good" && "bg-emerald-50/60 ring-emerald-200 hover:bg-emerald-50",
                o.tone === "bad" && "bg-red-50/50 ring-red-200 hover:bg-red-50",
                o.tone === "neutral" && "bg-white ring-slate-200 hover:bg-slate-50",
              )}
            >
              <span className="text-xl" aria-hidden>
                {o.icon}
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold text-slate-900">{o.label}</span>
                <span className="block text-xs text-slate-500">{resultHint(o, job.status)}</span>
              </span>
              <ChevronRightIcon className="h-4 w-4 text-slate-400" />
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function resultHint(o: Outcome, status: JobStatus): string {
  if (o.toStatus === "done") return "Closes the job";
  if (o.toStatus === "lost") return "Closes the job as lost";
  if (o.key === "snoozed") return "Keeps it as is, reminds you later";
  if (o.key === "other") return "Write a note, adjust the next step";
  const to = o.toStatus && o.toStatus !== status ? `→ ${STATUS_META[o.toStatus].label}` : "Stays " + STATUS_META[status].label;
  return o.nextAction && o.toStatus !== "scheduled" ? `${to} · then “${o.nextAction}”` : to;
}

function OutcomeForm({
  job,
  outcome,
  onBack,
  onDone,
}: {
  job: UpdatableJob;
  outcome: Outcome;
  onBack: () => void;
  onDone: () => void;
}) {
  const today = todayKey();
  const keepsStatus = outcome.toStatus === null;
  const [visit, setVisit] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState(
    outcome.nextAction ?? (keepsStatus ? (job.nextAction ?? "") : ""),
  );
  const [dueOn, setDueOn] = useState<string | null>(
    outcome.dueInDays !== undefined
      ? addDays(today, outcome.dueInDays)
      : job.dueOn && job.dueOn >= today
        ? job.dueOn
        : today,
  );
  const [value, setValue] = useState(job.estimatedValue ? String(job.estimatedValue) : "");
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const { run, pending, error } = useAction(recordOutcome);

  const finalStatus: JobStatus =
    outcome.schedule === "optional" && visit ? "scheduled" : (outcome.toStatus ?? job.status);
  const closes = finalStatus === "done" || finalStatus === "lost";
  const asksNextStep = !closes && finalStatus !== "scheduled";

  function submit() {
    run(
      {
        jobId: job.id,
        outcome: outcome.key,
        scheduledAt: visit,
        nextAction: asksNextStep ? nextAction : null,
        dueOn: asksNextStep ? dueOn : null,
        estimatedValue: outcome.askValue ? value : null,
        note: [reason, note.trim()].filter(Boolean).join(" · "),
      },
      onDone,
    );
  }

  const saveLabel = closes
    ? finalStatus === "done"
      ? "Mark job done"
      : "Mark job lost"
    : finalStatus !== job.status
      ? `Save · move to ${STATUS_META[finalStatus].label}`
      : "Save";

  return (
    <form
      className="space-y-5 pb-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <button type="button" onClick={onBack} className="-ml-1 flex items-center gap-1 text-sm font-semibold text-brand-600">
        <ChevronLeftIcon className="h-4 w-4" /> Pick something else
      </button>

      {outcome.schedule && (
        <div>
          <Label hint={outcome.schedule === "optional" ? "Optional — skip if not booked yet" : undefined}>
            {outcome.schedule === "optional" ? "Already booked a visit?" : "When's the visit?"}
          </Label>
          <VisitPicker value={visit} onChange={setVisit} />
        </div>
      )}

      {outcome.askValue && (
        <div>
          <Label>Quote amount</Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">$</span>
            <input
              inputMode="decimal"
              className={cx(inputCls, "pl-7")}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      )}

      {finalStatus === "lost" && (
        <div>
          <Label>Why? (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {LOST_REASONS.map((r) => (
              <Chip key={r} active={reason === r} onClick={() => setReason(reason === r ? null : r)}>
                {r}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {asksNextStep && (
        <>
          <div>
            <Label>Next step</Label>
            <input
              className={inputCls}
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g. Call customer"
            />
            {keepsStatus && (
              <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
                {NEXT_ACTION_SUGGESTIONS.filter((s) => s !== nextAction).map((s) => (
                  <Chip key={s} onClick={() => setNextAction(s)} className="h-8 px-3 text-xs">
                    {s}
                  </Chip>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label>{outcome.key === "snoozed" ? "Remind me" : "When?"}</Label>
            <DuePicker value={dueOn} onChange={setDueOn} />
          </div>
        </>
      )}

      {finalStatus === "done" && (
        <p className="rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
          Nice work. This job will leave your list and stay in history.
        </p>
      )}

      <div>
        <Label>{outcome.noteRequired ? "What happened?" : "Note (optional)"}</Label>
        <textarea
          className={cx(inputCls, "min-h-20 resize-none")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={outcome.noteRequired ? "Quick note…" : "Anything worth remembering"}
          autoFocus={outcome.noteRequired}
        />
      </div>

      <ErrorText>{error}</ErrorText>

      <button
        type="submit"
        disabled={pending || (outcome.schedule === "required" && !visit) || (outcome.noteRequired && !note.trim())}
        className={cx(btn.base, closes && finalStatus === "lost" ? btn.dark : closes ? btn.success : btn.primary, btn.lg, "w-full")}
      >
        {pending ? "Saving…" : saveLabel}
      </button>
    </form>
  );
}
