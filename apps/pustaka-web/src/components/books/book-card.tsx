"use client";

import Link from "next/link";
import { BookText, MapPin } from "lucide-react";
import type { Book, ReadingStatus } from "@/types/api";
import { BookCover } from "@/components/books/book-cover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: "Want to Read",
  reading: "Reading",
  completed: "Completed",
  on_hold: "On Hold",
  dropped: "Dropped",
};

export interface BookCardProps {
  book: Book;
  readingStatus?: ReadingStatus;
  viewMode?: "grid" | "list";
}

export function BookCard({
  book,
  readingStatus,
  viewMode = "grid",
}: BookCardProps) {
  if (viewMode === "list") {
    return (
      <Link href={`/books/${book.id}`} className="group block">
        <Card className="overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
            <BookCover
              bookId={book.id}
              title={book.title}
              coverImageKey={book.cover_image_key}
              className="h-24 w-16 shrink-0 rounded-md"
              iconClassName="h-5 w-5"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-serif text-base font-medium leading-tight text-foreground group-hover:underline">
                  {book.title}
                </h3>
                {readingStatus && (
                  <Badge variant="secondary" className="text-[11px]">
                    {READING_STATUS_LABELS[readingStatus]}
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {book.author}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <BookText className="h-3.5 w-3.5" />
                  {book.total_pages} pages
                </span>
                <span className="font-mono">ISBN: {book.isbn}</span>
                {book.bookshelf?.name && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {book.bookshelf.name} ({book.bookshelf.location})
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/books/${book.id}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
        <div className="relative p-3 pb-0">
          <BookCover
            bookId={book.id}
            title={book.title}
            coverImageKey={book.cover_image_key}
          />
          {readingStatus && (
            <Badge className="absolute right-5 top-5 shadow-sm">
              {READING_STATUS_LABELS[readingStatus]}
            </Badge>
          )}
        </div>
        <CardContent className="flex flex-1 flex-col justify-between space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="line-clamp-2 font-serif text-base font-medium leading-snug text-foreground group-hover:underline">
              {book.title}
            </h3>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {book.author}
            </p>
          </div>

          <div className="space-y-1.5 border-t pt-2.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1">
                <BookText className="h-3.5 w-3.5" />
                {book.total_pages}p
              </span>
              <span className="truncate font-mono text-[11px]">
                {book.isbn}
              </span>
            </div>
            {book.bookshelf?.name && (
              <div className="flex items-center gap-1 truncate text-[11px]">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{book.bookshelf.name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
