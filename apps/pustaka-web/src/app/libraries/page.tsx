"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Crown,
  Globe,
  Library as LibraryIcon,
  LibraryBig,
  Link2,
  Lock,
  LogIn,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import type { Library } from "@/types/api";
import { PageHeader } from "@niwa/ui/components";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { AppShell } from "@/components/layout/app-shell";
import { CreateLibraryDialog } from "@/components/libraries/create-library-dialog";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type LibrariesTab = "mine" | "public";

function extractInviteCode(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/\/invites\/([^/?#]+)/i);
  if (match?.[1]) return match[1];
  return trimmed;
}

export default function LibrariesPage() {
  const router = useRouter();
  const { isAuthenticated, loginWithSso } = useAuth();
  const [activeTab, setActiveTab] = React.useState<LibrariesTab>("mine");
  const [searchInput, setSearchInput] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [joinOpen, setJoinOpen] = React.useState(false);
  const [inviteInput, setInviteInput] = React.useState("");

  const debouncedSearch = useDebounce(searchInput.trim(), 250);

  const effectiveScope: LibrariesTab = isAuthenticated ? activeTab : "public";

  const librariesQuery = useQuery({
    queryKey: [
      "libraries",
      { scope: effectiveScope, search: debouncedSearch || undefined },
    ],
    queryFn: () =>
      apiClient.get<{ libraries: Library[] }>("/api/v1/libraries", {
        params: {
          scope: effectiveScope,
          search: debouncedSearch || undefined,
        },
      }),
  });

  const libraries = librariesQuery.data?.libraries ?? [];

  const handleSignIn = () => {
    loginWithSso(
      typeof window !== "undefined" ? window.location.href : undefined
    );
  };

  function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = extractInviteCode(inviteInput);
    if (!code) return;
    setJoinOpen(false);
    setInviteInput("");
    router.push(`/invites/${encodeURIComponent(code)}`);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          kicker="Pustaka / Libraries"
          title="Libraries"
          description="Create personal or shared household libraries, manage bookshelves and book ownership, or browse public collections."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setJoinOpen(true)}
              >
                <Link2 className="h-4 w-4" />
                Join by Code
              </Button>
              {isAuthenticated ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New Library
                </Button>
              ) : (
                <Button size="sm" onClick={handleSignIn}>
                  <LogIn className="h-4 w-4" />
                  Sign In to Create
                </Button>
              )}
            </div>
          }
        />

        <div className="flex flex-col gap-3 rounded-[var(--radius-2xl)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
          {isAuthenticated && (
            <div
              role="tablist"
              aria-label="Library scope"
              className="inline-flex rounded-full border border-border bg-surface-subtle/60 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "mine"}
                onClick={() => setActiveTab("mine")}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  activeTab === "mine"
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                My Libraries
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "public"}
                onClick={() => setActiveTab("public")}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  activeTab === "public"
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Public Libraries
              </button>
            </div>
          )}

          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search libraries..."
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
        </div>

        {librariesQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="h-48 w-full rounded-2xl" />
            ))}
          </div>
        ) : libraries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <LibraryIcon className="mb-3 h-10 w-10 text-muted-foreground/60" />
              <h2 className="text-base font-semibold text-foreground">
                {effectiveScope === "mine"
                  ? "No libraries yet"
                  : "No public libraries found"}
              </h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {effectiveScope === "mine"
                  ? "Create your own library to organize bookshelves and books, or join a shared one with an invite code."
                  : "Try clearing your search filter or check back later."}
              </p>
              {isAuthenticated && effectiveScope === "mine" && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Create Library
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setJoinOpen(true)}
                  >
                    <Link2 className="h-4 w-4" />
                    Join via Invite
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {libraries.map((lib) => (
              <Link
                key={lib.id}
                href={`/libraries/${lib.slug || lib.id}`}
                className="group block h-full"
              >
                <Card className="flex h-full flex-col justify-between transition-all hover:border-primary/40 hover:shadow-md">
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        variant={
                          lib.visibility === "public" ? "secondary" : "outline"
                        }
                        className="gap-1 text-[11px]"
                      >
                        {lib.visibility === "public" ? (
                          <Globe className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        {lib.visibility === "public" ? "Public" : "Private"}
                      </Badge>

                      {lib.role === "owner" ? (
                        <Badge className="gap-1 text-[11px]">
                          <Crown className="h-3 w-3" />
                          Owner
                        </Badge>
                      ) : lib.role === "member" ? (
                        <Badge variant="secondary" className="text-[11px]">
                          Member
                        </Badge>
                      ) : null}
                    </div>

                    <div>
                      <CardTitle className="font-serif text-lg font-medium group-hover:underline">
                        {lib.name}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2 text-xs">
                        {lib.description || `Owned by ${lib.owner_name}`}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <div className="flex flex-wrap items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {lib.book_count}{" "}
                        {lib.book_count === 1 ? "book" : "books"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <LibraryBig className="h-3.5 w-3.5" />
                        {lib.bookshelf_count}{" "}
                        {lib.bookshelf_count === 1 ? "shelf" : "shelves"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {lib.member_count + 1}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate text-muted-foreground">
                        Owner:{" "}
                        <span className="font-medium text-foreground">
                          {lib.owner_name}
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
                        Open
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateLibraryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(library) =>
          router.push(`/libraries/${library.slug || library.id}`)
        }
      />

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join a Library</DialogTitle>
            <DialogDescription>
              Paste an invite link or invite code shared by a library owner.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-code-input">Invite Code or URL</Label>
              <Input
                id="invite-code-input"
                required
                placeholder="e.g. AbC123XyZ789 or https://.../invites/..."
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setJoinOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!inviteInput.trim()}>
                Continue
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
