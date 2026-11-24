"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Globe,
  Library as LibraryIcon,
  Loader2,
  Lock,
  LogIn,
  XCircle,
} from "lucide-react";
import type { InvitePreview } from "@/types/api";
import { ApiError, apiClient } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function InviteAcceptPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, loginWithSso } = useAuth();
  const { toast } = useToast();

  const code = params.code;

  const previewQuery = useQuery({
    queryKey: ["invite-preview", code],
    queryFn: () =>
      apiClient.get<{ invite: InvitePreview }>(
        `/api/v1/invites/${encodeURIComponent(code)}`
      ),
    enabled: Boolean(code),
    retry: false,
  });

  const joinMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ library_id: string }>(
        `/api/v1/invites/${encodeURIComponent(code)}/join`,
        {}
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      toast({
        title: "Joined library",
        description: `Welcome to "${previewQuery.data?.invite.library.name}"!`,
      });
      router.push(
        `/libraries/${previewQuery.data?.invite.library.slug || res.library_id}`
      );
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        const target =
          previewQuery.data?.invite.library.slug ||
          previewQuery.data?.invite.library.id;
        toast({
          title: "Already a member",
          description: err.message,
        });
        if (target) {
          router.push(`/libraries/${target}`);
          return;
        }
      }
      toast({
        variant: "destructive",
        title: "Could not join library",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
  });

  const invite = previewQuery.data?.invite;

  const handleSignIn = () => {
    loginWithSso(
      typeof window !== "undefined" ? window.location.href : undefined
    );
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-lg py-8">
        {previewQuery.isLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Loading invite details...
              </p>
            </CardContent>
          </Card>
        ) : !invite ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <XCircle className="mb-3 h-10 w-10 text-destructive/80" />
              <h1 className="font-serif text-xl font-medium text-foreground">
                Invite Not Found
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This invite code is invalid or no longer exists.
              </p>
              <Button variant="outline" size="sm" className="mt-5" asChild>
                <Link href="/libraries">Browse Libraries</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-primary-soft text-primary">
                <LibraryIcon className="h-6 w-6" />
              </div>
              <div className="flex justify-center gap-2">
                <Badge
                  variant={
                    invite.library.visibility === "public"
                      ? "secondary"
                      : "outline"
                  }
                  className="gap-1"
                >
                  {invite.library.visibility === "public" ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                  {invite.library.visibility === "public"
                    ? "Public Library"
                    : "Private Library"}
                </Badge>
              </div>
              <CardTitle className="mt-2 font-serif text-2xl font-medium">
                {invite.library.name}
              </CardTitle>
              <CardDescription>
                Invited by{" "}
                <span className="font-medium text-foreground">
                  {invite.library.owner_name}
                </span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 text-center">
              {invite.library.description && (
                <p className="text-sm text-muted-foreground">
                  {invite.library.description}
                </p>
              )}

              {!invite.is_active ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  This invite link is no longer active (expired, revoked, or
                  reached its usage limit). Ask the library owner for a fresh
                  link.
                </div>
              ) : authLoading ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : isAuthenticated ? (
                <Button
                  className="w-full"
                  onClick={() => joinMutation.mutate()}
                  disabled={joinMutation.isPending}
                >
                  {joinMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Accept Invite &amp; Join Library
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Sign in with your Niwa account to join as a library member.
                  </p>
                  <Button className="w-full" onClick={handleSignIn}>
                    <LogIn className="h-4 w-4" />
                    Sign in with Niwa to Join
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
