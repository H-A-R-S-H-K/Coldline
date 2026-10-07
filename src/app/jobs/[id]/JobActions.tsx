"use client";

import { useState, type ReactNode } from "react";
import { addNote, changeStatus, completeJob, markLost, reopenJob, updateDetails } from "@/app/actions";
import { Chip, DuePicker, ErrorText, inputCls, Label, VisitPicker } from "@/components/fields";
import { Sheet } from "@/components/Sheet";
import { btn, cx } from "@/components/ui";
import { useAction } from "@/components/useAction";
import { addDays, todayKey } from "@/lib/dates";
import type { JobStatus, Priority } from "@/lib/types";
import { JOB_STATUSES } from "@/lib/types";
import { DEFAULT_NEXT_ACTION, LOST_REASONS, STATUS_META } from "@/lib/workflow";

interface ActionJob {
  id: string;
  status: JobStatus;
  issue: string;
  priority: Priority;
  estimatedValue: number | null;
  nextAction: string | null;
  dueOn: string | null;
}

type Panel = "note" | "status" | "complete" | "lost" | "edit" | null;

export function JobActions({ job }: { job: ActionJob }) {
  const [panel, setPanel] = useState<Panel>(null);
  const close = () => setPanel(null);
  const closed = job.status === "done" || job.status === "lost";
  const reopen = useAction(reopenJob);

  return (
    <>
      <section className="mt-4 grid grid-cols-2 gap-2">
        <ActionButton onClick={() => setPanel("note")}>📝 Add note</ActionButton>
        {closed ? (
          <ActionButton onClick={() => reopen.run({ jobId: job.id })} disabled={reopen.pending}>
            ↩️ {reopen.pending ? "Reopening…" : "Reopen job"}
          </ActionButton>
        ) : (
          <>
            <ActionButton onClick={() => setPanel("status")}>🔀 Change status</ActionButton>
            <ActionButton onClick={() => setPanel("complete")} className="text-emerald-700">
              ✅ Complete
            </ActionButton>
            <ActionButton onClick={() => setPanel("lost")} className="text-red-700">
              ✖️ Mark lost
            </ActionButton>
          </>
        )}
        <ActionButton onClick={() => setPanel("edit")} className={closed ? "" : "col-span-2"}>
          ✏️ Edit details
        </ActionButton>
      </section>
      {reopen.error && <ErrorText>{reopen.error}</ErrorText>}

      {panel === "note" && <NoteSheet jobId={job.id} onClose={close} />}
      {panel === "status" && <StatusSheet job={job} onClose={close} />}
      {panel === "complete" && <CompleteSheet jobId={job.id} onClose={close} />}
      {panel === "lost" && <LostSheet jobId={job.id} onClose={close} />}
      {panel === "edit" && <EditSheet job={job} onClose={close} />}
    </>
  );
}

function ActionButton({
  children,
  onClick,
  className,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(btn.base, btn.secondary, "h-12 justify-start px-4 text-sm", className)}
    >
      {children}
    </button>
  );
}

function SaveButton({ pending, label, tone = btn.primary, disabled }: { pending: boolean; label: string; tone?: string; disabled?: boolean }) {
  return (
    <button type="submit" disabled={pending || disabled} className={cx(btn.base, tone, btn.lg, "w-full")}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function NoteSheet({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [note, setNote] = useState("");
  const { run, pending, error } = useAction(addNote);
  return (
    <Sheet open onClose={onClose} title="Add a note">
      <form
        className="space-y-4 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          run({ jobId, note }, onClose);
        }}
      >
        <textarea
          className={cx(inputCls, "min-h-28 resize-none")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Called, spoke to the manager…"
          autoFocus
        />
        <ErrorText>{error}</ErrorText>
        <SaveButton pending={pending} label="Save note" disabled={!note.trim()} />
      </form>
    </Sheet>
  );
}

function StatusSheet({ job, onClose }: { job: ActionJob; onClose: () => void }) {
  const today = todayKey();
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [nextAction, setNextAction] = useState(job.nextAction ?? DEFAULT_NEXT_ACTION[job.status]?.action ?? "");
  const [dueOn, setDueOn] = useState<string | null>(job.dueOn && job.dueOn >= today ? job.dueOn : today);
  const [visit, setVisit] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const { run, pending, error } = useAction(changeStatus);

  function pick(s: JobStatus) {
    setStatus(s);
    const def = DEFAULT_NEXT_ACTION[s];
    if (def && s !== job.status) {
      setNextAction(def.action);
      setDueOn(addDays(today, def.dueInDays));
    }
  }

  const closes = status === "done" || status === "lost";
  return (
    <Sheet open onClose={onClose} title="Change status" subtitle="Prefer “What happened?” — this is for corrections.">
      <form
        className="space-y-5 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          run({ jobId: job.id, status, nextAction, dueOn, scheduledAt: visit, note }, onClose);
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {JOB_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => pick(s)}
              aria-pressed={status === s}
              className={cx(
                "flex h-11 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold ring-1 ring-inset",
                status === s ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200",
              )}
            >
              <span className={cx("h-2 w-2 shrink-0 rounded-full", STATUS_META[s].dot)} />
              {STATUS_META[s].label}
            </button>
          ))}
        </div>

        {status === "scheduled" ? (
          <div>
            <Label hint={job.status === "scheduled" ? "Leave empty to keep current" : undefined}>Visit</Label>
            <VisitPicker value={visit} onChange={setVisit} />
          </div>
        ) : (
          !closes && (
            <>
              <div>
                <Label>Next step</Label>
                <input className={inputCls} value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
              </div>
              <div>
                <Label>When?</Label>
                <DuePicker value={dueOn} onChange={setDueOn} />
              </div>
            </>
          )
        )}

        <div>
          <Label>Note (optional)</Label>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <ErrorText>{error}</ErrorText>
        <SaveButton
          pending={pending}
          label="Save"
          disabled={status === "scheduled" && job.status !== "scheduled" && !visit}
        />
      </form>
    </Sheet>
  );
}

function CompleteSheet({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [note, setNote] = useState("");
  const { run, pending, error } = useAction(completeJob);
  return (
    <Sheet open onClose={onClose} title="Mark job done?" subtitle="It leaves your list and stays in history.">
      <form
        className="space-y-4 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          run({ jobId, note }, onClose);
        }}
      >
        <div>
          <Label>Note (optional)</Label>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done" />
        </div>
        <ErrorText>{error}</ErrorText>
        <SaveButton pending={pending} label="Mark done" tone={btn.success} />
      </form>
    </Sheet>
  );
}

function LostSheet({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const { run, pending, error } = useAction(markLost);
  return (
    <Sheet open onClose={onClose} title="Mark job lost?" subtitle="It leaves your list and stays in history.">
      <form
        className="space-y-4 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          run({ jobId, reason, note }, onClose);
        }}
      >
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
        <div>
          <Label>Note (optional)</Label>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <ErrorText>{error}</ErrorText>
        <SaveButton pending={pending} label="Mark lost" tone={btn.dark} />
      </form>
    </Sheet>
  );
}

function EditSheet({ job, onClose }: { job: ActionJob; onClose: () => void }) {
  const [issue, setIssue] = useState(job.issue);
  const [value, setValue] = useState(job.estimatedValue ? String(job.estimatedValue) : "");
  const [urgent, setUrgent] = useState(job.priority === "urgent");
  const { run, pending, error } = useAction(updateDetails);
  return (
    <Sheet open onClose={onClose} title="Edit details">
      <form
        className="space-y-4 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          run({ jobId: job.id, issue, estimatedValue: value, priority: urgent ? "urgent" : "normal" }, onClose);
        }}
      >
        <div>
          <Label>What&apos;s wrong?</Label>
          <textarea className={cx(inputCls, "min-h-20 resize-none")} value={issue} onChange={(e) => setIssue(e.target.value)} />
        </div>
        <div>
          <Label>Estimated value</Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">$</span>
            <input className={cx(inputCls, "pl-7")} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
        </div>
        <Chip active={urgent} onClick={() => setUrgent((u) => !u)} className={urgent ? "!bg-red-600" : ""}>
          {urgent ? "🚨 Urgent" : "Mark urgent"}
        </Chip>
        <ErrorText>{error}</ErrorText>
        <SaveButton pending={pending} label="Save" />
      </form>
    </Sheet>
  );
}
