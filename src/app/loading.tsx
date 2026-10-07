import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-4 px-4 pt-6 lg:pt-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-36 w-full rounded-3xl" />
      <div className="space-y-4 pt-2 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
        {[0, 1, 2].map((i) => (
          <div key={i} className={i > 0 ? "space-y-3 max-lg:hidden" : "space-y-3"}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
