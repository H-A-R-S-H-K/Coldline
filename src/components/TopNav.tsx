"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BUSINESS_NAME } from "@/lib/config";
import { AccountMenu } from "./AccountMenu";
import { PlusIcon, SnowflakeIcon } from "./icons";
import { btn, cx } from "./ui";

const HIDDEN_ON = ["/login", "/setup"];

/** Desktop navigation (lg and up). Phones use the bottom nav instead. */
export function TopNav() {
  const path = usePathname();
  if (HIDDEN_ON.includes(path)) return null;

  const link = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "rounded-xl px-3.5 py-2 text-sm font-semibold transition",
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200/60",
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 hidden h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-lg lg:block">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-6 px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <SnowflakeIcon className="h-5 w-5" />
          </span>
          <span className="text-base font-bold tracking-tight text-slate-900">{BUSINESS_NAME}</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          {link("/", "Today", path === "/")}
          {link("/jobs", "Jobs", path === "/jobs" || (path.startsWith("/jobs/") && path !== "/jobs/new"))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/jobs/new" className={cx(btn.base, btn.primary, btn.md)}>
            <PlusIcon className="h-4 w-4" strokeWidth={2.5} /> Add job
          </Link>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
