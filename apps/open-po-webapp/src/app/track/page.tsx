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
  PackageSearch,
  Phone,
  Receipt,
  Search,
  Store as StoreIcon,
  Truck,
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
import { apiClient } from "@/lib/api";
import type { GuestPhoneLookupResponse } from "@/types/api";
import { toast } from "@/hooks/use-toast";
import { cn, formatCurrencyIDR, formatUnixDateTime } from "@/lib/utils";

function TrackOrderLookupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPhone = searchParams.get("phone") || "";
  const initialMode = initialPhone ? "phone" : "code";

  const [mode, setMode] = React.useState<"code" | "phone">(initialMode);
  const [orderCodeInput, setOrderCodeInput] = React.useState("");
  const [phoneInput, setPhoneInput] = React.useState(initialPhone);
  const [submittedPhone, setSubmittedPhone] = React.useState(initialPhone);

  const {
    data: lookupData,
    isLoading: lookupLoading,
    isFetching: lookupFetching,
  } = useQuery({
    queryKey: ["guest-phone-lookup", submittedPhone],
    queryFn: () =>
      apiClient.get<GuestPhoneLookupResponse>("/api/v1/track/lookup", {
        params: { phone: submittedPhone },
      }),
    enabled: Boolean(submittedPhone.trim().length >= 6),
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
            ) or find all your guest orders using your WhatsApp number.
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
                  Guest / Customer WhatsApp Number (supports 08..., 628..., +62...)
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
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">
              Orders Matching{" "}
              <span className="font-mono text-primary">{submittedPhone}</span>
            </h2>
            {lookupData && (
              <Badge variant="secondary">
                {lookupData.total} {lookupData.total === 1 ? "order" : "orders"}{" "}
                found
              </Badge>
            )}
          </div>

          {lookupLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : matchedOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center space-y-2">
                <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  No orders found for {submittedPhone}
                </p>
                <p className="text-xs text-muted-foreground">
                  Double-check the WhatsApp number you entered during checkout.
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
                            <Badge variant="secondary" className="text-[11px]">
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
                        <Button size="sm" className="h-8 text-xs gap-1" asChild>
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
