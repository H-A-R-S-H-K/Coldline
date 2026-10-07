"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { cx } from "./ui";

type Toast = { id: number; text: string; kind: "success" | "error" };

const ToastContext = createContext<(text: string, kind?: Toast["kind"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((text: string, kind: Toast["kind"] = "success") => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), text, kind });
    timer.current = setTimeout(() => setToast(null), kind === "error" ? 5000 : 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[60]">
        {toast && (
          <div
            key={toast.id}
            className={cx(
              "animate-toast-in absolute top-[calc(env(safe-area-inset-top)+12px)] left-1/2 lg:top-20 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl",
              toast.kind === "success" ? "bg-slate-900 text-white" : "bg-red-600 text-white",
            )}
          >
            {toast.kind === "success" ? "✓ " : ""}
            {toast.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
