"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  PackageSearch,
  Receipt,
  ShoppingBag,
  Store,
  User as UserIcon,
} from "lucide-react";
import {
  BottomNav,
  BottomNavItem,
  BottomNavItemContent,
  bottomNavItemClasses,
} from "@niwa/ui/components";
import {
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@niwa/ui/primitives";
import { useAuth } from "@/providers/auth-provider";
import { useCart } from "@/providers/cart-provider";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, ownedStores, logout } = useAuth();
  const { totalItems, setIsDrawerOpen } = useCart();

  const navItems = [
    {
      href: "/",
      label: "Explore Pre-Orders",
      mobileLabel: "Explore",
      icon: Store,
    },
    {
      href: "/track",
      label: "Track Order",
      mobileLabel: "Track",
      icon: PackageSearch,
    },
    ...(isAuthenticated
      ? [
          {
            href: "/orders",
            label: "My Orders",
            mobileLabel: "Orders",
            icon: Receipt,
          },
          {
            href: "/seller",
            label:
              ownedStores.length > 0 ? "Seller Console" : "Open My Store",
            mobileLabel: ownedStores.length > 0 ? "Seller" : "Store",
            icon: LayoutDashboard,
          },
        ]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/90 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-border bg-primary-soft text-primary-soft-foreground shadow-[var(--shadow-card)]">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg font-medium leading-none tracking-[-0.01em] text-foreground">
                  Open-PO
                </span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  UMKM Pre-Order Hub
                </span>
              </div>
            </Link>

            <nav
              aria-label="Primary"
              className="hidden md:flex items-center gap-1"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                        : "text-muted-foreground hover:bg-surface-subtle/80 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDrawerOpen(true)}
              className="relative gap-2"
              aria-label={
                totalItems > 0 ? `Open cart (${totalItems} items)` : "Open cart"
              }
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cart</span>
              {totalItems > 0 && (
                <Badge className="h-5 min-w-5 px-1.5 flex items-center justify-center text-[11px]">
                  {totalItems}
                </Badge>
              )}
            </Button>

            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full pl-2 pr-2.5 sm:pr-3 font-medium"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {user.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="max-w-[120px] truncate hidden sm:inline text-xs">
                      {user.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <UserIcon className="h-4 w-4" />
                      My Profile &amp; Address
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="cursor-pointer">
                      <Receipt className="h-4 w-4" />
                      Order History
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/seller" className="cursor-pointer">
                      <LayoutDashboard className="h-4 w-4" />
                      {ownedStores.length > 0
                        ? "Seller Console"
                        : "Create My Store"}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" className="hidden sm:inline-flex" asChild>
                  <Link href="/register">Register</Link>
                </Button>
                <Button size="sm" className="sm:hidden gap-1.5" asChild>
                  <Link href="/login">
                    <LogIn className="h-3.5 w-3.5" />
                    Sign In
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <BottomNav label="Open-PO mobile navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={bottomNavItemClasses(isActive)}
            >
              <BottomNavItemContent
                icon={<Icon className="h-5 w-5" />}
                label={item.mobileLabel}
                active={isActive}
              />
            </Link>
          );
        })}
        {!isAuthenticated && (
          <BottomNavItem
            icon={<ShoppingBag className="h-5 w-5" />}
            label="Cart"
            badge={totalItems > 0 ? totalItems : undefined}
            onClick={() => setIsDrawerOpen(true)}
          />
        )}
      </BottomNav>

      <CartDrawer />
    </>
  );
}
