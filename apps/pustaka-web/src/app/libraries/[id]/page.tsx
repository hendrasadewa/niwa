"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Crown,
  Globe,
  Library as LibraryIcon,
  LibraryBig,
  Loader2,
  Lock,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import type {
  Bookshelf,
  Library,
  LibraryMembersResponse,
} from "@/types/api";
import { ApiError, apiClient } from "@/lib/api";
import { useToast } from "@niwa/ui/hooks";
import { AppShell } from "@/components/layout/app-shell";
import { LibraryBooksTab } from "@/components/libraries/library-books-tab";
import { LibraryBookshelvesTab } from "@/components/libraries/library-bookshelves-tab";
import { LibraryMembersTab } from "@/components/libraries/library-members-tab";
import { LibrarySettingsTab } from "@/components/libraries/library-settings-tab";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@niwa/ui/primitives";
import { cn } from "@/lib/utils";

type WorkspaceTab = "books" | "bookshelves" | "members" | "settings";

export default function LibraryWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const libraryIdentifier = params.id;
  const [activeTab, setActiveTab] = React.useState<WorkspaceTab>("books");
  const [leaveConfirmOpen, setLeaveConfirmOpen] = React.useState(false);

  const libraryQuery = useQuery({
    queryKey: ["library", libraryIdentifier],
    queryFn: () =>
      apiClient.get<{ library: Library }>(
        `/api/v1/libraries/${encodeURIComponent(libraryIdentifier)}`
      ),
    enabled: Boolean(libraryIdentifier),
  });

  const library = libraryQuery.data?.library;
  const isOwner = library?.role === "owner";
  const isMember = library?.role === "member";
  const canViewMembers = isOwner || isMember;

  const effectiveTab: WorkspaceTab =
    (activeTab === "settings" && !isOwner) ||
    (activeTab === "members" && !canViewMembers)
      ? "books"
      : activeTab;

  const bookshelvesQuery = useQuery({
    queryKey: ["library-bookshelves", library?.id],
    queryFn: () =>
      apiClient.get<{ bookshelves: Bookshelf[] }>(
        `/api/v1/libraries/${library!.id}/bookshelves`
      ),
    enabled: Boolean(library?.id),
  });

  const membersQuery = useQuery({
    queryKey: ["library-members", library?.id],
    queryFn: () =>
      apiClient.get<LibraryMembersResponse>(
        `/api/v1/libraries/${library!.id}/members`
      ),
    enabled: Boolean(library?.id) && canViewMembers,
  });

  const leaveMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/v1/libraries/${library!.id}/leave`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      queryClient.invalidateQueries({ queryKey: ["library", libraryIdentifier] });
      toast({
        title: "Left library",
        description: `You are no longer a member of "${library?.name}".`,
      });
      setLeaveConfirmOpen(false);
      router.push("/libraries");
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not leave library",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
  });

  const tabs: {
    id: WorkspaceTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    visible: boolean;
  }[] = [
    {
      id: "books",
      label: `Books (${library?.book_count ?? 0})`,
      icon: BookOpen,
      visible: true,
    },
    {
      id: "bookshelves",
      label: `Bookshelves (${library?.bookshelf_count ?? 0})`,
      icon: LibraryBig,
      visible: true,
    },
    {
      id: "members",
      label: `Members (${(library?.member_count ?? 0) + 1})`,
      icon: Users,
      visible: canViewMembers,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      visible: isOwner,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/libraries">
              <ArrowLeft className="h-4 w-4" />
              Back to Libraries
            </Link>
          </Button>
        </div>

        {libraryQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-12 w-72 rounded-full" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : !library ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <LibraryIcon className="mb-3 h-10 w-10 text-muted-foreground/60" />
              <h2 className="text-base font-semibold text-foreground">
                Library Not Found
              </h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                This library does not exist or is private and requires an invite
                to access.
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/libraries">Browse Libraries</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        library.visibility === "public"
                          ? "secondary"
                          : "outline"
                      }
                      className="gap-1"
                    >
                      {library.visibility === "public" ? (
                        <Globe className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      {library.visibility === "public" ? "Public" : "Private"}
                    </Badge>
                    {isOwner && (
                      <Badge className="gap-1">
                        <Crown className="h-3 w-3" />
                        Owner
                      </Badge>
                    )}
                    {isMember && <Badge variant="secondary">Member</Badge>}
                  </div>

                  <h1 className="font-serif text-2xl font-medium tracking-[-0.015em] text-foreground sm:text-3xl">
                    {library.name}
                  </h1>

                  {library.description && (
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      {library.description}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Owned by{" "}
                    <span className="font-medium text-foreground">
                      {library.owner_name}
                    </span>{" "}
                    · <span className="font-mono">/{library.slug}</span>
                  </p>
                </div>

                {isMember && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLeaveConfirmOpen(true)}
                    className="shrink-0 text-destructive hover:text-destructive"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Leave Library
                  </Button>
                )}
              </CardContent>
            </Card>

            <div
              role="tablist"
              aria-label="Library workspace sections"
              className="flex gap-1.5 overflow-x-auto rounded-[var(--radius-2xl)] border border-border bg-surface p-1.5 shadow-[var(--shadow-card)]"
            >
              {tabs
                .filter((t) => t.visible)
                .map((tab) => {
                  const Icon = tab.icon;
                  const isActive = effectiveTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors cursor-pointer",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                          : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
            </div>

            {effectiveTab === "books" && (
              <LibraryBooksTab
                library={library}
                bookshelves={bookshelvesQuery.data?.bookshelves ?? []}
                membersData={membersQuery.data}
              />
            )}

            {effectiveTab === "bookshelves" && (
              <LibraryBookshelvesTab
                library={library}
                bookshelves={bookshelvesQuery.data?.bookshelves ?? []}
                isLoading={bookshelvesQuery.isLoading}
              />
            )}

            {effectiveTab === "members" && canViewMembers && (
              <LibraryMembersTab
                library={library}
                membersData={membersQuery.data}
                isLoadingMembers={membersQuery.isLoading}
              />
            )}

            {effectiveTab === "settings" && isOwner && (
              <LibrarySettingsTab
                key={`${library.id}-${library.updated_at}`}
                library={library}
                membersData={membersQuery.data}
              />
            )}
          </>
        )}
      </div>

      <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Library</DialogTitle>
            <DialogDescription>
              Leave <strong>{library?.name}</strong>? If this library is
              private, you will need a new invite link to regain access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setLeaveConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => leaveMutation.mutate()}
              disabled={leaveMutation.isPending}
            >
              {leaveMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Leave Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
