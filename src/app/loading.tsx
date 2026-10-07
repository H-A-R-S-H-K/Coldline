import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-4 px-4 pt-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-36 w-full rounded-3xl" />
      <Skeleton className="mt-6 h-4 w-24" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
