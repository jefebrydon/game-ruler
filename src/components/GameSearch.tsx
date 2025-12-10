"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import type { ApiResponse, RulebookSearchResult } from "@/types";

const DEBOUNCE_MS = 250;

export function GameSearch(): React.ReactElement {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RulebookSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

  return (
    <Command
      className="rounded-lg border shadow-md"
      shouldFilter={false} // We handle filtering server-side
    >
      <CommandInput
        placeholder="Search for a game..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Searching…
          </div>
        )}

        {!isLoading && hasSearched && results.length === 0 && (
          <CommandEmpty>No games found.</CommandEmpty>
        )}

        {!isLoading && results.length > 0 && (
          <CommandGroup heading="Games">
            {results.map((game) => (
              <CommandItem
                key={game.id}
                value={game.slug}
                onSelect={() => handleSelect(game.slug)}
                className="cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{game.title}</span>
                  {game.year && (
                    <span className="text-xs text-muted-foreground">
                      {game.year}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
