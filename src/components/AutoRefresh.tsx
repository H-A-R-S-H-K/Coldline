"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { todayKey } from "@/lib/dates";

/** How long the app can sit in the background before it re-fetches on return. */
const STALE_AFTER_HIDDEN_MS = 2 * 60_000;

/**
 * Keeps an open screen current. Phones resume apps from memory instead of
 * reloading them, so without this Denise could open the app in the morning
 * and see yesterday's "Due today". router.refresh() re-renders the server
 * data but keeps client state (e.g. a half-filled form).
 */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let day = todayKey();
    let hiddenAt: number | null = null;

    const refresh = () => {
      day = todayKey();
      router.refresh();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      const awayLong = hiddenAt !== null && Date.now() - hiddenAt > STALE_AFTER_HIDDEN_MS;
      hiddenAt = null;
      if (awayLong || todayKey() !== day) refresh();
    };

    // Back/forward cache restores an old snapshot of the page.
    const onPageShow = (e: PageTransitionEvent) => e.persisted && refresh();

    // Midnight while the app is open (also catches a phone that slept through it).
    const tick = setInterval(() => {
      if (document.visibilityState === "visible" && todayKey() !== day) refresh();
    }, 60_000);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [router]);

  return null;
}
