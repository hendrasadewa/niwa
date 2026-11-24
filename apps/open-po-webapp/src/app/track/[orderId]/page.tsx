"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Copy,
  ImagePlus,
  Loader2,
  Lock,
  LogIn,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
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
  Input,
  Button,
  Badge,
} from "@niwa/ui/primitives";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiError, getOrderReceiptUrl } from "@/lib/api";
import type { OrderTrackingDetail } from "@/types/api";
import { toast } from "@niwa/ui/hooks";
import { formatCurrencyIDR, formatUnixDateTime } from "@/lib/utils";

export default function OrderTrackingTimelinePage() {
  const params = useParams<{ orderId: string }>();
  const slugOrId = params.orderId;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = React.useState(false);
  const [receiptBust, setReceiptBust] = React.useState<number>(1);

  const { data, error, isLoading, isError } = useQuery({
    queryKey: ["public-order-tracking", slugOrId, user?.id ?? "guest"],
    queryFn: () =>
      apiClient.get<{ tracking: OrderTrackingDetail }>(
        `/api/v1/track/${encodeURIComponent(slugOrId)}`
      ),
    enabled: Boolean(slugOrId),
    retry: false,
  });

  const confirmReceivedMutation = useMutation({
    mutationFn: () =>
      apiClient.patch(
        `/api/v1/track/${encodeURIComponent(slugOrId)}/confirm-received`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["public-order-tracking", slugOrId],
      });
      queryClient.invalidateQueries({
        queryKey: ["member-orders"],
      });
      toast({
        title: "Delivery confirmed!",
        description:
          "Order marked as 'Received by Customer'. You can now leave product reviews.",
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not confirm delivery",
        description:
          err instanceof ApiError
            ? err.message
            : "Failed to confirm order receipt.",
      });
    },
  });

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      await apiClient.upload(
        `/api/v1/orders/${encodeURIComponent(slugOrId)}/receipt`,
        formData,
        "PUT"
      );
      setReceiptBust((v) => v + 1);
      await queryClient.invalidateQueries({
        queryKey: ["public-order-tracking", slugOrId],
      });
      toast({
        title: "Payment receipt uploaded",
        description: "Your transfer proof is now visible to the seller.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description:
          err instanceof ApiError ? err.message : "Could not upload receipt.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-10 text-center space-y-4">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-destructive">
                Access Restricted (403 Forbidden)
              </h1>
              <p className="text-sm text-muted-foreground">
                {error.message ||
                  "You do not have permission to view another customer's order."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/orders">View My Order History</Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/track">Back to Order Lookup</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tracking = data?.tracking;

  if (isError || !tracking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-3">
        <h1 className="text-xl font-bold">Order Code Not Found</h1>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find an order matching Code or ID{" "}
          <span className="font-mono font-semibold text-foreground">
            {slugOrId}
          </span>
          .
        </p>
        <Button variant="outline" asChild>
          <Link href="/track">Try Order Code or Phone Lookup</Link>
        </Button>
      </div>
    );
  }

  const orderCode = tracking.order_slug || tracking.order_id;
  const isPiiMasked = tracking.is_pii_masked ?? !user;
  const canConfirmReceived =
    tracking.status === "Delivered" || tracking.status === "On Shipping";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" asChild>
          <Link href="/track">
            <ArrowLeft className="h-4 w-4" />
            Back to Order Lookup
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-[-0.015em]">
              Order{" "}
              <span className="font-mono text-primary">{orderCode}</span>
            </h1>
            <Badge variant="default">{tracking.status}</Badge>
            {isPiiMasked ? (
              <Badge variant="outline" className="gap-1 text-xs">
                <Lock className="h-3 w-3" />
                PII Masked (Guest View)
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-xs">
                <ShieldCheck className="h-3 w-3 text-success" />
                Verified — PII Unlocked
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ordered by{" "}
            <span className="font-medium text-foreground">
              {tracking.customer_display_name}
            </span>{" "}
            on {formatUnixDateTime(tracking.created_at)}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(orderCode);
            toast({ title: `Order Code ${orderCode} copied` });
          }}
          className="gap-1.5 font-mono text-xs"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy Code: {orderCode}
        </Button>
      </div>

      {isPiiMasked && (
        <div className="rounded-[var(--radius-xl)] border border-warning-border bg-warning-soft p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs">
            <Lock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning-foreground">
                Customer PII Masked for Privacy
              </p>
              <p className="text-warning-foreground/85">
                Name, WhatsApp number, shipping address, and transfer receipt
                preview are masked in public guest view. Log in as the order
                owner to unlock full details.
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
              href={`/login?redirect=${encodeURIComponent(`/track/${orderCode}`)}`}
            >
              <LogIn className="h-3.5 w-3.5" />
              Log in to Unlock PII
            </Link>
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Customer & Delivery Information
          </CardTitle>
          <CardDescription>
            {isPiiMasked
              ? "Masked for guest privacy protection"
              : "Full verified customer & shipping details"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <div className="text-muted-foreground flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5" />
                Customer Name
              </div>
              <p className="font-semibold text-sm">
                {tracking.customer_display_name}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <div className="text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                WhatsApp Number
              </div>
              <p className="font-mono font-semibold text-sm">
                {tracking.whatsapp_number ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <div className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Shipping Address
              </div>
              <p className="font-medium text-sm break-words">
                {tracking.shipping_address ?? "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Fulfillment State Machine Timeline
          </CardTitle>
          <CardDescription>
            {tracking.store?.name ? `${tracking.store.name} • ` : ""}
            {tracking.wave?.name ?? "Pre-Order Batch"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            {tracking.timeline.map((step) => (
              <div
                key={step.status}
                className={`rounded-[var(--radius-lg)] border p-3 flex sm:flex-col items-center sm:text-center gap-2.5 ${
                  step.is_current
                    ? "border-primary bg-primary-soft/70 ring-1 ring-primary"
                    : step.is_completed
                      ? "border-success-border bg-success-soft/70"
                      : "opacity-55"
                }`}
              >
                {step.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="text-xs font-medium leading-tight">
                  {step.status}
                </div>
              </div>
            ))}
          </div>

          {tracking.tracking_number && (
            <div className="rounded-xl border bg-secondary/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Courier Tracking Number (Resi Pengiriman)
                  </p>
                  <p className="font-mono text-sm font-bold">
                    {tracking.tracking_number}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(tracking.tracking_number!);
                  toast({ title: "Tracking number copied" });
                }}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Resi
              </Button>
            </div>
          )}

          {canConfirmReceived && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  Has your pre-order package arrived?
                </p>
                <p className="text-xs text-muted-foreground">
                  Confirm delivery receipt to complete this order and unlock
                  product reviews.
                </p>
              </div>
              <Button
                size="sm"
                disabled={confirmReceivedMutation.isPending}
                onClick={() => confirmReceivedMutation.mutate()}
                className="gap-1.5 shrink-0"
              >
                {confirmReceivedMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackageCheck className="h-4 w-4" />
                )}
                Confirm Received by Customer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ordered Wave Items</CardTitle>
            <CardDescription>
              Locked snapshot pricing from {tracking.wave?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="divide-y text-sm">
              {tracking.items.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div>
                    <Link
                      href={`/products/${item.product_id}`}
                      className="font-medium hover:underline"
                    >
                      {item.product_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrencyIDR(item.locked_price)}
                    </p>
                  </div>
                  <span className="font-semibold">
                    {formatCurrencyIDR(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-sm font-medium">Total Order Amount</span>
              <span className="text-lg font-bold">
                {formatCurrencyIDR(tracking.total_amount)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Payment Instructions & Transfer Proof
            </CardTitle>
            <CardDescription>
              Upload or update your manual transfer receipt (Cloudflare R2)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tracking.store?.payment_instructions && (
              <div className="rounded-lg border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                {tracking.store.payment_instructions}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold flex items-center gap-1.5">
                <ImagePlus className="h-4 w-4" />
                {tracking.has_payment_receipt
                  ? "Replace Payment Receipt Image"
                  : "Upload Payment Receipt Image"}
              </label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={isUploading}
                onChange={handleReceiptUpload}
              />
            </div>

            {tracking.has_payment_receipt && (
              <div className="space-y-1.5">
                <Badge variant="secondary" className="text-[11px]">
                  Uploaded Transfer Receipt
                </Badge>
                {isPiiMasked ? (
                  <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-center text-xs text-muted-foreground space-y-2">
                    <Lock className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p>
                      Transfer receipt has been uploaded. Log in as the order
                      owner to preview the receipt image.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted overflow-hidden flex justify-center max-h-56">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getOrderReceiptUrl(
                        orderCode,
                        `${tracking.payment_receipt_url}-${receiptBust}`
                      )}
                      alt="Payment Receipt"
                      className="max-h-52 object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {tracking.store && (
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  asChild
                >
                  <Link href={`/stores/${tracking.store.slug}`}>
                    <StoreIcon className="h-3.5 w-3.5" />
                    Visit Storefront
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  asChild
                >
                  <a
                    href={`https://wa.me/${
                      tracking.store.whatsapp_contact
                        .replace(/[^0-9]/g, "")
                        .startsWith("08")
                        ? `62${tracking.store.whatsapp_contact
                            .replace(/[^0-9]/g, "")
                            .slice(1)}`
                        : tracking.store.whatsapp_contact.replace(/[^0-9]/g, "")
                    }`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Contact Seller
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
