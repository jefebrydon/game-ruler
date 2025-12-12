# Text Layer Highlighting Plan

## Overview

Implement PDF text highlighting by:
1. Adding pdf.js text layer to RulebookViewer (enables text selection + DOM-based highlighting)
2. Extracting quoted text from OpenAI response annotations
3. Fuzzy-matching quotes against page text
4. Highlighting matching spans via DOM class manipulation

**Key benefits over coordinate-based approach:**
- Zoom/responsive scaling handled automatically by CSS
- Text selection works (users can copy rules text)
- Browser Ctrl+F search works on PDF text
- No manual transform matrix math

**Acceptance criteria:**
- Highlight appears within 500ms of citation click
- Works for quotes that span multiple text spans
- If no match found, scroll to page anyway (no error shown)
- Text selection still works on highlighted text

---

## Phase 1: Add Text Layer to RulebookViewer

### Goal
Render the pdf.js text layer over each canvas, enabling text selection and providing DOM elements for highlighting.

### 1.1 Fix canvas scaling for text layer alignment

Current problem: canvas renders at `scale=1.5` but CSS stretches it via `w-full`. The text layer won't align.

**Solution:** Set explicit CSS dimensions on canvas to match viewport, remove `w-full` stretching.

In `renderPage()`, after getting viewport:

```typescript
const scale = 1.5;
const viewport = page.getViewport({ scale });

// Set canvas bitmap size
canvas.width = viewport.width;
canvas.height = viewport.height;

// Set CSS size to match (prevents stretching)
canvas.style.width = `${viewport.width}px`;
canvas.style.height = `${viewport.height}px`;
```

Update the page container to allow natural sizing with max-width constraint:

```tsx
<div
  key={pageNum}
  data-page={pageNum}
  className="relative mx-auto rounded-lg bg-white shadow-md"
  style={{ maxWidth: "100%" }}
>
  <canvas
    ref={(el) => {
      if (el) pageRefs.current.set(pageNum, el);
    }}
    // Remove w-full class - size set explicitly in renderPage
  />
  <div
    ref={(el) => {
      if (el) textLayerRefs.current.set(pageNum, el);
    }}
    className="textLayer"
  />
</div>
```

### 1.2 Import renderTextLayer from pdfjs-dist

For pdfjs-dist v5.x, use `renderTextLayer` function:

```typescript
import * as pdfjsLib from "pdfjs-dist";
import { renderTextLayer } from "pdfjs-dist/web/pdf_viewer.mjs";
```

**Note:** If the web viewer module causes issues, fall back to:
```typescript
import { TextLayer } from "pdfjs-dist";
```
And check the actual export path in node_modules.

### 1.3 Add ref map for text layers

```typescript
const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
```

### 1.4 Render text layer after canvas

In `renderPage()`, after `page.render().promise`:

```typescript
// Render text layer
const textContent = await page.getTextContent();
const textLayerDiv = textLayerRefs.current.get(pageNum);

if (textLayerDiv) {
  // Clear previous render
  textLayerDiv.innerHTML = "";
  
  // Size to match canvas
  textLayerDiv.style.width = `${viewport.width}px`;
  textLayerDiv.style.height = `${viewport.height}px`;

  // Render text layer
  await renderTextLayer({
    textContentSource: textContent,
    container: textLayerDiv,
    viewport,
    textDivs: [], // pdf.js populates this
  }).promise;
}
```

### 1.5 CSS for text layer

Add to `src/app/globals.css`:

```css
/* PDF.js text layer - positioned over canvas for text selection */
.textLayer {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  line-height: 1;
  opacity: 0.25; /* Debug: make visible. Set to 1 for production with transparent text */
}

.textLayer span {
  position: absolute;
  white-space: pre;
  color: transparent;
  pointer-events: all;
  user-select: text;
}

.textLayer span::selection {
  background: rgba(0, 100, 255, 0.3);
}

/* Highlight style for citation matches */
.textLayer span.highlight {
  background-color: rgba(255, 230, 0, 0.5);
  border-radius: 2px;
}
```

### 1.6 Track text layer render completion

Add a ref to track which pages have text layers rendered:

```typescript
const textLayerRendered = useRef<Set<number>>(new Set());
```

Set after successful render:
```typescript
textLayerRendered.current.add(pageNum);
```

### Testing Phase 1
- [ ] Text layer renders over canvas (set opacity to 0.25 to verify alignment)
- [ ] Text spans align with rendered PDF text
- [ ] Text is selectable
- [ ] Ctrl+F finds text in PDF
- [ ] Lazy loading still works (text layer renders when page scrolls into view)

---

## Phase 2: Extract Quoted Text from OpenAI Response

### Goal
Get the exact text that OpenAI cited so we can find and highlight it in the PDF.

### 2.1 Update Citation type

In `src/types/index.ts` (or inline in route):

```typescript
export type Citation = {
  pageNumber: number;
  fileId: string;
  quote: string | null; // The text OpenAI quoted from this page
};
```

### 2.2 Extract quote from annotations

In `src/app/api/rulebooks/ask/route.ts`, update the annotation extraction:

```typescript
// Map file_id -> quote text
const fileIdToQuote = new Map<string, string>();

for (const item of response.output) {
  if (item.type === "message") {
    for (const content of item.content) {
      if (content.type === "output_text" && content.annotations) {
        for (const annotation of content.annotations) {
          if (annotation.type === "file_citation") {
            const fileId = annotation.file_id;
            // OpenAI Responses API: quote is in annotation.quote
            // If not available, try extracting from start_index/end_index
            const quote = annotation.quote ?? null;
            
            if (fileId && !fileIdToQuote.has(fileId)) {
              fileIdToQuote.set(fileId, quote);
            }
          }
        }
      }
    }
  }
}
```

### 2.3 Update citation building

```typescript
const citations: Citation[] = [];
if (fileIdToQuote.size > 0) {
  const { data: pages } = await supabase
    .from("rulebook_pages")
    .select("page_number, openai_file_id")
    .eq("rulebook_id", rulebookId)
    .in("openai_file_id", Array.from(fileIdToQuote.keys()));

  if (pages) {
    for (const page of pages) {
      citations.push({
        pageNumber: page.page_number,
        fileId: page.openai_file_id,
        quote: fileIdToQuote.get(page.openai_file_id) ?? null,
      });
    }
  }
}
```

### 2.4 Update AskResponse type

```typescript
type AskResponse = {
  answer: string;
  citations: Citation[];
};
```

### Testing Phase 2
- [ ] API returns citations with quote field populated
- [ ] Quote text matches content from the PDF page
- [ ] Works when OpenAI returns multiple citations

---

## Phase 3: Text Matching

### Goal
Find where the quoted text appears in the page's text layer.

### 3.1 Create `src/lib/text-matcher.ts`

No external dependencies needed for v1.

```typescript
export type MatchResult = {
  startIndex: number;
  endIndex: number;
  score: number;
} | null;

/**
 * Normalize text for matching:
 * - lowercase
 * - collapse whitespace
 * - normalize quotes and dashes
 * - remove soft hyphens
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u00AD\u200B]/g, "") // soft hyphen, zero-width space
    .replace(/[\u2018\u2019]/g, "'") // curly single quotes
    .replace(/[\u201C\u201D]/g, '"') // curly double quotes
    .replace(/[\u2013\u2014]/g, "-") // en/em dash
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

/**
 * Find quote in page text. Returns character indices into normalized page text.
 */
export function findQuoteInPage(
  pageText: string,
  quote: string,
  threshold = 0.7
): MatchResult {
  if (!quote || !pageText) return null;
  
  const normQuote = normalize(quote);
  const normPage = normalize(pageText);
  
  // Skip very short quotes (likely noise)
  if (normQuote.length < 10) return null;
  
  // Fast path: exact substring match
  const exactIdx = normPage.indexOf(normQuote);
  if (exactIdx !== -1) {
    return {
      startIndex: exactIdx,
      endIndex: exactIdx + normQuote.length,
      score: 1.0,
    };
  }
  
  // For long quotes, try matching just the beginning (first 150 chars)
  // OpenAI sometimes returns partial or slightly modified quotes
  const shortQuote = normQuote.slice(0, 150);
  const shortIdx = normPage.indexOf(shortQuote);
  if (shortIdx !== -1) {
    return {
      startIndex: shortIdx,
      endIndex: shortIdx + shortQuote.length,
      score: 0.9,
    };
  }
  
  // Fallback: sliding window similarity (expensive, only for medium quotes)
  if (normQuote.length <= 300) {
    const result = slidingWindowMatch(normPage, normQuote, threshold);
    if (result) return result;
  }
  
  return null;
}

/**
 * Simple sliding window with character-level similarity.
 * For v1, we use a basic approach; can swap in string-similarity later if needed.
 */
function slidingWindowMatch(
  haystack: string,
  needle: string,
  threshold: number
): MatchResult {
  const needleLen = needle.length;
  let best: MatchResult = null;
  
  // Step by 10 chars for performance
  for (let i = 0; i <= haystack.length - needleLen; i += 10) {
    const window = haystack.slice(i, i + needleLen);
    const score = similarity(needle, window);
    
    if (score >= threshold && (!best || score > best.score)) {
      best = { startIndex: i, endIndex: i + needleLen, score };
      if (score > 0.95) return best; // Good enough, stop early
    }
  }
  
  return best;
}

/**
 * Basic bigram similarity (Dice coefficient).
 * Fast and reasonable for fuzzy matching.
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  
  const bigramsA = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) {
    bigramsA.add(a.slice(i, i + 2));
  }
  
  let intersection = 0;
  for (let i = 0; i < b.length - 1; i++) {
    if (bigramsA.has(b.slice(i, i + 2))) {
      intersection++;
    }
  }
  
  return (2 * intersection) / (a.length - 1 + b.length - 1);
}
```

### Testing Phase 3
- [ ] Exact matches found instantly
- [ ] Matches work with minor whitespace differences
- [ ] Long quotes (500+ chars) match via prefix
- [ ] Performance: < 50ms per page for typical quotes

---

## Phase 4: DOM-Based Highlighting

### Goal
Highlight matching text spans in the text layer.

### 4.1 Create `src/lib/text-highlighter.ts`

```typescript
/**
 * Extract text from a text layer div, building a map of character positions to spans.
 */
export type TextLayerMap = {
  text: string;
  spans: Array<{ span: HTMLSpanElement; start: number; end: number }>;
};

export function buildTextLayerMap(textLayerDiv: HTMLElement): TextLayerMap {
  const spans = Array.from(textLayerDiv.querySelectorAll("span"));
  const result: TextLayerMap = { text: "", spans: [] };
  
  let pos = 0;
  for (const span of spans) {
    const content = span.textContent || "";
    result.spans.push({
      span,
      start: pos,
      end: pos + content.length,
    });
    result.text += content + " "; // Join with space (matches how we'll normalize)
    pos += content.length + 1;
  }
  
  return result;
}

/**
 * Highlight spans that overlap with the given character range.
 * Note: This highlights entire spans, not exact character ranges.
 */
export function highlightRange(
  map: TextLayerMap,
  startIndex: number,
  endIndex: number
): void {
  for (const { span, start, end } of map.spans) {
    // Check if span overlaps with target range
    if (end > startIndex && start < endIndex) {
      span.classList.add("highlight");
    }
  }
}

/**
 * Clear all highlights within a specific text layer.
 */
export function clearHighlights(textLayerDiv: HTMLElement): void {
  textLayerDiv
    .querySelectorAll(".highlight")
    .forEach((el) => el.classList.remove("highlight"));
}

/**
 * Clear all highlights in the entire viewer.
 */
export function clearAllHighlights(viewerContainer: HTMLElement): void {
  viewerContainer
    .querySelectorAll(".textLayer .highlight")
    .forEach((el) => el.classList.remove("highlight"));
}

/**
 * Scroll the first highlighted element into view.
 */
export function scrollToFirstHighlight(container: HTMLElement): void {
  const firstHighlight = container.querySelector(".textLayer .highlight");
  firstHighlight?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}
```

### Testing Phase 4
- [ ] Correct spans get highlighted
- [ ] clearHighlights removes only highlights in target layer
- [ ] clearAllHighlights removes all highlights in viewer
- [ ] scrollToFirstHighlight scrolls highlight into view

---

## Phase 5: Integration

### Goal
Wire everything together with proper timing/readiness handling.

### 5.1 Add ensurePageReady to RulebookViewer

Add a method that waits for a page's text layer to be rendered:

```typescript
// In RulebookViewer, add a way to wait for page readiness
const pageReadyResolvers = useRef<Map<number, Array<() => void>>>(new Map());

const ensurePageReady = useCallback(async (pageNum: number): Promise<void> => {
  // If already rendered, resolve immediately
  if (textLayerRendered.current.has(pageNum)) {
    return;
  }
  
  // Otherwise, wait for render to complete
  return new Promise((resolve) => {
    const resolvers = pageReadyResolvers.current.get(pageNum) || [];
    resolvers.push(resolve);
    pageReadyResolvers.current.set(pageNum, resolvers);
  });
}, []);

// In renderPage, after text layer renders successfully:
const resolvers = pageReadyResolvers.current.get(pageNum);
if (resolvers) {
  resolvers.forEach((resolve) => resolve());
  pageReadyResolvers.current.delete(pageNum);
}
```

### 5.2 Update RulebookViewer event handler

Replace the simple `scrollToPage` event with one that handles highlighting:

```typescript
import { findQuoteInPage } from "@/lib/text-matcher";
import {
  buildTextLayerMap,
  highlightRange,
  clearAllHighlights,
  scrollToFirstHighlight,
} from "@/lib/text-highlighter";

// Event detail type
type ScrollAndHighlightDetail = {
  pageNumber: number;
  quote?: string | null;
};

useEffect(() => {
  const handler = async (e: CustomEvent<ScrollAndHighlightDetail>): Promise<void> => {
    const { pageNumber, quote } = e.detail;
    
    // Clear previous highlights
    if (containerRef.current) {
      clearAllHighlights(containerRef.current);
    }
    
    // Scroll to page
    scrollToPage(pageNumber);
    
    // If no quote, we're done
    if (!quote) return;
    
    // Ensure page is rendered (including text layer)
    await ensurePageReady(pageNumber);
    
    // Small delay for DOM to settle after render
    await new Promise((r) => setTimeout(r, 50));
    
    // Get text layer and attempt highlight
    const textLayerDiv = textLayerRefs.current.get(pageNumber);
    if (!textLayerDiv) return;
    
    const map = buildTextLayerMap(textLayerDiv);
    const match = findQuoteInPage(map.text, quote);
    
    if (match) {
      highlightRange(map, match.startIndex, match.endIndex);
      scrollToFirstHighlight(containerRef.current!);
    }
    // If no match, page is already scrolled into view - graceful degradation
  };

  window.addEventListener(
    "scrollToPageAndHighlight" as keyof WindowEventMap,
    handler as EventListener
  );
  return () => {
    window.removeEventListener(
      "scrollToPageAndHighlight" as keyof WindowEventMap,
      handler as EventListener
    );
  };
}, [scrollToPage, ensurePageReady]);
```

### 5.3 Export updated helper function

```typescript
export function scrollViewerToPage(pageNumber: number, quote?: string | null): void {
  window.dispatchEvent(
    new CustomEvent("scrollToPageAndHighlight", {
      detail: { pageNumber, quote },
    })
  );
}
```

### 5.4 Update ChatPanel Citation type and click handler

In `ChatPanel.tsx`:

```typescript
type Citation = {
  pageNumber: number;
  fileId: string;
  quote: string | null;
};

// Update props
type ChatPanelProps = {
  rulebookId: string;
  title: string;
  onCitationClick?: (pageNumber: number, quote: string | null) => void;
};

// Update click handler in MessageBubble
<button
  key={idx}
  onClick={() => onCitationClick?.(citation.pageNumber, citation.quote)}
  className="rounded bg-background/20 px-2 py-0.5 text-xs hover:bg-background/30"
>
  Page {citation.pageNumber}
</button>
```

### 5.5 Update GamePageClient

```typescript
import { scrollViewerToPage } from "@/components/RulebookViewer";

const handleCitationClick = useCallback((pageNumber: number, quote: string | null) => {
  setActiveTab("rulebook");
  // Small delay to ensure tab switch completes
  setTimeout(() => scrollViewerToPage(pageNumber, quote), 100);
}, []);

// Update ChatPanel usage
<ChatPanel
  rulebookId={rulebookId}
  title={title}
  onCitationClick={handleCitationClick}
/>
```

### Testing Phase 5
- [ ] Citation click scrolls to page AND highlights quote
- [ ] Previous highlights cleared on new citation click
- [ ] Works when page hasn't been rendered yet (waits for render)
- [ ] Graceful fallback: if no match, still scrolls to page
- [ ] Works on mobile (tab switch + scroll + highlight)

---

## Phase 6: Polish

### 6.1 Highlight fade-in animation

Add to `globals.css`:

```css
.textLayer span.highlight {
  background-color: rgba(255, 230, 0, 0.5);
  border-radius: 2px;
  animation: highlightPulse 0.6s ease-out;
}

@keyframes highlightPulse {
  0% { background-color: rgba(255, 180, 0, 0.8); }
  100% { background-color: rgba(255, 230, 0, 0.5); }
}
```

### 6.2 Clear highlights on new question

In `ChatPanel.tsx`, dispatch a clear event when submitting:

```typescript
const handleSubmit = async (e: React.FormEvent): Promise<void> => {
  e.preventDefault();
  
  // Clear previous highlights when asking new question
  window.dispatchEvent(new CustomEvent("clearHighlights"));
  
  // ... rest of submit logic
};
```

In `RulebookViewer.tsx`, listen for clear event:

```typescript
useEffect(() => {
  const handler = (): void => {
    if (containerRef.current) {
      clearAllHighlights(containerRef.current);
    }
  };
  window.addEventListener("clearHighlights", handler);
  return () => window.removeEventListener("clearHighlights", handler);
}, []);
```

### 6.3 Long quote handling

Already handled in `findQuoteInPage()` - matches first 150 chars for quotes > 150 chars.

### 6.4 Debug mode (optional)

Add a debug flag to visualize text layer alignment during development:

```css
/* Uncomment to debug text layer alignment */
/*
.textLayer {
  opacity: 0.5 !important;
}
.textLayer span {
  color: red !important;
  background: rgba(255, 0, 0, 0.1);
}
*/
```

---

## File Summary

| File | Changes |
|------|---------|
| `src/components/RulebookViewer.tsx` | Add text layer rendering, refs, ensurePageReady, highlight event handler |
| `src/app/globals.css` | Text layer CSS + highlight styles |
| `src/lib/text-matcher.ts` | NEW: normalize + findQuoteInPage |
| `src/lib/text-highlighter.ts` | NEW: buildTextLayerMap, highlightRange, clear/scroll helpers |
| `src/app/api/rulebooks/ask/route.ts` | Extract quote from annotations |
| `src/types/index.ts` | Update Citation type with quote field |
| `src/components/ChatPanel.tsx` | Update Citation type, pass quote to click handler |
| `src/components/GamePageClient.tsx` | Update handleCitationClick signature |

---

## Failure Modes & Fallbacks

| Scenario | Behavior |
|----------|----------|
| OpenAI returns no quote | Scroll to page, no highlight |
| Quote not found in page text | Scroll to page, no highlight (silent) |
| Text layer fails to render | Canvas still works, no text selection/highlight |
| Very long quote (500+ chars) | Match first 150 chars only |
| Page not yet rendered | Wait for render via ensurePageReady |

---

## Future Improvements (Out of Scope)

- **Exact character highlighting**: Split spans at match boundaries for precise highlighting
- **Multiple quotes per page**: Support highlighting multiple distinct quotes
- **Highlight persistence**: Keep highlights when scrolling away and back
- **Search within PDF**: Use text layer for in-viewer Ctrl+F style search

---

## References

- [pdf.js Text Layer](https://github.com/nicokant/pdf-viewer/blob/master/src/pdf.css) - Example text layer CSS
- [pdf.js API - getTextContent](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html)
- [renderTextLayer usage](https://github.com/nicokant/pdf-viewer/blob/main/src/Page.tsx)
