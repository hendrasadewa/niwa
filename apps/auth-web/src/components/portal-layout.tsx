import { useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router";
import { Alert, Badge, Button, FullPageLoader } from "@niwa/ui/components";
import { useAuth } from "../context/auth-context";
import { maskEmail } from "../lib/format";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const ACCOUNT_NAV: NavItem[] = [
  { to: "/account", label: "Profile & Security", end: true },
  { to: "/account/sessions", label: "Active Sessions" },
  { to: "/account/apps", label: "Connected Apps" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin/apps", label: "Apps Registry" },
  { to: "/admin/roles", label: "Roles & Permissions" },
  { to: "/admin/users", label: "Users Directory" },
];

export function RequireAuth() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader label="Checking session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <PortalLayout />;
}

export function RequireAdmin() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <Alert variant="error">
          Administrator privileges are required to access the ACL dashboard.
        </Alert>
        <Button variant="secondary" size="md" onClick={() => navigate("/account")}>
          Back to Account
        </Button>
      </div>
    );
  }

  return <Outlet />;
}

function NavSection({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      <nav aria-label={title} className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `block rounded-full px-3.5 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                  : "text-muted-foreground hover:bg-surface-subtle/80 hover:text-foreground"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function PortalLayout() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border bg-primary-soft font-serif text-sm font-semibold text-primary-soft-foreground">
            N
          </div>
          <span className="font-serif text-base font-medium text-foreground">
            Niwa Account
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-portal-menu"
          onClick={() => setMobileMenuOpen((v) => !v)}
        >
          {mobileMenuOpen ? "Close" : "Menu"}
        </Button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-portal-menu"
          className="border-b border-border bg-surface px-4 py-4 space-y-5 shadow-[var(--shadow-card)] md:hidden"
        >
          <NavSection
            title="Account"
            items={ACCOUNT_NAV}
            onNavigate={() => setMobileMenuOpen(false)}
          />
          {isAdmin && (
            <NavSection
              title="Admin ACL"
              items={ADMIN_NAV}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          )}
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                {user?.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {maskEmail(user?.email)}
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              disabled={signingOut}
              onClick={handleSignOut}
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-6xl">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:justify-between md:border-r md:border-border md:bg-surface/60 md:min-h-screen md:sticky md:top-0 md:h-screen md:px-4 md:py-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-primary-soft font-serif text-base font-semibold text-primary-soft-foreground shadow-[var(--shadow-card)]">
                N
              </div>
              <div>
                <p className="font-serif text-base font-medium leading-tight text-foreground">
                  Niwa Account
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Identity &amp; Access Portal
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <NavSection title="Account" items={ACCOUNT_NAV} />
              {isAdmin && <NavSection title="Admin ACL" items={ADMIN_NAV} />}
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="space-y-1 px-2">
              <div className="flex items-center gap-2">
                <p className="truncate text-xs font-semibold text-foreground">
                  {user?.name}
                </p>
                {isAdmin && <Badge variant="primary">Admin</Badge>}
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {maskEmail(user?.email)}
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              disabled={signingOut}
              onClick={handleSignOut}
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
