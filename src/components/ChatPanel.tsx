"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpIcon } from "lucide-react";
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
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    const question = input.trim();
    if (!question || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
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
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="text-h3">Ask about {title}</h2>
        <p className="mt-1 text-paragraph-sm text-muted-foreground">
          Get answers with page citations
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-paragraph-sm text-muted-foreground">
              Ask a question about the rules
            </p>
          </div>
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
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the rules..."
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            className="flex-shrink-0"
          >
            <ArrowUpIcon className="h-4 w-4" />
          </Button>
        </div>
      </form>
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

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap text-paragraph-sm">{message.content}</p>

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
