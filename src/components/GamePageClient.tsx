"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ChatPanel } from "@/components/ChatPanel";

// Dynamic import with SSR disabled to avoid "DOMMatrix is not defined" error
const RulebookViewer = dynamic(
  () =>
    import("@/components/RulebookViewer").then((mod) => ({
      default: mod.RulebookViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-paragraph text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading PDF viewer...
        </div>
      </div>
    ),
  }
);

// Helper to scroll PDF viewer to a page (dispatches event to RulebookViewer)
function scrollViewerToPage(pageNumber: number): void {
  window.dispatchEvent(
    new CustomEvent("scrollToPage", { detail: { pageNumber } })
  );
}

type GamePageClientProps = {
  rulebookId: string;
  title: string;
  pdfUrl: string;
  pageCount: number;
};

export function GamePageClient({
  rulebookId,
  title,
  pdfUrl,
  pageCount,
}: GamePageClientProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<"rulebook" | "chat">("chat");

  const handleCitationClick = useCallback((pageNumber: number) => {
    console.log("[GamePageClient] handleCitationClick called:", pageNumber);
    // On mobile, switch to rulebook tab when citation is clicked
    setActiveTab("rulebook");
    // Wait for React to render and paint before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        console.log("[GamePageClient] Dispatching scrollViewerToPage:", pageNumber);
        scrollViewerToPage(pageNumber);
      });
    });
  }, []);

  return (
    <>
      {/* Desktop: Side-by-side layout */}
      <div className="hidden flex-1 overflow-hidden md:flex">
        {/* Left: Chat Panel */}
        <div className="relative z-10 w-96 flex-shrink-0 border-r border-stone-200 shadow-subtle">
          <ChatPanel
            rulebookId={rulebookId}
            title={title}
            onCitationClick={handleCitationClick}
          />
        </div>

        {/* Right: Rulebook Viewer */}
        <div className="relative z-0 flex-1 overflow-hidden">
          <RulebookViewer
            rulebookId={rulebookId}
            pdfUrl={pdfUrl}
            pageCount={pageCount}
          />
        </div>
      </div>

      {/* Mobile: Tab-based layout */}
      <div className="flex flex-1 flex-col overflow-hidden md:hidden">
        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          <div
            className={`h-full ${activeTab === "rulebook" ? "block" : "hidden"}`}
          >
            <RulebookViewer
              rulebookId={rulebookId}
              pdfUrl={pdfUrl}
              pageCount={pageCount}
            />
          </div>
          <div
            className={`h-full ${activeTab === "chat" ? "block" : "hidden"}`}
          >
            <ChatPanel
              rulebookId={rulebookId}
              title={title}
              onCitationClick={handleCitationClick}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </div>
      </div>
    </>
  );
}
