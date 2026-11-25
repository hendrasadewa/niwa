"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StandardPublicationDto } from "@niwa/blog-validators";
import { CheckCircle2, ExternalLink, Save } from "lucide-react";
import { Spinner } from "@niwa/ui/components";
import { toast } from "@niwa/ui/hooks";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@niwa/ui/primitives";
import { apiClient, formatApiErrorMessage, SITE_URL } from "@/lib/api";

function PublicationSettingsForm({
  publication,
}: {
  publication: StandardPublicationDto | null;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState(publication?.name || "Hendra Sadewa");
  const [description, setDescription] = React.useState(
    publication?.description ||
      "Micro-essays, engineering notes, and TILs published on ATProto via Standard.site."
  );
  const [url, setUrl] = React.useState(publication?.url || SITE_URL);

  const upsertMutation = useMutation({
    mutationFn: () =>
      apiClient.put<{ publication: StandardPublicationDto }>(
        "/api/v1/studio/publication",
        {
          name: name.trim(),
          description: description.trim(),
          url: url.trim(),
        }
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["studio"] });
      toast({
        title: "Standard.site publication saved",
        description: data.publication.uri,
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to save publication",
        description: formatApiErrorMessage(err),
      });
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          Standard.site Publication
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the <code>site.standard.publication</code> record on your
          ATProto PDS and verify two-way domain binding.
        </p>
      </div>

      {publication && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>Publication Record Active</span>
            </CardTitle>
            <CardDescription className="break-all font-mono text-xs">
              {publication.uri}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Two-way verification endpoint:
            </p>
            <a
              href="/.well-known/site.standard.publication"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-primary underline underline-offset-4"
            >
              <span>/.well-known/site.standard.publication</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">
            {publication ? "Update Publication" : "Initialize Publication"}
          </CardTitle>
          <CardDescription>
            Creates or updates your <code>site.standard.publication</code> record
            via your configured Bluesky App Password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              upsertMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="pub-name">Publication Name</Label>
              <Input
                id="pub-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pub-url">Canonical Publication URL</Label>
              <Input
                id="pub-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pub-desc">Description</Label>
              <Textarea
                id="pub-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={upsertMutation.isPending}>
              <Save className="h-4 w-4" />
              <span>
                {upsertMutation.isPending
                  ? "Saving to PDS..."
                  : publication
                    ? "Update Publication Record"
                    : "Initialize Publication on ATProto"}
              </span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudioSettingsPage() {
  const publicationQuery = useQuery({
    queryKey: ["studio", "publication"],
    queryFn: () =>
      apiClient.get<{ publication: StandardPublicationDto | null }>(
        "/api/v1/studio/publication"
      ),
  });

  if (publicationQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const publication = publicationQuery.data?.publication ?? null;

  return (
    <PublicationSettingsForm
      key={publication?.cid ?? "uninitialized"}
      publication={publication}
    />
  );
}
