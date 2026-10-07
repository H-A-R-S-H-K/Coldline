"use client";

import { useState } from "react";
import type { ActionResult } from "@/lib/types";
import { useToast } from "./Toast";

/**
 * Runs a server action, shows a toast with the result and keeps track of the
 * pending/error state for the form that triggered it. The action revalidates,
 * so the updated page arrives with its response.
 */
export function useAction<A>(action: (args: A) => Promise<ActionResult>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function run(args: A, onSuccess?: (r: ActionResult) => void) {
    setError(null);
    setPending(true);
    try {
      const result = await action(args);
      if (result.ok) {
        if (result.message) toast(result.message);
        onSuccess?.(result);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return { run, pending, error, setError };
}
