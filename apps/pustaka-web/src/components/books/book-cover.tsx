"use client";

import * as React from "react";
import { BookOpen } from "lucide-react";
import { getAuthToken, getBookCoverUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface BookCoverProps {
  bookId: string;
  title: string;
  coverImageKey?: string | null;
  isPrivate?: boolean;
  className?: string;
  iconClassName?: string;
}

export function BookCover({
  bookId,
  title,
  coverImageKey,
  isPrivate = false,
  className,
  iconClassName,
}: BookCoverProps) {
  const coverKey = `${bookId}:${coverImageKey ?? ""}:${isPrivate}`;
  const [failedKey, setFailedKey] = React.useState<string | null>(null);
  const [authRetryKey, setAuthRetryKey] = React.useState<string | null>(null);
  const [blobState, setBlobState] = React.useState<{
    key: string;
    url: string;
  } | null>(null);

  const shouldUseAuthFetch = isPrivate || authRetryKey === coverKey;

  React.useEffect(() => {
    if (!coverImageKey || !shouldUseAuthFetch) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    fetch(getBookCoverUrl(bookId, coverImageKey), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Cover fetch failed");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobState({ key: coverKey, url: createdUrl });
      })
      .catch(() => {
        if (!cancelled) {
          setFailedKey(coverKey);
        }
      });

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [bookId, coverImageKey, coverKey, shouldUseAuthFetch]);

  const activeBlobUrl =
    blobState && blobState.key === coverKey ? blobState.url : null;

  const imgSrc = shouldUseAuthFetch
    ? activeBlobUrl
    : coverImageKey
      ? getBookCoverUrl(bookId, coverImageKey)
      : null;

  const showImage =
    Boolean(coverImageKey) && Boolean(imgSrc) && failedKey !== coverKey;

  return (
    <div
      className={cn(
        "relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-muted text-muted-foreground shadow-[var(--shadow-card)]",
        className
      )}
    >
      {showImage && imgSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgSrc}
          alt={`Cover of ${title}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => {
            if (!shouldUseAuthFetch && getAuthToken()) {
              setAuthRetryKey(coverKey);
            } else {
              setFailedKey(coverKey);
            }
          }}
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
