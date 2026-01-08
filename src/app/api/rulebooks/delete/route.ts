import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai";
import type { ApiResponse } from "@/types";

type DeleteRequest = {
  ids: string[];
};

type DeleteResponse = {
  deletedCount: number;
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<DeleteResponse>>> {
  try {
    const body: DeleteRequest = await request.json();

    if (!body.ids?.length) {
      return NextResponse.json(
        { error: "No rulebook IDs provided" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const openai = getOpenAIClient();

    // Fetch rulebooks with their vector store IDs
    const { data: rulebooks, error: fetchError } = await supabase
      .from("rulebooks")
      .select("id, openai_vector_store_id")
      .in("id", body.ids);

    if (fetchError) {
      console.error("Failed to fetch rulebooks:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch rulebooks" },
        { status: 500 }
      );
    }

    if (!rulebooks?.length) {
      return NextResponse.json({ data: { deletedCount: 0 } });
    }

    // Fetch all page file IDs for these rulebooks
    const { data: pages, error: pagesError } = await supabase
      .from("rulebook_pages")
      .select("openai_file_id")
      .in(
        "rulebook_id",
        rulebooks.map((r) => r.id)
      );

    if (pagesError) {
      console.error("Failed to fetch pages:", pagesError);
      // Continue anyway - we'll still delete what we can
    }

    // Delete OpenAI vector stores FIRST (releases attached files)
    const vectorStoreIds = rulebooks
      .filter((r) => r.openai_vector_store_id)
      .map((r) => r.openai_vector_store_id!);
    
    console.log(`[DELETE] Deleting ${vectorStoreIds.length} vector stores:`, vectorStoreIds);
    
    for (const vectorStoreId of vectorStoreIds) {
      try {
        console.log(`[DELETE] Attempting to delete vector store: ${vectorStoreId}`);
        const result = await openai.vectorStores.delete(vectorStoreId);
        console.log(`[DELETE] Vector store deleted:`, result);
      } catch (err) {
        console.error(`[DELETE] Failed to delete vector store ${vectorStoreId}:`, err);
      }
    }

    // Delete OpenAI files SECOND (now released from vector stores)
    const fileIds = pages?.map((p) => p.openai_file_id) ?? [];
    console.log(`[DELETE] Deleting ${fileIds.length} files:`, fileIds);
    
    for (const fileId of fileIds) {
      try {
        console.log(`[DELETE] Attempting to delete file: ${fileId}`);
        const result = await openai.files.delete(fileId);
        console.log(`[DELETE] File deleted:`, result);
      } catch (err) {
        console.error(`[DELETE] Failed to delete file ${fileId}:`, err);
      }
    }

    // Delete storage files (PDFs and thumbnails)
    const pdfPaths = rulebooks.map((r) => `pdfs/${r.id}.pdf`);
    const thumbnailPaths = rulebooks.map((r) => `thumbnails/${r.id}.png`);

    // Delete from storage (ignore errors - files may not exist)
    await supabase.storage.from("rulebooks").remove(pdfPaths);
    await supabase.storage.from("rulebooks").remove(thumbnailPaths);

    // Delete rulebook rows (cascade deletes rulebook_pages)
    const { error: deleteError } = await supabase
      .from("rulebooks")
      .delete()
      .in("id", body.ids);

    if (deleteError) {
      console.error("Failed to delete rulebooks:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete rulebooks" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { deletedCount: rulebooks.length },
    });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json(
      { error: "Failed to process delete request" },
      { status: 500 }
    );
  }
}

