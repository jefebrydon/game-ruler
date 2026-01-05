"use client";

import { useRef, KeyboardEvent, FormEvent, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionInputProps {
  onSubmit?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function QuestionInput({
  onSubmit,
  placeholder = "Ask About the Rules",
  disabled = false,
  className,
}: QuestionInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (trimmed && onSubmit) {
      onSubmit(trimmed);
      setValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter submits, Shift+Enter inserts newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={cn(
        "h-16 w-full rounded-[20px] p-[4px] transition-all",
        isFocused ? "brass-gradient" : "brass-gradient-light",
        disabled && "opacity-50",
        className
      )}
    >
      <div className="flex h-full gap-2 rounded-[16px] bg-white pl-4 pr-2 py-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none overflow-y-auto bg-transparent",
            "text-paragraph-sm placeholder:text-muted-foreground",
            "outline-none focus:outline-none",
            "leading-5"
          )}
        />
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={disabled}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full self-center",
            "brass-gradient text-primary-foreground",
            "transition-all",
            "focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
            "disabled:pointer-events-none"
          )}
          aria-label="Submit question"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </div>
  );
}

