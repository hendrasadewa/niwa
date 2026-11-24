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
import { Button, Card, CardContent } from "@niwa/ui/primitives";
import { cn } from "@/lib/utils";

type DashboardTab = "reading" | "want_to_read" | "completed" | "recent";

const TOP_ITEMS_LIMIT = 10;

export default function DashboardPage() {
  const { isAuthenticated, loginWithSso } = useAuth();
  const [activeTab, setActiveTab] = React.useState<DashboardTab>("reading");

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

  const readingList = React.useMemo(
    () => readingListQuery.data?.reading_list ?? [],
    [readingListQuery.data?.reading_list]
  );

  const allBooks = React.useMemo(
    () => booksQuery.data?.books ?? [],
    [booksQuery.data?.books]
  );

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
        .slice(0, TOP_ITEMS_LIMIT),
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

  const tabs: {
    id: DashboardTab;
    label: string;
    fullLabel: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "reading",
      label: "Reading",
      fullLabel: "Currently Reading",
      count: currentlyReading.length,
      icon: BookOpen,
    },
    {
      id: "want_to_read",
      label: "Wishlist",
      fullLabel: "Want to Read",
      count: wantToRead.length,
      icon: Bookmark,
    },
    {
      id: "completed",
      label: "Done",
      fullLabel: "Completed",
      count: completedBooks.length,
      icon: CheckCircle2,
    },
    {
      id: "recent",
      label: "Recent",
      fullLabel: "Library Collection",
      count: allBooks.length,
      icon: Library,
    },
  ];

  const activeReadingItems =
    activeTab === "reading"
      ? currentlyReading.slice(0, TOP_ITEMS_LIMIT)
      : activeTab === "want_to_read"
        ? wantToRead.slice(0, TOP_ITEMS_LIMIT)
        : activeTab === "completed"
          ? completedBooks.slice(0, TOP_ITEMS_LIMIT)
          : [];

  const activeReadingTotal =
    activeTab === "reading"
      ? currentlyReading.length
      : activeTab === "want_to_read"
        ? wantToRead.length
        : activeTab === "completed"
          ? completedBooks.length
          : 0;

  return (
    <AppShell>
      {isAuthenticated ? (
        <div className="space-y-5">
          {/* Summary Tabs */}
          <div
            role="tablist"
            aria-label="Library views"
            className="grid grid-cols-4 gap-1 rounded-[var(--radius-2xl)] border border-border bg-surface p-1.5 shadow-[var(--shadow-card)]"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  title={`${tab.fullLabel} (${tab.count})`}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-xl)] px-1 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-ring cursor-pointer select-none",
                    isActive
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-surface-subtle/70 hover:text-foreground"
                  )}
                >
                  <span className="flex items-center justify-center gap-1">
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "font-serif text-base font-medium leading-none tabular-nums sm:text-lg",
                        isActive ? "text-primary" : "text-foreground"
                      )}
                    >
                      {tab.count}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-[11px] leading-[1.35] sm:text-xs",
                      isActive ? "font-semibold" : "font-medium"
                    )}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel */}
          <section
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="space-y-3"
          >
            {activeTab === "recent" ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h1 className="font-serif text-xl font-medium tracking-[-0.01em] text-foreground">
                    Recent
                  </h1>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/books">
                      View all
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                {booksQuery.isLoading ? (
                  <BookGridSkeleton count={6} />
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
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h1 className="font-serif text-xl font-medium tracking-[-0.01em] text-foreground">
                    {activeTab === "reading"
                      ? "Reading"
                      : activeTab === "want_to_read"
                        ? "Wishlist"
                        : "Completed"}
                  </h1>
                  {activeReadingTotal > TOP_ITEMS_LIMIT && (
                    <span className="text-xs text-muted-foreground">
                      Top {TOP_ITEMS_LIMIT} of {activeReadingTotal}
                    </span>
                  )}
                </div>

                {readingListQuery.isLoading ? (
                  <BookRowSkeleton count={3} />
                ) : activeReadingItems.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                      {activeTab === "reading" ? (
                        <BookOpen className="mb-3 h-8 w-8 text-muted-foreground/60" />
                      ) : activeTab === "want_to_read" ? (
                        <Bookmark className="mb-3 h-8 w-8 text-muted-foreground/60" />
                      ) : (
                        <CheckCircle2 className="mb-3 h-8 w-8 text-muted-foreground/60" />
                      )}
                      <p className="text-sm font-medium text-foreground">
                        {activeTab === "reading"
                          ? "Nothing in progress right now"
                          : activeTab === "want_to_read"
                            ? "Your wishlist is empty"
                            : "No completed books yet"}
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
                    {activeReadingItems.map((item) => (
                      <ReadingListBookRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-8">
          <PageHeader
            kicker="Pustaka / Library"
            title="Welcome to Pustaka"
            description="Browse our household library collection. Sign in to save books to your reading list, track page progress, and leave reviews."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={handleSignIn}>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
                <Button asChild>
                  <Link href="/books">
                    <Library className="h-4 w-4" />
                    Browse Catalog
                  </Link>
                </Button>
              </div>
            }
          />

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-xl font-medium tracking-[-0.01em] text-foreground">
                Recent
              </h2>
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
                {recentAdditions.slice(0, 5).map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            )}
          </section>

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
        </div>
      )}
    </AppShell>
  );
}
