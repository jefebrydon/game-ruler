import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GameSearch } from "@/components/GameSearch";

export default function HomePage(): React.ReactElement {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
        {/* Background Video */}
        <video
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover -z-10"
        >
          <source src="/World_BG.mp4" type="video/mp4" />
        </video>

        <div className="mx-auto w-full max-w-2xl text-center">
          <h1 className="text-h1">Rule Finder</h1>
          <p className="mt-4 text-subhead text-muted-foreground">
            Upload a board-game rulebook and instantly get an AI-powered rules
            assistant with page-level citations.
          </p>

          {/* Game Search */}
          <div className="mt-8">
            <p className="mb-3 text-paragraph-sm text-muted-foreground">
              Select a Game
            </p>
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
              className="text-paragraph-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Browse all games
            </Link>
          </div>
        </div>
      </section>

      {/* Board Games Section */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          {/* Content to be added */}
        </div>
      </section>
    </main>
  );
}
