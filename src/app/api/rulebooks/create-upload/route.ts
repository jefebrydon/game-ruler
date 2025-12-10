import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/slug";
import type { ApiResponse } from "@/types";

type CreateUploadRequest = {
  title: string;
  year?: number | null;
};

type CreateUploadResponse = {
  rulebookId: string;
  slug: string;
  uploadUrl: string;
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CreateUploadResponse>>> {
  try {
    const body: CreateUploadRequest = await request.json();

    // Validate input
    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const title = body.title.trim();
    const year = body.year ?? null;

    const supabase = createServerClient();

    // Generate unique slug
    let slug = generateSlug(title);
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from("rulebooks")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!existing) break;

      // Slug exists, regenerate
      slug = generateSlug(title);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Failed to generate unique slug" },
        { status: 500 }
      );
    }

    // Create rulebook record
    const { data: rulebook, error: insertError } = await supabase
      .from("rulebooks")
      .insert({
        slug,
        title,
        year,
        pdf_url: "", // Will be updated after upload
        page_count: 0,
        status: "pending_ingest",
      })
      .select("id")
      .single();

    if (insertError || !rulebook) {
      console.error("Failed to create rulebook:", insertError);
      return NextResponse.json(
        { error: "Failed to create rulebook record" },
        { status: 500 }
      );
    }

    // Generate signed upload URL for PDF
    const pdfPath = `pdfs/${rulebook.id}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("rulebooks")
      .createSignedUploadUrl(pdfPath);

    if (uploadError || !uploadData) {
      console.error("Failed to create upload URL:", uploadError);
      // Clean up the created record
      await supabase.from("rulebooks").delete().eq("id", rulebook.id);
      return NextResponse.json(
        { error: "Failed to create upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        rulebookId: rulebook.id,
        slug,
        uploadUrl: uploadData.signedUrl,
      },
    });
  } catch (err) {
    console.error("Create upload error:", err);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
