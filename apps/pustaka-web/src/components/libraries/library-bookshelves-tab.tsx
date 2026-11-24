"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit2, LibraryBig, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import type { Bookshelf, Library } from "@/types/api";
import { ApiError, apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface LibraryBookshelvesTabProps {
  library: Library;
  bookshelves: Bookshelf[];
  isLoading: boolean;
}

export function LibraryBookshelvesTab({
  library,
  bookshelves,
  isLoading,
}: LibraryBookshelvesTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isOwner = library.role === "owner";

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingShelf, setEditingShelf] = React.useState<Bookshelf | null>(
    null
  );
  const [name, setName] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<Bookshelf | null>(
    null
  );

  function openCreate() {
    setEditingShelf(null);
    setName("");
    setLocation("");
    setDialogOpen(true);
  }

  function openEdit(shelf: Bookshelf) {
    setEditingShelf(shelf);
    setName(shelf.name);
    setLocation(shelf.location);
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        location: location.trim(),
      };
      if (editingShelf) {
        return apiClient.put<{ bookshelf: Bookshelf }>(
          `/api/v1/bookshelves/${editingShelf.id}`,
          payload
        );
      }
      return apiClient.post<{ bookshelf: Bookshelf }>(
        `/api/v1/libraries/${library.id}/bookshelves`,
        payload
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ["library-bookshelves", library.id],
      });
      queryClient.invalidateQueries({ queryKey: ["library", library.id] });
      queryClient.invalidateQueries({ queryKey: ["library", library.slug] });
      queryClient.invalidateQueries({ queryKey: ["bookshelves"] });
      setDialogOpen(false);
      toast({
        title: editingShelf ? "Bookshelf updated" : "Bookshelf created",
        description: `"${res.bookshelf.name}" saved.`,
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to save bookshelf",
        description:
          err instanceof ApiError ? err.message : "Please check your inputs.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/bookshelves/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["library-bookshelves", library.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["library-books", library.id],
      });
      queryClient.invalidateQueries({ queryKey: ["library", library.id] });
      queryClient.invalidateQueries({ queryKey: ["library", library.slug] });
      queryClient.invalidateQueries({ queryKey: ["bookshelves"] });
      setDeleteTarget(null);
      toast({
        title: "Bookshelf deleted",
        description:
          "Any books previously on this shelf are now marked as unshelved.",
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to delete bookshelf",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg font-medium text-foreground">
            Bookshelves ({bookshelves.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Physical shelves and locations inside {library.name}.
          </p>
        </div>
        {isOwner && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Bookshelf
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : bookshelves.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <LibraryBig className="mb-3 h-9 w-9 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">
              No bookshelves yet
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Bookshelves are optional — add them whenever you want to track
              where physical books live.
            </p>
            {isOwner && (
              <Button size="sm" className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add First Bookshelf
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bookshelves.map((shelf) => (
            <Card key={shelf.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <h3 className="truncate font-serif text-base font-medium text-foreground">
                    {shelf.name}
                  </h3>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{shelf.location}</span>
                  </p>
                </div>

                {isOwner && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(shelf)}
                      aria-label={`Edit ${shelf.name}`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(shelf)}
                      aria-label={`Delete ${shelf.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Shelf Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingShelf ? "Edit Bookshelf" : "Add Bookshelf"}
            </DialogTitle>
            <DialogDescription>
              Name this physical shelf and describe where it is located.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim() || !location.trim()) return;
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="shelf-name">Shelf Name</Label>
              <Input
                id="shelf-name"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Study Room Shelf A"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shelf-location">Location</Label>
              <Input
                id="shelf-location"
                required
                maxLength={255}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. 2nd Floor Study"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editingShelf ? "Save Changes" : "Create Bookshelf"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Shelf Confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Bookshelf</DialogTitle>
            <DialogDescription>
              Delete &ldquo;{deleteTarget?.name}&rdquo;? Books currently on this
              shelf will not be deleted — they will simply become unshelved.
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
              Delete Bookshelf
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
