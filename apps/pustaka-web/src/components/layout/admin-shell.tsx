"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BookCopy,
  LayoutDashboard,
  LibraryBig,
  Shield,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";

const ADMIN_NAV_ITEMS = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/books",
    label: "Books Inventory",
    icon: BookCopy,
    exact: false,
  },
  {
    href: "/admin/bookshelves",
    label: "Bookshelves",
    icon: LibraryBig,
    exact: false,
  },
  {
    href: "/admin/users",
    label: "Users & Roles",
    icon: Users,
    exact: false,
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AppShell requireAdmin>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">
                  Admin Console
                </h1>
                <Badge variant="secondary" className="text-[11px]">
                  RBAC: Admin
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Manage library inventory, physical bookshelves, R2 book covers,
                and household member roles.
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Member View
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-2 lg:flex-col">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <section className="min-w-0 lg:col-span-9">{children}</section>
        </div>
      </div>
    </AppShell>
  );
}
