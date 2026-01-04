import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { GameTile } from "@/components/GameTile";
import { Header } from "@/components/Header";
import { createServerClient } from "@/lib/supabase/server";

export default async function HomePage(): Promise<React.ReactElement> {
  const supabase = createServerClient();

  const { data: rulebooks } = await supabase
    .from("rulebooks")
    .select("id, slug, title, thumbnail_url")
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(20);

  const games = rulebooks ?? [];

  return (
    <>
      <Header floating />
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

        <div className="mx-auto w-full max-w-[344px] text-left">
          <h1 className="text-h1 text-white text-shadow-dark">Find Rules Fast</h1>
          <p className="mt-4 text-subhead text-white text-shadow-dark">
            Clarify board game rules.
            <br />
            See answers in the rulebook.
          </p>

          {/* Game Search */}
          <div className="mt-8">
            <SearchBar className="w-full" />
          </div>
        </div>
      </section>

      {/* Board Games Section */}
      <section className="w-full px-6 py-16">
        <div className="mx-auto max-w-[1080px]">
          {/* Header row */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-h2 text-brass-gradient">Board Games</h2>
            <Button asChild variant="secondary">
              <Link href="/upload">Upload Rulebook</Link>
            </Button>
          </div>

          {/* Game Grid */}
          {games.length > 0 ? (
            <div
              className="grid gap-6"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 170px))",
                justifyContent: "start",
              }}
            >
              {games.map((game) => (
                <GameTile
                  key={game.id}
                  slug={game.slug}
                  title={game.title}
                  thumbnailUrl={game.thumbnail_url}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-paragraph text-muted-foreground">
                No rulebooks have been uploaded yet.
              </p>
              <Link
                href="/upload"
                className="mt-4 inline-block text-paragraph-sm text-primary underline-offset-4 hover:underline"
              >
                Upload the first one →
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
    </>
  );
}
