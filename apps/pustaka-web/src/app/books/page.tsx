"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  LayoutGrid,
  List,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Book, Bookshelf, ReadingListItem } from "@/types/api";
import { PageHeader } from "@niwa/ui/components";
import { apiClient } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { AppShell } from "@/components/layout/app-shell";
import { BookCard } from "@/components/books/book-card";
import {
  BookGridSkeleton,
  BookRowSkeleton,
} from "@/components/books/book-card-skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function BooksCatalogPage() {
  const [searchInput, setSearchInput] = React.useState("");
  const [selectedShelfId, setSelectedShelfId] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  const debouncedSearch = useDebounce(searchInput.trim(), 300);

  const bookshelvesQuery = useQuery({
    queryKey: ["bookshelves"],
    queryFn: () =>
      apiClient.get<{ bookshelves: Bookshelf[] }>("/api/v1/bookshelves"),
  });

  const booksQuery = useQuery({
    queryKey: [
      "books",
      {
        search: debouncedSearch || undefined,
        bookshelf_id: selectedShelfId === "all" ? undefined : selectedShelfId,
      },
    ],
    queryFn: () =>
      apiClient.get<{ books: Book[] }>("/api/v1/books", {
        params: {
          search: debouncedSearch || undefined,
          bookshelf_id:
            selectedShelfId === "all" ? undefined : selectedShelfId,
        },
      }),
  });

  const readingListQuery = useQuery({
    queryKey: ["reading-list"],
    queryFn: () =>
      apiClient.get<{ reading_list: ReadingListItem[] }>(
        "/api/v1/me/reading-list"
      ),
  });

  const statusByBookId = React.useMemo(() => {
    const map = new Map<string, ReadingListItem["status"]>();
    for (const item of readingListQuery.data?.reading_list ?? []) {
      map.set(item.book_id, item.status);
    }
    return map;
  }, [readingListQuery.data]);

  const books = booksQuery.data?.books ?? [];
  const bookshelves = bookshelvesQuery.data?.bookshelves ?? [];
  const hasActiveFilters =
    Boolean(searchInput.trim()) || selectedShelfId !== "all";

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          kicker="Pustaka / Catalog"
          title="Book Catalog"
          description="Browse the household physical collection by title, author, ISBN, or bookshelf location."
          actions={
            <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-[var(--shadow-card)]">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3"
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5" />
                List
              </Button>
            </div>
          }
        />

        <search className="flex flex-col gap-3 rounded-[var(--radius-2xl)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, author, or ISBN..."
              className="rounded-full pl-10 pr-9"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:w-64">
            <SlidersHorizontal className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
            <Select
              value={selectedShelfId}
              onValueChange={(value) => setSelectedShelfId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Bookshelves" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bookshelves</SelectItem>
                {bookshelves.map((shelf) => (
                  <SelectItem key={shelf.id} value={shelf.id}>
                    {shelf.name} ({shelf.location})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput("");
                setSelectedShelfId("all");
              }}
            >
              Reset
            </Button>
          )}
        </search>

        {booksQuery.isLoading ? (
          viewMode === "grid" ? (
            <BookGridSkeleton count={10} />
          ) : (
            <BookRowSkeleton count={5} />
          )
        ) : books.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/60" />
            <h2 className="text-base font-semibold">No books found</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {hasActiveFilters
                ? "No books matched your current search or bookshelf filter."
                : "The household library catalog is currently empty."}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchInput("");
                  setSelectedShelfId("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                readingStatus={statusByBookId.get(book.id)}
                viewMode="grid"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                readingStatus={statusByBookId.get(book.id)}
                viewMode="list"
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
