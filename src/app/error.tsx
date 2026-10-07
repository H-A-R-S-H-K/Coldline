"use client";

import { btn, cx } from "@/components/ui";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl">⚠️</div>
      <h1 className="mt-3 text-lg font-bold text-slate-900">Couldn&apos;t load this</h1>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        {error.message.includes("fetch") ? "Check your connection and try again." : error.message}
      </p>
      <button onClick={reset} className={cx(btn.base, btn.primary, btn.lg, "mt-6")}>
        Try again
      </button>
    </div>
  );
}
