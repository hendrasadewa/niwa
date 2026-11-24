"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import type { ReadingListItem, ReadingProgress } from "@/types/api";
import { apiClient } from "@/lib/api";
import { BookCover } from "@/components/books/book-cover";
import { READING_STATUS_LABELS } from "@/components/books/book-card";
import {
  Badge,
  Progress,
  Card,
  CardContent,
} from "@niwa/ui/primitives";
export interface ReadingListBookRowProps {
  item: ReadingListItem;
}

export function ReadingListBookRow({ item }: ReadingListBookRowProps) {
  const { book } = item;

  const progressQuery = useQuery({
    queryKey: ["reading-progress", book.id],
    queryFn: () =>
      apiClient.get<{ progress: ReadingProgress }>(
        `/api/v1/me/progress/${book.id}`
      ),
  });

  const lastPageRead = progressQuery.data?.progress.last_page_read ?? 0;
  const totalPages = book.total_pages || 1;
  const percentage = Math.min(
    100,
    Math.round((lastPageRead / totalPages) * 100)
  );

  return (
    <Link href={`/books/${book.id}`} className="group block">
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="flex items-center gap-3.5 p-3.5">
          <BookCover
            bookId={book.id}
            title={book.title}
            coverImageKey={book.cover_image_key}
            className="h-20 w-14 shrink-0 rounded-[var(--radius-md)]"
            iconClassName="h-4 w-4"
          />

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-serif text-base font-medium leading-tight text-foreground group-hover:underline">
                {book.title}
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                {READING_STATUS_LABELS[item.status]}
              </Badge>
            </div>

            <p className="truncate text-xs text-muted-foreground">
              {book.author}
            </p>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Page {lastPageRead} of {book.total_pages}
                </span>
                <span className="font-semibold text-foreground">
                  {percentage}%
                </span>
              </div>
              <Progress value={percentage} className="h-1.5" />
            </div>
          </div>

          <ChevronRight
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </CardContent>
      </Card>
    </Link>
  );
}
