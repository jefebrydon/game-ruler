import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { GameCard } from "@/components/GameCard";

const PAGE_SIZE = 20;

export default async function GamesPage(): Promise<React.ReactElement> {
  const supabase = createServerClient();

  const { data: rulebooks, error } = await supabase
    .from("rulebooks")
    .select("id, slug, title, thumbnail_url")
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  // Throw to trigger error.tsx boundary
  if (error) {
    console.error("Failed to fetch rulebooks:", error);
    throw new Error("Failed to load games");
  }

  const games = rulebooks ?? [];

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">All Games</h1>
            <p className="mt-1 text-muted-foreground">
              Browse rulebooks that have been uploaded to Rule Finder.
            </p>
          </div>
          <Link
            href="/upload"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Upload Rulebook
          </Link>
        </div>

        {/* Game Grid */}
        {games.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {games.map((game) => (
              <GameCard
                key={game.id}
                slug={game.slug}
                title={game.title}
                thumbnailUrl={game.thumbnail_url}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground">
              No rulebooks have been uploaded yet.
            </p>
            <Link
              href="/upload"
              className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              Upload the first one →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
