"use client";

import { useCallback } from "react";
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
        <div className="flex items-center gap-2 text-muted-foreground">
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
  const handleCitationClick = useCallback((pageNumber: number) => {
    scrollViewerToPage(pageNumber);
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Rulebook Viewer */}
      <div className="flex-1 overflow-hidden border-r">
        <RulebookViewer
          rulebookId={rulebookId}
          pdfUrl={pdfUrl}
          pageCount={pageCount}
        />
      </div>

      {/* Right: Chat Panel */}
      <div className="w-96 flex-shrink-0">
        <ChatPanel
          rulebookId={rulebookId}
          title={title}
          onCitationClick={handleCitationClick}
        />
      </div>
    </div>
  );
}
