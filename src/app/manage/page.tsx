import { createServerClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { ManageGamesClient } from "@/components/ManageGamesClient";

export default async function ManagePage(): Promise<React.ReactElement> {
  const supabase = createServerClient();

  const { data: rulebooks, error } = await supabase
    .from("rulebooks")
    .select("id, slug, title, year, status, page_count, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch rulebooks:", error);
    throw new Error("Failed to load rulebooks");
  }

  return (
    <>
      <Header />
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-[1080px]">
          <ManageGamesClient rulebooks={rulebooks ?? []} />
        </div>
      </main>
    </>
  );
}

