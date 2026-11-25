"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DraftDto,
  StandardDocumentSummaryDto,
  StandardPublicationDto,
} from "@niwa/blog-validators";
import {
  AlertCircle,
  ExternalLink,
  FileEdit,
  Globe,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "@niwa/ui/hooks";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@niwa/ui/primitives";
import { apiClient, formatApiErrorMessage } from "@/lib/api";

function formatTimestamp(secOrIso: number | string): string {
  const date =
    typeof secOrIso === "number" ? new Date(secOrIso * 1000) : new Date(secOrIso);
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return String(secOrIso);
  }
}

export default function StudioDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"drafts" | "published">(
    "drafts"
  );

  const publicationQuery = useQuery({
    queryKey: ["studio", "publication"],
    queryFn: () =>
      apiClient.get<{ publication: StandardPublicationDto | null }>(
        "/api/v1/studio/publication"
      ),
  });

  const draftsQuery = useQuery({
    queryKey: ["studio", "drafts"],
    queryFn: () => apiClient.get<{ drafts: DraftDto[] }>("/api/v1/studio/drafts"),
  });

  const postsQuery = useQuery({
    queryKey: ["studio", "posts"],
    queryFn: () =>
      apiClient.get<{ posts: StandardDocumentSummaryDto[] }>(
        "/api/v1/studio/posts"
      ),
  });

  const createDraftMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ draft: DraftDto }>("/api/v1/studio/drafts", {
        title: "",
        markdown: "",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["studio", "drafts"] });
      router.push(`/studio/drafts/${data.draft.id}`);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to create draft",
        description: formatApiErrorMessage(err),
      });
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ deleted: boolean }>(`/api/v1/studio/drafts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studio", "drafts"] });
      toast({ title: "Draft deleted" });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to delete draft",
        description: formatApiErrorMessage(err),
      });
    },
  });

  const drafts = draftsQuery.data?.drafts ?? [];
  const posts = postsQuery.data?.posts ?? [];
  const publication = publicationQuery.data?.publication;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            Writing Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Private drafts live in D1; published posts live on your ATProto PDS.
          </p>
        </div>

        <Button
          onClick={() => createDraftMutation.mutate()}
          disabled={createDraftMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          <span>New Draft</span>
        </Button>
      </div>

      {!publicationQuery.isLoading && !publication && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Standard.site publication is not initialized yet
              </p>
              <p className="text-xs text-muted-foreground">
                Create your <code>site.standard.publication</code> record before
                publishing your first essay to ATProto.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/studio/settings">Initialize Publication</Link>
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Button
          size="sm"
          variant={activeTab === "drafts" ? "default" : "ghost"}
          onClick={() => setActiveTab("drafts")}
        >
          Drafts ({drafts.length})
        </Button>
        <Button
          size="sm"
          variant={activeTab === "published" ? "default" : "ghost"}
          onClick={() => setActiveTab("published")}
        >
          Published on ATProto ({posts.length})
        </Button>
      </div>

      {activeTab === "drafts" ? (
        draftsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : drafts.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">No drafts yet</CardTitle>
              <CardDescription>
                Start a private Markdown draft and publish it to your ATProto PDS
                whenever it is ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => createDraftMutation.mutate()}>
                <Plus className="h-4 w-4" />
                <span>Create first draft</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => (
              <Card key={draft.id}>
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/studio/drafts/${draft.id}`}
                      className="font-serif text-lg font-semibold text-foreground hover:text-primary"
                    >
                      {draft.title || "Untitled draft"}
                    </Link>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      /p/{draft.slug} · Updated {formatTimestamp(draft.updatedAt)}
                    </p>
                    {draft.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {draft.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/studio/drafts/${draft.id}`}>
                        <FileEdit className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (window.confirm("Delete this private draft?")) {
                          deleteDraftMutation.mutate(draft.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : postsQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              No published posts found
            </CardTitle>
            <CardDescription>
              Once you publish a draft to ATProto, it will appear here and on your
              public feed.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.uri}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/studio/posts/${post.rkey}`}
                      className="font-serif text-lg font-semibold text-foreground hover:text-primary"
                    >
                      {post.title}
                    </Link>
                    {post.bskyPostRef && (
                      <Badge variant="secondary" className="text-[11px]">
                        Bluesky Linked
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {post.path} · Published {formatTimestamp(post.publishedAt)} ·{" "}
                    <code>{post.rkey}</code>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={post.path} target="_blank">
                      <Globe className="h-3.5 w-3.5" />
                      <span>Live</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/studio/posts/${post.rkey}`}>
                      <FileEdit className="h-3.5 w-3.5" />
                      <span>Edit Live</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
