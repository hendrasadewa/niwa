"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { FullPageLoader } from "@niwa/ui/components";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";

export interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  React.useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const target =
        pathname && pathname !== "/"
          ? `/login?redirect=${encodeURIComponent(pathname)}`
          : "/login";
      router.replace(target);
      return;
    }

    if (requireAdmin && !isAdmin) {
      toast({
        variant: "destructive",
        title: "Access denied",
        description: "Administrator privileges are required to view that page.",
      });
      router.replace("/");
    }
  }, [isAdmin, isAuthenticated, isLoading, pathname, requireAdmin, router, toast]);

  if (isLoading) {
    return <FullPageLoader label="Verifying session..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: { requireAdmin?: boolean }
) {
  const WrappedComponent = (props: P) => (
    <AuthGuard requireAdmin={options?.requireAdmin}>
      <Component {...props} />
    </AuthGuard>
  );

  WrappedComponent.displayName = `withAuth(${
    Component.displayName || Component.name || "Component"
  })`;

  return WrappedComponent;
}
