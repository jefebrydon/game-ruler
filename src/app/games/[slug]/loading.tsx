import { Skeleton } from "@/components/ui/skeleton";

export default function GameLoading(): React.ReactElement {
  return (
    <main className="flex h-screen flex-col">
      {/* Header skeleton */}
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2 sm:gap-4">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-5 w-20" />
      </header>

      {/* Content skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF viewer skeleton */}
        <div className="flex-1 bg-muted/30 p-4">
          <div className="mx-auto max-w-3xl space-y-4">
            <Skeleton className="aspect-[8.5/11] w-full rounded-lg" />
            <Skeleton className="aspect-[8.5/11] w-full rounded-lg" />
          </div>
        </div>

        {/* Chat panel skeleton (hidden on mobile) */}
        <div className="hidden w-96 flex-shrink-0 border-l md:block">
          <div className="border-b p-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
          <div className="flex h-full items-center justify-center p-4">
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    </main>
  );
}
