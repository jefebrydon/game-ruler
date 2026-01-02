import { notFound } from "next/navigation";
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
          <h1 className="text-h2">{rulebook.title}</h1>
          <p className="mt-4 text-paragraph text-muted-foreground">
            {rulebook.status === "ingesting"
              ? "This rulebook is still being processed. Please check back shortly."
              : rulebook.status === "pending_ingest"
              ? "This rulebook is queued for processing."
              : "There was an error processing this rulebook."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100dvh-64px)] flex-col">
      {/* Title bar */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h1 className="truncate text-h3">{rulebook.title}</h1>
        <span className="shrink-0 text-paragraph-sm text-muted-foreground">
          {rulebook.page_count} pages
        </span>
      </div>

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
