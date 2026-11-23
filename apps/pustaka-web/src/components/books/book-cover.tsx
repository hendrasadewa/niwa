"use client";

import * as React from "react";
import { BookOpen } from "lucide-react";
import { getBookCoverUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface BookCoverProps {
  bookId: string;
  title: string;
  coverImageKey?: string | null;
  className?: string;
  iconClassName?: string;
}

export function BookCover({
  bookId,
  title,
  coverImageKey,
  className,
  iconClassName,
}: BookCoverProps) {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [bookId, coverImageKey]);

  const showImage = Boolean(coverImageKey) && !hasError;

  return (
    <div
      className={cn(
        "relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-muted text-muted-foreground shadow-[var(--shadow-card)]",
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getBookCoverUrl(bookId, coverImageKey)}
          alt={`Cover of ${title}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
          <BookOpen
            className={cn("h-10 w-10 text-muted-foreground/60", iconClassName)}
          />
          <span className="line-clamp-2 text-xs font-medium text-muted-foreground/80">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
