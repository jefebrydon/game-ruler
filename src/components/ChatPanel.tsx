"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { QuestionInput } from "@/components/QuestionInput";
import { ArrowLeftIcon } from "lucide-react";
import type { ApiResponse } from "@/types";

type Citation = {
  pageNumber: number;
  fileId: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

type AskResponse = {
  answer: string;
  citations: Citation[];
};

type ChatPanelProps = {
  rulebookId: string;
  title: string;
  onCitationClick?: (pageNumber: number) => void;
};

export function ChatPanel({
  rulebookId,
  title,
  onCitationClick,
}: ChatPanelProps): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleGamesClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    
    // If already on home page, scroll directly
    if (window.location.pathname === "/") {
      const element = document.getElementById("board-games");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      // Navigate to home page with hash
      router.push("/#board-games");
      // Scroll after navigation completes
      setTimeout(() => {
        const element = document.getElementById("board-games");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (question: string): Promise<void> => {
    if (!question || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/rulebooks/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rulebookId, question }),
      });

      const json: ApiResponse<AskResponse> = await res.json();

      if (json.error || !json.data) {
        throw new Error(json.error ?? "Failed to get response");
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: json.data.answer,
        citations: json.data.citations,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Auto-scroll to first cited page
      if (json.data.citations.length > 0 && onCitationClick) {
        onCitationClick(json.data.citations[0].pageNumber);
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Back to Games */}
      <div className="border-b border-stone-200 p-4">
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

      {/* Header */}
      <div className="border-b border-stone-200 p-4">
        <h2 className="text-h3 text-stone-800">{title}</h2>
        <p className="mt-1 text-paragraph-sm text-muted-foreground">
          Get answers with page citations
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center" />
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCitationClick={onCitationClick}
              />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-paragraph-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-stone-200 p-4">
        <QuestionInput
          onSubmit={handleSubmit}
          placeholder="Ask about the rules..."
          disabled={isLoading}
        />
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onCitationClick,
}: {
  message: Message;
  onCitationClick?: (pageNumber: number) => void;
}): React.ReactElement {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[16px] border border-stone-200 p-[1px]">
          <div className="rounded-[15px] bg-white px-4 py-3">
            <p className="whitespace-pre-wrap text-paragraph-sm text-stone-600">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div>
        <p className="whitespace-pre-wrap text-paragraph-sm text-stone-600">{message.content}</p>

        {/* Jump to Page links */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.citations.map((citation, idx) => (
              <Button
                key={idx}
                variant="link"
                size="sm"
                className="h-auto p-0 text-paragraph-sm"
                onClick={() => onCitationClick?.(citation.pageNumber)}
              >
                Jump to Page {citation.pageNumber}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
