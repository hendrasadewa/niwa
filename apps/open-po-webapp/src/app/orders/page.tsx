"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Loader2,
  PackageCheck,
  Receipt,
  Star,
  Store as StoreIcon,
  Truck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient, ApiError } from "@/lib/api";
import type { OrderItemRecord, OrderRecord } from "@/types/api";
import { toast } from "@/hooks/use-toast";
import { formatCurrencyIDR, formatUnixDateTime } from "@/lib/utils";

export default function MemberOrdersPage() {
  const queryClient = useQueryClient();

  const [reviewModalTarget, setReviewModalTarget] = React.useState<{
    orderId: string;
    item: OrderItemRecord;
  } | null>(null);
  const [rating, setRating] = React.useState<number>(5);
  const [comment, setComment] = React.useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["member-orders"],
    queryFn: () =>
      apiClient.get<{ orders: OrderRecord[] }>("/api/v1/me/orders"),
  });

  const confirmReceivedMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiClient.patch(`/api/v1/track/${encodeURIComponent(orderId)}/confirm-received`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-orders"] });
      toast({
        title: "Order marked as Received by Customer!",
        description: "You can now submit ratings and reviews for your items.",
      });
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: (payload: {
      order_id: string;
      product_id: string;
      rating: number;
      comment: string;
    }) => apiClient.post("/api/v1/reviews", payload),
    onSuccess: () => {
      toast({
        title: "Review submitted!",
        description: "Thank you for supporting this UMKM store.",
      });
      setReviewModalTarget(null);
      setComment("");
      setRating(5);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not submit review",
        description:
          err instanceof ApiError ? err.message : "Failed to submit review.",
      });
    },
  });

  function openReviewModal(orderId: string, item: OrderItemRecord) {
    setReviewModalTarget({ orderId, item });
    setRating(5);
    setComment("");
  }

  function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewModalTarget) return;
    if (!comment.trim()) {
      toast({
        variant: "destructive",
        title: "Comment required",
        description: "Please write a brief review comment.",
      });
      return;
    }

    submitReviewMutation.mutate({
      order_id: reviewModalTarget.orderId,
      product_id: reviewModalTarget.item.product_id,
      rating,
      comment: comment.trim(),
    });
  }

  const orders = data?.orders ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          My Pre-Order History
        </h1>
        <p className="text-sm text-muted-foreground">
          Track active pre-orders, confirm package receipt, and leave 1–5 star
          reviews once delivered.
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center space-y-3">
            <Receipt className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="text-sm font-medium">
              You haven&apos;t placed any pre-orders yet
            </p>
            <p className="text-xs text-muted-foreground">
              Explore live UMKM pre-order waves and checkout with your member
              account.
            </p>
            <Button size="sm" asChild>
              <Link href="/">Browse Pre-Order Waves</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isReceived = order.status === "Received by Customer";
            const canConfirm =
              order.status === "Delivered" || order.status === "On Shipping";

            return (
              <Card key={order.id}>
                <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {order.store && (
                        <Link
                          href={`/stores/${order.store.slug}`}
                          className="font-bold text-sm hover:underline flex items-center gap-1.5"
                        >
                          <StoreIcon className="h-4 w-4 text-muted-foreground" />
                          {order.store.name}
                        </Link>
                      )}
                      {order.wave && (
                        <Badge variant="secondary" className="text-xs">
                          {order.wave.name}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">
                      Order #{order.id} • Placed{" "}
                      {formatUnixDateTime(order.created_at)}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isReceived ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {order.status}
                    </Badge>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" asChild>
                      <Link href={`/track/${order.id}`}>
                        Track & Receipt
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  <div className="divide-y">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <Link
                            href={`/products/${item.product_id}`}
                            className="font-medium text-sm hover:underline"
                          >
                            {item.product_name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} ×{" "}
                            {formatCurrencyIDR(item.locked_price)} ={" "}
                            <span className="font-semibold text-foreground">
                              {formatCurrencyIDR(item.subtotal)}
                            </span>
                          </p>
                        </div>

                        {isReceived && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => openReviewModal(order.id, item)}
                            className="h-8 text-xs gap-1.5 shrink-0"
                          >
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            Write Product Review
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t pt-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {order.tracking_number && (
                        <span className="flex items-center gap-1 font-mono text-foreground">
                          <Truck className="h-3.5 w-3.5" />
                          Resi: {order.tracking_number}
                        </span>
                      )}
                      <span>
                        Payment Receipt:{" "}
                        {order.payment_receipt_url ? "Uploaded" : "Pending"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {canConfirm && (
                        <Button
                          size="sm"
                          disabled={confirmReceivedMutation.isPending}
                          onClick={() =>
                            confirmReceivedMutation.mutate(order.id)
                          }
                          className="h-8 text-xs gap-1.5"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          Confirm Order Received
                        </Button>
                      )}
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground mr-2">
                          Total
                        </span>
                        <span className="text-base font-bold">
                          {formatCurrencyIDR(order.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(reviewModalTarget)}
        onOpenChange={(open) => !open && setReviewModalTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave a Product Review</DialogTitle>
            <DialogDescription>
              Share your feedback for{" "}
              <span className="font-semibold text-foreground">
                {reviewModalTarget?.item.product_name}
              </span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Star Rating (1 – 5)</label>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((starValue) => (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setRating(starValue)}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        starValue <= rating
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-semibold">{rating} / 5</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Your Review Comment</label>
              <Textarea
                rows={4}
                placeholder="How was the quality, taste, packaging, and pre-order experience?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewModalTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitReviewMutation.isPending}
                className="gap-1.5"
              >
                {submitReviewMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Submit Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
