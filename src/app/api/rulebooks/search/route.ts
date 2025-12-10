import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { ApiResponse, RulebookSearchResult } from "@/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<RulebookSearchResult[]>>> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();

  // Empty query → return empty array (don't hit DB)
  if (!query) {
    return NextResponse.json({ data: [] });
  }

  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("rulebooks")
      .select("id, slug, title, year, game_image_url")
      .ilike("title", `%${query}%`)
      .eq("status", "ready")
      .limit(10);

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json(
        { error: "Failed to search rulebooks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { error: "Failed to search rulebooks" },
      { status: 500 }
    );
  }
}
