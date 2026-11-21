import { useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router";
import { Alert, Badge, Button } from "@niwa/ui/components";
import { useAuth } from "../context/auth-context";
import { maskEmail } from "../lib/format";
import { FullPageLoader } from "./form-controls";

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
        <Button variant="secondary" onClick={() => navigate("/account")}>
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
    <div className="space-y-1">
      <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </p>
      <nav className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-100 border border-transparent"
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Mobile Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-400">
            N
          </div>
          <span className="text-sm font-semibold text-neutral-100">
            Niwa Account
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setMobileMenuOpen((v) => !v)}
        >
          {mobileMenuOpen ? "Close" : "Menu"}
        </Button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-neutral-800 bg-neutral-900/95 px-4 py-4 space-y-5 md:hidden">
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
          <div className="border-t border-neutral-800 pt-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-neutral-200">
                {user?.name}
              </p>
              <p className="truncate text-[11px] text-neutral-500">
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
        <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:justify-between md:border-r md:border-neutral-800/80 md:min-h-screen md:sticky md:top-0 md:h-screen md:px-4 md:py-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2.5 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-400">
                N
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight text-neutral-100">
                  Niwa Account
                </p>
                <p className="text-[11px] text-neutral-500">
                  Identity &amp; Access Portal
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <NavSection title="Account" items={ACCOUNT_NAV} />
              {isAdmin && <NavSection title="Admin ACL" items={ADMIN_NAV} />}
            </div>
          </div>

          <div className="space-y-3 border-t border-neutral-800/80 pt-4">
            <div className="px-2 space-y-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-xs font-medium text-neutral-200">
                  {user?.name}
                </p>
                {isAdmin && <Badge variant="info">Admin</Badge>}
              </div>
              <p className="truncate text-[11px] text-neutral-500">
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
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
