"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react";
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
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navItems = React.useMemo(() => {
    const items = [
      {
        href: "/",
        label: "Dashboard",
        icon: LayoutDashboard,
        active: pathname === "/",
      },
      {
        href: "/books",
        label: "Catalog",
        icon: BookOpen,
        active: pathname === "/books" || pathname.startsWith("/books/"),
      },
      {
        href: "/profile",
        label: "Profile",
        icon: UserIcon,
        active: pathname === "/profile",
      },
    ];

    if (isAdmin) {
      items.push({
        href: "/admin",
        label: "Admin Console",
        icon: Shield,
        active: pathname.startsWith("/admin"),
      });
    }

    return items;
  }, [isAdmin, pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-xs">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Library className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold leading-none tracking-tight">
                Pustaka
              </span>
              <span className="text-[11px] text-muted-foreground">
                Household Library
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex md:items-center md:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    item.active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full pl-2.5 pr-3"
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
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t bg-background px-4 py-3 md:hidden">
          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    item.active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
