"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  User as UserIcon,
  X,
} from "lucide-react";
import type { Book, Bookshelf, Library, ReadingListItem } from "@/types/api";
import { PageHeader } from "@niwa/ui/components";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
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
  const { isAuthenticated } = useAuth();
  const [searchInput, setSearchInput] = React.useState("");
  const [selectedLibraryId, setSelectedLibraryId] =
    React.useState<string>("all");
  const [selectedShelfId, setSelectedShelfId] = React.useState<string>("all");
  const [ownedByMeOnly, setOwnedByMeOnly] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  const debouncedSearch = useDebounce(searchInput.trim(), 300);

  const librariesQuery = useQuery({
    queryKey: ["libraries", { scope: "all" }],
    queryFn: () =>
      apiClient.get<{ libraries: Library[] }>("/api/v1/libraries", {
        params: { scope: "all" },
      }),
  });

  const bookshelvesQuery = useQuery({
    queryKey: [
      "bookshelves",
      { library_id: selectedLibraryId === "all" ? undefined : selectedLibraryId },
    ],
    queryFn: () =>
      apiClient.get<{ bookshelves: Bookshelf[] }>("/api/v1/bookshelves", {
        params: {
          library_id:
            selectedLibraryId === "all" ? undefined : selectedLibraryId,
        },
      }),
  });

  const booksQuery = useQuery({
    queryKey: [
      "books",
      {
        search: debouncedSearch || undefined,
        library_id:
          selectedLibraryId === "all" ? undefined : selectedLibraryId,
        bookshelf_id: selectedShelfId === "all" ? undefined : selectedShelfId,
        owned_by_me: ownedByMeOnly ? "true" : undefined,
      },
    ],
    queryFn: () =>
      apiClient.get<{ books: Book[] }>("/api/v1/books", {
        params: {
          search: debouncedSearch || undefined,
          library_id:
            selectedLibraryId === "all" ? undefined : selectedLibraryId,
          bookshelf_id:
            selectedShelfId === "all" ? undefined : selectedShelfId,
          owned_by_me: ownedByMeOnly ? "true" : undefined,
        },
      }),
  });

  const readingListQuery = useQuery({
    queryKey: ["reading-list"],
    queryFn: () =>
      apiClient.get<{ reading_list: ReadingListItem[] }>(
        "/api/v1/me/reading-list"
      ),
    enabled: isAuthenticated,
  });

  const statusByBookId = React.useMemo(() => {
    const map = new Map<string, ReadingListItem["status"]>();
    for (const item of readingListQuery.data?.reading_list ?? []) {
      map.set(item.book_id, item.status);
    }
    return map;
  }, [readingListQuery.data]);

  const libraries = librariesQuery.data?.libraries ?? [];
  const books = booksQuery.data?.books ?? [];
  const bookshelves = bookshelvesQuery.data?.bookshelves ?? [];
  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    selectedLibraryId !== "all" ||
    selectedShelfId !== "all" ||
    ownedByMeOnly;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          kicker="Pustaka / Catalog"
          title="Book Catalog"
          description="Browse books across your libraries and public collections by title, author, ISBN, owner, or bookshelf."
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

        <search className="flex flex-col gap-3 rounded-[var(--radius-2xl)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, author, ISBN, or owner..."
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

          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="hidden h-4 w-4 shrink-0 text-muted-foreground lg:block" />

            <div className="w-full sm:w-48">
              <Select
                value={selectedLibraryId}
                onValueChange={(value) => {
                  setSelectedLibraryId(value);
                  setSelectedShelfId("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Libraries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Libraries</SelectItem>
                  {libraries.map((lib) => (
                    <SelectItem key={lib.id} value={lib.id}>
                      {lib.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
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

            {isAuthenticated && (
              <Button
                type="button"
                variant={ownedByMeOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setOwnedByMeOnly((prev) => !prev)}
              >
                <UserIcon className="h-3.5 w-3.5" />
                Owned by me
              </Button>
            )}

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setSelectedLibraryId("all");
                  setSelectedShelfId("all");
                  setOwnedByMeOnly(false);
                }}
              >
                Reset
              </Button>
            )}
          </div>
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
                ? "No books matched your current search or filter settings."
                : "No accessible books are cataloged yet."}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchInput("");
                  setSelectedLibraryId("all");
                  setSelectedShelfId("all");
                  setOwnedByMeOnly(false);
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
