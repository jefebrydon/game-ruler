# PDF Upload Tweaks v1.1 — Implementation Plan

## Executive Summary

Replace raw pdf.js text extraction with Gemini-powered per-page document processing to produce RAG-optimized `.txt` files for OpenAI ingestion. The result: better section awareness, cleaner citations, and more accurate answers.

---

## What Stays the Same

- `POST /api/rulebooks/create-upload` — creates DB row + signed Storage URL
- Client uploads original PDF directly to Supabase Storage (required for viewer)
- Thumbnail generation + `POST /api/rulebooks/upload-assets`
- One OpenAI vector store per rulebook
- One file per page uploaded to OpenAI (batched)
- `rulebook_pages` table stores `openai_file_id` per page
- Ask flow (`/api/rulebooks/ask`) unchanged

---

## What Changes

### Current Flow
```
pdf.js parse → raw page text → upload to OpenAI
```

### New Flow
```
pdf.js split → single-page PDFs → Gemini processing → structured .txt → upload to OpenAI
```

---

## Implementation Steps

### Step 1: Add Google Generative AI SDK

**File:** `package.json`

Install the official Google AI SDK:
```bash
npm install @google/generative-ai
```

**File:** `.env.local` (and Vercel env vars)
```
GOOGLE_AI_API_KEY=your-gemini-api-key
```

---

### Step 2: Create Gemini Prompt Config

**File:** `src/lib/gemini/prompt.ts`

Store the canonical Gemini prompt as a constant. This keeps it version-controlled and easy to iterate.

```typescript
export const GEMINI_PAGE_EXTRACTION_PROMPT = `You are a document-structure extraction system.

**Input:**

1. **One PDF page** from a board game rulebook (only a single page).
2. A provided integer \`PAGE_INDEX\` (1-based) that corresponds to the PDF's actual page position in the file.

**Goal:** Convert this single page into **RAG-optimized plain text** that preserves section headings and repeats section context inline so retrieval can always return the section name with any quote.

### Hard rules

* **Do NOT paraphrase.** Preserve wording as close to the PDF as possible.
* Fix obvious OCR mistakes only when unambiguous.
* **Do NOT invent** headings or section names.
* Maintain correct reading order (including multi-column layouts: top-to-bottom within a column, left column first).
* Output **plain text only** (no JSON, no Markdown, no commentary, no code fences).
* **The output \`PAGE_INDEX\` must exactly equal the provided PAGE_INDEX.**
* **Ignore any printed page numbers visible inside the PDF.** Use only the provided \`PAGE_INDEX\`.

---

## Required output format (exact)

\`\`\`
PAGE_INDEX: <PAGE_INDEX>

SECTION_PATH_INFERRED: <Top Level> > <Subsection> > <Subsection if applicable>
HEADINGS_ON_PAGE:
- <Heading 1>
- <Heading 2>
- <Heading 3 if present>

---

[SECTION: <Section Path for this block>]
<verbatim paragraph / rule text>

[SECTION: <Section Path for this block>]
<next paragraph / list / rule text>

...
\`\`\`

### Instructions

1. **HEADINGS_ON_PAGE**

* List every heading that is visibly a heading on this page (top-to-bottom).
* If none, use:
  \`\`\`
  HEADINGS_ON_PAGE:
  - NONE
  \`\`\`

2. **SECTION_PATH_INFERRED**

* Choose the most specific section path that governs most of the page content.
* Build it using \`>\` separators (e.g., \`SETUP > PREPARE THE BOARD\`).
* If no reliable heading context exists on this page, set:
  \`SECTION_PATH_INFERRED: UNKNOWN\`

3. **Block extraction with inline section tags**

* Split content into logical blocks (paragraphs, bullets, numbered lists, short rule statements).
* Before **every** block, add:
  \`\`\`
  [SECTION: ...]
  \`\`\`
* If the section changes mid-page (new heading), update the section tag for subsequent blocks.
* If no headings exist on the page, use \`[SECTION: UNKNOWN]\` for blocks.

4. **Lists**

* Bullets must be lines beginning with \`- \`
* Numbered lists must be lines beginning with \`1. \`, \`2. \`, etc.

5. **Tables**

* If simple, serialize rows on new lines, with columns separated by \`|\`.
* If complex:
  \`\`\`
  [TABLE]
  <row-by-row text preserving column meaning>
  [/TABLE]
  \`\`\`

6. **Inline icons / symbols**

* When an inline icon or symbol appears within text, replace it with a bracketed label like:
  \`[ICON: sun]\`, \`[ICON: shield]\`, or \`[ICON: unknown]\`.
* If the page clearly includes a legend that defines the icon, use that legend name.
* Do not invent meanings.`;

export function buildPromptForPage(pageIndex: number): string {
  return `${GEMINI_PAGE_EXTRACTION_PROMPT}

---

## Provided value

\`PAGE_INDEX = ${pageIndex}\`

Now output the page in the exact required format.`;
}
```

---

### Step 3: Create Gemini Client Helper

**File:** `src/lib/gemini/client.ts`

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}
```

---

### Step 4: Add pdf-lib for PDF Splitting (Client-Side)

**File:** `package.json`

```bash
npm install pdf-lib
```

pdf-lib is a pure JavaScript library that can split PDFs in the browser without a server.

---

### Step 5: Update pdf-parser.ts — Add Page Splitting

**File:** `src/lib/pdf-parser.ts`

Add a new function to split a PDF into single-page PDF blobs:

```typescript
import { PDFDocument } from "pdf-lib";

export type SinglePagePDF = {
  pageNumber: number;       // 1-based index
  pdfBlob: Blob;            // Single-page PDF as blob
  pdfBase64: string;        // Base64 for Gemini API
};

/**
 * Split a multi-page PDF into individual single-page PDFs.
 * Returns an array of blobs, each containing one page.
 */
export async function splitPDFIntoPages(file: File): Promise<SinglePagePDF[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();
  
  const singlePages: SinglePagePDF[] = [];
  
  for (let i = 0; i < pageCount; i++) {
    // Create a new PDF with just this page
    const singlePageDoc = await PDFDocument.create();
    const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i]);
    singlePageDoc.addPage(copiedPage);
    
    const pdfBytes = await singlePageDoc.save();
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
    
    // Convert to base64 for Gemini API
    const base64 = await blobToBase64(pdfBlob);
    
    singlePages.push({
      pageNumber: i + 1,  // 1-based
      pdfBlob,
      pdfBase64: base64,
    });
  }
  
  return singlePages;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Remove data URL prefix to get raw base64
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

Update `ParsedPDF` type and `parsePDF` function to return split pages instead of text:

```typescript
export type ParsedPDF = {
  pageCount: number;
  singlePages: SinglePagePDF[];  // Changed from pages: PageText[]
  thumbnailBlob: Blob;
};

export async function parsePDF(file: File): Promise<ParsedPDF> {
  // Split PDF into single pages
  const singlePages = await splitPDFIntoPages(file);
  
  // Generate thumbnail from first page (still using pdfjs for rendering)
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const firstPage = await pdf.getPage(1);
  const thumbnailBlob = await renderPageToBlob(firstPage, 0.5);
  
  return {
    pageCount: singlePages.length,
    singlePages,
    thumbnailBlob,
  };
}
```

---

### Step 6: Create Gemini Processing API Route

**File:** `src/app/api/rulebooks/process-page/route.ts`

This route receives a single-page PDF (as base64) and returns the Gemini-processed text.

**Why a server route?** The Gemini API key must stay server-side. Each page is small (~50-200KB as single-page PDF), well under Vercel's 4.5MB limit.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini/client";
import { buildPromptForPage } from "@/lib/gemini/prompt";
import type { ApiResponse } from "@/types";

type ProcessPageRequest = {
  pageNumber: number;      // 1-based page index
  pdfBase64: string;       // Single-page PDF as base64
};

type ProcessPageResponse = {
  pageNumber: number;
  processedText: string;
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ProcessPageResponse>>> {
  try {
    const body: ProcessPageRequest = await request.json();
    const { pageNumber, pdfBase64 } = body;

    if (!pageNumber || !pdfBase64) {
      return NextResponse.json(
        { error: "pageNumber and pdfBase64 are required" },
        { status: 400 }
      );
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = buildPromptForPage(pageNumber);

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const processedText = response.text();

    return NextResponse.json({
      data: {
        pageNumber,
        processedText,
      },
    });
  } catch (err) {
    console.error("Process page error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process page" },
      { status: 500 }
    );
  }
}
```

---

### Step 7: Update UploadForm.tsx — New Processing Step

**File:** `src/components/UploadForm.tsx`

Add a new state step and update the flow:

```typescript
type UploadState =
  | { step: "form" }
  | { step: "uploading"; message: string }
  | { step: "parsing"; message: string }
  | { step: "processing"; current: number; total: number }  // NEW: Gemini processing
  | { step: "ingesting"; current: number; total: number }
  | { step: "finalizing"; message: string }
  | { step: "error"; message: string };
```

Update `handleSubmit`:

```typescript
const handleSubmit = async (e: React.FormEvent): Promise<void> => {
  e.preventDefault();
  // ... validation ...

  try {
    // Step 1: Create upload + signed URL (unchanged)
    // Step 2: Upload PDF to Supabase Storage (unchanged)
    
    // Step 3: Parse PDF — now splits into single-page PDFs
    setState({ step: "parsing", message: "Splitting PDF into pages..." });
    const { parsePDF } = await import("@/lib/pdf-parser");
    const { pageCount, singlePages, thumbnailBlob } = await parsePDF(file);

    // Step 4: Process each page through Gemini (NEW)
    const processedPages: { pageNumber: number; text: string }[] = [];
    
    // Process in small batches to avoid overwhelming the API
    const GEMINI_CONCURRENCY = 5;
    
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

          const json: ApiResponse<{ pageNumber: number; processedText: string }> = 
            await res.json();

          if (json.error || !json.data) {
            throw new Error(json.error ?? `Failed to process page ${page.pageNumber}`);
          }

          return {
            pageNumber: json.data.pageNumber,
            text: json.data.processedText,
          };
        })
      );

      processedPages.push(...batchResults);
    }

    // Step 5: Ingest Gemini-processed pages to OpenAI (mostly unchanged)
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
          text: p.text,  // Now Gemini-processed text
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

      // ... error handling unchanged ...
    }

    // Step 6: Upload thumbnail (unchanged)
    // Step 7: Navigate (unchanged)
  } catch (err) {
    // ... error handling unchanged ...
  }
};
```

Update `ProgressDisplay` to handle the new "processing" step:

```typescript
function ProgressDisplay({ state }: { state: UploadState }): React.ReactElement {
  switch (state.step) {
    // ... existing cases ...
    
    case "processing":
      const processPercent = Math.round((state.current / state.total) * 100);
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
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
    
    // ... rest unchanged ...
  }
}
```

---

### Step 8: Update ingest-batch Route (Minor)

**File:** `src/app/api/rulebooks/ingest-batch/route.ts`

No structural changes needed. The route already expects:
```typescript
type PageData = {
  pageNumber: number;
  text: string;
};
```

The only difference is that `text` now contains Gemini-processed content instead of raw pdf.js text. The file naming, vector store creation, and `rulebook_pages` insertion all stay the same.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `@google/generative-ai` and `pdf-lib` |
| `.env.local` | Modify | Add `GOOGLE_AI_API_KEY` |
| `src/lib/gemini/prompt.ts` | Create | Canonical Gemini prompt |
| `src/lib/gemini/client.ts` | Create | Gemini client singleton |
| `src/lib/pdf-parser.ts` | Modify | Add PDF splitting, update `parsePDF` |
| `src/app/api/rulebooks/process-page/route.ts` | Create | Gemini processing endpoint |
| `src/components/UploadForm.tsx` | Modify | Add processing step, update flow |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User selects PDF                                                     │
│           │                                                              │
│           ▼                                                              │
│  2. create-upload → DB row + signed URL                                  │
│           │                                                              │
│           ▼                                                              │
│  3. Upload PDF to Supabase Storage ────────────────────┐                │
│           │                                             │                │
│           ▼                                             ▼                │
│  4. parsePDF() splits into single-page PDFs    [PDF in Storage]         │
│           │                                     (for viewer)             │
│           ▼                                                              │
│  5. For each page:                                                       │
│        │                                                                 │
│        ├──────► POST /api/rulebooks/process-page ◄──────┐               │
│        │              │                                  │               │
│        │              ▼                                  │               │
│        │        Gemini API                               │               │
│        │              │                                  │               │
│        │              ▼                                  │               │
│        │        RAG-optimized .txt                       │               │
│        │              │                                  │               │
│        └──────────────┴──────────────────────────────────┘               │
│           │                                                              │
│           ▼                                                              │
│  6. POST /api/rulebooks/ingest-batch (batched)                          │
│           │                                                              │
│           ▼                                                              │
│     ┌─────────────────────────────────────────┐                         │
│     │           OpenAI Vector Store            │                         │
│     │  - One vector store per rulebook         │                         │
│     │  - One file per page (Gemini .txt)       │                         │
│     └─────────────────────────────────────────┘                         │
│           │                                                              │
│           ▼                                                              │
│  7. upload-assets (thumbnail)                                            │
│           │                                                              │
│           ▼                                                              │
│  8. Redirect to /games/[slug]                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Error Handling Considerations

### Gemini API Failures

- **Retry logic:** Implement exponential backoff for transient failures
- **Fallback:** Consider falling back to raw pdf.js text if Gemini fails for a page
- **Rate limits:** Gemini has rate limits; use controlled concurrency (5 parallel requests)

### Large PDFs

- **Memory:** Single-page PDFs are small (~50-200KB each), but keep them in memory briefly
- **Timeout:** Gemini processing may take 2-5s per page; total time for 100-page PDF could be 2-3 minutes
- **Progress UX:** The new "processing" step keeps users informed

### Vercel Limits

- **Request body:** Each `/process-page` call sends one base64-encoded single-page PDF (~100-300KB). Well under 4.5MB.
- **Function timeout:** Default 10s may be tight for complex pages. Consider increasing to 30s for the process-page route.

---

## Testing Plan

1. **Unit test:** `splitPDFIntoPages()` produces correct page count
2. **Unit test:** `buildPromptForPage()` correctly injects page index
3. **Integration test:** Single page through `/process-page` returns valid structured text
4. **E2E test:** Full upload flow with a small (5-page) PDF
5. **E2E test:** Large PDF (50+ pages) to verify concurrency and progress UI

---

## Rollout Strategy

1. **Phase 1:** Implement and test locally
2. **Phase 2:** Add feature flag to toggle between old (raw text) and new (Gemini) ingestion
3. **Phase 3:** Test with real rulebooks, compare answer quality
4. **Phase 4:** Remove feature flag, make Gemini ingestion the default

---

## Future Improvements (Out of Scope)

- **Caching:** Cache Gemini results by PDF hash + page number
- **Background processing:** Move Gemini processing to a queue for very large PDFs
- **Section continuity:** Pass previous page's section context to improve `SECTION_PATH_INFERRED` accuracy
- **Image extraction:** For pages with important diagrams, render as images and include in Gemini context
