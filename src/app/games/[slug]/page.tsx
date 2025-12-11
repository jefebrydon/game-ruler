import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { GamePageClient } from "@/components/GamePageClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function GamePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { slug } = await params;

  const supabase = createServerClient();

  // Fetch rulebook by slug
  const { data: rulebook, error } = await supabase
    .from("rulebooks")
    .select("id, slug, title, pdf_url, page_count, status, thumbnail_url")
    .eq("slug", slug)
    .single();

  if (error || !rulebook) {
    notFound();
  }

  // Handle non-ready states
  if (rulebook.status !== "ready") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{rulebook.title}</h1>
          <p className="mt-4 text-muted-foreground">
            {rulebook.status === "ingesting"
              ? "This rulebook is still being processed. Please check back shortly."
              : rulebook.status === "pending_ingest"
              ? "This rulebook is queued for processing."
              : "There was an error processing this rulebook."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
          >
            ← <span className="hidden sm:inline">Home</span>
          </Link>
          <h1 className="truncate text-base font-semibold sm:text-lg">
            {rulebook.title}
          </h1>
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          {rulebook.page_count} pages
        </span>
      </header>

      {/* Main content */}
      <GamePageClient
        rulebookId={rulebook.id}
        title={rulebook.title}
        pdfUrl={rulebook.pdf_url}
        pageCount={rulebook.page_count}
      />
    </main>
  );
}
