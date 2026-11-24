"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  Library,
  LogIn,
  LogOut,
  Shield,
  User as UserIcon,
} from "lucide-react";
import {
  BottomNav,
  BottomNavItem,
  BottomNavItemContent,
  bottomNavItemClasses,
} from "@niwa/ui/components";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, isLoading, loginWithSso, logout } =
    useAuth();

  const navItems = React.useMemo(() => {
    const items = [
      {
        href: "/",
        label: isAuthenticated ? "Dashboard" : "Home",
        mobileLabel: "Home",
        icon: LayoutDashboard,
        active: pathname === "/",
      },
      {
        href: "/libraries",
        label: "Libraries",
        mobileLabel: "Libraries",
        icon: Library,
        active:
          pathname === "/libraries" || pathname.startsWith("/libraries/"),
      },
      {
        href: "/books",
        label: "Catalog",
        mobileLabel: "Catalog",
        icon: BookOpen,
        active: pathname === "/books" || pathname.startsWith("/books/"),
      },
    ];

    if (isAuthenticated) {
      items.push({
        href: "/profile",
        label: "Profile",
        mobileLabel: "Profile",
        icon: UserIcon,
        active: pathname === "/profile",
      });
    }

    if (isAdmin) {
      items.push({
        href: "/admin",
        label: "Admin",
        mobileLabel: "Admin",
        icon: Shield,
        active: pathname.startsWith("/admin"),
      });
    }

    return items;
  }, [isAuthenticated, isAdmin, pathname]);

  const handleSignIn = () => {
    loginWithSso(
      typeof window !== "undefined" ? window.location.href : undefined
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/90 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-border bg-primary-soft text-primary-soft-foreground shadow-[var(--shadow-card)]">
                <Library className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg font-medium leading-none tracking-[-0.01em] text-foreground">
                  Pustaka
                </span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Personal &amp; Shared Libraries
                </span>
              </div>
            </Link>

            <nav
              aria-label="Primary"
              className="hidden md:flex md:items-center md:gap-1"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                      item.active
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
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full pl-2 pr-2.5 sm:pl-2.5 sm:pr-3"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {user.username.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="hidden max-w-[120px] truncate text-xs font-medium sm:inline">
                      {user.username}
                    </span>
                    {isAdmin && (
                      <Badge
                        variant="secondary"
                        className="hidden h-5 px-1.5 text-[10px] sm:inline-flex"
                      >
                        Admin
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.username}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/" className="w-full cursor-pointer">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/libraries" className="w-full cursor-pointer">
                      <Library className="h-4 w-4" />
                      Libraries
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/books" className="w-full cursor-pointer">
                      <BookOpen className="h-4 w-4" />
                      Book Catalog
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="w-full cursor-pointer">
                      <UserIcon className="h-4 w-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="w-full cursor-pointer">
                          <Shield className="h-4 w-4" />
                          Admin Console
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
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
            ) : !isLoading ? (
              <Button size="sm" onClick={handleSignIn}>
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <BottomNav label="Pustaka mobile navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={bottomNavItemClasses(item.active)}
            >
              <BottomNavItemContent
                icon={<Icon className="h-5 w-5" />}
                label={item.mobileLabel}
                active={item.active}
              />
            </Link>
          );
        })}
        {!isAuthenticated && !isLoading && (
          <BottomNavItem
            icon={<LogIn className="h-5 w-5" />}
            label="Sign In"
            onClick={handleSignIn}
          />
        )}
      </BottomNav>
    </>
  );
}
