"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DraftDto, StandardDocumentDto } from "@niwa/blog-validators";
import {
  ArchiveRestore,
  ArrowLeft,
  ExternalLink,
  ImagePlus,
  Save,
  Upload,
  X,
} from "lucide-react";
import { Spinner } from "@niwa/ui/components";
import { toast } from "@niwa/ui/hooks";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@niwa/ui/primitives";
import { MarkdownPreview } from "@/components/studio/markdown-preview";
import {
  apiClient,
  formatApiErrorMessage,
  uploadStudioFile,
} from "@/lib/api";
import { atUriToBskyWebUrl } from "@/lib/bsky";

function LivePostEditorForm({
  initialPost,
}: {
  initialPost: StandardDocumentDto;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const rkey = initialPost.rkey;

  const [title, setTitle] = React.useState(initialPost.title);
  const [slug, setSlug] = React.useState(initialPost.slug);
  const [description, setDescription] = React.useState(initialPost.description);
  const [tagsInput, setTagsInput] = React.useState(initialPost.tags.join(", "));
  const [markdown, setMarkdown] = React.useState(initialPost.markdown);
  const [existingCoverUrl, setExistingCoverUrl] = React.useState<string | null>(
    initialPost.coverImageUrl
  );
  const [keepExistingCover, setKeepExistingCover] = React.useState(true);
  const [newCoverKey, setNewCoverKey] = React.useState<string | null>(null);
  const [newCoverUrl, setNewCoverUrl] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"split" | "write" | "preview">(
    "split"
  );
  const [unpublishOpen, setUnpublishOpen] = React.useState(false);
  const [deleteBskyPost, setDeleteBskyPost] = React.useState(false);
  const [uploadingInline, setUploadingInline] = React.useState(false);
  const [uploadingCover, setUploadingCover] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const inlineFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const coverFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const parsedTags = React.useMemo(
    () =>
      tagsInput
        .split(",")
        .map((t) => t.replace(/^#+/, "").trim())
        .filter(Boolean)
        .slice(0, 10),
    [tagsInput]
  );

  const updateMutation = useMutation({
    mutationFn: () =>
      apiClient.put<{ post: StandardDocumentDto }>(
        `/api/v1/studio/posts/${rkey}`,
        {
          title,
          slug,
          description,
          markdown,
          tags: parsedTags,
          coverImageKey: newCoverKey,
          keepExistingCover,
        }
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["studio"] });
      setExistingCoverUrl(data.post.coverImageUrl);
      setNewCoverKey(null);
      setNewCoverUrl(null);
      setKeepExistingCover(true);
      toast({
        title: "Updated live ATProto record",
        description: `putRecord succeeded for ${rkey}`,
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to update live post",
        description: formatApiErrorMessage(err),
      });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ draft: DraftDto; deletedBskyPost: boolean }>(
        `/api/v1/studio/posts/${rkey}/unpublish`,
        { deleteBskyPost }
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["studio"] });
      setUnpublishOpen(false);
      toast({
        title: "Post unpublished and moved to Drafts",
        description: data.deletedBskyPost
          ? "Removed both site.standard.document and the companion Bluesky post."
          : "Removed site.standard.document from your PDS.",
      });
      router.push(`/studio/drafts/${data.draft.id}`);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Unpublish failed",
        description: formatApiErrorMessage(err),
      });
    },
  });

  async function handleInlineImageUpload(file: File) {
    setUploadingInline(true);
    try {
      const res = await uploadStudioFile<{
        media: { key: string; url: string };
      }>("/api/v1/studio/media", file);
      const alt = file.name.replace(/\.[^.]+$/, "");
      const snippet = `\n![${alt}](${res.media.url})\n`;
      const el = textareaRef.current;
      if (el) {
        const start = el.selectionStart ?? markdown.length;
        const end = el.selectionEnd ?? markdown.length;
        setMarkdown(markdown.slice(0, start) + snippet + markdown.slice(end));
      } else {
        setMarkdown((prev) => prev + snippet);
      }
      toast({ title: "Image uploaded to R2" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Image upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setUploadingInline(false);
    }
  }

  async function handleCoverUpload(file: File) {
    if (file.size > 976 * 1024) {
      toast({
        variant: "destructive",
        title: "Cover image too large for ATProto PDS",
        description: "Must be under 976 KB.",
      });
      return;
    }

    setUploadingCover(true);
    try {
      const res = await uploadStudioFile<{
        cover: { key: string; url: string };
      }>("/api/v1/studio/cover", file);
      setNewCoverKey(res.cover.key);
      setNewCoverUrl(res.cover.url);
      setKeepExistingCover(false);
      toast({ title: "New cover ready (uploads to PDS on update)" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Cover upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setUploadingCover(false);
    }
  }

  const activeCoverPreview =
    newCoverUrl || (keepExistingCover ? existingCoverUrl : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/studio"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
          <Badge variant="secondary">Live on ATProto · {rkey}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" asChild>
            <Link href={initialPost.path} target="_blank">
              <span>View Live</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {initialPost.bskyPostRef?.uri && (
            <Button size="sm" variant="ghost" asChild>
              <a
                href={atUriToBskyWebUrl(initialPost.bskyPostRef.uri)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Bluesky Post</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setUnpublishOpen(true)}
          >
            <ArchiveRestore className="h-4 w-4" />
            <span>Unpublish</span>
          </Button>
          <Button
            size="sm"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            <Save className="h-4 w-4" />
            <span>
              {updateMutation.isPending ? "Updating PDS..." : "Update Live Post"}
            </span>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="live-title">Title</Label>
            <Input
              id="live-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-serif text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-slug">Slug (/p/slug)</Label>
            <Input
              id="live-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-tags">Tags (comma-separated)</Label>
            <Input
              id="live-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="live-description">Excerpt / Description</Label>
            <Textarea
              id="live-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Cover Image (ATProto PDS Blob · max 976 KB)</Label>
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleCoverUpload(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploadingCover}
                onClick={() => coverFileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>
                  {uploadingCover
                    ? "Uploading..."
                    : activeCoverPreview
                      ? "Replace Cover"
                      : "Upload Cover"}
                </span>
              </Button>
            </div>
            {activeCoverPreview && (
              <div className="relative inline-block overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeCoverPreview}
                  alt="Cover preview"
                  className="h-36 w-64 object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setNewCoverKey(null);
                    setNewCoverUrl(null);
                    setKeepExistingCover(false);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-background/85 p-1 text-foreground shadow hover:bg-background"
                  title="Remove cover image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="md:col-span-2 text-xs text-muted-foreground">
            AT-URI: <code className="break-all">{initialPost.uri}</code>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {(["write", "split", "preview"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                viewMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div>
          <input
            ref={inlineFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleInlineImageUpload(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploadingInline}
            onClick={() => inlineFileInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            <span>
              {uploadingInline ? "Uploading to R2..." : "Insert Image (R2)"}
            </span>
          </Button>
        </div>
      </div>

      <div
        className={`grid gap-4 ${
          viewMode === "split" ? "lg:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {viewMode !== "preview" && (
          <Textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="min-h-[520px] resize-y font-mono text-sm leading-relaxed"
          />
        )}
        {viewMode !== "write" && (
          <div className="min-h-[520px] rounded-xl border border-border bg-card p-6">
            <MarkdownPreview markdown={markdown} />
          </div>
        )}
      </div>

      <Dialog open={unpublishOpen} onOpenChange={setUnpublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Unpublish Post?
            </DialogTitle>
            <DialogDescription>
              Your content will be safely copied back into a private D1 draft
              before deleting <code>site.standard.document/{rkey}</code> from
              your ATProto PDS.
            </DialogDescription>
          </DialogHeader>

          {initialPost.bskyPostRef?.uri && (
            <label className="flex cursor-pointer items-center gap-2.5 py-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={deleteBskyPost}
                onChange={(e) => setDeleteBskyPost(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-destructive"
              />
              <span>Also delete the companion Bluesky post</span>
            </label>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUnpublishOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => unpublishMutation.mutate()}
              disabled={unpublishMutation.isPending}
            >
              {unpublishMutation.isPending
                ? "Unpublishing..."
                : "Move to Drafts & Delete from PDS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LivePostEditorPage() {
  const params = useParams<{ rkey: string }>();
  const rkey = params.rkey;

  const postQuery = useQuery({
    queryKey: ["studio", "post", rkey],
    queryFn: () =>
      apiClient.get<{ post: StandardDocumentDto }>(
        `/api/v1/studio/posts/${rkey}`
      ),
    enabled: Boolean(rkey),
  });

  if (postQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const post = postQuery.data?.post;
  if (!post) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-destructive">
          Published post not found on PDS.
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/studio">Back to Studio</Link>
        </Button>
      </div>
    );
  }

  return <LivePostEditorForm key={post.cid} initialPost={post} />;
}
