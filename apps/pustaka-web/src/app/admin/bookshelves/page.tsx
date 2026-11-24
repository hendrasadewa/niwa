"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Library as LibraryIcon, LibraryBig } from "lucide-react";
import type { Library } from "@/types/api";
import { apiClient } from "@/lib/api";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminBookshelvesRedirectPage() {
  const librariesQuery = useQuery({
    queryKey: ["libraries", { scope: "mine" }],
    queryFn: () =>
      apiClient.get<{ libraries: Library[] }>("/api/v1/libraries", {
        params: { scope: "mine" },
      }),
  });

  const ownedLibraries = (librariesQuery.data?.libraries ?? []).filter(
    (lib) => lib.role === "owner"
  );

  return (
    <AdminShell>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LibraryBig className="h-5 w-5" />
            Manage Bookshelves Inside Your Libraries
          </CardTitle>
          <CardDescription>
            Bookshelves now belong to individual libraries and are managed by
            each library&apos;s owner. Open one of your libraries below to
            manage its shelves.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ownedLibraries.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <LibraryIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                You don&apos;t own any libraries yet.
              </p>
              <Button size="sm" className="mt-4" asChild>
                <Link href="/libraries">Go to Libraries</Link>
              </Button>
            </div>
          ) : (
            ownedLibraries.map((lib) => (
              <Link
                key={lib.id}
                href={`/libraries/${lib.slug || lib.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-border p-3.5 transition-colors hover:border-primary/40"
              >
                <div>
                  <p className="font-serif text-base font-medium text-foreground">
                    {lib.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lib.bookshelf_count} bookshelves · {lib.book_count} books
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Open Workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
