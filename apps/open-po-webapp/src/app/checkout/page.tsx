"use client";

import * as React from "react";
import Link from "next/link";
import { checkoutOrderSchema } from "@niwa/open-po-validators";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Hash,
  ImagePlus,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  User as UserIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { useCart } from "@/providers/cart-provider";
import { apiClient, ApiError, getOrderReceiptUrl } from "@/lib/api";
import type { CheckoutResponse } from "@/types/api";
import { toast } from "@/hooks/use-toast";
import { formatCurrencyIDR } from "@/lib/utils";

export default function CheckoutPage() {
  const { user, isAuthenticated } = useAuth();
  const { cart, totalAmount, clearCart } = useCart();

  const [guestName, setGuestName] = React.useState("");
  const [guestWhatsapp, setGuestWhatsapp] = React.useState("");
  const [customOrderSlug, setCustomOrderSlug] = React.useState("");
  const [customShippingAddress, setCustomShippingAddress] = React.useState<
    string | null
  >(null);
  const shippingAddress =
    customShippingAddress ?? user?.default_shipping_address ?? "";
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [checkoutResult, setCheckoutResult] =
    React.useState<CheckoutResponse | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = React.useState(false);
  const [receiptUploadedKey, setReceiptUploadedKey] = React.useState<
    string | null
  >(null);
  const [receiptBust, setReceiptBust] = React.useState<number>(1);

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!cart.waveId || cart.items.length === 0) return;

    const rawPayload = {
      wave_id: cart.waveId,
      slug: customOrderSlug.trim()
        ? customOrderSlug.trim().toUpperCase()
        : undefined,
      shipping_address: shippingAddress.trim(),
      ...(isAuthenticated
        ? {}
        : {
            guest_name: guestName.trim(),
            guest_whatsapp: guestWhatsapp.trim(),
          }),
      items: cart.items.map((i) => ({
        wave_product_id: i.waveProductId,
        quantity: i.quantity,
      })),
    };

    const parsed = checkoutOrderSchema.safeParse(rawPayload);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: firstIssue?.message ?? "Please check your checkout fields.",
      });
      return;
    }

    if (!isAuthenticated && (!guestName.trim() || !guestWhatsapp.trim())) {
      toast({
        variant: "destructive",
        title: "Guest contact info required",
        description:
          "Please fill in your name and WhatsApp number so the seller can contact you.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post<CheckoutResponse>(
        "/api/v1/orders/checkout",
        parsed.data
      );

      setCheckoutResult(res);
      clearCart();
      toast({
        title: "Pre-order submitted!",
        description: `Order Code ${res.order.slug || res.order.id} has been created.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Checkout failed",
        description:
          err instanceof ApiError
            ? err.message
            : "Could not submit your order.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !checkoutResult) return;

    const orderKey = checkoutResult.order.slug || checkoutResult.order.id;
    setIsUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      const res = await apiClient.upload<{ payment_receipt_url: string }>(
        `/api/v1/orders/${encodeURIComponent(orderKey)}/receipt`,
        formData,
        "PUT"
      );
      setReceiptUploadedKey(res.payment_receipt_url);
      setReceiptBust((v) => v + 1);
      toast({
        title: "Payment receipt uploaded!",
        description:
          "Your transfer proof has been saved to R2 for the seller to verify.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Receipt upload failed",
        description:
          err instanceof ApiError ? err.message : "Could not upload receipt.",
      });
    } finally {
      setIsUploadingReceipt(false);
    }
  }

  if (checkoutResult) {
    const order = checkoutResult.order;
    const orderCode = order.slug || order.id;
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        <Card className="border-primary/30">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full border border-success-border bg-success-soft text-success-foreground flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-medium">
              Pre-Order Reserved!
            </CardTitle>
            <CardDescription>
              Save your Order Code below to track fulfillment and confirm your
              manual transfer payment.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-xl border bg-muted/50 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Human-Readable Order Code
                </p>
                <p className="font-mono text-lg font-extrabold tracking-wide text-primary">
                  {orderCode}
                </p>
                {order.slug && (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    UUID: {order.id}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(orderCode);
                  toast({ title: `Order Code ${orderCode} copied!` });
                }}
                className="gap-1.5 shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Code
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">
                1. Manual Bank / E-Wallet Payment Instructions
              </h3>
              <div className="rounded-xl border bg-card p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {checkoutResult.payment_instructions}
              </div>
              <div className="flex items-center justify-between pt-1 text-sm">
                <span className="text-muted-foreground">
                  Total Amount to Transfer
                </span>
                <span className="text-lg font-bold">
                  {formatCurrencyIDR(order.total_amount)}
                </span>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <ImagePlus className="h-4 w-4" />
                2. Upload Payment Transfer Receipt (Cloudflare R2)
              </h3>
              <p className="text-xs text-muted-foreground">
                Upload a screenshot or photo of your transfer receipt so the
                seller can verify it directly on their Kanban dashboard.
              </p>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={isUploadingReceipt}
                onChange={handleReceiptUpload}
              />
              {isUploadingReceipt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading receipt to Cloudflare R2...
                </p>
              )}
              {receiptUploadedKey && (
                <div className="pt-2 space-y-1.5">
                  <Badge variant="default" className="text-xs">
                    Receipt Uploaded
                  </Badge>
                  <div className="max-h-56 overflow-hidden rounded-lg border bg-muted flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getOrderReceiptUrl(orderCode, receiptBust)}
                      alt="Payment Receipt"
                      className="max-h-52 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold">
                3. Confirm Payment via WhatsApp
              </h3>
              <Button className="w-full gap-2" asChild>
                <a
                  href={checkoutResult.whatsapp_redirect_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                  Send Confirmation on WhatsApp
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
            <Button variant="outline" className="w-full sm:flex-1" asChild>
              <Link href={`/track/${encodeURIComponent(orderCode)}`}>
                Open Live Order Tracking ({orderCode})
              </Link>
            </Button>
            {isAuthenticated && (
              <Button variant="secondary" className="w-full sm:flex-1" asChild>
                <Link href="/orders">View My Order History</Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="font-serif text-2xl font-medium">Your Pre-Order Cart is Empty</h1>
        <p className="text-sm text-muted-foreground">
          Browse an active UMKM pre-order wave and add products before checking
          out.
        </p>
        <Button asChild>
          <Link href="/">Browse Active Pre-Order Waves</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Open-PO / Checkout
        </p>
        <h1 className="font-serif text-3xl font-medium tracking-[-0.015em] mt-1">
          Pre-Order Checkout
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Store:{" "}
          <span className="font-medium text-foreground">{cart.storeName}</span>{" "}
          • Wave:{" "}
          <span className="font-medium text-foreground">{cart.waveName}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {isAuthenticated
                ? "Member Delivery Details"
                : "Guest Customer & Delivery Details"}
            </CardTitle>
            <CardDescription>
              {isAuthenticated
                ? `Ordering as ${user?.name} (${user?.whatsapp_number}). Your saved address is pre-filled below.`
                : "Enter your contact info and shipping address, or sign in to auto-fill."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              {!isAuthenticated && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5" />
                      Your Name
                    </label>
                    <Input
                      placeholder="Budi Santoso"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      WhatsApp Number
                    </label>
                    <Input
                      placeholder="081234567890"
                      value={guestWhatsapp}
                      onChange={(e) => setGuestWhatsapp(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Used so you can look up all your guest orders anytime on
                      the Track Order page.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Complete Shipping Address
                </label>
                <Textarea
                  rows={3}
                  placeholder="Street address, RT/RW, district, city, postal code, and delivery notes..."
                  value={shippingAddress}
                  onChange={(e) => setCustomShippingAddress(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Custom Order Code / Slug (Optional)
                </label>
                <Input
                  placeholder="Leave blank to auto-generate (e.g. DAPU-261118-YVLP)"
                  value={customOrderSlug}
                  onChange={(e) =>
                    setCustomOrderSlug(e.target.value.toUpperCase())
                  }
                  maxLength={40}
                  className="font-mono text-sm uppercase"
                />
                <p className="text-[11px] text-muted-foreground">
                  3–40 letters, numbers, and hyphens. If left blank, a memorable
                  short Order Code is generated automatically.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Pre-Order ({formatCurrencyIDR(totalAmount)})
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Summary</CardTitle>
            <CardDescription>{cart.waveName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="divide-y text-sm">
              {cart.items.map((item) => (
                <div
                  key={item.waveProductId}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrencyIDR(item.lockedPrice)}
                    </p>
                  </div>
                  <span className="font-semibold">
                    {formatCurrencyIDR(item.quantity * item.lockedPrice)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-sm font-medium">Total Amount</span>
              <span className="text-lg font-bold">
                {formatCurrencyIDR(totalAmount)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
