"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookCopy,
  Image as ImageIcon,
  LibraryBig,
  Plus,
  Users,
} from "lucide-react";
import type { Book, Bookshelf, User } from "@/types/api";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { AdminShell } from "@/components/layout/admin-shell";
import { BookCover } from "@/components/books/book-cover";
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

  const booksQuery = useQuery({
    queryKey: ["books", {}],
    queryFn: () => apiClient.get<{ books: Book[] }>("/api/v1/books"),
  });

  const bookshelvesQuery = useQuery({
    queryKey: ["bookshelves"],
    queryFn: () =>
      apiClient.get<{ bookshelves: Bookshelf[] }>("/api/v1/bookshelves"),
  });

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

  const books = booksQuery.data?.books ?? [];
  const bookshelves = bookshelvesQuery.data?.bookshelves ?? [];
  const usersList = usersQuery.data?.users ?? (user ? [user] : []);
  const booksWithCoverCount = books.filter((b) =>
    Boolean(b.cover_image_key)
  ).length;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between gap-2">
                <span>Total Books</span>
                <BookCopy className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-3xl">{books.length}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                {booksWithCoverCount} with R2 cover
              </span>
              <Link
                href="/admin/books"
                className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline"
              >
                Manage
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between gap-2">
                <span>Total Bookshelves</span>
                <LibraryBig className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-3xl">{bookshelves.length}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
              <span>Physical storage locations</span>
              <Link
                href="/admin/bookshelves"
                className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline"
              >
                Manage
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between gap-2">
                <span>Household Users</span>
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-3xl">{usersList.length}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
              <span>Registered members</span>
              <Link
                href="/admin/users"
                className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline"
              >
                Roles
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-base">
                Recent Inventory Overview
              </CardTitle>
              <CardDescription>
                Quick snapshot of books and their assigned bookshelves.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/bookshelves">
                  <Plus className="h-4 w-4" />
                  New Bookshelf
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/admin/books">
                  <Plus className="h-4 w-4" />
                  Manage Books
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {books.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No books in inventory yet. Create a bookshelf first, then add
                your first book!
              </div>
            ) : (
              <div className="space-y-3">
                {books.slice(0, 5).map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <BookCover
                        bookId={book.id}
                        title={book.title}
                        coverImageKey={book.cover_image_key}
                        className="h-14 w-10 shrink-0 rounded-sm"
                        iconClassName="h-4 w-4"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {book.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {book.author} · ISBN {book.isbn}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {book.bookshelf ? (
                        <Badge variant="secondary">
                          {book.bookshelf.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
