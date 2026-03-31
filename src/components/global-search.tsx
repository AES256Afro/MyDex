"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Monitor, FolderKanban, LifeBuoy, Shield, X } from "lucide-react";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_ICONS: Record<string, typeof Users> = {
  employee: Users,
  device: Monitor,
  project: FolderKanban,
  ticket: LifeBuoy,
  alert: Shield,
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex].href);
    }
  }

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2">
            <div className="rounded-xl border bg-popover shadow-2xl">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search employees, devices, projects, tickets..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {query && (
                  <button onClick={() => setQuery("")}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto p-2">
                {loading && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Searching...
                  </div>
                )}

                {!loading && query.length >= 2 && results.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No results found for &ldquo;{query}&rdquo;
                  </div>
                )}

                {!loading && query.length < 2 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Type at least 2 characters to search
                  </div>
                )}

                {results.map((result, idx) => {
                  const Icon = TYPE_ICONS[result.type] || Search;
                  return (
                    <button
                      key={result.id}
                      onClick={() => navigate(result.href)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        idx === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{result.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {result.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
