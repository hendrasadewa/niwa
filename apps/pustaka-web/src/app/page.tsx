"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Library,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { Book, ReadingListItem } from "@/types/api";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { BookCard } from "@/components/books/book-card";
import {
  BookGridSkeleton,
  BookRowSkeleton,
} from "@/components/books/book-card-skeleton";
import { ReadingListBookRow } from "@/components/books/reading-list-book-row";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useAuth();

  const readingListQuery = useQuery({
    queryKey: ["reading-list"],
    queryFn: () =>
      apiClient.get<{ reading_list: ReadingListItem[] }>(
        "/api/v1/me/reading-list"
      ),
  });

  const booksQuery = useQuery({
    queryKey: ["books", {}],
    queryFn: () => apiClient.get<{ books: Book[] }>("/api/v1/books"),
  });

  const readingList = readingListQuery.data?.reading_list ?? [];
  const allBooks = booksQuery.data?.books ?? [];

  const currentlyReading = React.useMemo(
    () => readingList.filter((item) => item.status === "reading"),
    [readingList]
  );

  const wantToRead = React.useMemo(
    () => readingList.filter((item) => item.status === "want_to_read"),
    [readingList]
  );

  const completedBooks = React.useMemo(
    () => readingList.filter((item) => item.status === "completed"),
    [readingList]
  );

  const recentAdditions = React.useMemo(
    () => allBooks.slice(0, 5),
    [allBooks]
  );

  const statusByBookId = React.useMemo(() => {
    const map = new Map<string, ReadingListItem["status"]>();
    for (const item of readingList) {
      map.set(item.book_id, item.status);
    }
    return map;
  }, [readingList]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {user?.username}
            </h1>
            <p className="text-sm text-muted-foreground">
              Track your active reading progress and discover books from the
              household shelves.
            </p>
          </div>
          <Button asChild>
            <Link href="/books">
              <Library className="h-4 w-4" />
              Browse Full Catalog
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Currently Reading</span>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-2xl">
                {currentlyReading.length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Want to Read</span>
                <Bookmark className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-2xl">{wantToRead.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Completed</span>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-2xl">
                {completedBooks.length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Library Collection</span>
                <Library className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-2xl">{allBooks.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Active Reading List
              </h2>
              <p className="text-xs text-muted-foreground">
                Books you are currently reading and your page progress.
              </p>
            </div>
          </div>

          {readingListQuery.isLoading ? (
            <BookRowSkeleton count={2} />
          ) : currentlyReading.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <BookOpen className="mb-3 h-9 w-9 text-muted-foreground/60" />
                <h3 className="text-sm font-semibold">
                  No active books in your reading list
                </h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Explore the household catalog and mark a book as &ldquo;Reading&rdquo;
                  to track your page progress here.
                </p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/books">Explore Catalog</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {currentlyReading.map((item) => (
                <ReadingListBookRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {wantToRead.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Want to Read ({wantToRead.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Saved on your personal wishlist for next reading.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {wantToRead.map((item) => (
                <ReadingListBookRow key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <Sparkles className="h-4 w-4 text-primary" />
                Recent Additions to the Library
              </h2>
              <p className="text-xs text-muted-foreground">
                Latest books cataloged on the household shelves.
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/books">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {booksQuery.isLoading ? (
            <BookGridSkeleton count={5} />
          ) : recentAdditions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No books have been added to the library yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {recentAdditions.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  readingStatus={statusByBookId.get(book.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
