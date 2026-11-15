"use client";

import * as React from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Navbar } from "@/components/layout/navbar";

export interface AppShellProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AppShell({ children, requireAdmin = false }: AppShellProps) {
  return (
    <AuthGuard requireAdmin={requireAdmin}>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t py-6 text-center text-xs text-muted-foreground">
          Pustaka — Household Mini-Library &amp; Reading Tracker
        </footer>
      </div>
    </AuthGuard>
  );
}
