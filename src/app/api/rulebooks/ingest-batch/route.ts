import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai";
import type { ApiResponse } from "@/types";

type PageData = {
  pageNumber: number;
  text: string;
};

type IngestBatchRequest = {
  rulebookId: string;
  batchIndex: number;
  pages: PageData[];
  isLastBatch: boolean;
  totalPages: number;
};

type IngestBatchResponse = {
  success: boolean;
  ingestedPages: number;
  status: "ingesting" | "ready";
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<IngestBatchResponse>>> {
  try {
    const body: IngestBatchRequest = await request.json();
    const { rulebookId, batchIndex, pages, isLastBatch, totalPages } = body;

    // Validate input
    if (!rulebookId || pages.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: rulebookId and pages are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const openai = getOpenAIClient();

    // Get current rulebook
    const { data: rulebook, error: fetchError } = await supabase
      .from("rulebooks")
      .select("id, title, openai_vector_store_id, ingested_pages")
      .eq("id", rulebookId)
      .single();

    if (fetchError || !rulebook) {
      return NextResponse.json(
        { error: "Rulebook not found" },
        { status: 404 }
      );
    }

    let vectorStoreId = rulebook.openai_vector_store_id;

    // First batch: create vector store
    if (batchIndex === 0) {
      const vectorStore = await openai.vectorStores.create({
        name: `${rulebook.title} Rulebook`,
      });
      vectorStoreId = vectorStore.id;

      // Update rulebook with vector store ID and set status to ingesting
      await supabase
        .from("rulebooks")
        .update({
          openai_vector_store_id: vectorStoreId,
          status: "ingesting",
        })
        .eq("id", rulebookId);
    }

    if (!vectorStoreId) {
      return NextResponse.json(
        { error: "Vector store not found" },
        { status: 500 }
      );
    }

    // Upload all files in parallel
    const uploadPromises = pages.map(async (page) => {
      const fileName = `rulebook-${rulebookId}-page-${page.pageNumber}.txt`;
      const fileBlob = new Blob([page.text], { type: "text/plain" });
      const file = new File([fileBlob], fileName, { type: "text/plain" });

      const uploadedFile = await openai.files.create({
        file,
        purpose: "assistants",
      });

      return {
        pageNumber: page.pageNumber,
        fileId: uploadedFile.id,
        textLength: page.text.length,
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    // Attach all files to vector store in a single batch operation
    const fileIds = uploadedFiles.map((f) => f.fileId);
    await openai.vectorStores.fileBatches.createAndPoll(vectorStoreId, {
      file_ids: fileIds,
    });

    // Prepare page records for database
    const pageInserts = uploadedFiles.map((f) => ({
      rulebook_id: rulebookId,
      page_number: f.pageNumber,
      openai_file_id: f.fileId,
      text_length: f.textLength,
    }));

    // Insert page records
    const { error: insertError } = await supabase
      .from("rulebook_pages")
      .insert(pageInserts);

    if (insertError) {
      console.error("Failed to insert pages:", insertError);
      return NextResponse.json(
        { error: "Failed to save page records" },
        { status: 500 }
      );
    }

    // Update ingested pages count
    const newIngestedCount = (rulebook.ingested_pages ?? 0) + pages.length;

    // If last batch, mark as ready
    if (isLastBatch) {
      await supabase
        .from("rulebooks")
        .update({
          ingested_pages: newIngestedCount,
          page_count: totalPages,
          status: "ready",
        })
        .eq("id", rulebookId);

      return NextResponse.json({
        data: {
          success: true,
          ingestedPages: newIngestedCount,
          status: "ready",
        },
      });
    }

    // Update progress
    await supabase
      .from("rulebooks")
      .update({ ingested_pages: newIngestedCount })
      .eq("id", rulebookId);

    return NextResponse.json({
      data: {
        success: true,
        ingestedPages: newIngestedCount,
        status: "ingesting",
      },
    });
  } catch (err) {
    console.error("Ingest batch error:", err);

    // Try to mark rulebook as error
    try {
      const body = await request.clone().json();
      if (body.rulebookId) {
        const supabase = createServerClient();
        await supabase
          .from("rulebooks")
          .update({
            status: "error",
            error_message: err instanceof Error ? err.message : "Unknown error",
          })
          .eq("id", body.rulebookId);
      }
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json(
      { error: "Failed to process batch" },
      { status: 500 }
    );
  }
}
