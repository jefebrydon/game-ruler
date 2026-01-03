"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { ApiResponse, RulebookSearchResult } from "@/types";

const DEBOUNCE_MS = 250;

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  placeholder = "Find Your Game",
  className = "",
}: SearchBarProps): React.ReactElement {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RulebookSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleContainerClick = (): void => {
    inputRef.current?.focus();
  };

  const searchRulebooks = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/rulebooks/search?q=${encodeURIComponent(searchQuery)}`
      );
      const json: ApiResponse<RulebookSearchResult[]> = await res.json();

      if (json.error) {
        console.error("Search failed:", json.error);
        setResults([]);
      } else {
        setResults(json.data ?? []);
      }
      setHasSearched(true);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchRulebooks(query);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, searchRulebooks]);

  const handleSelect = (slug: string): void => {
    router.push(`/games/${slug}`);
  };

  const showDropdown = isFocused && (isLoading || hasSearched);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div
        onClick={handleContainerClick}
        className="brass-gradient-light cursor-text rounded-[99px] p-[4px]"
      >
        <div className="flex items-center gap-3 rounded-[95px] bg-white px-5 py-4">
          <Search className="size-5 shrink-0 text-brass-300" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Delay to allow click on results
              setTimeout(() => setIsFocused(false), 150);
            }}
            className="w-full bg-transparent text-paragraph text-foreground placeholder:text-stone-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Results Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border bg-popover shadow-md">
          {isLoading && (
            <div className="px-4 py-3 text-center text-paragraph-sm text-muted-foreground">
              Searching…
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <div className="px-4 py-3 text-center text-paragraph-sm text-muted-foreground">
              No games found.
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                Games
              </div>
              {results.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleSelect(game.slug)}
                  className="flex w-full cursor-pointer flex-col px-4 py-2 text-left hover:bg-accent"
                >
                  <span className="text-paragraph-bold">{game.title}</span>
                  {game.year && (
                    <span className="text-paragraph-sm text-muted-foreground">
                      {game.year}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
