"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@niwa/pustaka-validators";
import {
  BookCheck,
  BookOpen,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import type { ChangePasswordResponse, ReadingListItem } from "@/types/api";
import {
  ApiError,
  apiClient,
  setAuthToken,
  setRefreshToken,
} from "@/lib/api";
import { ColorSchemeToggle, PageHeader } from "@niwa/ui/components";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { AppShell } from "@/components/layout/app-shell";
import { BookCard } from "@/components/books/book-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      revoke_other_sessions: true,
    },
  });

  async function onChangePassword(values: ChangePasswordInput) {
    setIsChangingPassword(true);
    try {
      const res = await apiClient.put<ChangePasswordResponse>(
        "/api/v1/auth/password",
        values,
        { skipAuthRedirect: true }
      );
      if (res.token) {
        setAuthToken(res.token);
      }
      if (res.refresh_token) {
        setRefreshToken(res.refresh_token);
      }
      passwordForm.reset({
        current_password: "",
        new_password: "",
        revoke_other_sessions: true,
      });
      toast({
        title: "Password updated",
        description:
          "Your Niwa account password has been updated across all apps.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Password change failed",
        description:
          err instanceof ApiError
            ? err.message
            : "Could not update your password.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  const readingListQuery = useQuery({
    queryKey: ["reading-list"],
    queryFn: () =>
      apiClient.get<{ reading_list: ReadingListItem[] }>(
        "/api/v1/me/reading-list"
      ),
  });

  const readingList = readingListQuery.data?.reading_list ?? [];
  const completedItems = readingList.filter(
    (item) => item.status === "completed"
  );
  const readingItems = readingList.filter((item) => item.status === "reading");
  const wantToReadItems = readingList.filter(
    (item) => item.status === "want_to_read"
  );

  return (
    <AppShell>
      <div className="space-y-8">
        <PageHeader
          kicker="Pustaka / Member"
          title="My Profile"
          description="Your household member account, appearance preference, assigned roles, and reading summary."
        />

        <div className="grid gap-6 md:grid-cols-12">
          <Card className="md:col-span-5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {user?.username.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-lg">{user?.username}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {user?.email}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Assigned Roles
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {user?.roles.map((role) => (
                    <Badge
                      key={role}
                      variant={role === "admin" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <KeyRound className="h-3.5 w-3.5" />
                  Permissions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {user?.permissions.map((perm) => (
                    <Badge
                      key={perm}
                      variant="outline"
                      className="font-mono text-[11px]"
                    >
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>

              {isAdmin && (
                <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  You have Administrator access. Visit the{" "}
                  <Link
                    href="/admin"
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    Admin Console
                  </Link>{" "}
                  to manage bookshelves, inventory, and household member roles.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6 md:col-span-7">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserIcon className="h-5 w-5" />
                  Reading Milestones
                </CardTitle>
                <CardDescription>
                  Summary of books on your personal reading list.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div className="rounded-[var(--radius-xl)] border border-border bg-surface-muted/60 p-4 text-center">
                  <BookCheck className="mx-auto mb-1.5 h-5 w-5 text-success" />
                  <p className="font-serif text-2xl font-medium text-foreground">{completedItems.length}</p>
                  <p className="text-xs text-muted-foreground">Books Read</p>
                </div>
                <div className="rounded-[var(--radius-xl)] border border-border bg-surface-muted/60 p-4 text-center">
                  <BookOpen className="mx-auto mb-1.5 h-5 w-5 text-primary" />
                  <p className="font-serif text-2xl font-medium text-foreground">{readingItems.length}</p>
                  <p className="text-xs text-muted-foreground">Reading Now</p>
                </div>
                <div className="rounded-[var(--radius-xl)] border border-border bg-surface-muted/60 p-4 text-center">
                  <BookOpen className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground" />
                  <p className="font-serif text-2xl font-medium text-foreground">{wantToReadItems.length}</p>
                  <p className="text-xs text-muted-foreground">Want to Read</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>
                  Follow your device theme or pin light or dark mode.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ColorSchemeToggle />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <KeyRound className="h-4 w-4" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your Niwa account password and rotate active sessions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(onChangePassword)}
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    <FormField
                      control={passwordForm.control}
                      name="current_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="new_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="At least 8 characters"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="sm:col-span-2">
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        disabled={isChangingPassword}
                        className="gap-2"
                      >
                        {isChangingPassword ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <KeyRound className="h-4 w-4" />
                        )}
                        Update Password
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="font-serif text-xl font-medium tracking-[-0.01em]">
            Completed Books ({completedItems.length})
          </h2>
          {completedItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                You haven&apos;t marked any books as completed yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {completedItems.map((item) => (
                <BookCard
                  key={item.id}
                  book={item.book}
                  readingStatus="completed"
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
