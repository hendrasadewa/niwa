"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DraftDto, StandardDocumentDto } from "@niwa/blog-validators";
import {
  ArrowLeft,
  ImagePlus,
  Save,
  Send,
  Upload,
  X,
} from "lucide-react";
import { Spinner } from "@niwa/ui/components";
import { toast } from "@niwa/ui/hooks";
import {
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

function slugifyClient(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function DraftEditorForm({ initialDraft }: { initialDraft: DraftDto }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const draftId = initialDraft.id;

  const [title, setTitle] = React.useState(initialDraft.title);
  const [slug, setSlug] = React.useState(initialDraft.slug);
  const [slugTouched, setSlugTouched] = React.useState(
    Boolean(initialDraft.title)
  );
  const [description, setDescription] = React.useState(initialDraft.description);
  const [tagsInput, setTagsInput] = React.useState(initialDraft.tags.join(", "));
  const [markdown, setMarkdown] = React.useState(initialDraft.markdown);
  const [coverImageKey, setCoverImageKey] = React.useState<string | null>(
    initialDraft.coverImageKey
  );
  const [coverImageUrl, setCoverImageUrl] = React.useState<string | null>(
    initialDraft.coverImageUrl
  );
  const [crosspostToBsky, setCrosspostToBsky] = React.useState(
    initialDraft.crosspostToBsky
  );
  const [bskyTeaser, setBskyTeaser] = React.useState(initialDraft.bskyTeaser);
  const [viewMode, setViewMode] = React.useState<"split" | "write" | "preview">(
    "split"
  );
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false);
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

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.patch<{ draft: DraftDto }>(`/api/v1/studio/drafts/${draftId}`, {
        title,
        slug: slug.trim() || slugifyClient(title || "untitled"),
        description,
        markdown,
        tags: parsedTags,
        coverImageKey,
        bskyTeaser,
        crosspostToBsky,
      }),
    onSuccess: (data) => {
      setSlug(data.draft.slug);
      setCoverImageUrl(data.draft.coverImageUrl);
      queryClient.invalidateQueries({ queryKey: ["studio", "drafts"] });
      toast({ title: "Draft saved" });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to save draft",
        description: formatApiErrorMessage(err),
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch<{ draft: DraftDto }>(
        `/api/v1/studio/drafts/${draftId}`,
        {
          title,
          slug: slug.trim() || slugifyClient(title || "untitled"),
          description,
          markdown,
          tags: parsedTags,
          coverImageKey,
          bskyTeaser,
          crosspostToBsky,
        }
      );
      return apiClient.post<{ post: StandardDocumentDto }>(
        `/api/v1/studio/drafts/${draftId}/publish`,
        {
          crosspostToBsky,
          bskyTeaser: bskyTeaser.trim() || undefined,
        }
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["studio"] });
      setPublishDialogOpen(false);
      toast({
        title: "Published to ATProto!",
        description: `Live at ${data.post.path}`,
      });
      router.push(`/studio/posts/${data.post.rkey}`);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Publish failed",
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
        description:
          "Standard.site cover images are uploaded as ATProto blobs and must be under 976 KB.",
      });
      return;
    }

    setUploadingCover(true);
    try {
      const res = await uploadStudioFile<{
        cover: { key: string; url: string };
      }>("/api/v1/studio/cover", file);
      setCoverImageKey(res.cover.key);
      setCoverImageUrl(res.cover.url);
      toast({ title: "Cover image staged (uploads to PDS on publish)" });
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

  const teaserCharCount = Array.from(bskyTeaser).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/studio"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Studio</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4" />
            <span>{saveMutation.isPending ? "Saving..." : "Save Draft"}</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (!bskyTeaser.trim() && title.trim()) {
                const defaultTags = parsedTags
                  .slice(0, 3)
                  .map((t) => `#${t.replace(/[^a-zA-Z0-9_]/g, "")}`)
                  .join(" ");
                const suggested = [title.trim(), description.trim(), defaultTags]
                  .filter(Boolean)
                  .join("\n\n");
                setBskyTeaser(suggested);
              }
              setPublishDialogOpen(true);
            }}
          >
            <Send className="h-4 w-4" />
            <span>Publish to ATProto</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="draft-title">Title</Label>
            <Input
              id="draft-title"
              placeholder="Essay or TIL title..."
              value={title}
              onChange={(e) => {
                const next = e.target.value;
                setTitle(next);
                if (!slugTouched) {
                  setSlug(slugifyClient(next));
                }
              }}
              className="font-serif text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="draft-slug">Slug (/p/slug)</Label>
            <Input
              id="draft-slug"
              placeholder="my-first-atproto-essay"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="draft-tags">Tags (comma-separated)</Label>
            <Input
              id="draft-tags"
              placeholder="atproto, engineering, cloudflare"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="draft-description">
              Excerpt / OpenGraph Description
            </Label>
            <Textarea
              id="draft-description"
              rows={2}
              placeholder="Short summary shown in your feed, RSS, and Bluesky link card..."
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
                    : coverImageUrl
                      ? "Replace Cover"
                      : "Upload Cover"}
                </span>
              </Button>
            </div>
            {coverImageUrl && (
              <div className="relative inline-block overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImageUrl}
                  alt="Staged cover preview"
                  className="h-36 w-64 object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverImageKey(null);
                    setCoverImageUrl(null);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-background/85 p-1 text-foreground shadow hover:bg-background"
                  title="Remove cover image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
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
            onDrop={(e) => {
              const file = e.dataTransfer.files?.[0];
              if (file && file.type.startsWith("image/")) {
                e.preventDefault();
                void handleInlineImageUpload(file);
              }
            }}
            placeholder="Write in GitHub-Flavored Markdown... Drop images here to upload to R2."
            className="min-h-[520px] resize-y font-mono text-sm leading-relaxed"
          />
        )}

        {viewMode !== "write" && (
          <div className="min-h-[520px] rounded-xl border border-border bg-card p-6">
            <MarkdownPreview markdown={markdown} />
          </div>
        )}
      </div>

      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Publish to ATProto (Standard.site)
            </DialogTitle>
            <DialogDescription>
              This writes a public <code>site.standard.document</code> record to
              your PDS and removes the private draft from D1.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={crosspostToBsky}
                onChange={(e) => setCrosspostToBsky(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span>Auto-crosspost companion link card to Bluesky</span>
            </label>

            {crosspostToBsky && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bsky-teaser">Bluesky Teaser Text</Label>
                  <span
                    className={`text-xs ${
                      teaserCharCount > 300
                        ? "font-medium text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {teaserCharCount} / 300
                  </span>
                </div>
                <Textarea
                  id="bsky-teaser"
                  rows={4}
                  value={bskyTeaser}
                  onChange={(e) => setBskyTeaser(e.target.value)}
                  placeholder="Write a short teaser for your Bluesky followers..."
                />
                <p className="text-xs text-muted-foreground">
                  An external link card pointing to{" "}
                  <code>/p/{slug || "..."}</code> is attached automatically and
                  linked via <code>bskyPostRef</code>.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPublishDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={
                publishMutation.isPending ||
                !title.trim() ||
                !markdown.trim() ||
                (crosspostToBsky && teaserCharCount > 300)
              }
            >
              <Send className="h-4 w-4" />
              <span>
                {publishMutation.isPending ? "Publishing..." : "Publish Now"}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DraftEditorPage() {
  const params = useParams<{ id: string }>();
  const draftId = params.id;

  const draftQuery = useQuery({
    queryKey: ["studio", "draft", draftId],
    queryFn: () =>
      apiClient.get<{ draft: DraftDto }>(`/api/v1/studio/drafts/${draftId}`),
    enabled: Boolean(draftId),
  });

  if (draftQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (draftQuery.isError || !draftQuery.data?.draft) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-destructive">Failed to load draft.</p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/studio">Back to Studio</Link>
        </Button>
      </div>
    );
  }

  return (
    <DraftEditorForm
      key={draftQuery.data.draft.id}
      initialDraft={draftQuery.data.draft}
    />
  );
}
