import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GameSearch } from "@/components/GameSearch";

export default function HomePage(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mx-auto w-full max-w-2xl text-center">
        {/* Hero Section */}
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Rule Finder
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Upload a board-game rulebook and instantly get an AI-powered rules
          assistant with page-level citations.
        </p>

        {/* Game Search */}
        <div className="mt-8">
          <p className="mb-3 text-sm text-muted-foreground">Select a Game</p>
          <div className="mx-auto max-w-md">
            <GameSearch />
          </div>
        </div>

        {/* Upload CTA */}
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/upload">Upload New Rulebook</Link>
          </Button>
        </div>

        {/* Browse Games Link */}
        <div className="mt-4">
          <Link
            href="/games"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Browse all games
          </Link>
        </div>
      </div>
    </main>
  );
}
