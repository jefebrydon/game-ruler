"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GameError({
  error,
  reset,
}: ErrorProps): React.ReactElement {
  useEffect(() => {
    console.error("Game page error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-h2">Failed to load rulebook</h1>
        <p className="mt-2 text-paragraph text-muted-foreground">
          We couldn&apos;t load this rulebook. It may have been removed or there
          was a server error.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/games">Browse games</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
