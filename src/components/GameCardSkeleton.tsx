import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function GameCardSkeleton(): React.ReactElement {
  return (
    <Card className="overflow-hidden p-0">
      {/* Thumbnail skeleton */}
      <Skeleton className="aspect-[4/3] w-full rounded-none" />

      {/* Content skeleton */}
      <CardContent className="p-4">
        <Skeleton className="h-5 w-3/4" />
      </CardContent>
    </Card>
  );
}
