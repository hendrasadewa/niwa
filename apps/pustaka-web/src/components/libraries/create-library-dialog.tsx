"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, Lock } from "lucide-react";
import type { Library, LibraryVisibility } from "@/types/api";
import { ApiError, apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface CreateLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (library: Library) => void;
}

export function CreateLibraryDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateLibraryDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [visibility, setVisibility] =
    React.useState<LibraryVisibility>("private");

  const resetForm = React.useCallback(() => {
    setName("");
    setSlug("");
    setDescription("");
    setVisibility("private");
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ library: Library }>("/api/v1/libraries", {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || null,
        visibility,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      toast({
        title: "Library created",
        description: `"${data.library.name}" is ready for shelves and books.`,
      });
      resetForm();
      onOpenChange(false);
      onCreated?.(data.library);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to create library",
        description:
          err instanceof ApiError ? err.message : "Please check your inputs.",
      });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Library</DialogTitle>
          <DialogDescription>
            Create a personal or shared collection for your bookshelves and
            books.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-lib-name">Library Name</Label>
            <Input
              id="create-lib-name"
              required
              maxLength={100}
              placeholder="e.g. Hendra's Study Library"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-lib-slug">
              URL Slug <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="create-lib-slug"
              maxLength={80}
              placeholder="auto-generated-from-name"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only. Leave blank to
              auto-generate.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-lib-desc">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="create-lib-desc"
              rows={2}
              maxLength={500}
              placeholder="What kind of books live in this library?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-[var(--radius-xl)] border p-3 text-left transition-colors cursor-pointer",
                  visibility === "private"
                    ? "border-primary bg-primary-soft/50 text-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-primary/40"
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  Private
                </span>
                <span className="text-xs text-muted-foreground">
                  Only you and invited members can view.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-[var(--radius-xl)] border p-3 text-left transition-colors cursor-pointer",
                  visibility === "public"
                    ? "border-primary bg-primary-soft/50 text-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-primary/40"
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  Public
                </span>
                <span className="text-xs text-muted-foreground">
                  Anyone can browse this catalog.
                </span>
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create Library
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
