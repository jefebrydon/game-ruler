# Text Layer Highlighting Plan

## Overview

Implement PDF text highlighting by:
1. Adding pdf.js text layer to the RulebookViewer (enables text selection + DOM-based highlighting)
2. Extracting quoted text from OpenAI responses
3. Fuzzy-matching quotes against page text
4. Highlighting matching text via DOM manipulation

**Key benefits over coordinate-based approach:**
- Zoom/responsive scaling handled automatically by CSS
- Text selection works (users can copy rules text)
- Browser Ctrl+F search works on PDF text
- No manual transform matrix math
- Much simpler highlighting via DOM class manipulation

---

## Phase 1: Add Text Layer to RulebookViewer

### Goal
Render the pdf.js text layer over each canvas, enabling text selection and providing DOM elements for highlighting.

### 1.1 Update page container structure

Current:
```tsx
<div data-page={pageNum} className="w-full rounded-lg bg-white shadow-md">
  <canvas ref={...} className="w-full" />
</div>
```

New:
```tsx
<div data-page={pageNum} className="w-full rounded-lg bg-white shadow-md overflow-hidden">
  <div className="relative">
    <canvas ref={...} className="w-full" />
    <div ref={textLayerRef} className="textLayer" />
  </div>
</div>
```

### 1.2 Import TextLayer from pdfjs-dist

```typescript
import { TextLayer } from "pdfjs-dist";
```

### 1.3 Render text layer after canvas

In `renderPage()`, after `page.render()`:

```typescript
// After canvas render, add text layer
const textContent = await page.getTextContent();
const textLayerDiv = textLayerRefs.current.get(pageNum);

if (textLayerDiv) {
  textLayerDiv.innerHTML = "";
  textLayerDiv.style.width = `${viewport.width}px`;
  textLayerDiv.style.height = `${viewport.height}px`;
  
  const textLayer = new TextLayer({
    textContentSource: textContent,
    container: textLayerDiv,
    viewport,
  });
  
  await textLayer.render();
}
```

### 1.4 Add ref map for text layers

```typescript
const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
```

### 1.5 CSS for Text Layer

Add to `src/app/globals.css`:

```css
.textLayer {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  line-height: 1;
  pointer-events: auto;
}

.textLayer span {
  position: absolute;
  white-space: pre;
  color: transparent;
  pointer-events: all;
  user-select: text;
}

.textLayer span::selection {
  background: rgba(0, 0, 255, 0.3);
}

.textLayer span.highlight {
  background-color: rgba(255, 230, 0, 0.4);
  border-radius: 2px;
}
```

### Testing Phase 1
- [ ] Text layer renders over canvas
- [ ] Text is selectable
- [ ] Text positions align with canvas
- [ ] Lazy loading still works

---

## Phase 2: Extract Quoted Text from OpenAI Response

### Goal
Get the exact text that OpenAI cited so we can find it in the PDF.

### 2.1 Expand Citation type

In `src/app/api/rulebooks/ask/route.ts`:

```typescript
type Citation = {
  pageNumber: number;
  fileId: string;
  quotedText?: string;  // NEW
};
```

### 2.2 Extract quoted text from annotations

```typescript
for (const annotation of content.annotations) {
  if (annotation.type === "file_citation") {
    fileIdsWithQuotes.set(annotation.file_id, annotation.text);
  }
}
```

### Testing Phase 2
- [ ] Citations include quotedText field
- [ ] Quoted text matches retrieved content

---

## Phase 3: Fuzzy Text Matching

### Goal
Find where the quoted text appears in the page.

### 3.1 Install string-similarity

```bash
npm install string-similarity
npm install -D @types/string-similarity
```

### 3.2 Create `src/lib/text-matcher.ts`

```typescript
import { compareTwoStrings } from "string-similarity";

export type MatchResult = {
  startIndex: number;
  endIndex: number;
  score: number;
} | null;

export function findQuoteInPage(
  pageText: string,
  quote: string,
  threshold = 0.6
): MatchResult {
  if (!quote || !pageText || quote.length < 10) return null;
  
  const normQuote = quote.toLowerCase().replace(/\s+/g, " ");
  const normPage = pageText.toLowerCase().replace(/\s+/g, " ");
  
  // Fast path: exact match
  const exactIdx = normPage.indexOf(normQuote);
  if (exactIdx !== -1) {
    return { startIndex: exactIdx, endIndex: exactIdx + normQuote.length, score: 1 };
  }
  
  // Sliding window fuzzy match
  let best: MatchResult = null;
  const len = normQuote.length;
  
  for (let i = 0; i <= normPage.length - len; i += 5) {
    const window = normPage.slice(i, i + len);
    const score = compareTwoStrings(normQuote, window);
    
    if (score >= threshold && (!best || score > best.score)) {
      best = { startIndex: i, endIndex: i + len, score };
      if (score > 0.95) return best;
    }
  }
  
  return best;
}
```

### Testing Phase 3
- [ ] Exact matches found
- [ ] Fuzzy matches work for minor differences
- [ ] Performance < 50ms per page

---

## Phase 4: DOM-Based Highlighting

### Goal
Highlight matching text spans in the text layer.

### 4.1 Create `src/lib/text-highlighter.ts`

```typescript
export function highlightTextInPage(
  textLayerDiv: HTMLElement,
  startIndex: number,
  endIndex: number
): void {
  const spans = textLayerDiv.querySelectorAll("span");
  let idx = 0;
  
  for (const span of spans) {
    const text = span.textContent || "";
    const spanEnd = idx + text.length;
    
    if (spanEnd > startIndex && idx < endIndex) {
      span.classList.add("highlight");
    }
    idx = spanEnd + 1;
  }
}

export function clearAllHighlights(): void {
  document.querySelectorAll(".textLayer .highlight")
    .forEach(el => el.classList.remove("highlight"));
}

export function scrollToHighlight(container: HTMLElement): void {
  container.querySelector(".highlight")?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

export function getTextFromLayer(div: HTMLElement): string {
  return Array.from(div.querySelectorAll("span"))
    .map(s => s.textContent || "")
    .join(" ");
}
```

### Testing Phase 4
- [ ] Correct spans highlighted
- [ ] Clear highlights works
- [ ] Scroll to highlight works

---

## Phase 5: Integration

### Goal
Wire everything together.

### 5.1 Update ChatPanel

Pass quotedText to citation click:

```typescript
onClick={() => onCitationClick?.(citation.pageNumber, citation.quotedText)}
```

### 5.2 Update GamePageClient

```typescript
const handleCitationClick = useCallback((pageNumber: number, quotedText?: string) => {
  setActiveTab("rulebook");
  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("scrollToPageAndHighlight", {
        detail: { pageNumber, quotedText }
      })
    );
  }, 100);
}, []);
```

### 5.3 Update RulebookViewer

Add event handler for highlighting:

```typescript
useEffect(() => {
  const handler = async (e: CustomEvent) => {
    const { pageNumber, quotedText } = e.detail;
    clearAllHighlights();
    scrollToPage(pageNumber);
    
    if (quotedText) {
      await new Promise(r => setTimeout(r, 300)); // Wait for render
      const textLayer = textLayerRefs.current.get(pageNumber);
      if (textLayer) {
        const pageText = getTextFromLayer(textLayer);
        const match = findQuoteInPage(pageText, quotedText);
        if (match) {
          highlightTextInPage(textLayer, match.startIndex, match.endIndex);
          scrollToHighlight(textLayer);
        }
      }
    }
  };
  
  window.addEventListener("scrollToPageAndHighlight", handler as EventListener);
  return () => window.removeEventListener("scrollToPageAndHighlight", handler as EventListener);
}, [scrollToPage]);
```

### Testing Phase 5
- [ ] Citation click highlights text
- [ ] Previous highlights cleared
- [ ] Graceful fallback if no match

---

## Phase 6: Polish

### 6.1 Highlight animation

```css
.textLayer span.highlight {
  animation: highlightFade 0.5s ease-out;
}

@keyframes highlightFade {
  from { background-color: rgba(255, 230, 0, 0.8); }
  to { background-color: rgba(255, 230, 0, 0.4); }
}
```

### 6.2 Clear on new question

Clear highlights when user submits new question.

### 6.3 Long quote handling

For quotes > 500 chars, match first 200 chars only.

---

## File Summary

| File | Changes |
|------|---------|
| `src/components/RulebookViewer.tsx` | Add text layer, highlight handler |
| `src/app/globals.css` | Text layer + highlight CSS |
| `src/lib/text-matcher.ts` | NEW: Fuzzy matching |
| `src/lib/text-highlighter.ts` | NEW: DOM highlighting |
| `src/app/api/rulebooks/ask/route.ts` | Extract quotedText |
| `src/components/ChatPanel.tsx` | Pass quotedText |
| `src/components/GamePageClient.tsx` | Update event |
| `package.json` | Add string-similarity |


---

## References

- [pdf.js API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html)
- [PDFPageProxy](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html)
- [Text selection guide](https://medium.com/@mxgel/enable-text-selection-on-pdf-js-32fcfe845f4b)
- [pdf.js layers in React](https://blog.react-pdf.dev/understanding-pdfjs-layers-and-how-to-use-them-in-reactjs)
- [string-similarity](https://www.npmjs.com/package/string-similarity)
- [Fuse.js](https://www.fusejs.io/) (alternative fuzzy search)

