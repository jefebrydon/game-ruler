# AGENTS.md

Guide for AI agents and developers making code changes to this project.

## Feature Index

| Feature | Description | Key Files |
|---------|-------------|-----------|
| **Upload rulebook** | Upload PDF (up to 50MB), AI-processed for RAG | `UploadForm.tsx`, `create-upload/`, `process-page/`, `ingest-batch/` |
| **Ask questions** | Natural language Q&A about rules | `ChatPanel.tsx`, `ask/route.ts` |
| **Page citations** | Answers include clickable page references | `ask/route.ts` (extraction), `ChatPanel.tsx` (buttons) |
| **PDF viewer** | View rulebook with page navigation | `RulebookViewer.tsx`, `GamePageClient.tsx` |
| **Auto-scroll to citations** | Clicking citation jumps to that page in viewer | `GamePageClient.tsx`, `RulebookViewer.tsx` (scrollToPage) |
| **Search games** | Debounced autocomplete search | `GameSearch.tsx`, `search/route.ts` |
| **Browse library** | Grid of all uploaded rulebooks | `games/page.tsx`, `GameCard.tsx` |
| **Responsive layout** | Desktop: side-by-side / Mobile: tabs | `GamePageClient.tsx` |

## Repo Map

```
src/
├── app/                      # Next.js App Router
│   ├── api/rulebooks/        # API routes
│   │   ├── ask/              # Q&A endpoint (OpenAI query + citations)
│   │   ├── create-upload/    # Creates DB row + signed upload URL
│   │   ├── ingest-batch/     # Uploads pages to OpenAI vector store
│   │   ├── process-page/     # Gemini PDF processing
│   │   ├── search/           # Search rulebooks by title
│   │   └── upload-assets/    # Thumbnail upload
│   ├── games/[slug]/         # Rulebook viewer + chat page
│   └── upload/               # Upload form page
├── components/               # React components
│   ├── ui/                   # Shadcn/ui primitives
│   ├── ChatPanel.tsx         # Q&A chat interface
│   ├── RulebookViewer.tsx    # PDF viewer (pdf.js)
│   ├── UploadForm.tsx        # Upload flow orchestrator
│   └── GameSearch.tsx        # Search autocomplete
├── lib/                      # Business logic
│   ├── gemini/               # Gemini client + prompts
│   ├── supabase/             # Supabase client helpers
│   ├── openai.ts             # OpenAI client singleton
│   ├── pdf-parser.ts         # PDF splitting + thumbnail
│   └── slug.ts               # URL slug generation
└── types/
    ├── database.ts           # Supabase table types
    └── index.ts              # Shared app types (ApiResponse, etc.)

supabase/migrations/          # Database schema SQL
```

## Stack

- **Framework:** Next.js 16 (App Router), TypeScript strict mode
- **Styling:** Tailwind CSS v4 (mobile-first), Shadcn/ui components
- **Database:** Supabase (Postgres + Storage)
- **AI:** OpenAI Responses API (file_search), Gemini (PDF processing)
- **Deployment:** Vercel

**Installed Shadcn components:** button, input, command, card, skeleton, sonner, dialog

## Key Rules

### React
- Server Components by default; Client Components only when interactivity required
- Use existing Shadcn components before creating custom ones
- Handle loading, error, and empty states explicitly

### API Routes
- Validate input at the boundary
- Return `{ data }` on success, `{ error: string }` on failure
- Use `ApiResponse<T>` discriminated union for all responses
- Keep orchestration in routes, business logic in `lib/`

### TypeScript
- Explicit return types on all exported functions
- Prefer discriminated unions over optional fields for state

### Files
- Components: `components/<ComponentName>.tsx`
- API helpers: `lib/<domain>.ts`
- Types: `types/database.ts` (Supabase), `types/index.ts` (shared)

## Key Constraints

| Constraint | Why | Impact |
|------------|-----|--------|
| Never POST raw PDFs through API routes | Vercel 4.5MB request body limit | Upload directly to Supabase Storage from client |
| 1 PDF page = 1 OpenAI file | Enables page-level citation mapping | File names encode page numbers |
| pdf.js runs client-side only | Uses browser APIs (canvas, DOMMatrix) | Must use `next/dynamic` with `ssr: false` |

## Architecture and Key Data Flows

### Upload Flow (Client-Orchestrated)

**Trigger:** Form submit in `UploadForm.tsx`

**Steps:**
1. `create-upload` — Supabase: insert row + signed URL
2. Client direct upload — Supabase Storage (bypasses Vercel 4.5MB limit)
3. `parsePDF()` — Client-side pdf-lib splits PDF into single pages
4. `process-page` ×N — Gemini extracts structured text (5 concurrent max)
5. `ingest-batch` ×N — OpenAI: upload files + attach to vector store
6. `upload-assets` — Supabase Storage: thumbnail upload
7. Redirect to `/games/[slug]`

**Ordering invariants:**
- Step 1 must complete before step 2 (need signed URL)
- Step 2 must complete before step 3 (need PDF bytes)
- Step 4 must complete before step 5 (need processed text)
- `batchIndex=0` creates vector store; subsequent batches reuse it
- Status transitions: `pending_ingest` → `ingesting` → `ready`

**Failure handling:**
- `ingest-batch` catches errors → sets `status='error'` + `error_message` on rulebook
- Other steps throw → caught in `UploadForm` → shows error UI with retry
- No automatic cleanup of partial uploads (orphaned files may remain)

**Key files:**
- `src/components/UploadForm.tsx` — orchestrates entire flow
- `src/lib/pdf-parser.ts` — PDF splitting with pdf-lib
- `src/app/api/rulebooks/process-page/route.ts` — Gemini processing
- `src/app/api/rulebooks/ingest-batch/route.ts` — OpenAI vector store creation
- `src/lib/gemini/prompt.ts` — RAG-optimized extraction prompt

### Ask Flow (Q&A)

**Trigger:** Form submit in `ChatPanel.tsx`

**Steps:**
1. POST `/api/rulebooks/ask` with `{ rulebookId, question }`
2. Supabase: fetch rulebook → get `openai_vector_store_id`
3. OpenAI: `responses.create` with `file_search` tool
4. Extract `file_id` from `message.content.annotations` (not `file_search_call.results`)
5. Supabase: lookup `rulebook_pages` → resolve `file_id` → `page_number`
6. Return `{ answer, citations }`

**Preconditions:**
- `rulebook.status` must be `'ready'`
- `rulebook.openai_vector_store_id` must exist

**Failure handling:**
- Missing/invalid rulebook → 404
- Status not ready or no vector store → 400
- OpenAI error → 500, generic error message

**Key files:**
- `src/components/ChatPanel.tsx` — chat UI
- `src/app/api/rulebooks/ask/route.ts` — query + citation resolution
- `src/components/RulebookViewer.tsx` — PDF display + scroll-to-page

### Integration Reference

| Integration | Purpose | Called From |
|-------------|---------|-------------|
| Supabase DB | All CRUD operations | `lib/supabase/server.ts` via route handlers |
| Supabase Storage | PDF + thumbnail storage | `create-upload/`, `upload-assets/`, client direct |
| Gemini | PDF page → structured text | `process-page/route.ts` |
| OpenAI Files | Upload .txt files | `ingest-batch/route.ts` |
| OpenAI Vector Stores | Create store + attach files | `ingest-batch/route.ts` |
| OpenAI Responses | Q&A with file_search | `ask/route.ts` |

All integrations are synchronous (await). No background jobs or queues.

## Database

**Tables:**
- `rulebooks` — id, slug, title, year, pdf_url, thumbnail_url, page_count, status, openai_vector_store_id, ingested_pages, error_message
- `rulebook_pages` — id, rulebook_id, page_number, openai_file_id, text_length

**Storage bucket:** `rulebooks` (public)
- `pdfs/<rulebookId>.pdf`
- `thumbnails/<rulebookId>.png`

**Schema:** `supabase/migrations/001_initial_schema.sql`

## Critical Patterns

### Citation Extraction (do not change)

Citations come from `message.content.annotations`, NOT from `file_search_call.results`:

```typescript
for (const item of response.output) {
  if (item.type === "message") {
    for (const content of item.content) {
      if (content.type === "output_text" && content.annotations) {
        for (const annotation of content.annotations) {
          if (annotation.type === "file_citation" && annotation.file_id) {
            // Map file_id → page_number via rulebook_pages table
          }
        }
      }
    }
  }
}
```

**Do NOT** use `include: ["file_search_call.results"]` — it returns ALL searched files, not just cited ones.

### pdf.js SSR Fix

Components using pdf.js must be dynamically imported:

```typescript
const RulebookViewer = dynamic(() => import("@/components/RulebookViewer"), {
  ssr: false,
});
```

### Canvas Race Condition

Track both `renderedPages` AND `renderingPages` refs to prevent concurrent renders to the same canvas.

### OpenAI Model

Use `gpt-5.1` for the ask endpoint. Do not change this model.

## Validation

```bash
npm run lint      # ESLint
npm run build     # Type check + production build
```

**Manual testing checklist:**
1. Upload a small PDF (5-10 pages)
2. Wait for ingestion to complete (status → ready)
3. Ask a question about the rulebook
4. Verify answer includes citation buttons
5. Click citation — PDF should scroll to correct page

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL    # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY   # Supabase service role (server-side only)
OPENAI_API_KEY              # OpenAI API key
GOOGLE_AI_API_KEY           # Gemini API key
```
