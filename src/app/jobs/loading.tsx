import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-3 px-4 pt-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-11 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}
