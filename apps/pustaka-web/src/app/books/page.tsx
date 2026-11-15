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
import { apiClient } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { AppShell } from "@/components/layout/app-shell";
import { BookCard } from "@/components/books/book-card";
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
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Book Catalog</h1>
            <p className="text-sm text-muted-foreground">
              Browse the household physical collection by title, author, ISBN,
              or bookshelf location.
            </p>
          </div>
          <div className="flex items-center gap-1 self-start rounded-lg border bg-card p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
              List
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, author, or ISBN..."
              className="pl-9 pr-8"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
        </div>

        {booksQuery.isLoading ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading library catalog...
            </p>
          </div>
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
