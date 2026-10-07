"use client";

import { useEffect, useRef } from "react";
import { useToast } from "./Toast";

/** Shows the "job added" toast once after Add Job redirects here, then tidies the URL. */
export function AddedNotice({ text }: { text: string }) {
  const toast = useToast();
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast(text);
    window.history.replaceState(null, "", "/");
    document.getElementById("added-job")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [text, toast]);
  return null;
}
