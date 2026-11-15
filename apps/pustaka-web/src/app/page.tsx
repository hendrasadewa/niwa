"use client";

import { BookOpen, Library, LogOut, ShieldCheck, UserCheck } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/providers/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function HomePage() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <AuthGuard>
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Library className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Pustaka Web App
              </h1>
              <p className="text-sm text-muted-foreground">
                Personal &amp; household mini-library and reading progress tracker
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                Welcome, {user?.username}
              </CardTitle>
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <Badge className="gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <UserCheck className="h-3.5 w-3.5" />
                    Member
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription>
              Phase 2 Authentication &amp; State is active. Your session is
              protected with JWT Bearer authentication and role-based route
              guards.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Project Execution Progress (Phase 2 / 5)</span>
                <span>40%</span>
              </div>
              <Progress value={40} />
            </div>

            <div className="grid gap-3 pt-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Signed-in Account
                </p>
                <p className="mt-1 font-medium">{user?.email}</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Assigned Roles &amp; Permissions
                </p>
                <p className="mt-1 font-mono text-xs">
                  {user?.roles.join(", ")} ({user?.permissions.length ?? 0}{" "}
                  permissions)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </AuthGuard>
  );
}
