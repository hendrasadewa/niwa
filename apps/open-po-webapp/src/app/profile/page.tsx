"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@niwa/open-po-validators";
import {
  ArrowRight,
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
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiError } from "@/lib/api";
import type { User } from "@/types/api";
import { toast } from "@/hooks/use-toast";
import { formatUnixDate } from "@/lib/utils";

export default function ProfilePage() {
  const { user, ownedStores, refreshProfile, isLoading } = useAuth();
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
      whatsapp_number: "",
      default_shipping_address: "",
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
      await apiClient.put<{ user: User }>("/api/v1/me", {
        ...values,
        default_shipping_address: values.default_shipping_address?.trim()
          ? values.default_shipping_address.trim()
          : null,
      });
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

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            My Profile & Shipping Address
          </h1>
          <p className="text-sm text-muted-foreground">
            Keep your WhatsApp number and shipping address up to date for
            one-click pre-order checkouts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.roles.map((role) => (
            <Badge key={role} variant="secondary" className="capitalize">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              {role}
            </Badge>
          ))}
        </div>
      </div>

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
        </div>
      </div>
    </div>
  );
}
