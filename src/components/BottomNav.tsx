"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ListIcon, PlusIcon } from "./icons";
import { cx } from "./ui";

const HIDDEN_ON = ["/login", "/setup", "/jobs/new"];

export function BottomNav() {
  const path = usePathname();
  if (HIDDEN_ON.includes(path)) return null;

  const tab = (href: string, label: string, Icon: typeof HomeIcon, active: boolean) => (
    <Link
      href={href}
      className={cx(
        "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold",
        active ? "text-brand-600" : "text-slate-500",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t lg:hidden border-slate-200/80 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-4">
        {tab("/", "Today", HomeIcon, path === "/")}
        <div className="flex flex-1 items-center justify-center">
          <Link
            href="/jobs/new"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition active:scale-95"
            aria-label="Add job"
          >
            <PlusIcon className="h-7 w-7" strokeWidth={2.5} />
          </Link>
        </div>
        {tab("/jobs", "Jobs", ListIcon, path.startsWith("/jobs"))}
      </div>
    </nav>
  );
}
