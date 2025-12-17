/**
 * Canonical Gemini prompt for RAG-optimized page extraction.
 * Converts a single PDF page into structured plain text with section tags.
 */
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

/**
 * Build the complete prompt for a specific page index.
 */
export function buildPromptForPage(pageIndex: number): string {
  return `${GEMINI_PAGE_EXTRACTION_PROMPT}

---

## Provided value

\`PAGE_INDEX = ${pageIndex}\`

Now output the page in the exact required format.`;
}
