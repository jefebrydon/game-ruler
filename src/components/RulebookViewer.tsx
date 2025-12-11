"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type RulebookViewerProps = {
  rulebookId: string;
  pdfUrl: string;
  pageCount: number;
};

export function RulebookViewer({
  pdfUrl,
  pageCount,
}: RulebookViewerProps): React.ReactElement {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderedPages = useRef<Set<number>>(new Set());
  const renderingPages = useRef<Set<number>>(new Set());

  // Load PDF document
  useEffect(() => {
    let cancelled = false;

    async function loadPdf(): Promise<void> {
      try {
        setIsLoading(true);
        setError(null);
        const loadedPdf = await pdfjsLib.getDocument(pdfUrl).promise;
        if (!cancelled) {
          setPdf(loadedPdf);
        }
      } catch (err) {
        console.error("Failed to load PDF:", err);
        if (!cancelled) {
          setError("Failed to load PDF");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // Render a specific page to canvas
  const renderPage = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement): Promise<void> => {
      // Check if already rendered OR currently rendering (prevents race condition)
      if (!pdf || renderedPages.current.has(pageNum) || renderingPages.current.has(pageNum)) {
        return;
      }

      // Mark as rendering BEFORE starting async work
      renderingPages.current.add(pageNum);

      try {
        const page = await pdf.getPage(pageNum);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext("2d");
        if (!context) return;

        await page.render({
          canvasContext: context,
          canvas,
          viewport,
        }).promise;

        renderedPages.current.add(pageNum);
      } catch (err) {
        console.error(`Failed to render page ${pageNum}:`, err);
      } finally {
        // Remove from rendering set when done (success or failure)
        renderingPages.current.delete(pageNum);
      }
    },
    [pdf]
  );

  // Render visible pages on scroll
  useEffect(() => {
    if (!pdf || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(
              entry.target.getAttribute("data-page") ?? "0",
              10
            );
            const canvas = pageRefs.current.get(pageNum);
            if (canvas && pageNum > 0) {
              renderPage(pageNum, canvas);
            }
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: "100px",
        threshold: 0,
      }
    );

    // Observe all page containers
    const pageContainers = containerRef.current.querySelectorAll("[data-page]");
    pageContainers.forEach((container) => observer.observe(container));

    return () => observer.disconnect();
  }, [pdf, renderPage]);

  // Track current page on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = (): void => {
      const pages = container.querySelectorAll("[data-page]");
      const containerRect = container.getBoundingClientRect();
      const containerMiddle = containerRect.top + containerRect.height / 2;

      for (const page of pages) {
        const pageRect = page.getBoundingClientRect();
        if (pageRect.top <= containerMiddle && pageRect.bottom >= containerMiddle) {
          const pageNum = parseInt(page.getAttribute("data-page") ?? "0", 10);
          if (pageNum > 0) {
            setCurrentPage(pageNum);
            break;
          }
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to a specific page
  const scrollToPage = useCallback((pageNum: number): void => {
    const pageContainer = containerRef.current?.querySelector(
      `[data-page="${pageNum}"]`
    );
    pageContainer?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Expose scrollToPage to parent via a custom event
  useEffect(() => {
    const handler = (e: CustomEvent<{ pageNumber: number }>): void => {
      scrollToPage(e.detail.pageNumber);
    };
    window.addEventListener("scrollToPage" as keyof WindowEventMap, handler as EventListener);
    return () => {
      window.removeEventListener("scrollToPage" as keyof WindowEventMap, handler as EventListener);
    };
  }, [scrollToPage]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading PDF...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page indicator */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2 sm:px-4">
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {pageCount}
        </span>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="rounded px-2 py-1 text-sm hover:bg-muted disabled:opacity-50"
            aria-label="Previous page"
          >
            <span className="sm:hidden">←</span>
            <span className="hidden sm:inline">← Prev</span>
          </button>
          <button
            onClick={() => scrollToPage(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage >= pageCount}
            className="rounded px-2 py-1 text-sm hover:bg-muted disabled:opacity-50"
            aria-label="Next page"
          >
            <span className="sm:hidden">→</span>
            <span className="hidden sm:inline">Next →</span>
          </button>
        </div>
      </div>

      {/* PDF pages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-muted/30 p-4"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              data-page={pageNum}
              className="w-full rounded-lg bg-white shadow-md"
            >
              <canvas
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNum, el);
                }}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper function to scroll to a page from outside the component
export function scrollViewerToPage(pageNumber: number): void {
  window.dispatchEvent(
    new CustomEvent("scrollToPage", { detail: { pageNumber } })
  );
}
