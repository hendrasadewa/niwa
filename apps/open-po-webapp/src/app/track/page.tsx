"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Copy,
  ExternalLink,
  Hash,
  Loader2,
  Lock,
  LogIn,
  MapPin,
  PackageSearch,
  Phone,
  Receipt,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store as StoreIcon,
  Truck,
  User as UserIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiError } from "@/lib/api";
import type { GuestPhoneLookupResponse } from "@/types/api";
import { toast } from "@/hooks/use-toast";
import { cn, formatCurrencyIDR, formatUnixDateTime } from "@/lib/utils";

function TrackOrderLookupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const initialPhone = searchParams.get("phone") || "";
  const initialMode = initialPhone ? "phone" : "code";

  const [mode, setMode] = React.useState<"code" | "phone">(initialMode);
  const [orderCodeInput, setOrderCodeInput] = React.useState("");
  const [phoneInput, setPhoneInput] = React.useState(initialPhone);
  const [submittedPhone, setSubmittedPhone] = React.useState(initialPhone);

  const {
    data: lookupData,
    error: lookupError,
    isLoading: lookupLoading,
    isFetching: lookupFetching,
  } = useQuery({
    queryKey: ["guest-phone-lookup", submittedPhone, user?.id ?? "guest"],
    queryFn: () =>
      apiClient.get<GuestPhoneLookupResponse>("/api/v1/track/lookup", {
        params: { phone: submittedPhone },
      }),
    enabled: Boolean(submittedPhone.trim().length >= 6),
    retry: false,
  });

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = orderCodeInput.trim();
    if (!trimmed) return;
    router.push(`/track/${encodeURIComponent(trimmed)}`);
  }

  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = phoneInput.trim();
    if (trimmed.length < 6) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter at least 6 digits of your WhatsApp number.",
      });
      return;
    }
    setSubmittedPhone(trimmed);
  }

  const matchedOrders = lookupData?.orders ?? [];
  const isForbiddenError =
    lookupError instanceof ApiError && lookupError.status === 403;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <PackageSearch className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Track Your Pre-Order
          </CardTitle>
          <CardDescription>
            Look up a specific order by its Order Code (e.g.{" "}
            <span className="font-mono font-medium text-foreground">
              DAPU-261118-YVLP
            </span>
            ) or find your orders using your WhatsApp number.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("code")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md py-2 text-xs sm:text-sm font-medium transition-all",
                mode === "code"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Hash className="h-4 w-4" />
              Track by Order Code
            </button>
            <button
              type="button"
              onClick={() => setMode("phone")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md py-2 text-xs sm:text-sm font-medium transition-all",
                mode === "phone"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Phone className="h-4 w-4" />
              Find by WhatsApp Number
            </button>
          </div>

          {mode === "code" ? (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Order Code (`slug`) or Order UUID
                </label>
                <Input
                  placeholder="e.g. DAPU-261118-YVLP"
                  value={orderCodeInput}
                  onChange={(e) => setOrderCodeInput(e.target.value)}
                  className="font-mono text-sm uppercase"
                  required
                />
              </div>
              <Button type="submit" className="w-full gap-2">
                View Order Status Timeline
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {isAuthenticated
                    ? `Your WhatsApp Number (${user?.whatsapp_number})`
                    : "Guest / Customer WhatsApp Number (supports 08..., 628..., +62...)"}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="e.g. 081234567890"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={lookupLoading || lookupFetching}
                    className="gap-2 shrink-0"
                  >
                    {lookupLoading || lookupFetching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Find My Orders
                  </Button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {mode === "phone" && submittedPhone && (
        <div className="space-y-4">
          {lookupLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isForbiddenError ? (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="py-8 text-center space-y-3">
                <ShieldAlert className="mx-auto h-9 w-9 text-destructive" />
                <div className="space-y-1">
                  <p className="text-base font-bold text-destructive">
                    Access Restricted (403 Forbidden)
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {lookupError.message ||
                      "While logged in, you cannot look up order history belonging to another user's phone number."}
                  </p>
                </div>
                {user?.whatsapp_number && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPhoneInput(user.whatsapp_number);
                      setSubmittedPhone(user.whatsapp_number);
                    }}
                  >
                    Search My Registered Number ({user.whatsapp_number})
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold">
                  Orders Matching{" "}
                  <span className="font-mono text-primary">
                    {lookupData?.phone ?? submittedPhone}
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  {lookupData?.is_pii_masked ? (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Lock className="h-3 w-3" />
                      Guest View (PII Masked)
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      PII Unlocked
                    </Badge>
                  )}
                  {lookupData && (
                    <Badge variant="secondary">
                      {lookupData.total}{" "}
                      {lookupData.total === 1 ? "order" : "orders"} found
                    </Badge>
                  )}
                </div>
              </div>

              {lookupData?.is_pii_masked && matchedOrders.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-xs">
                    <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">
                        Personal Information Masked for Privacy
                      </p>
                      <p className="text-muted-foreground">
                        Names, phone numbers, and shipping addresses are masked
                        in guest lookup mode. Sign in to unlock your full order
                        details.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 shrink-0"
                    asChild
                  >
                    <Link
                      href={`/login?redirect=${encodeURIComponent(`/track?phone=${submittedPhone}`)}`}
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Log in to Unlock PII
                    </Link>
                  </Button>
                </div>
              )}

              {matchedOrders.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center space-y-2">
                    <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      No orders found for {submittedPhone}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Double-check the WhatsApp number you entered during
                      checkout.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {matchedOrders.map((order) => {
                    const orderCode = order.slug || order.id;
                    const hasReceipt =
                      order.has_payment_receipt ??
                      Boolean(order.payment_receipt_url);

                    return (
                      <Card
                        key={order.id}
                        className="hover:shadow-xs transition-shadow"
                      >
                        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-bold text-primary">
                                {orderCode}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  navigator.clipboard.writeText(orderCode);
                                  toast({
                                    title: `Order Code ${orderCode} copied`,
                                  });
                                }}
                                title="Copy Order Code"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              {order.store && (
                                <Link
                                  href={`/stores/${order.store.slug}`}
                                  className="text-xs font-semibold hover:underline flex items-center gap-1"
                                >
                                  <StoreIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  {order.store.name}
                                </Link>
                              )}
                              {order.wave && (
                                <Badge
                                  variant="secondary"
                                  className="text-[11px]"
                                >
                                  {order.wave.name}
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="text-xs">
                              Placed {formatUnixDateTime(order.created_at)}
                            </CardDescription>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-xs">
                              {order.status}
                            </Badge>
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1"
                              asChild
                            >
                              <Link
                                href={`/track/${encodeURIComponent(orderCode)}`}
                              >
                                View Tracking Timeline
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-3 space-y-2.5 text-xs">
                          <div className="rounded-lg border bg-muted/40 p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate">
                                {order.customer_display_name ?? "Customer"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-mono truncate">
                                {order.whatsapp_number ?? "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">
                                {order.shipping_address ?? "—"}
                              </span>
                            </div>
                          </div>

                          <div className="divide-y">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="py-1.5 flex items-center justify-between"
                              >
                                <span>
                                  {item.product_name} × {item.quantity}
                                </span>
                                <span className="font-medium">
                                  {formatCurrencyIDR(item.subtotal)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="border-t pt-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <span>
                                Receipt: {hasReceipt ? "Uploaded" : "Pending"}
                              </span>
                              {order.tracking_number && (
                                <span className="flex items-center gap-1 font-mono text-foreground">
                                  <Truck className="h-3.5 w-3.5" />
                                  {order.tracking_number}
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-sm">
                              Total: {formatCurrencyIDR(order.total_amount)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrackOrderLookupPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-20 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <TrackOrderLookupContent />
    </React.Suspense>
  );
}
