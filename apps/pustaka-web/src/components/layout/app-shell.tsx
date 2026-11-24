"use client";

import * as React from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Navbar } from "@/components/layout/navbar";

export interface AppShellProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function AppShell({
  children,
  requireAuth = false,
  requireAdmin = false,
}: AppShellProps) {
  const shouldGuard = requireAuth || requireAdmin;

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <Navbar />
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {shouldGuard ? (
          <AuthGuard requireAdmin={requireAdmin}>{children}</AuthGuard>
        ) : (
          children
        )}
      </main>
      <footer className="border-t border-border py-6 pb-24 text-center text-xs text-muted-foreground md:pb-6">
        Pustaka — Household Mini-Library &amp; Reading Tracker
      </footer>
    </div>
  );
}
