"use client";

import Link from "next/link";
import { PenLine, Rss } from "lucide-react";
import { ColorSchemeToggle } from "@niwa/ui/components";
import { useAuth } from "@/providers/auth-provider";

interface SiteHeaderProps {
  siteName?: string;
}

export function SiteHeader({ siteName = "Hendra Sadewa" }: SiteHeaderProps) {
  const { isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-serif text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          {siteName}
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/feed.xml"
            title="RSS Feed"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Rss className="h-4 w-4" />
            <span className="hidden sm:inline">RSS</span>
          </Link>

          {isAdmin && (
            <Link
              href="/studio"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <PenLine className="h-3.5 w-3.5" />
              <span>Studio</span>
            </Link>
          )}

          <ColorSchemeToggle />
        </nav>
      </div>
    </header>
  );
}
