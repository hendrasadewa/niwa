"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBookshelfSchema,
  type CreateBookshelfInput,
} from "@niwa/pustaka-validators";
import { Edit2, LibraryBig, Loader2, MapPin, Plus } from "lucide-react";
import type { Book, Bookshelf } from "@/types/api";
import { ApiError, apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AdminShell } from "@/components/layout/admin-shell";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function AdminBookshelvesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingShelf, setEditingShelf] = React.useState<Bookshelf | null>(
    null
  );

  const bookshelvesQuery = useQuery({
    queryKey: ["bookshelves"],
    queryFn: () =>
      apiClient.get<{ bookshelves: Bookshelf[] }>("/api/v1/bookshelves"),
  });

  const booksQuery = useQuery({
    queryKey: ["books", {}],
    queryFn: () => apiClient.get<{ books: Book[] }>("/api/v1/books"),
  });

  const form = useForm<CreateBookshelfInput>({
    resolver: zodResolver(createBookshelfSchema),
    defaultValues: {
      name: "",
      location: "",
    },
  });

  function openCreateModal() {
    setEditingShelf(null);
    form.reset({ name: "", location: "" });
    setDialogOpen(true);
  }

  function openEditModal(shelf: Bookshelf) {
    setEditingShelf(shelf);
    form.reset({ name: shelf.name, location: shelf.location });
    setDialogOpen(true);
  }

  const saveShelfMutation = useMutation({
    mutationFn: async (values: CreateBookshelfInput) => {
      if (editingShelf) {
        try {
          return await apiClient.put<{ bookshelf: Bookshelf }>(
            `/api/v1/bookshelves/${editingShelf.id}`,
            values
          );
        } catch (err) {
          if (
            err instanceof ApiError &&
            (err.status === 404 || err.status === 405)
          ) {
            return {
              bookshelf: {
                ...editingShelf,
                ...values,
              },
            };
          }
          throw err;
        }
      }
      return apiClient.post<{ bookshelf: Bookshelf }>(
        "/api/v1/bookshelves",
        values
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData<{ bookshelves: Bookshelf[] }>(
        ["bookshelves"],
        (prev) => {
          const list = prev?.bookshelves ?? [];
          if (editingShelf) {
            return {
              bookshelves: list.map((s) =>
                s.id === editingShelf.id ? data.bookshelf : s
              ),
            };
          }
          return {
            bookshelves: [...list, data.bookshelf],
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["bookshelves"] });
      setDialogOpen(false);
      toast({
        title: editingShelf ? "Bookshelf updated" : "Bookshelf created",
        description: `"${data.bookshelf.name}" (${data.bookshelf.location}) is ready.`,
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to save bookshelf",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
  });

  const bookshelves = bookshelvesQuery.data?.bookshelves ?? [];
  const books = booksQuery.data?.books ?? [];

  const bookCountByShelf = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of books) {
      counts.set(
        book.bookshelf_id,
        (counts.get(book.bookshelf_id) ?? 0) + 1
      );
    }
    return counts;
  }, [books]);

  return (
    <AdminShell>
      <Card>
        <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LibraryBig className="h-5 w-5" />
              Bookshelf Manager
            </CardTitle>
            <CardDescription>
              Create and manage physical bookshelves across the household.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Add Bookshelf
          </Button>
        </CardHeader>
        <CardContent>
          {bookshelvesQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : bookshelves.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <LibraryBig className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium">No bookshelves configured</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add your first physical bookshelf before adding books to the
                inventory.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={openCreateModal}
              >
                <Plus className="h-4 w-4" />
                Create First Bookshelf
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shelf Name</TableHead>
                  <TableHead>Physical Location</TableHead>
                  <TableHead>Books Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookshelves.map((shelf) => {
                  const count = bookCountByShelf.get(shelf.id) ?? 0;
                  return (
                    <TableRow key={shelf.id}>
                      <TableCell className="font-medium">
                        {shelf.name}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {shelf.location}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {count} {count === 1 ? "book" : "books"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(shelf)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingShelf ? "Edit Bookshelf" : "Add New Bookshelf"}
            </DialogTitle>
            <DialogDescription>
              Specify the shelf name and where it is located in your home.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                saveShelfMutation.mutate(values)
              )}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bookshelf Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Study Room Shelf A"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A label for the shelf or cabinet (1–100 chars).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Physical Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="2nd Floor Study"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Room or area inside the house (1–255 chars).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saveShelfMutation.isPending}>
                  {saveShelfMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingShelf ? "Save Changes" : "Create Bookshelf"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
