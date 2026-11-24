"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  BookOpen,
  Edit2,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import type {
  Book,
  Bookshelf,
  Library,
  LibraryMembersResponse,
  ReadingListItem,
} from "@/types/api";
import { ApiError, apiClient } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@niwa/ui/hooks";
import { BookCard } from "@/components/books/book-card";
import { BookCover } from "@/components/books/book-cover";
import { BookGridSkeleton } from "@/components/books/book-card-skeleton";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@niwa/ui/primitives";
import { cn } from "@/lib/utils";

const UNSHELVED_VALUE = "__unshelved__";

export interface LibraryBooksTabProps {
  library: Library;
  bookshelves: Bookshelf[];
  membersData?: LibraryMembersResponse;
}

export function LibraryBooksTab({
  library,
  bookshelves,
  membersData,
}: LibraryBooksTabProps) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isOwner = library.role === "owner";
  const isPrivate = library.visibility === "private";

  const [searchInput, setSearchInput] = React.useState("");
  const [shelfFilter, setShelfFilter] = React.useState<string>("all");
  const [ownedByMeOnly, setOwnedByMeOnly] = React.useState(false);
  const debouncedSearch = useDebounce(searchInput.trim(), 250);

  // Create/Edit Book Dialog State
  const [bookDialogOpen, setBookDialogOpen] = React.useState(false);
  const [editingBook, setEditingBook] = React.useState<Book | null>(null);
  const [title, setTitle] = React.useState("");
  const [author, setAuthor] = React.useState("");
  const [isbn, setIsbn] = React.useState("");
  const [totalPages, setTotalPages] = React.useState("250");
  const [bookshelfId, setBookshelfId] = React.useState<string>(UNSHELVED_VALUE);
  const [ownerMode, setOwnerMode] = React.useState<"member" | "custom">(
    "member"
  );
  const [ownerId, setOwnerId] = React.useState<string>("");
  const [customOwnerName, setCustomOwnerName] = React.useState("");
  const [selectedCoverFile, setSelectedCoverFile] = React.useState<File | null>(
    null
  );

  // Move Shelf Dialog State
  const [moveTarget, setMoveTarget] = React.useState<Book | null>(null);
  const [moveShelfId, setMoveShelfId] =
    React.useState<string>(UNSHELVED_VALUE);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = React.useState<Book | null>(null);

  const booksQuery = useQuery({
    queryKey: [
      "library-books",
      library.id,
      {
        search: debouncedSearch || undefined,
        bookshelf_id:
          shelfFilter === "all" || shelfFilter === UNSHELVED_VALUE
            ? undefined
            : shelfFilter,
        owned_by_me: ownedByMeOnly ? "true" : undefined,
      },
    ],
    queryFn: () =>
      apiClient.get<{ books: Book[] }>(`/api/v1/libraries/${library.id}/books`, {
        params: {
          search: debouncedSearch || undefined,
          bookshelf_id:
            shelfFilter === "all" || shelfFilter === UNSHELVED_VALUE
              ? undefined
              : shelfFilter,
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

  const ownerCandidates = React.useMemo(() => {
    const list: { user_id: string; username: string; isLibraryOwner: boolean }[] =
      [
        {
          user_id: library.owner_id,
          username: library.owner_name,
          isLibraryOwner: true,
        },
      ];
    for (const member of membersData?.members ?? []) {
      if (member.user_id !== library.owner_id) {
        list.push({
          user_id: member.user_id,
          username: member.username,
          isLibraryOwner: false,
        });
      }
    }
    return list;
  }, [library.owner_id, library.owner_name, membersData]);

  const books = React.useMemo(() => {
    const rawBooks = booksQuery.data?.books ?? [];
    if (shelfFilter === UNSHELVED_VALUE) {
      return rawBooks.filter((b) => !b.bookshelf_id);
    }
    return rawBooks;
  }, [booksQuery.data?.books, shelfFilter]);

  function openCreateDialog() {
    setEditingBook(null);
    setTitle("");
    setAuthor("");
    setIsbn("");
    setTotalPages("250");
    setBookshelfId(bookshelves[0]?.id ?? UNSHELVED_VALUE);
    setOwnerMode("member");
    setOwnerId(user?.id ?? library.owner_id);
    setCustomOwnerName("");
    setSelectedCoverFile(null);
    setBookDialogOpen(true);
  }

  function openEditDialog(book: Book) {
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setIsbn(book.isbn);
    setTotalPages(String(book.total_pages));
    setBookshelfId(book.bookshelf_id ?? UNSHELVED_VALUE);
    if (
      book.owner_id &&
      ownerCandidates.some((c) => c.user_id === book.owner_id)
    ) {
      setOwnerMode("member");
      setOwnerId(book.owner_id);
      setCustomOwnerName("");
    } else {
      setOwnerMode("custom");
      setOwnerId("");
      setCustomOwnerName(book.owner_name);
    }
    setSelectedCoverFile(null);
    setBookDialogOpen(true);
  }

  function openMoveDialog(book: Book) {
    setMoveTarget(book);
    setMoveShelfId(book.bookshelf_id ?? UNSHELVED_VALUE);
  }

  const saveBookMutation = useMutation({
    mutationFn: async () => {
      const pagesNum = Number.parseInt(totalPages, 10);
      if (!Number.isInteger(pagesNum) || pagesNum <= 0) {
        throw new Error("Total pages must be a positive integer.");
      }

      const resolvedBookshelfId =
        bookshelfId === UNSHELVED_VALUE ? null : bookshelfId;

      const ownerPayload =
        ownerMode === "member"
          ? {
              owner_id: ownerId || library.owner_id,
              owner_name: ownerCandidates.find(
                (c) => c.user_id === (ownerId || library.owner_id)
              )?.username,
            }
          : {
              owner_id: null,
              owner_name: customOwnerName.trim(),
            };

      if (ownerMode === "custom" && !customOwnerName.trim()) {
        throw new Error("Please enter an owner name.");
      }

      const payload = {
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        total_pages: pagesNum,
        bookshelf_id: resolvedBookshelfId,
        ...ownerPayload,
      };

      const saved = editingBook
        ? await apiClient.put<{ book: Book }>(
            `/api/v1/books/${editingBook.id}`,
            payload
          )
        : await apiClient.post<{ book: Book }>(
            `/api/v1/libraries/${library.id}/books`,
            payload
          );

      if (selectedCoverFile) {
        const formData = new FormData();
        formData.append("cover", selectedCoverFile);
        await apiClient.put(`/api/v1/books/${saved.book.id}/cover`, formData);
      }

      return saved.book;
    },
    onSuccess: (book) => {
      queryClient.invalidateQueries({ queryKey: ["library-books", library.id] });
      queryClient.invalidateQueries({ queryKey: ["library", library.id] });
      queryClient.invalidateQueries({ queryKey: ["library", library.slug] });
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setBookDialogOpen(false);
      toast({
        title: editingBook ? "Book updated" : "Book added",
        description: `"${book.title}" has been saved.`,
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to save book",
        description:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Please check your inputs.",
      });
    },
  });

  const moveMutation = useMutation({
    mutationFn: async () => {
      if (!moveTarget) return;
      const nextShelfId = moveShelfId === UNSHELVED_VALUE ? null : moveShelfId;
      return apiClient.patch<{ book: Book }>(
        `/api/v1/books/${moveTarget.id}/location`,
        { bookshelf_id: nextShelfId }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-books", library.id] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setMoveTarget(null);
      toast({
        title: "Shelf updated",
        description: "Book shelf assignment updated.",
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to move book",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (bookId: string) =>
      apiClient.delete(`/api/v1/books/${bookId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-books", library.id] });
      queryClient.invalidateQueries({ queryKey: ["library", library.id] });
      queryClient.invalidateQueries({ queryKey: ["library", library.slug] });
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setDeleteTarget(null);
      toast({
        title: "Book deleted",
        description: "The book and its cover were removed from this library.",
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to delete book",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
  });

  const hasFilters =
    Boolean(searchInput.trim()) || shelfFilter !== "all" || ownedByMeOnly;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[var(--radius-2xl)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
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
          <div className="w-full sm:w-52">
            <Select value={shelfFilter} onValueChange={setShelfFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Bookshelves" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bookshelves</SelectItem>
                <SelectItem value={UNSHELVED_VALUE}>Unshelved</SelectItem>
                {bookshelves.map((shelf) => (
                  <SelectItem key={shelf.id} value={shelf.id}>
                    {shelf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isAuthenticated && (
            <Button
              type="button"
              size="sm"
              variant={ownedByMeOnly ? "default" : "outline"}
              onClick={() => setOwnedByMeOnly((prev) => !prev)}
            >
              <UserIcon className="h-3.5 w-3.5" />
              Owned by me
            </Button>
          )}

          {isOwner && (
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Add Book
            </Button>
          )}
        </div>
      </div>

      {booksQuery.isLoading ? (
        <BookGridSkeleton count={6} />
      ) : books.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="mb-3 h-9 w-9 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">
              {hasFilters ? "No matching books" : "No books in this library yet"}
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {hasFilters
                ? "Try clearing your search or shelf filters."
                : isOwner
                  ? "Add your first book — shelves are optional, so you can start cataloging right away."
                  : "The library owner has not added any books yet."}
            </p>
            {hasFilters ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchInput("");
                  setShelfFilter("all");
                  setOwnedByMeOnly(false);
                }}
              >
                Clear filters
              </Button>
            ) : isOwner ? (
              <Button size="sm" className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                Add First Book
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : isOwner ? (
        <div className="space-y-3">
          {books.map((book) => (
            <Card key={book.id} className="overflow-hidden">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href={`/books/${book.id}`}
                  className="group flex min-w-0 flex-1 items-center gap-3.5"
                >
                  <BookCover
                    bookId={book.id}
                    title={book.title}
                    coverImageKey={book.cover_image_key}
                    isPrivate={isPrivate}
                    className="h-20 w-14 shrink-0 rounded-md"
                    iconClassName="h-4 w-4"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-serif text-base font-medium text-foreground group-hover:underline">
                        {book.title}
                      </h3>
                      {statusByBookId.get(book.id) && (
                        <Badge variant="secondary" className="text-[10px]">
                          {statusByBookId.get(book.id)?.replaceAll("_", " ")}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {book.author} · {book.total_pages}p ·{" "}
                      <span className="font-mono">{book.isbn}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
                      <Badge variant="outline" className="gap-1 text-[11px]">
                        <UserIcon className="h-3 w-3" />
                        Owner: {book.owner_name}
                      </Badge>
                      <Badge variant="secondary" className="gap-1 text-[11px]">
                        <MapPin className="h-3 w-3" />
                        {book.bookshelf ? book.bookshelf.name : "Unshelved"}
                      </Badge>
                    </div>
                  </div>
                </Link>

                <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openMoveDialog(book)}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Shelf
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(book)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(book)}
                    aria-label={`Delete ${book.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              readingStatus={statusByBookId.get(book.id)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Book Dialog */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBook ? "Edit Book" : "Add Book to Library"}
            </DialogTitle>
            <DialogDescription>
              Catalog a book in {library.name}, assign its owner, and optionally
              place it on a bookshelf.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveBookMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="book-title">Title</Label>
              <Input
                id="book-title"
                required
                maxLength={255}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Designing Data-Intensive Applications"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="book-author">Author</Label>
              <Input
                id="book-author"
                required
                maxLength={255}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Martin Kleppmann"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="book-isbn">ISBN</Label>
                <Input
                  id="book-isbn"
                  required
                  minLength={10}
                  maxLength={20}
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="9781449373320"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="book-pages">Total Pages</Label>
                <Input
                  id="book-pages"
                  type="number"
                  required
                  min={1}
                  value={totalPages}
                  onChange={(e) => setTotalPages(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Bookshelf (optional)</Label>
              <Select value={bookshelfId} onValueChange={setBookshelfId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unshelved" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNSHELVED_VALUE}>Unshelved</SelectItem>
                  {bookshelves.map((shelf) => (
                    <SelectItem key={shelf.id} value={shelf.id}>
                      {shelf.name} — {shelf.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 rounded-[var(--radius-xl)] border border-border bg-surface-subtle/50 p-3.5">
              <Label>Book Owner</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOwnerMode("member");
                    if (!ownerId) setOwnerId(library.owner_id);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                    ownerMode === "member"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground"
                  )}
                >
                  Library Member
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerMode("custom")}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                    ownerMode === "custom"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground"
                  )}
                >
                  Custom Name
                </button>
              </div>

              {ownerMode === "member" ? (
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a library member" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownerCandidates.map((candidate) => (
                      <SelectItem
                        key={candidate.user_id}
                        value={candidate.user_id}
                      >
                        {candidate.username}
                        {candidate.isLibraryOwner ? " (Library Owner)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={customOwnerName}
                  onChange={(e) => setCustomOwnerName(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. Mom, Sarah, Family Shared"
                />
              )}
              <p className="text-[11px] text-muted-foreground">
                {ownerMode === "member"
                  ? "Links this book to a Niwa member account for their Owned Books view."
                  : "Stores a label-only owner name for someone without a Niwa account."}
              </p>
            </div>

            <div className="space-y-1.5 rounded-[var(--radius-xl)] border border-border bg-surface-subtle/40 p-3.5">
              <label className="flex items-center gap-2 text-xs font-medium">
                <ImagePlus className="h-4 w-4" />
                Cover Image (optional, up to 10 MB)
              </label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={(e) =>
                  setSelectedCoverFile(e.target.files?.[0] ?? null)
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setBookDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveBookMutation.isPending}>
                {saveBookMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editingBook ? "Save Changes" : "Add Book"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move Shelf Dialog */}
      <Dialog
        open={Boolean(moveTarget)}
        onOpenChange={(open) => {
          if (!open) setMoveTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Book to Bookshelf</DialogTitle>
            <DialogDescription>
              Choose a bookshelf in {library.name} for &ldquo;{moveTarget?.title}
              &rdquo;, or mark it as unshelved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={moveShelfId} onValueChange={setMoveShelfId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose bookshelf" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSHELVED_VALUE}>Unshelved</SelectItem>
                {bookshelves.map((shelf) => (
                  <SelectItem key={shelf.id} value={shelf.id}>
                    {shelf.name} ({shelf.location})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoveTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => moveMutation.mutate()}
              disabled={moveMutation.isPending}
            >
              {moveMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Update Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Book Confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Book</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}
              &rdquo;? This removes the book, its cover, reviews, and reading
              progress permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete Book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
