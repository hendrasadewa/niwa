"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRightLeft,
  Globe,
  Loader2,
  Lock,
  Save,
  Trash2,
} from "lucide-react";
import type {
  Library,
  LibraryMembersResponse,
  LibraryVisibility,
} from "@/types/api";
import { ApiError, apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface LibrarySettingsTabProps {
  library: Library;
  membersData?: LibraryMembersResponse;
}

export function LibrarySettingsTab({
  library,
  membersData,
}: LibrarySettingsTabProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = React.useState(library.name);
  const [slug, setSlug] = React.useState(library.slug);
  const [description, setDescription] = React.useState(
    library.description ?? ""
  );
  const [visibility, setVisibility] = React.useState<LibraryVisibility>(
    library.visibility
  );

  const [selectedNewOwnerId, setSelectedNewOwnerId] = React.useState("");
  const [transferConfirmOpen, setTransferConfirmOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiClient.put<{ library: Library }>(`/api/v1/libraries/${library.id}`, {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        visibility,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["library", library.id] });
      queryClient.invalidateQueries({ queryKey: ["library", library.slug] });
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      toast({
        title: "Library settings updated",
        description: `"${res.library.name}" is now ${res.library.visibility}.`,
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to update settings",
        description:
          err instanceof ApiError ? err.message : "Please check your inputs.",
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ library: Library }>(
        `/api/v1/libraries/${library.id}/transfer-ownership`,
        { new_owner_id: selectedNewOwnerId }
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["library", library.id] });
      queryClient.invalidateQueries({ queryKey: ["library", library.slug] });
      queryClient.invalidateQueries({
        queryKey: ["library-members", library.id],
      });
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      setTransferConfirmOpen(false);
      toast({
        title: "Ownership transferred",
        description: `${res.library.owner_name} is now the owner of ${res.library.name}. You are now a member.`,
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Ownership transfer failed",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/libraries/${library.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["bookshelves"] });
      toast({
        title: "Library deleted",
        description: `"${library.name}" has been permanently removed.`,
      });
      router.push("/libraries");
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Cannot delete library",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
  });

  const members = membersData?.members ?? [];
  const selectedNewOwner = members.find(
    (m) => m.user_id === selectedNewOwnerId
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General Settings</CardTitle>
          <CardDescription>
            Update the library&apos;s name, URL slug, description, and public
            visibility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim() || !slug.trim()) return;
              updateMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-name">Library Name</Label>
                <Input
                  id="settings-name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-slug">URL Slug</Label>
                <Input
                  id="settings-slug"
                  required
                  maxLength={80}
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-desc">Description</Label>
              <Textarea
                id="settings-desc"
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this library..."
              />
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <div className="grid gap-3 sm:grid-cols-2">
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
                    Visible only to you and invited members.
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
                    Anyone can browse shelves, books, and reviews.
                  </span>
                </button>
              </div>
            </div>

            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Ownership
          </CardTitle>
          <CardDescription>
            Hand over ownership of {library.name} to an existing library member.
            You will automatically remain a member.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Invite at least one member first before transferring ownership.
            </p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full sm:max-w-xs">
                <Select
                  value={selectedNewOwnerId}
                  onValueChange={setSelectedNewOwnerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                disabled={!selectedNewOwnerId}
                onClick={() => setTransferConfirmOpen(true)}
              >
                Transfer Ownership
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete this library, its bookshelves, memberships, and
            invite links. Libraries containing books cannot be deleted until all
            books are removed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            {library.book_count > 0
              ? `This library currently has ${library.book_count} book(s). Delete all books first to enable deletion.`
              : "This library has 0 books and can be safely deleted."}
          </p>
          <Button
            variant="destructive"
            size="sm"
            disabled={library.book_count > 0}
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Library
          </Button>
        </CardContent>
      </Card>

      {/* Transfer Confirmation Dialog */}
      <Dialog
        open={transferConfirmOpen}
        onOpenChange={setTransferConfirmOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Ownership Transfer</DialogTitle>
            <DialogDescription>
              Make <strong>{selectedNewOwner?.username}</strong> the new owner
              of <strong>{library.name}</strong>? You will become a regular
              member and will no longer be able to edit books, shelves, or
              settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setTransferConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => transferMutation.mutate()}
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Library Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Library</DialogTitle>
            <DialogDescription>
              Permanently delete <strong>{library.name}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
