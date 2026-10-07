import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-4 px-4 pt-16" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-5 w-72" />
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="flex gap-2">
        <Skeleton className="h-12 flex-1" />
        <Skeleton className="h-12 flex-1" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
