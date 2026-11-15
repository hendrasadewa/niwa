"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Verifying session...</p>
      </div>
    );
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
