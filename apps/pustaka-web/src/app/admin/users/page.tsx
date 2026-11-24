"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignRoleSchema, type AssignRoleInput } from "@niwa/pustaka-validators";
import { Loader2, Shield, UserPlus, Users } from "lucide-react";
import type { User } from "@/types/api";
import { ApiError, apiClient } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@niwa/ui/hooks";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@niwa/ui/primitives";
export default function AdminUsersPage() {
  const { user: currentUser, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [manualModalOpen, setManualModalOpen] = React.useState(false);
  const [targetUserId, setTargetUserId] = React.useState("");
  const [targetRole, setTargetRole] =
    React.useState<AssignRoleInput["role"]>("admin");

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      try {
        return await apiClient.get<{ users: User[] }>("/api/v1/users");
      } catch {
        return { users: currentUser ? [currentUser] : [] };
      }
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: AssignRoleInput["role"];
    }) => {
      const parsed = assignRoleSchema.parse({ role });
      return apiClient.post<{ user: User }>(
        `/api/v1/users/${encodeURIComponent(userId)}/roles`,
        parsed
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData<{ users: User[] }>(["admin-users"], (prev) => {
        const list = prev?.users ?? [];
        const exists = list.some((u) => u.id === data.user.id);
        return {
          users: exists
            ? list.map((u) => (u.id === data.user.id ? data.user : u))
            : [...list, data.user],
        };
      });
      if (data.user.id === currentUser?.id) {
        refreshProfile();
      }
      setManualModalOpen(false);
      setTargetUserId("");
      toast({
        title: "User role updated",
        description: `${data.user.username} now has roles: ${data.user.roles.join(", ")}.`,
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to assign role",
        description:
          err instanceof ApiError ? err.message : "Please verify the user ID.",
      });
    },
  });

  const usersList = usersQuery.data?.users ?? (currentUser ? [currentUser] : []);

  return (
    <AdminShell>
      <Card>
        <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              User Role Management
            </CardTitle>
            <CardDescription>
              View household members and assign Admin or Member roles.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setManualModalOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Assign Role by User ID
          </Button>
        </CardHeader>

        <CardContent>
          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Roles</TableHead>
                  <TableHead className="text-right">Assign Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersList.map((member) => {
                  const primaryRole: AssignRoleInput["role"] =
                    member.roles.includes("admin") ? "admin" : "member";

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{member.username}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {member.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.roles.map((r) => (
                            <Badge
                              key={r}
                              variant={r === "admin" ? "default" : "secondary"}
                              className="capitalize"
                            >
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex w-36 justify-end">
                          <Select
                            value={primaryRole}
                            onValueChange={(value) =>
                              assignRoleMutation.mutate({
                                userId: member.id,
                                role: value as AssignRoleInput["role"],
                              })
                            }
                            disabled={assignRoleMutation.isPending}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Assign Role to Household Member
            </DialogTitle>
            <DialogDescription>
              Promote a registered household member by their User ID via POST
              /api/v1/users/:id/roles.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!targetUserId.trim()) return;
              assignRoleMutation.mutate({
                userId: targetUserId.trim(),
                role: targetRole,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">User UUID</label>
              <Input
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role to Grant</label>
              <Select
                value={targetRole}
                onValueChange={(v) =>
                  setTargetRole(v as AssignRoleInput["role"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setManualModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignRoleMutation.isPending || !targetUserId.trim()}
              >
                {assignRoleMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Assign Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
