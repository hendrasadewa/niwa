"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Barcode,
  BookOpen,
  BookText,
  Globe,
  Library,
  Lock,
  MapPin,
  Star,
  User as UserIcon,
} from "lucide-react";
import type { Book, BookReview } from "@/types/api";
import { apiClient } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { BookCover } from "@/components/books/book-cover";
import { ReadingProgressCard } from "@/components/books/reading-progress-card";
import { BookReviewsSection } from "@/components/books/book-reviews-section";
import { Badge, Button, Skeleton } from "@niwa/ui/primitives";
export default function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const bookId = params.id;

  const bookQuery = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => apiClient.get<{ book: Book }>(`/api/v1/books/${bookId}`),
    enabled: Boolean(bookId),
  });

  const reviewsQuery = useQuery({
    queryKey: ["book-reviews", bookId],
    queryFn: () =>
      apiClient.get<{ reviews: BookReview[] }>(
        `/api/v1/books/${bookId}/reviews`
      ),
    enabled: Boolean(bookId) && Boolean(bookQuery.data?.book),
  });

  const book = bookQuery.data?.book;
  const reviews = React.useMemo(
    () => reviewsQuery.data?.reviews ?? [],
    [reviewsQuery.data?.reviews]
  );

  const averageRating = React.useMemo(() => {
    if (reviews.length === 0) return null;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/books">
              <ArrowLeft className="h-4 w-4" />
              Back to Catalog
            </Link>
          </Button>
          {book?.library && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/libraries/${book.library.slug || book.library.id}`}>
                <Library className="h-4 w-4" />
                {book.library.name}
              </Link>
            </Button>
          )}
        </div>

        {bookQuery.isLoading ? (
          <div className="grid gap-8 md:grid-cols-12">
            <div className="mx-auto w-full max-w-[240px] md:col-span-4 lg:col-span-3">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
            </div>
            <div className="space-y-4 md:col-span-8 lg:col-span-9">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-44 w-full rounded-xl" />
            </div>
          </div>
        ) : !book ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/60" />
            <h2 className="text-base font-semibold">Book Not Found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This book may have been removed or belongs to a private library
              you don&apos;t have access to.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/books">Return to Catalog</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-8 md:grid-cols-12">
              <div className="mx-auto w-full max-w-[240px] md:col-span-4 lg:col-span-3">
                <BookCover
                  bookId={book.id}
                  title={book.title}
                  coverImageKey={book.cover_image_key}
                  isPrivate={book.library?.visibility === "private"}
                  className="shadow-md"
                />
              </div>

              <div className="space-y-6 md:col-span-8 lg:col-span-9">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {book.library && (
                      <Link
                        href={`/libraries/${book.library.slug || book.library.id}`}
                      >
                        <Badge
                          variant="default"
                          className="gap-1 hover:opacity-90"
                        >
                          {book.library.visibility === "public" ? (
                            <Globe className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                          {book.library.name}
                        </Badge>
                      </Link>
                    )}

                    <Badge variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {book.bookshelf
                        ? `${book.bookshelf.name} — ${book.bookshelf.location}`
                        : "Unshelved"}
                    </Badge>

                    <Badge variant="outline" className="gap-1">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      {averageRating
                        ? `${averageRating} / 5 (${reviews.length} ${
                            reviews.length === 1 ? "review" : "reviews"
                          })`
                        : "No ratings yet"}
                    </Badge>
                  </div>

                  <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] text-foreground sm:text-4xl">
                    {book.title}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    by{" "}
                    <span className="font-medium text-foreground">
                      {book.author}
                    </span>
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2 text-sm text-muted-foreground">
                    {book.owner_name && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 shadow-[var(--shadow-card)]">
                        <UserIcon className="h-4 w-4 text-primary" />
                        Owned by{" "}
                        <strong className="text-foreground">
                          {book.owner_name}
                        </strong>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 shadow-[var(--shadow-card)]">
                      <BookText className="h-4 w-4 text-primary" />
                      <strong className="text-foreground">
                        {book.total_pages}
                      </strong>{" "}
                      pages
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 font-mono text-xs shadow-[var(--shadow-card)]">
                      <Barcode className="h-4 w-4 text-primary" />
                      ISBN: {book.isbn}
                    </span>
                  </div>
                </div>

                <ReadingProgressCard book={book} />
              </div>
            </div>

            <BookReviewsSection bookId={book.id} />
          </>
        )}
      </div>
    </AppShell>
  );
}
