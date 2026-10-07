"use client";

import { useEffect, useRef, useState } from "react";
import { resetDemoData, signOut } from "@/app/actions";
import { OWNER_NAME } from "@/lib/config";
import { useAction } from "./useAction";

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reset = useAction(resetDemoData);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {OWNER_NAME.charAt(0)}
      </button>
      {open && (
        <div className="animate-fade-in absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-200">
          <button
            disabled={reset.pending}
            onClick={() => {
              if (confirm("Replace all jobs with fresh demo data?")) reset.run(undefined, () => setOpen(false));
            }}
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {reset.pending ? "Resetting…" : "Reset demo data"}
          </button>
          {reset.error && <p className="px-3 pb-2 text-xs text-red-600">{reset.error}</p>}
          <form action={signOut}>
            <button className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
