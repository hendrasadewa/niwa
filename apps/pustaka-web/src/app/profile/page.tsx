"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BookCheck,
  BookOpen,
  KeyRound,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import type { ReadingListItem } from "@/types/api";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { BookCard } from "@/components/books/book-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProfilePage() {
  const { user, isAdmin } = useAuth();

  const readingListQuery = useQuery({
    queryKey: ["reading-list"],
    queryFn: () =>
      apiClient.get<{ reading_list: ReadingListItem[] }>(
        "/api/v1/me/reading-list"
      ),
  });

  const readingList = readingListQuery.data?.reading_list ?? [];
  const completedItems = readingList.filter(
    (item) => item.status === "completed"
  );
  const readingItems = readingList.filter((item) => item.status === "reading");
  const wantToReadItems = readingList.filter(
    (item) => item.status === "want_to_read"
  );

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground">
            Your household member account, assigned roles, and reading summary.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          <Card className="md:col-span-5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {user?.username.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-lg">{user?.username}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {user?.email}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Assigned Roles
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {user?.roles.map((role) => (
                    <Badge
                      key={role}
                      variant={role === "admin" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <KeyRound className="h-3.5 w-3.5" />
                  Permissions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {user?.permissions.map((perm) => (
                    <Badge
                      key={perm}
                      variant="outline"
                      className="font-mono text-[11px]"
                    >
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>

              {isAdmin && (
                <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  You have Administrator access. Visit the{" "}
                  <Link
                    href="/admin"
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    Admin Console
                  </Link>{" "}
                  to manage bookshelves, inventory, and household member roles.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-7">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserIcon className="h-5 w-5" />
                Reading Milestones
              </CardTitle>
              <CardDescription>
                Summary of books on your personal reading list.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <BookCheck className="mx-auto mb-1.5 h-5 w-5 text-emerald-600" />
                <p className="text-2xl font-bold">{completedItems.length}</p>
                <p className="text-xs text-muted-foreground">Books Read</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <BookOpen className="mx-auto mb-1.5 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{readingItems.length}</p>
                <p className="text-xs text-muted-foreground">Reading Now</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <BookOpen className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground" />
                <p className="text-2xl font-bold">{wantToReadItems.length}</p>
                <p className="text-xs text-muted-foreground">Want to Read</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Completed Books ({completedItems.length})
          </h2>
          {completedItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                You haven&apos;t marked any books as completed yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {completedItems.map((item) => (
                <BookCard
                  key={item.id}
                  book={item.book}
                  readingStatus="completed"
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
