"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBookSchema,
  updateBookLocationSchema,
  type CreateBookInput,
  type UpdateBookLocationInput,
} from "@niwa/pustaka-validators";
import {
  ArrowLeftRight,
  BookCopy,
  ChevronLeft,
  ChevronRight,
  Edit2,
  ImagePlus,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { Book, Bookshelf } from "@/types/api";
import { ApiError, apiClient } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { AdminShell } from "@/components/layout/admin-shell";
import { BookCover } from "@/components/books/book-cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const PAGE_SIZE = 8;

export default function AdminBooksPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchInput, setSearchInput] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [bookModalOpen, setBookModalOpen] = React.useState(false);
  const [editingBook, setEditingBook] = React.useState<Book | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = React.useState<File | null>(
    null
  );

  const [moveBookTarget, setMoveBookTarget] = React.useState<Book | null>(null);
  const [deleteBookTarget, setDeleteBookTarget] = React.useState<Book | null>(
    null
  );

  const debouncedSearch = useDebounce(searchInput.trim(), 250);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const bookshelvesQuery = useQuery({
    queryKey: ["bookshelves"],
    queryFn: () =>
      apiClient.get<{ bookshelves: Bookshelf[] }>("/api/v1/bookshelves"),
  });

  const booksQuery = useQuery({
    queryKey: ["books", { search: debouncedSearch || undefined }],
    queryFn: () =>
      apiClient.get<{ books: Book[] }>("/api/v1/books", {
        params: { search: debouncedSearch || undefined },
      }),
  });

  const bookshelves = bookshelvesQuery.data?.bookshelves ?? [];
  const allBooks = booksQuery.data?.books ?? [];
  const totalPages = Math.max(1, Math.ceil(allBooks.length / PAGE_SIZE));
  const paginatedBooks = allBooks.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const bookForm = useForm<CreateBookInput>({
    resolver: zodResolver(createBookSchema),
    defaultValues: {
      title: "",
      author: "",
      isbn: "",
      total_pages: 200,
      bookshelf_id: "",
    },
  });

  const moveForm = useForm<UpdateBookLocationInput>({
    resolver: zodResolver(updateBookLocationSchema),
    defaultValues: {
      bookshelf_id: "",
    },
  });

  function openAddBookModal() {
    setEditingBook(null);
    setSelectedCoverFile(null);
    bookForm.reset({
      title: "",
      author: "",
      isbn: "",
      total_pages: 200,
      bookshelf_id: bookshelves[0]?.id ?? "",
    });
    setBookModalOpen(true);
  }

  function openEditBookModal(book: Book) {
    setEditingBook(book);
    setSelectedCoverFile(null);
    bookForm.reset({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      total_pages: book.total_pages,
      bookshelf_id: book.bookshelf_id,
    });
    setBookModalOpen(true);
  }

  function openMoveModal(book: Book) {
    setMoveBookTarget(book);
    moveForm.reset({ bookshelf_id: book.bookshelf_id });
  }

  const saveBookMutation = useMutation({
    mutationFn: async (values: CreateBookInput) => {
      let savedBook: Book;

      if (editingBook) {
        const res = await apiClient.put<{ book: Book }>(
          `/api/v1/books/${editingBook.id}`,
          {
            title: values.title,
            author: values.author,
            isbn: values.isbn,
            total_pages: values.total_pages,
            bookshelf_id: values.bookshelf_id,
          }
        );
        savedBook = res.book;
      } else {
        const res = await apiClient.post<{ book: Book }>(
          "/api/v1/books",
          values
        );
        savedBook = res.book;
      }

      if (selectedCoverFile) {
        const formData = new FormData();
        formData.append("cover", selectedCoverFile);
        const coverRes = await apiClient.upload<{
          book: Book;
          cover_image_key: string;
        }>(`/api/v1/books/${savedBook.id}/cover`, formData, "PUT");
        savedBook = coverRes.book;
      }

      return savedBook;
    },
    onSuccess: (savedBook) => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["book", savedBook.id] });
      setBookModalOpen(false);
      setSelectedCoverFile(null);
      toast({
        title: editingBook ? "Book updated" : "Book added to library",
        description: selectedCoverFile
          ? `"${savedBook.title}" and its R2 cover image have been saved.`
          : `"${savedBook.title}" has been saved.`,
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to save book",
        description:
          err instanceof ApiError ? err.message : "Please check your inputs.",
      });
    },
  });

  const moveLocationMutation = useMutation({
    mutationFn: async (values: UpdateBookLocationInput) => {
      if (!moveBookTarget) throw new Error("No book selected");
      return apiClient.patch<{ book: Book }>(
        `/api/v1/books/${moveBookTarget.id}/location`,
        values
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setMoveBookTarget(null);
      toast({
        title: "Book moved",
        description: `"${res.book.title}" has been moved to its new bookshelf.`,
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

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: string) =>
      apiClient.delete<{ message: string; id: string }>(
        `/api/v1/books/${bookId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      const title = deleteBookTarget?.title ?? "Book";
      setDeleteBookTarget(null);
      toast({
        title: "Book deleted",
        description: `"${title}" and its R2 cover have been removed.`,
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

  return (
    <AdminShell>
      <Card>
        <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookCopy className="h-5 w-5" />
              Inventory Manager
            </CardTitle>
            <CardDescription>
              Create, edit, move bookshelf locations, upload R2 covers, and
              remove books.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openAddBookModal}>
            <Plus className="h-4 w-4" />
            Add New Book
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search inventory by title, author, or ISBN..."
              className="pl-9"
            />
          </div>

          {booksQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : paginatedBooks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <BookCopy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium">No books found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {searchInput
                  ? "No books matched your search query."
                  : "Add your first book to the household inventory."}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>ISBN</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Bookshelf</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBooks.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <BookCover
                            bookId={book.id}
                            title={book.title}
                            coverImageKey={book.cover_image_key}
                            className="h-14 w-10 shrink-0 rounded-sm"
                            iconClassName="h-4 w-4"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{book.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {book.author}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {book.isbn}
                      </TableCell>
                      <TableCell>{book.total_pages}</TableCell>
                      <TableCell>
                        {book.bookshelf ? (
                          <Badge variant="secondary">
                            {book.bookshelf.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditBookModal(book)}
                            title="Edit book & cover"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openMoveModal(book)}
                            title="Move bookshelf location"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Move</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteBookTarget(book)}
                            title="Delete book"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
                  <span>
                    Page {page} of {totalPages} ({allBooks.length} books total)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Book Modal + Cover Image Upload */}
      <Dialog open={bookModalOpen} onOpenChange={setBookModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBook ? "Edit Book & Cover" : "Add New Book"}
            </DialogTitle>
            <DialogDescription>
              Enter book metadata and optionally upload a cover image to
              Cloudflare R2.
            </DialogDescription>
          </DialogHeader>

          <Form {...bookForm}>
            <form
              onSubmit={bookForm.handleSubmit((values) =>
                saveBookMutation.mutate(values)
              )}
              className="space-y-4"
            >
              <FormField
                control={bookForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="The C Programming Language"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={bookForm.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Author</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brian W. Kernighan & Dennis M. Ritchie"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={bookForm.control}
                  name="isbn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ISBN (10–20 chars)</FormLabel>
                      <FormControl>
                        <Input placeholder="9780131103627" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookForm.control}
                  name="total_pages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Pages</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={bookForm.control}
                name="bookshelf_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bookshelf Location</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a bookshelf" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bookshelves.map((shelf) => (
                          <SelectItem key={shelf.id} value={shelf.id}>
                            {shelf.name} — {shelf.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2 rounded-lg border bg-muted/30 p-3.5">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <ImagePlus className="h-4 w-4" />
                  Cover Image (Cloudflare R2)
                </label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setSelectedCoverFile(file);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedCoverFile
                    ? `Selected: ${selectedCoverFile.name} (${Math.round(
                        selectedCoverFile.size / 1024
                      )} KB)`
                    : "Optional. Supports JPEG, PNG, WebP, GIF, AVIF up to 10 MB."}
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setBookModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saveBookMutation.isPending}>
                  {saveBookMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingBook ? "Save Changes" : "Create Book"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Move Location Modal */}
      <Dialog
        open={Boolean(moveBookTarget)}
        onOpenChange={(open) => {
          if (!open) setMoveBookTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Book Location</DialogTitle>
            <DialogDescription>
              Reassign &ldquo;{moveBookTarget?.title}&rdquo; to a different
              physical bookshelf.
            </DialogDescription>
          </DialogHeader>
          <Form {...moveForm}>
            <form
              onSubmit={moveForm.handleSubmit((values) =>
                moveLocationMutation.mutate(values)
              )}
              className="space-y-4"
            >
              <FormField
                control={moveForm.control}
                name="bookshelf_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Bookshelf</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose bookshelf" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bookshelves.map((shelf) => (
                          <SelectItem key={shelf.id} value={shelf.id}>
                            {shelf.name} ({shelf.location})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Updates physical shelf assignment via PATCH
                      /api/v1/books/:id/location.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMoveBookTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={moveLocationMutation.isPending}
                >
                  {moveLocationMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Move Book
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteBookTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteBookTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Book</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove &ldquo;
              {deleteBookTarget?.title}&rdquo; from the library inventory and
              delete its R2 cover image?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteBookTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBookMutation.isPending}
              onClick={() => {
                if (deleteBookTarget) {
                  deleteBookMutation.mutate(deleteBookTarget.id);
                }
              }}
            >
              {deleteBookMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
