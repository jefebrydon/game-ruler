"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { ApiResponse } from "@/types";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const BATCH_SIZE = 25; // Pages per batch for OpenAI ingestion
const GEMINI_CONCURRENCY = 5; // Parallel Gemini requests

type UploadState =
  | { step: "form" }
  | { step: "uploading"; message: string }
  | { step: "parsing"; message: string }
  | { step: "processing"; current: number; total: number }
  | { step: "ingesting"; current: number; total: number }
  | { step: "finalizing"; message: string }
  | { step: "error"; message: string };

export function UploadForm(): React.ReactElement {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isDraggingThumbnail, setIsDraggingThumbnail] = useState(false);
  const [state, setState] = useState<UploadState>({ step: "form" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (selectedFile.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      e.target.value = "";
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File size must be under 50MB");
      e.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const validateThumbnail = (file: File): boolean => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please select a valid image (PNG, JPEG, WebP, or GIF)");
      return false;
    }
    if (file.size > MAX_THUMBNAIL_SIZE) {
      toast.error("Thumbnail must be under 5MB");
      return false;
    }
    return true;
  };

  const setThumbnailWithPreview = (file: File): void => {
    setThumbnailFile(file);
    const objectUrl = URL.createObjectURL(file);
    setThumbnailPreview(objectUrl);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!validateThumbnail(selectedFile)) {
      e.target.value = "";
      return;
    }

    setThumbnailWithPreview(selectedFile);
  };

  const handleThumbnailDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingThumbnail(true);
  };

  const handleThumbnailDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingThumbnail(false);
  };

  const handleThumbnailDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingThumbnail(false);

    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    if (!validateThumbnail(droppedFile)) return;

    setThumbnailWithPreview(droppedFile);
  };

  const handleThumbnailClick = (): void => {
    thumbnailInputRef.current?.click();
  };

  const clearThumbnail = (): void => {
    setThumbnailFile(null);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(null);
    }
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a game title");
      return;
    }

    if (!file) {
      toast.error("Please select a PDF file");
      return;
    }

    if (!thumbnailFile) {
      toast.error("Please select a thumbnail image");
      return;
    }

    try {
      // Step 1: Create upload record and get signed URL
      setState({ step: "uploading", message: "Creating upload..." });

      const createRes = await fetch("/api/rulebooks/create-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          year: year ? parseInt(year, 10) : null,
        }),
      });

      const createJson: ApiResponse<{
        rulebookId: string;
        slug: string;
        uploadUrl: string;
      }> = await createRes.json();

      if (createJson.error || !createJson.data) {
        throw new Error(createJson.error ?? "Failed to create upload");
      }

      const { rulebookId, slug, uploadUrl } = createJson.data;

      // Step 2: Upload PDF to Supabase Storage
      setState({ step: "uploading", message: "Uploading PDF..." });

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/pdf" },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload PDF to storage");
      }

      // Step 3: Parse PDF — splits into single-page PDFs
      setState({ step: "parsing", message: "Splitting PDF into pages..." });

      // Dynamic import to avoid SSR issues
      const { parsePDF } = await import("@/lib/pdf-parser");
      const { pageCount, singlePages } = await parsePDF(file);

      // Step 4: Process each page through Gemini
      const processedPages: { pageNumber: number; text: string }[] = [];

      for (let i = 0; i < singlePages.length; i += GEMINI_CONCURRENCY) {
        const batch = singlePages.slice(i, i + GEMINI_CONCURRENCY);

        setState({
          step: "processing",
          current: i,
          total: pageCount,
        });

        const batchResults = await Promise.all(
          batch.map(async (page) => {
            const res = await fetch("/api/rulebooks/process-page", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pageNumber: page.pageNumber,
                pdfBase64: page.pdfBase64,
              }),
            });

            const json: ApiResponse<{
              pageNumber: number;
              processedText: string;
            }> = await res.json();

            if (json.error || !json.data) {
              throw new Error(
                json.error ?? `Failed to process page ${page.pageNumber}`
              );
            }

            return {
              pageNumber: json.data.pageNumber,
              text: json.data.processedText,
            };
          })
        );

        processedPages.push(...batchResults);
      }

      // Step 5: Ingest Gemini-processed pages to OpenAI
      const totalBatches = Math.ceil(pageCount / BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startPage = batchIndex * BATCH_SIZE + 1;
        const endPage = Math.min(startPage + BATCH_SIZE - 1, pageCount);

        setState({
          step: "ingesting",
          current: startPage - 1,
          total: pageCount,
        });

        const batchPages = processedPages
          .filter((p) => p.pageNumber >= startPage && p.pageNumber <= endPage)
          .map((p) => ({
            pageNumber: p.pageNumber,
            text: p.text,
          }));

        const ingestRes = await fetch("/api/rulebooks/ingest-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rulebookId,
            batchIndex,
            pages: batchPages,
            isLastBatch: batchIndex === totalBatches - 1,
            totalPages: pageCount,
          }),
        });

        const ingestJson: ApiResponse<{
          success: boolean;
          ingestedPages: number;
          status: string;
        }> = await ingestRes.json();

        if (ingestJson.error || !ingestJson.data) {
          throw new Error(ingestJson.error ?? "Failed to ingest batch");
        }
      }

      // Step 6: Upload thumbnail
      setState({ step: "finalizing", message: "Uploading thumbnail..." });

      await uploadThumbnail(rulebookId, thumbnailFile);

      // Step 7: Navigate to game page
      toast.success("Rulebook uploaded successfully!");
      router.push(`/games/${slug}`);
    } catch (err) {
      console.error("Upload error:", err);
      const message = err instanceof Error ? err.message : "Upload failed";
      setState({ step: "error", message });
      toast.error(message);
    }
  };

  const isProcessing = state.step !== "form" && state.step !== "error";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="text-paragraph-bold">
          Game Title <span className="text-destructive">*</span>
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Catan, Gloomhaven"
          disabled={isProcessing}
          required
        />
      </div>

      {/* Year */}
      <div className="space-y-2">
        <label htmlFor="year" className="text-paragraph-bold">
          Publication Year{" "}
          <span className="text-paragraph text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="year"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="e.g., 2024"
          min={1900}
          max={new Date().getFullYear() + 1}
          disabled={isProcessing}
        />
      </div>

      {/* File Input */}
      <div className="space-y-2">
        <label htmlFor="file" className="text-paragraph-bold">
          PDF Rulebook <span className="text-destructive">*</span>
        </label>
        <Input
          id="file"
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={isProcessing}
          required
        />
        <p className="text-paragraph-sm text-muted-foreground">PDF only, max 50MB</p>
        {file && (
          <p className="text-paragraph-sm text-muted-foreground">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
          </p>
        )}
      </div>

      {/* Thumbnail Input */}
      <div className="space-y-2">
        <label htmlFor="thumbnail" className="text-paragraph-bold">
          Thumbnail <span className="text-destructive">*</span>
        </label>
        <input
          id="thumbnail"
          ref={thumbnailInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleThumbnailChange}
          disabled={isProcessing}
          className="sr-only"
        />
        <div
          onClick={!isProcessing ? handleThumbnailClick : undefined}
          onDragOver={!isProcessing ? handleThumbnailDragOver : undefined}
          onDragLeave={!isProcessing ? handleThumbnailDragLeave : undefined}
          onDrop={!isProcessing ? handleThumbnailDrop : undefined}
          className={`
            relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center
            rounded-lg border-2 border-dashed transition-colors
            ${isDraggingThumbnail 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            }
            ${isProcessing ? "pointer-events-none opacity-50" : ""}
          `}
        >
          {thumbnailPreview ? (
            <div className="relative p-4">
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="max-h-[200px] max-w-full rounded object-contain"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearThumbnail();
                }}
                disabled={isProcessing}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80"
                aria-label="Remove thumbnail"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              <svg
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div>
                <span className="text-paragraph-sm font-medium text-primary">
                  Click to upload
                </span>
                <span className="text-paragraph-sm text-muted-foreground">
                  {" "}or drag and drop
                </span>
              </div>
              <p className="text-paragraph-sm text-muted-foreground">
                PNG, JPEG, WebP, or GIF (max 5MB)
              </p>
            </div>
          )}
        </div>
        {thumbnailFile && (
          <p className="text-paragraph-sm text-muted-foreground">
            Selected: {thumbnailFile.name} ({(thumbnailFile.size / 1024 / 1024).toFixed(2)}MB)
          </p>
        )}
      </div>

      {/* Progress */}
      {isProcessing && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <ProgressDisplay state={state} />
        </div>
      )}

      {/* Error */}
      {state.step === "error" && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-paragraph-sm text-destructive">{state.message}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => setState({ step: "form" })}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Submit */}
      <Button type="submit" disabled={isProcessing} className="w-full">
        {isProcessing ? "Processing..." : "Upload Rulebook"}
      </Button>
    </form>
  );
}

function ProgressDisplay({ state }: { state: UploadState }): React.ReactElement {
  switch (state.step) {
    case "uploading":
    case "parsing":
    case "finalizing":
      return (
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-paragraph-sm">{state.message}</span>
        </div>
      );
    case "processing": {
      const processPercent = Math.round((state.current / state.total) * 100);
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-paragraph-sm">
            <span>Processing pages with AI...</span>
            <span>
              {state.current} / {state.total}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${processPercent}%` }}
            />
          </div>
        </div>
      );
    }
    case "ingesting": {
      const ingestPercent = Math.round((state.current / state.total) * 100);
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-paragraph-sm">
            <span>Indexing pages...</span>
            <span>
              {state.current} / {state.total}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${ingestPercent}%` }}
            />
          </div>
        </div>
      );
    }
    default:
      return <></>;
  }
}

/**
 * Upload thumbnail to Supabase Storage.
 */
async function uploadThumbnail(
  rulebookId: string,
  thumbnailFile: File
): Promise<void> {
  const formData = new FormData();
  formData.append("rulebookId", rulebookId);
  formData.append("thumbnail", thumbnailFile, thumbnailFile.name);

  const res = await fetch("/api/rulebooks/upload-assets", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || "Failed to upload thumbnail");
  }
}
