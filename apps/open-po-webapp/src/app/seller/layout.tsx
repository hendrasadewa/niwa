"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  ExternalLink,
  KanbanSquare,
  LayoutDashboard,
  Loader2,
  Package,
  Plus,
  Settings,
  Store as StoreIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

const SELLER_LINKS = [
  { href: "/seller", label: "Overview", icon: LayoutDashboard, exact: true },
  {
    href: "/seller/store",
    label: "Store & Payment",
    icon: Settings,
    exact: false,
  },
  {
    href: "/seller/products",
    label: "Master Catalog",
    icon: Package,
    exact: false,
  },
  {
    href: "/seller/waves",
    label: "Pre-Order Waves",
    icon: CalendarClock,
    exact: false,
  },
  {
    href: "/seller/orders",
    label: "Order Kanban",
    icon: KanbanSquare,
    exact: false,
  },
];

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const {
    isAuthenticated,
    isLoading,
    loginWithSso,
    ownedStores,
    activeStore,
    setActiveStoreId,
  } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-md items-center justify-center px-4 py-12">
        <Card className="w-full text-center">
          <CardHeader>
            <CardTitle className="text-xl">Seller Console Sign In</CardTitle>
            <CardDescription>
              Sign in with your Niwa account to manage your UMKM storefront,
              waves, and orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={() =>
                loginWithSso(
                  typeof window !== "undefined" ? window.location.href : undefined
                )
              }
            >
              Sign In
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Back to Storefronts</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-primary-soft text-primary-soft-foreground shadow-[var(--shadow-card)]">
            <StoreIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Open-PO / Seller
            </p>
            <h1 className="font-serif text-2xl font-medium tracking-[-0.015em] text-foreground">
              UMKM Seller Console
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage your store profile, master catalog, pre-order waves, and
              Kanban fulfillment.
            </p>
          </div>
        </div>

        {ownedStores.length > 0 && activeStore && (
          <div className="flex flex-wrap items-center gap-2">
            {ownedStores.length > 1 ? (
              <Select
                value={activeStore.id}
                onValueChange={(val) => setActiveStoreId(val)}
              >
                <SelectTrigger className="w-[210px] h-9 text-xs">
                  <SelectValue placeholder="Select active store" />
                </SelectTrigger>
                <SelectContent>
                  {ownedStores.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name} (/{s.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-full border border-border bg-surface-subtle/80 px-3.5 py-1.5 text-xs font-medium text-foreground">
                {activeStore.name}{" "}
                <span className="text-muted-foreground">
                  (/{activeStore.slug})
                </span>
              </div>
            )}

            <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
              <Link href={`/stores/${activeStore.slug}`} target="_blank">
                View Storefront
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>

            <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
              <Link href="/seller?newStore=1">
                <Plus className="h-3.5 w-3.5" />
                New Store
              </Link>
            </Button>
          </div>
        )}
      </div>

      {ownedStores.length > 0 && (
        <nav
          aria-label="Seller navigation"
          className="flex min-w-0 items-center gap-1.5 overflow-x-auto border-b border-border pb-3"
        >
          {SELLER_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact
              ? pathname === link.href
              : pathname === link.href ||
                pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                    : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="min-w-0">{children}</div>
    </div>
  );
}
