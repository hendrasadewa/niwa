"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  FileText,
  LogOut,
  RefreshCw,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { ColorSchemeToggle, FullPageLoader } from "@niwa/ui/components";
import { toast } from "@niwa/ui/hooks";
import { Button } from "@niwa/ui/primitives";
import { apiClient, formatApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isAdmin, isLoading, loginWithSso, logout } =
    useAuth();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || "/studio")}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  const refreshCacheMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ publicationUri: string | null; postCount: number }>(
        "/api/v1/studio/cache/refresh",
        {}
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["studio"] });
      toast({
        title: "PDS cache refreshed",
        description: `Synced ${data.postCount} published post(s) from ATProto.`,
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Cache refresh failed",
        description: formatApiErrorMessage(err),
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return <FullPageLoader label="Checking Niwa Studio session..." />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 font-serif text-2xl font-semibold text-foreground">
            Studio Access Restricted
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user?.email}</span>,
            which does not have the <code className="rounded bg-muted px-1 py-0.5">admin</code>{" "}
            role for <code className="rounded bg-muted px-1 py-0.5">blog</code>.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/">Back to Blog</Link>
            </Button>
            <Button variant="secondary" onClick={() => loginWithSso("/studio")}>
              Switch Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/studio"
              className="font-serif text-base font-semibold text-foreground"
            >
              Blog Studio
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/studio"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  pathname === "/studio"
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Posts</span>
              </Link>
              <Link
                href="/studio/settings"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  pathname === "/studio/settings"
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Publication</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refreshCacheMutation.mutate()}
              disabled={refreshCacheMutation.isPending}
              title="Sync published records from ATProto PDS"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  refreshCacheMutation.isPending ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">Sync PDS</span>
            </Button>

            <Button size="sm" variant="ghost" asChild>
              <Link href="/" target="_blank">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">View Blog</span>
              </Link>
            </Button>

            <ColorSchemeToggle />

            <Button
              size="sm"
              variant="ghost"
              onClick={logout}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
