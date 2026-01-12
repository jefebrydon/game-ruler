import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai";
import type { ApiResponse } from "@/types";
import type OpenAI from "openai";

// 2 minutes timeout for vector store file batch processing
const POLL_TIMEOUT_MS = 120_000;
// Max concurrent file uploads to avoid rate limiting
const FILE_UPLOAD_CONCURRENCY = 5;
// Retry attempts for file uploads
const MAX_UPLOAD_RETRIES = 3;
// Delay between retries (ms)
const RETRY_DELAY_MS = 1000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs / 1000}s`)), timeoutMs)
    ),
  ]);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type UploadedFile = {
  pageNumber: number;
  fileId: string;
  textLength: number;
};

async function uploadFileWithRetry(
  openai: OpenAI,
  rulebookId: string,
  page: { pageNumber: number; text: string }
): Promise<UploadedFile> {
  const fileName = `rulebook-${rulebookId}-page-${page.pageNumber}.txt`;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
    try {
      // Create fresh Blob and File for each attempt (streams can be exhausted)
      const fileBlob = new Blob([page.text], { type: "text/plain" });
      const file = new File([fileBlob], fileName, { type: "text/plain" });

      const uploadedFile = await openai.files.create({
        file,
        purpose: "assistants",
      });
      console.log(`[INGEST] Uploaded page ${page.pageNumber} -> ${uploadedFile.id}`);
      return {
        pageNumber: page.pageNumber,
        fileId: uploadedFile.id,
        textLength: page.text.length,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[INGEST] Upload attempt ${attempt}/${MAX_UPLOAD_RETRIES} failed for page ${page.pageNumber}: ${lastError.message}`);
      if (attempt < MAX_UPLOAD_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
      }
    }
  }
  throw new Error(`Failed to upload page ${page.pageNumber} after ${MAX_UPLOAD_RETRIES} attempts: ${lastError?.message}`);
}

async function uploadFilesWithConcurrencyLimit(
  openai: OpenAI,
  rulebookId: string,
  pages: { pageNumber: number; text: string }[]
): Promise<UploadedFile[]> {
  const results: UploadedFile[] = [];
  
  // Process in batches of FILE_UPLOAD_CONCURRENCY
  for (let i = 0; i < pages.length; i += FILE_UPLOAD_CONCURRENCY) {
    const batch = pages.slice(i, i + FILE_UPLOAD_CONCURRENCY);
    console.log(`[INGEST] Uploading files ${i + 1}-${Math.min(i + FILE_UPLOAD_CONCURRENCY, pages.length)} of ${pages.length}...`);
    
    const batchResults = await Promise.all(
      batch.map((page) => uploadFileWithRetry(openai, rulebookId, page))
    );
    results.push(...batchResults);
  }
  
  return results;
}

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

    console.log(`[INGEST] Received batch ${batchIndex} for rulebook ${rulebookId}: ${pages.length} pages, isLastBatch=${isLastBatch}`);

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
      console.log(`[INGEST] Creating vector store for "${rulebook.title}"...`);
      const vectorStore = await openai.vectorStores.create({
        name: `${rulebook.title} Rulebook`,
      });
      vectorStoreId = vectorStore.id;
      console.log(`[INGEST] Vector store created: ${vectorStoreId}`);

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

    // Upload files with concurrency limit and retry logic
    console.log(`[INGEST] Starting file uploads for ${pages.length} pages (max ${FILE_UPLOAD_CONCURRENCY} concurrent)...`);
    const uploadedFiles = await uploadFilesWithConcurrencyLimit(openai, rulebookId, pages);
    console.log(`[INGEST] All ${uploadedFiles.length} files uploaded to OpenAI`);

    // Attach all files to vector store in a single batch operation
    const fileIds = uploadedFiles.map((f) => f.fileId);
    console.log(`[INGEST] Attaching files to vector store ${vectorStoreId}...`);
    const fileBatch = await withTimeout(
      openai.vectorStores.fileBatches.createAndPoll(vectorStoreId, {
        file_ids: fileIds,
      }),
      POLL_TIMEOUT_MS,
      "Vector store file batch processing"
    );
    console.log(`[INGEST] File batch completed: ${fileBatch.id}, status: ${fileBatch.status}`);

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
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Ingest batch error:", errorMessage, err);

    // Try to mark rulebook as error
    try {
      const body = await request.clone().json();
      if (body.rulebookId) {
        const supabase = createServerClient();
        await supabase
          .from("rulebooks")
          .update({
            status: "error",
            error_message: errorMessage,
          })
          .eq("id", body.rulebookId);
      }
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json(
      { error: `Failed to process batch: ${errorMessage}` },
      { status: 500 }
    );
  }
}
