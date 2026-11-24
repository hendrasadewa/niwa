"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookCopy, Library as LibraryIcon } from "lucide-react";
import type { Library } from "@/types/api";
import { apiClient } from "@/lib/api";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@niwa/ui/primitives";
export default function AdminBooksRedirectPage() {
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
            <BookCopy className="h-5 w-5" />
            Manage Books Inside Your Libraries
          </CardTitle>
          <CardDescription>
            Books are now scoped to individual libraries and managed by each
            library&apos;s owner. Choose one of your libraries below to add,
            edit, move, or upload covers for books.
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
                    {lib.book_count} books · {lib.bookshelf_count} bookshelves
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
