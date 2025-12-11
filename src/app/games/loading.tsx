import { GameCardSkeleton } from "@/components/GameCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function GamesLoading(): React.ReactElement {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header skeleton */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Game grid skeleton */}
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
