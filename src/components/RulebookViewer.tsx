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

// Placeholder dimensions for canvases before rendering (prevents layout shift)
type PageDimensions = { width: number; height: number };

export function RulebookViewer({
  pdfUrl,
  pageCount,
}: RulebookViewerProps): React.ReactElement {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedPage, setHighlightedPage] = useState<number | null>(null);
  const [pageDimensions, setPageDimensions] = useState<PageDimensions | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderedPages = useRef<Set<number>>(new Set());
  const renderingPages = useRef<Set<number>>(new Set());
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load PDF document and get page dimensions for stable layout
  useEffect(() => {
    let cancelled = false;

    async function loadPdf(): Promise<void> {
      try {
        setIsLoading(true);
        setError(null);
        
        // Add timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          if (!cancelled) {
            setError("PDF loading timed out. Please check your connection and try again.");
            setIsLoading(false);
          }
        }, 30000); // 30 second timeout
        
        const loadedPdf = await pdfjsLib.getDocument(pdfUrl).promise;
        clearTimeout(timeoutId);
        
        if (!cancelled) {
          // Get page 1 dimensions to set placeholder sizes for all pages
          // This prevents layout shift when pages render lazily
          const page1 = await loadedPdf.getPage(1);
          const scale = 1.5;
          const viewport = page1.getViewport({ scale });
          setPageDimensions({ width: viewport.width, height: viewport.height });
          
          setPdf(loadedPdf);
        }
      } catch (err) {
        console.error("Failed to load PDF:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load PDF");
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

  // Set placeholder dimensions on all unrendered canvases for stable layout
  // This ensures scroll calculations are correct before pages render
  useEffect(() => {
    if (!pageDimensions || !pdf) return;
    
    pageRefs.current.forEach((canvas, pageNum) => {
      // Only set placeholder if not yet rendered (canvas default is 300x150)
      if (!renderedPages.current.has(pageNum) && canvas.width !== pageDimensions.width) {
        canvas.width = pageDimensions.width;
        canvas.height = pageDimensions.height;
      }
    });
  }, [pageDimensions, pdf]);

  // Scroll to a specific page
  const scrollToPage = useCallback((pageNum: number): void => {
    const container = containerRef.current;
    if (!container) {
      console.log("[RulebookViewer] scrollToPage: no container");
      return;
    }
    
    const pageContainer = container.querySelector(
      `[data-page="${pageNum}"]`
    ) as HTMLElement | null;
    
    console.log("[RulebookViewer] scrollToPage called:", {
      pageNum,
      hasContainer: !!container,
      hasPageContainer: !!pageContainer,
      containerScrollTop: container.scrollTop,
      containerScrollHeight: container.scrollHeight,
    });
    
    if (pageContainer) {
      // Use manual scroll calculation for reliability with nested containers
      const containerRect = container.getBoundingClientRect();
      const pageRect = pageContainer.getBoundingClientRect();
      const scrollOffset = pageRect.top - containerRect.top + container.scrollTop;
      
      console.log("[RulebookViewer] Scrolling:", {
        pageRect: { top: pageRect.top },
        containerRect: { top: containerRect.top },
        currentScrollTop: container.scrollTop,
        targetScrollTop: scrollOffset,
      });
      
      container.scrollTo({
        top: scrollOffset,
        behavior: "smooth",
      });
    }
  }, []);

  // Expose scrollToPage to parent via a custom event
  useEffect(() => {
    const handler = (e: CustomEvent<{ pageNumber: number }>): void => {
      const container = containerRef.current;
      const pageNum = e.detail.pageNumber;
      
      // Debug logging
      console.log("[RulebookViewer] scrollToPage event received:", {
        pageNum,
        hasContainer: !!container,
        offsetParent: container?.offsetParent,
        isVisible: container?.offsetParent !== null,
      });

      // Only handle if this instance is visible (offsetParent is null when display: none)
      if (!container || container.offsetParent === null) {
        console.log("[RulebookViewer] Skipping - container not visible");
        return;
      }

      console.log("[RulebookViewer] Scrolling to page", pageNum);
      scrollToPage(pageNum);
      
      // Clear any existing timeout
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      
      // Set highlighted page and auto-dismiss after 3 seconds
      setHighlightedPage(pageNum);
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedPage(null);
      }, 3000);
    };
    window.addEventListener("scrollToPage" as keyof WindowEventMap, handler as EventListener);
    return () => {
      window.removeEventListener("scrollToPage" as keyof WindowEventMap, handler as EventListener);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [scrollToPage]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-paragraph text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading PDF...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-paragraph text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* PDF pages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-stone-100 p-4"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              data-page={pageNum}
              className={`w-full rounded-lg bg-white shadow-md transition-shadow duration-300 ${
                highlightedPage === pageNum
                  ? "ring-4 ring-brass-400 shadow-[0_0_20px_rgba(113,89,54,0.5)]"
                  : ""
              }`}
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
