"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  Copy,
  ImagePlus,
  Loader2,
  MessageCircle,
  PackageCheck,
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
import { apiClient, ApiError, getOrderReceiptUrl } from "@/lib/api";
import type { OrderTrackingDetail } from "@/types/api";
import { toast } from "@/hooks/use-toast";
import { formatCurrencyIDR, formatUnixDateTime } from "@/lib/utils";

export default function OrderTrackingTimelinePage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = React.useState(false);
  const [receiptBust, setReceiptBust] = React.useState<number>(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-order-tracking", orderId],
    queryFn: () =>
      apiClient.get<{ tracking: OrderTrackingDetail }>(
        `/api/v1/track/${encodeURIComponent(orderId)}`
      ),
    enabled: Boolean(orderId),
  });

  const confirmReceivedMutation = useMutation({
    mutationFn: () =>
      apiClient.patch(`/api/v1/track/${encodeURIComponent(orderId)}/confirm-received`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["public-order-tracking", orderId],
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
  });

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      await apiClient.upload(
        `/api/v1/orders/${encodeURIComponent(orderId)}/receipt`,
        formData,
        "PUT"
      );
      setReceiptBust((v) => v + 1);
      await queryClient.invalidateQueries({
        queryKey: ["public-order-tracking", orderId],
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

  const tracking = data?.tracking;

  if (isError || !tracking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-3">
        <h1 className="text-xl font-bold">Order ID Not Found</h1>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find an order matching ID{" "}
          <span className="font-mono">{orderId}</span>.
        </p>
        <Button variant="outline" asChild>
          <Link href="/track">Try Another Order ID</Link>
        </Button>
      </div>
    );
  }

  const canConfirmReceived =
    tracking.status === "Delivered" || tracking.status === "On Shipping";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Order Status Tracker
            </h1>
            <Badge variant="default">{tracking.status}</Badge>
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
            navigator.clipboard.writeText(tracking.order_id);
            toast({ title: "Order ID copied" });
          }}
          className="gap-1.5 font-mono text-xs"
        >
          <Copy className="h-3.5 w-3.5" />
          {tracking.order_id.slice(0, 13)}...
        </Button>
      </div>

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
                className={`rounded-xl border p-3 flex sm:flex-col items-center sm:text-center gap-2.5 ${
                  step.is_current
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : step.is_completed
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "opacity-50"
                }`}
              >
                {step.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
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
                <div className="rounded-lg border bg-muted overflow-hidden flex justify-center max-h-56">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getOrderReceiptUrl(
                      tracking.order_id,
                      `${tracking.payment_receipt_url}-${receiptBust}`
                    )}
                    alt="Payment Receipt"
                    className="max-h-52 object-contain"
                  />
                </div>
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
