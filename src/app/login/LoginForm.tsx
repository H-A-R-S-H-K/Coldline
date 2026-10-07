"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions";
import { ErrorText, inputCls, Label } from "@/components/fields";
import { btn, cx } from "@/components/ui";

export function LoginForm({ next, showDemo }: { next: string; showDemo: boolean }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <Label>Email</Label>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputCls}
          defaultValue={showDemo ? "denise@example.com" : ""}
        />
      </label>
      <label className="block">
        <Label>Password</Label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputCls}
          defaultValue={showDemo ? "followup123" : ""}
        />
      </label>
      <ErrorText>{state?.error}</ErrorText>
      <button disabled={pending} className={cx(btn.base, btn.primary, btn.lg, "w-full")}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {showDemo && <p className="text-center text-xs text-slate-400">Demo login is pre-filled.</p>}
    </form>
  );
}
