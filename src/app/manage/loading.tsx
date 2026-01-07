import { Header } from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManageLoading(): React.ReactElement {
  return (
    <>
      <Header />
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-[1080px]">
          {/* Back button skeleton */}
          <div className="mb-6">
            <Skeleton className="h-8 w-20" />
          </div>

          {/* Title skeleton */}
          <Skeleton className="mb-6 h-9 w-48" />

          {/* Button row skeleton */}
          <div className="mb-8 flex gap-3">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-20" />
          </div>

          {/* Table skeleton */}
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            {/* Header */}
            <div className="flex border-b border-stone-200 bg-stone-50 px-4 py-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="ml-8 h-4 w-24" />
              <Skeleton className="ml-auto h-4 w-16" />
              <Skeleton className="ml-8 h-4 w-12" />
              <Skeleton className="ml-8 h-4 w-20" />
              <Skeleton className="ml-8 h-4 w-16" />
            </div>
            {/* Rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center border-b border-stone-200 px-4 py-3 last:border-b-0"
              >
                <Skeleton className="h-4 w-4" />
                <Skeleton className="ml-8 h-4 w-32" />
                <Skeleton className="ml-auto h-6 w-16 rounded-full" />
                <Skeleton className="ml-8 h-4 w-8" />
                <Skeleton className="ml-8 h-4 w-24" />
                <Skeleton className="ml-8 h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

