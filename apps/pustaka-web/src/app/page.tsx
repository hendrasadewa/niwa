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
  LogIn,
  Sparkles,
} from "lucide-react";
import type { Book, ReadingListItem } from "@/types/api";
import { PageHeader } from "@niwa/ui/components";
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
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  const { user, isAuthenticated, loginWithSso } = useAuth();

  const readingListQuery = useQuery({
    queryKey: ["reading-list"],
    queryFn: () =>
      apiClient.get<{ reading_list: ReadingListItem[] }>(
        "/api/v1/me/reading-list"
      ),
    enabled: isAuthenticated,
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
    () =>
      [...allBooks]
        .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
        .slice(0, 5),
    [allBooks]
  );

  const statusByBookId = React.useMemo(() => {
    const map = new Map<string, ReadingListItem["status"]>();
    for (const item of readingList) {
      map.set(item.book_id, item.status);
    }
    return map;
  }, [readingList]);

  const handleSignIn = () => {
    loginWithSso(
      typeof window !== "undefined" ? window.location.href : undefined
    );
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <PageHeader
          kicker="Pustaka / Library"
          title={
            isAuthenticated && user
              ? `Welcome back, ${user.username}`
              : "Welcome to Pustaka"
          }
          description={
            isAuthenticated
              ? "Track your active reading progress and discover books from the household shelves."
              : "Browse our household library collection. Sign in to save books to your reading list, track page progress, and leave reviews."
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {!isAuthenticated && (
                <Button variant="outline" onClick={handleSignIn}>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              )}
              <Button asChild>
                <Link href="/books">
                  <Library className="h-4 w-4" />
                  Browse Full Catalog
                </Link>
              </Button>
            </div>
          }
        />

        {isAuthenticated && (
          <>
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
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
                      Explore the household catalog and mark a book as
                      &ldquo;Reading&rdquo; to track your page progress here.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      asChild
                    >
                      <Link href="/books">Explore Catalog</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {currentlyReading.map((item) => (
                    <ReadingListBookRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>

            <div
              aria-label="Reading summary"
              className="grid grid-cols-4 divide-x divide-border rounded-[var(--radius-2xl)] border border-border bg-surface py-3 shadow-[var(--shadow-card)]"
            >
              {[
                {
                  label: "Currently Reading",
                  count: currentlyReading.length,
                  icon: BookOpen,
                  accent: true,
                },
                {
                  label: "Want to Read",
                  count: wantToRead.length,
                  icon: Bookmark,
                  accent: false,
                },
                {
                  label: "Completed",
                  count: completedBooks.length,
                  icon: CheckCircle2,
                  accent: false,
                },
                {
                  label: "Library Collection",
                  count: allBooks.length,
                  icon: Library,
                  accent: false,
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    title={stat.label}
                    aria-label={`${stat.label}: ${stat.count}`}
                    className="flex flex-col items-center justify-center gap-1 px-2 text-center"
                  >
                    <Icon
                      aria-hidden="true"
                      className={
                        stat.accent
                          ? "h-4 w-4 text-primary"
                          : "h-4 w-4 text-muted-foreground"
                      }
                    />
                    <span className="font-serif text-lg font-medium leading-none tabular-nums text-foreground sm:text-xl">
                      {stat.count}
                    </span>
                    <span className="sr-only sm:not-sr-only sm:text-[11px] sm:text-muted-foreground">
                      {stat.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {wantToRead.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
                      Want to Read ({wantToRead.length})
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Saved on your personal wishlist for next reading.
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {wantToRead.map((item) => (
                    <ReadingListBookRow key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-xl font-medium tracking-[-0.01em]">
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

        {!isAuthenticated && (
          <Card>
            <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Track your reading journey
                </h2>
                <p className="text-xs text-muted-foreground">
                  Sign in with your Niwa account to save books to Want to Read,
                  update your page progress, and share reviews.
                </p>
              </div>
              <Button onClick={handleSignIn} className="shrink-0">
                <LogIn className="h-4 w-4" />
                Sign in with Niwa
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
