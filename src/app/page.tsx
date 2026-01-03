import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";

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

        <div className="mx-auto w-full max-w-[344px] text-left">
          <h1 className="text-h1 text-white text-shadow-dark">Find Rules Fast</h1>
          <p className="mt-4 text-paragraph-bold text-white text-shadow-dark">
            Get answers about board game rules. See sources directly in the
            rulebook.
          </p>

          {/* Game Search */}
          <div className="mt-8">
            <SearchBar className="w-full" />
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
