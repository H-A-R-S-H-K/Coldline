import Link from "next/link";
import { btn, cx } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl">🔍</div>
      <h1 className="mt-3 text-lg font-bold text-slate-900">Job not found</h1>
      <p className="mt-1 text-sm text-slate-500">It may have been removed.</p>
      <Link href="/" className={cx(btn.base, btn.primary, btn.lg, "mt-6")}>
        Back to today
      </Link>
    </div>
  );
}
