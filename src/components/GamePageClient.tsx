"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChatPanel } from "@/components/ChatPanel";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

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
  const router = useRouter();

  const handleGamesClick = useCallback((e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    if (window.location.pathname === "/") {
      const element = document.getElementById("board-games");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      router.push("/#board-games");
      setTimeout(() => {
        const element = document.getElementById("board-games");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    }
  }, [router]);

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
            autoScrollOnResponse
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
        {/* Persistent header with Back button, title, and toggle */}
        <div className="border-b border-stone-200 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGamesClick}
            className="!px-0 has-[>svg]:!px-0 text-brass-300 hover:bg-transparent hover:text-brass-450"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Games
          </Button>
        </div>
        <div className="border-b border-stone-200 p-4">
          <h2 className="text-h3 text-stone-800">{title}</h2>
          <div className="mt-4">
            <Toggle
              options={[
                { value: "chat", label: "Ask Questions" },
                { value: "rulebook", label: "See Rulebook" },
              ]}
              value={activeTab}
              onChange={(v) => setActiveTab(v as "rulebook" | "chat")}
              className="w-full"
            />
          </div>
        </div>

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
              hideMobileHeader
            />
          </div>
        </div>
      </div>
    </>
  );
}
