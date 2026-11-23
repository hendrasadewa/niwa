"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, LogIn } from "lucide-react";
import { Spinner } from "@niwa/ui/components";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { isAuthenticated, isAdmin, isLoading, loginWithSso } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    if (requireAdmin && !isAdmin) {
      toast({
        variant: "destructive",
        title: "Access denied",
        description: "Administrator privileges are required to view that page.",
      });
      router.replace("/");
    }
  }, [isAdmin, isAuthenticated, isLoading, requireAdmin, router, toast]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 text-muted-foreground"
      >
        <Spinner size="md" />
        <p className="text-xs font-medium">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center py-8">
        <Card className="w-full text-center">
          <CardHeader className="items-center">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-primary-soft text-primary-soft-foreground">
              <Lock className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl">Sign in required</CardTitle>
            <CardDescription>
              {requireAdmin
                ? "Sign in with an administrator Niwa account to access the Admin Console."
                : "Sign in with your Niwa account to view your profile and personal reading settings."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Button
              onClick={() =>
                loginWithSso(
                  typeof window !== "undefined" ? window.location.href : undefined
                )
              }
            >
              <LogIn className="h-4 w-4" />
              Sign in with Niwa
            </Button>
            <Button variant="outline" asChild>
              <Link href="/books">Browse Catalog</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
