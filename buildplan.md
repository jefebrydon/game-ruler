## 1. Recommended stack (v1)

**Frontend**

* **Next.js (App Router) + React + TypeScript**, deployed on **Vercel**
* **Tailwind + Shadcn** for UI, mobile-first layouts
* **pdf.js** in the browser for:

  * Rendering PDF pages to canvas in the Rulebook Viewer
  * Extracting text + glyph positions for later bounding-box highlighting

**Backend**

* **Next.js API routes** on Vercel for:

  * Creating rulebook records
  * Talking to OpenAI Responses API
* **OpenAI Responses API** with **file_search + vector stores**
  * **Strategy:** 1 PDF Page = 1 OpenAI File. All files for a game are grouped into **1 Vector Store**.
  * **Model:** `gpt-4.1-mini` for cost efficiency (upgrade to `gpt-4.1` if quality needs it).
* **Supabase** for:

  * **Postgres**: rulebooks, page-file mapping
  * **Storage**: original PDFs and a per-rulebook JSON with text+coordinates

**Important infra constraint**

* Vercel serverless functions have a **4.5 MB request body limit**, so you should **never POST the raw PDF through your API**. ([Vercel][1])
* Typical heavy rulebooks (e.g. Gloomhaven 2nd ed) are ~50 pages and 12–30 MB, which would blow that limit. ([Manuals+][2])

So the core trick:
**Upload the binary PDF directly from the browser to Supabase Storage.**
Then, send **only text + metadata** (much smaller) through your Vercel API to OpenAI.

---

## 2. Home page & game search (v1)

**Goal:** A simple home page with a brief value prop, a primary "Select a Game" search input, and a clear path to upload new rulebooks.

**Layout:**

* **Hero section:** 1–2 sentences ("Upload a board-game rulebook and instantly get an AI-powered rules assistant with page-level citations.")
* **"Select a Game"** search input using `GameSearch` component.
* **"Upload New Rulebook"** button/link → navigates to `/upload`.

**GameSearch component:**

* Built with shadcn/ui `Command` primitives.
* UX:
  * Debounced search (~250ms).
  * Empty query → no results (don't hit API).
  * Loading state: "Searching…"
  * No results state: "No games found."
  * Keyboard: up/down to move, Enter to select.
  * Mouse/tap to select; mobile-friendly (full-width).
  * Selection → navigate to `/games/[slug]`.

**Backend route:** `GET /api/rulebooks/search?q=...`

* If `q` missing/empty → return `[]`.
* Case-insensitive match on `title` (ilike), limit 10.
* Return `{ id, slug, title, year, game_image_url }[]`.
* Safe for public read (no auth for v1).

---

## 3. Data model

In Supabase Postgres:

**`rulebooks` table**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, pk | |
| `slug` | text, unique | URL-friendly identifier |
| `title` | text | User-provided game name |
| `year` | int, nullable | Publication year (optional for v1) |
| `game_image_url` | text, nullable | External cover image URL |
| `thumbnail_url` | text, nullable | Supabase URL for page-1 PNG |
| `pdf_url` | text | Supabase public URL to stored PDF |
| `page_count` | int | Total pages in the PDF |
| `openai_vector_store_id` | text, nullable | Created during ingestion |
| `status` | text | `pending_ingest` \| `ingesting` \| `ready` \| `error` |
| `ingested_pages` | int, default 0 | Progress tracking for batched ingest |
| `error_message` | text, nullable | Error details if `status = 'error'` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Indexes:**

* `idx_rulebooks_title` on `title` (for search)
* `idx_rulebooks_status` on `status` (for filtering)

**`rulebook_pages` table**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, pk | |
| `rulebook_id` | uuid, fk → rulebooks.id | |
| `page_number` | int | 1-indexed |
| `openai_file_id` | text | File ID in OpenAI for this page |
| `text_length` | int, nullable | Character count (optional) |

**Unique constraint:** `(rulebook_id, page_number)`

In Supabase Storage (bucket: `rulebooks`, **public**):

* `pdfs/<rulebookId>.pdf`
* `text_coords/<rulebookId>.json` – text + bounding boxes for every page
* `thumbnails/<rulebookId>.png` – first page preview image

---

## 4. Upload / ingest flow (v1)

### Prerequisites – Upload form

* **Route:** `/upload`
* **Form fields:**
  * `title` (required) – game name
  * `year` (optional) – publication year
  * `file` (required) – PDF file input
* **Client-side validation:**
  * Max file size: **50 MB**. Show error before upload if exceeded.
  * File type: `application/pdf` only.
* **Slug generation:** Kebab-case from `title` + random suffix if collision (e.g., `catan-abc123`).

### Step 1 – Client: create record + upload PDF to Supabase

1. POST to `/api/rulebooks/create-upload` with `{ title, year }`:

   * Generate `slug` (check uniqueness).
   * Create `rulebooks` row with `status = 'pending_ingest'`.
   * Generate **signed upload URL** for `pdfs/<rulebookId>.pdf`.
   * Return `{ rulebookId, slug, uploadUrl }`.

2. In the browser:

   * `fetch(uploadUrl, { method: 'PUT', body: file })`.
   * On success: PDF is in storage, DB row exists.

> This avoids sending the PDF through Vercel and sidesteps the 4.5MB limit.

### Step 2 – Client: parse PDF locally with pdf.js

3. Load the `File` object with pdf.js (`pdfjs-dist`):

   * Iterate pages.
   * For each page:
     * `page.getTextContent()` → text items with glyph positions.
     * (Page 1 only) Render to `<canvas>` at low scale for thumbnail.

4. Build a **text + coords structure**:

```ts
type RulebookTextCoords = {
  pages: {
    pageNumber: number;
    fullText: string;
    items: {
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }[];
  }[];
};
```

5. Store in memory. Also capture:
   * `pageCount` (total pages)
   * `thumbnailBlob` (page 1 canvas as PNG blob)

### Step 3 – Client → Backend: send text for vectorization (Batched)

6. **Update status:** PATCH `/api/rulebooks/[id]/status` → `status = 'ingesting'`.

7. **Loop through batches** (e.g., 10 pages at a time):

   * Payload:
     ```ts
     {
       rulebookId,
       batchIndex: number,        // 0, 1, 2, ...
       pages: [
         { pageNumber: 1, text: "..." },
         ...
       ],
       isLastBatch: boolean,
       totalPages: number         // for progress calculation
     }
     ```
   * POST to `/api/rulebooks/ingest-batch`.
   * **On success:** Update UI progress bar ("Processed 20 of 50 pages…").
   * **On failure:** See error handling below.

### Step 4 – Backend: create vector_store + per-page files

In `/api/rulebooks/ingest-batch`:

8. **If first batch (`batchIndex === 0`):**
   * Create a **Vector Store**: `rulebook-{id}`.
   * Update DB: `openai_vector_store_id`.

9. **For each page in the batch:**
   * Create file in OpenAI: `rulebook-{id}-page-{n}.txt`.
   * **Crucial:** 1 Page = 1 File. This makes citation mapping trivial.
   * Attach file to the Vector Store.
   * Insert into `rulebook_pages` (`page_number`, `openai_file_id`).

10. **Update progress:** `UPDATE rulebooks SET ingested_pages = ingested_pages + <batch_size>`.

11. **If `isLastBatch`:**
    * Update `rulebooks`: `status = 'ready'`, `page_count = totalPages`.
    * Return `{ success: true, status: 'ready' }`.

### Step 5 – Client: upload thumbnail + text_coords JSON

12. After final batch succeeds:
    * Upload `thumbnailBlob` → `thumbnails/<rulebookId>.png`.
    * Upload `text_coords` JSON → `text_coords/<rulebookId>.json`.
    * PATCH `/api/rulebooks/[id]` with `{ thumbnail_url, pdf_url }` (full public URLs).

13. Navigate user to `/games/[slug]` – their rulebook is ready!

### Error handling & recovery

* **If any batch fails:**
  * Set `status = 'error'`, `error_message = <details>`.
  * Show user: "Upload failed. [Retry]"
  * **Retry logic:** Resume from `ingested_pages` (skip already-processed pages).
  * **Future:** Add cleanup job to delete orphaned OpenAI files/vector stores.

* **Duplicate rulebooks (v1):** Allow duplicates; they get unique slugs. Future: detect by title similarity or PDF hash.

---

## 5. Question answering flow with Responses API

> **V1 Scope:** Single-turn Q&A only. No conversation history. Future: pass last N messages as context.

### Step 1 – Client: call /api/rulebooks/ask

1. User is viewing `/games/[slug]`, sees Rulebook Viewer + chat panel.

2. On question submit, POST to `/api/rulebooks/ask`:

```ts
{
  rulebookId: string,
  question: string
}
```

### Step 2 – Backend: Responses + Native Citations

3. In `/api/rulebooks/ask`:

* Fetch `openai_vector_store_id` from `rulebooks` table.

* Call **Responses API** with:
  * `model: "gpt-4.1-mini"`
  * `tools: [{ type: "file_search" }]`
  * `tool_resources: { file_search: { vector_store_ids: [storeId] } }`
  * `stream: true`

* **System Prompt:**
  > You are a board game rules expert. Answer strictly based on the provided files. Keep answers concise. When citing rules, quote the exact text from the rulebook.

  * **Do NOT** ask for JSON output. We will use native annotations.

### Step 3 – Stream the response

4. **Streaming implementation:**
   * Use `ReadableStream` + `TextEncoderStream` on the server.
   * Return `new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })`.
   * Client uses `fetch` + `getReader()` to consume chunks.

5. **Parse streaming events:**
   * OpenAI returns text chunks interleaved with annotations like `【4:0†source】`.
   * Each annotation contains a `file_id`.

### Step 4 – Resolve Citations

6. When you encounter a `file_id` (in stream or final response):
   * Query: `SELECT page_number FROM rulebook_pages WHERE openai_file_id = ?`.
   * This gives you the **exact, verified page number**.

7. **Return/stream to client:**
   * Text chunks (for live display).
   * A final metadata event: `{ pageNumber, citedFileId }`.
   * Client uses the `pageNumber` to auto-scroll.

---

## 6. Rulebook Viewer + bounding-box highlight

### Rendering (with lazy loading)

1. On `/games/[slug]`:

* Fetch rulebook metadata (including `pdf_url`, `page_count`).
* Load `text_coords/<rulebookId>.json` into state.

2. **PDF rendering with virtualization:**

* Use `react-window` or similar to render only **visible pages** (± 1 buffer).
* Each page: render to `<canvas>` via pdf.js on demand.
* This keeps memory usage low for 50+ page rulebooks.

3. The viewer should support:

* Vertical scrolling through all pages.
* Page number indicator ("Page 12 of 48").
* Programmatic scroll to any page via ref.

### Highlighting a rule

4. When `/api/rulebooks/ask` responds with `{ pageNumber }`:

* Scroll that page into view (`scrollIntoView({ behavior: "smooth" })`).

5. **Quote highlighting (optional for v1):**

* If the model quoted text in its answer, fuzzy-match against `text_coords.pages[pageNumber].fullText`.
* Find the index range, map to `items[]` bounding boxes.
* Draw a semi-transparent overlay on the canvas.

6. **Fallback:**

* If fuzzy match fails, just scroll to the page (no highlight).
* Show: "See page 12 for details."

---

## 7. "Known Games" library

1. Create page `/games`:

* Query `rulebooks` where `status = 'ready'`, sorted by `created_at desc`.
* **Pagination:** Limit 20 per page, load more on scroll (infinite scroll) or pagination buttons.

2. Display as card grid:

* **Thumbnail** (from `thumbnail_url`, fallback to placeholder).
* **Title**.
* **Year** (if present).

3. Clicking a card → `/games/[slug]`.

---

## 8. Future features (out of scope for v1)

* **Delete/update rulebook:** Remove from OpenAI (files + vector store), Supabase (storage + DB).
* **Conversation history:** Multi-turn Q&A with context.
* **Duplicate detection:** Hash PDFs or fuzzy-match titles.
* **Full-text search:** Replace `ilike` with Postgres `tsvector` or Supabase full-text search.
* **User accounts:** Track uploads per user, private rulebooks.

---

## 9. Build order in Cursor

**Phase 1 – Skeleton**

1. Set up Next.js (App Router, TS) + deploy to Vercel.
2. Add Tailwind + Shadcn.
3. Create routes: `/`, `/upload`, `/games`, `/games/[slug]`.
4. Set up environment variables (`.env.local`):
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `SUPABASE_SERVICE_ROLE_KEY`
   * `OPENAI_API_KEY`

**Phase 2 – Supabase wiring**

5. Create Supabase project.
6. Add client helpers (`lib/supabase/client.ts`, `lib/supabase/server.ts`).
7. Create tables: `rulebooks`, `rulebook_pages` (with indexes).
8. Create storage bucket: `rulebooks` (public).

**Phase 3 – Home page + search**

9. Implement `GET /api/rulebooks/search`.
10. Build `GameSearch` component.
11. Wire into `app/page.tsx` with hero + upload CTA.

**Phase 4 – Upload pipeline (Batched)**

12. Build `/upload` page with form (title, year, file).
13. Implement `POST /api/rulebooks/create-upload`.
14. Implement `POST /api/rulebooks/ingest-batch`.
15. Frontend: PDF parsing with pdf.js, batched upload loop, progress UI.
16. Upload thumbnail + text_coords to Supabase on completion.

**Phase 5 – Viewer & chat (functional, basic UI)**

> Focus on getting the complete flow working end-to-end. Use basic/placeholder UI—design polish comes in Phase 6.

17. `/games/[slug]` page:
    * Fetch rulebook metadata.
    * Render PDF with virtualized page list.
    * Load `text_coords`.

18. Implement `POST /api/rulebooks/ask`:
    * Responses API + `file_search`.
    * Stream response with SSE.
    * Resolve `file_id` → `page_number`.

19. Chat UI:
    * Input box + send button.
    * Stream answer text.
    * Auto-scroll to cited page on completion.

**Phase 6 – Polish & UX**

> Now that the full flow works, refine the design and user experience.

20. Build `/games` list with pagination.
21. Mobile responsiveness pass.
22. Error states and loading skeletons.
23. Basic SEO (meta tags, OG images).
24. UX improvements:
    * Move upload form into a modal (trigger from home page).
    * Refine layouts, spacing, and visual hierarchy.
    * Add transitions/animations where appropriate.

---

[1]: https://vercel.com/docs/functions/limitations "Vercel Functions Limits"
[2]: https://manuals.plus/m/a6318fa47c0835fd6e2681380dbfe32e2671fc09783c671dba0f3cbc787d0b8b "Gloomhaven: Your Guide to Adventure"
[3]: https://platform.openai.com/docs/guides/tools-file-search "File search - OpenAI API"
[4]: https://platform.openai.com/docs/api-reference/responses-streaming "Streaming events | OpenAI API Reference"
