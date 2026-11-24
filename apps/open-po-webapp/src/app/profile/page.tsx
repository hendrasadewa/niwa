"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "@niwa/open-po-validators";
import {
  ArrowRight,
  KeyRound,
  Loader2,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Store,
  User as UserIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Button,
  Badge,
} from "@niwa/ui/primitives";
import { ColorSchemeToggle, PageHeader } from "@niwa/ui/components";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiError, setAuthToken } from "@/lib/api";
import type { ChangePasswordResponse, User } from "@/types/api";
import { toast } from "@niwa/ui/hooks";
import { formatUnixDate } from "@/lib/utils";

export default function ProfilePage() {
  const { user, ownedStores, refreshProfile, isLoading, loginWithSso } =
    useAuth();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
      whatsapp_number: "",
      default_shipping_address: "",
    },
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      revoke_other_sessions: true,
    },
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        whatsapp_number: user.whatsapp_number,
        default_shipping_address: user.default_shipping_address ?? "",
      });
    }
  }, [user, form]);

  async function onSubmit(values: UpdateProfileInput) {
    setIsSaving(true);
    try {
      const res = await apiClient.put<{ user: User; token?: string }>(
        "/api/v1/me",
        {
          ...values,
          default_shipping_address: values.default_shipping_address?.trim()
            ? values.default_shipping_address.trim()
            : null,
        }
      );
      if (res.token) {
        setAuthToken(res.token);
      }
      await refreshProfile();
      toast({
        title: "Profile updated",
        description:
          "Your contact info and default shipping address have been saved.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description:
          err instanceof ApiError ? err.message : "Could not update profile.",
      });
    } finally {
      setIsSaving(false);
    }
  }

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
      passwordForm.reset({
        current_password: "",
        new_password: "",
        revoke_other_sessions: true,
      });
      toast({
        title: "Password updated",
        description:
          "Your password has been changed and other sessions have been signed out.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Password change failed",
        description:
          err instanceof ApiError
            ? err.message
            : "Could not change your password.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-md items-center justify-center px-4 py-12">
        <Card className="w-full text-center">
          <CardHeader>
            <CardTitle className="text-xl">Sign in required</CardTitle>
            <CardDescription>
              Sign in with your Niwa account to view and edit your profile and
              default shipping address.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={() =>
                loginWithSso(
                  typeof window !== "undefined" ? window.location.href : undefined
                )
              }
            >
              Sign In
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Browse Waves</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <PageHeader
        kicker="Open-PO / Account"
        title="My Profile & Shipping Address"
        description="Keep your WhatsApp number, appearance preference, and shipping address up to date for one-click pre-order checkouts."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {user.roles.map((role) => (
              <Badge key={role} variant="secondary" className="capitalize">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                {role}
              </Badge>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Contact & Delivery Info</CardTitle>
            <CardDescription>
              This information auto-fills whenever you checkout an active
              pre-order wave.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">
                    Email Address
                  </label>
                  <Input value={user.email} disabled className="bg-muted" />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5" />
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        WhatsApp Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="081234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="default_shipping_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        Default Shipping Address
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="Street address, district, city, postal code..."
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Profile Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-4">
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
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4" />
                My UMKM Stores
              </CardTitle>
              <CardDescription>
                Member since {formatUnixDate(user.created_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ownedStores.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  You haven&apos;t created a store yet. Launch your own UMKM
                  pre-order storefront in seconds.
                </p>
              ) : (
                <div className="space-y-2">
                  {ownedStores.map((store) => (
                    <div
                      key={store.id}
                      className="rounded-md border p-2.5 text-xs space-y-1"
                    >
                      <p className="font-semibold text-sm">{store.name}</p>
                      <p className="text-muted-foreground">/{store.slug}</p>
                    </div>
                  ))}
                </div>
              )}

              <Button variant="outline" size="sm" className="w-full gap-1.5" asChild>
                <Link href="/seller">
                  {ownedStores.length > 0
                    ? "Open Seller Console"
                    : "Create My UMKM Store"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your Niwa account password and refresh your active
                session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onChangePassword)}
                  className="space-y-3"
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

                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    disabled={isChangingPassword}
                    className="w-full gap-2"
                  >
                    {isChangingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    Update Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
