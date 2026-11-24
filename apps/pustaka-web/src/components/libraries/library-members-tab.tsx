"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Crown,
  Link2,
  Loader2,
  Plus,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import type {
  Library,
  LibraryInvite,
  LibraryMember,
  LibraryMembersResponse,
} from "@/types/api";
import { ApiError, apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface LibraryMembersTabProps {
  library: Library;
  membersData?: LibraryMembersResponse;
  isLoadingMembers: boolean;
}

function getInviteStatus(invite: LibraryInvite) {
  const now = Math.floor(Date.now() / 1000);
  if (invite.revoked_at !== null) return { label: "Revoked", active: false };
  if (invite.expires_at !== null && invite.expires_at <= now) {
    return { label: "Expired", active: false };
  }
  if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) {
    return { label: "Used up", active: false };
  }
  return { label: "Active", active: true };
}

export function LibraryMembersTab({
  library,
  membersData,
  isLoadingMembers,
}: LibraryMembersTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isOwner = library.role === "owner";

  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);
  const [maxUses, setMaxUses] = React.useState("");
  const [expiresHours, setExpiresHours] = React.useState("168");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = React.useState<LibraryMember | null>(
    null
  );

  const invitesQuery = useQuery({
    queryKey: ["library-invites", library.id],
    queryFn: () =>
      apiClient.get<{ invites: LibraryInvite[] }>(
        `/api/v1/libraries/${library.id}/invites`
      ),
    enabled: isOwner,
  });

  const createInviteMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ invite: LibraryInvite }>(
        `/api/v1/libraries/${library.id}/invites`,
        {
          max_uses: maxUses.trim() ? Number.parseInt(maxUses, 10) : null,
          expires_in_hours: expiresHours.trim()
            ? Number.parseInt(expiresHours, 10)
            : null,
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["library-invites", library.id],
      });
      setInviteDialogOpen(false);
      toast({
        title: "Invite link created",
        description: "Share the link so others can join this library.",
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to create invite",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      apiClient.delete(`/api/v1/libraries/${library.id}/invites/${inviteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["library-invites", library.id],
      });
      toast({
        title: "Invite revoked",
        description: "This invite link can no longer be used.",
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to revoke invite",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`/api/v1/libraries/${library.id}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["library-members", library.id],
      });
      queryClient.invalidateQueries({ queryKey: ["library", library.id] });
      queryClient.invalidateQueries({ queryKey: ["library", library.slug] });
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      setRemoveTarget(null);
      toast({
        title: "Member removed",
        description:
          "Access revoked. Any book owner labels assigned to them remain intact.",
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to remove member",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
      });
    },
  });

  async function copyInviteUrl(invite: LibraryInvite) {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/invites/${invite.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Invite link copied",
        description: url,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: `Share this code manually: ${invite.code}`,
      });
    }
  }

  const members = membersData?.members ?? [];
  const invites = invitesQuery.data?.invites ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Library Members ({members.length + 1})
          </CardTitle>
          <CardDescription>
            The library owner manages shelves and books; members can browse,
            track reading progress, and post reviews.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {isLoadingMembers ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-border bg-surface-subtle/50 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {(membersData?.owner.username ?? library.owner_name)
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {membersData?.owner.username ?? library.owner_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Full inventory &amp; settings access
                    </p>
                  </div>
                </div>
                <Badge className="gap-1">
                  <Crown className="h-3 w-3" />
                  Owner
                </Badge>
              </div>

              {members.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No invited members yet.
                </p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-border p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-foreground">
                        {member.username.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {member.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined{" "}
                          {new Date(member.joined_at * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary">Member</Badge>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRemoveTarget(member)}
                          aria-label={`Remove ${member.username}`}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4" />
                Shareable Invite Links
              </CardTitle>
              <CardDescription>
                Generate an invite link to add household members or friends to{" "}
                {library.name}.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New Invite Link
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {invitesQuery.isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : invites.length === 0 ? (
              <p className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
                No invite links created yet.
              </p>
            ) : (
              invites.map((invite) => {
                const status = getInviteStatus(invite);
                return (
                  <div
                    key={invite.id}
                    className="flex flex-col justify-between gap-3 rounded-[var(--radius-xl)] border border-border p-3 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded bg-surface-muted px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                          {invite.code}
                        </code>
                        <Badge variant={status.active ? "default" : "outline"}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uses: {invite.uses_count}
                        {invite.max_uses !== null
                          ? ` / ${invite.max_uses}`
                          : " (unlimited)"}
                        {invite.expires_at !== null
                          ? ` · Expires ${new Date(
                              invite.expires_at * 1000
                            ).toLocaleString()}`
                          : " · Never expires"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {status.active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteUrl(invite)}
                        >
                          {copiedId === invite.id ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Copy Link
                        </Button>
                      )}
                      {invite.revoked_at === null && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={revokeInviteMutation.isPending}
                          onClick={() => revokeInviteMutation.mutate(invite.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Invite Link</DialogTitle>
            <DialogDescription>
              Anyone with this link who signs in with Niwa can join{" "}
              {library.name} as a member.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createInviteMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="invite-max-uses">
                Max Uses{" "}
                <span className="text-muted-foreground">
                  (optional, blank = unlimited)
                </span>
              </Label>
              <Input
                id="invite-max-uses"
                type="number"
                min={1}
                max={1000}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-expires">
                Expires After (hours){" "}
                <span className="text-muted-foreground">
                  (optional, blank = never)
                </span>
              </Label>
              <Input
                id="invite-expires"
                type="number"
                min={1}
                max={8760}
                value={expiresHours}
                onChange={(e) => setExpiresHours(e.target.value)}
                placeholder="168 (7 days)"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setInviteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createInviteMutation.isPending}>
                {createInviteMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Generate Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <Dialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Remove <strong>{removeTarget?.username}</strong> from{" "}
              {library.name}? If this library is private, they will lose access
              immediately. Any books attributed to them will keep their owner
              name intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                removeTarget &&
                removeMemberMutation.mutate(removeTarget.user_id)
              }
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
