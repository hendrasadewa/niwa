"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Crown,
  Globe,
  Library as LibraryIcon,
  Lock,
  Shield,
  Users,
} from "lucide-react";
import type { Library, User } from "@/types/api";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      try {
        return await apiClient.get<{ users: User[] }>("/api/v1/users");
      } catch {
        return { users: user ? [user] : [] };
      }
    },
  });

  const myLibrariesQuery = useQuery({
    queryKey: ["libraries", { scope: "mine" }],
    queryFn: () =>
      apiClient.get<{ libraries: Library[] }>("/api/v1/libraries", {
        params: { scope: "mine" },
      }),
  });

  const usersList = usersQuery.data?.users ?? (user ? [user] : []);
  const ownedLibraries = (myLibrariesQuery.data?.libraries ?? []).filter(
    (lib) => lib.role === "owner"
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between gap-2">
                <span>Platform Users</span>
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-3xl">{usersList.length}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
              <span>Manage Pustaka RBAC roles</span>
              <Link
                href="/admin/users"
                className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline"
              >
                Users &amp; Roles
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between gap-2">
                <span>Libraries You Own</span>
                <LibraryIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-3xl">
                {ownedLibraries.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
              <span>Books, shelves, members &amp; invites</span>
              <Link
                href="/libraries"
                className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline"
              >
                Open Libraries
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Inventory Management Moved Per-Library
            </CardTitle>
            <CardDescription>
              Platform admin privileges apply strictly to user &amp; role
              management. Private libraries remain private to their owners and
              invited members. Manage your own libraries directly below:
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ownedLibraries.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <p>You don&apos;t own any libraries yet.</p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/libraries">Go to Libraries</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {ownedLibraries.map((lib) => (
                  <Link
                    key={lib.id}
                    href={`/libraries/${lib.slug || lib.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border p-3.5 transition-colors hover:border-primary/40"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-serif text-base font-medium text-foreground">
                          {lib.name}
                        </span>
                        <Badge
                          variant={
                            lib.visibility === "public"
                              ? "secondary"
                              : "outline"
                          }
                          className="gap-1 text-[10px]"
                        >
                          {lib.visibility === "public" ? (
                            <Globe className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                          {lib.visibility}
                        </Badge>
                        <Badge className="gap-1 text-[10px]">
                          <Crown className="h-3 w-3" />
                          Owner
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {lib.book_count} books · {lib.bookshelf_count}{" "}
                        bookshelves · {lib.member_count + 1} member(s)
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                      Manage
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
