"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ORDER_STATUSES,
  type OrderStatus,
} from "@niwa/open-po-validators";
import {
  ArrowRight,
  Copy,
  Eye,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  Truck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Button,
  Badge,
} from "@niwa/ui/primitives";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, getOrderReceiptUrl } from "@/lib/api";
import type { KanbanBoard, OrderRecord, PreOrderWave } from "@/types/api";
import { toast } from "@niwa/ui/hooks";
import { formatCurrencyIDR, formatUnixDateTime } from "@/lib/utils";

export default function SellerKanbanOrdersPage() {
  const { activeStore } = useAuth();
  const queryClient = useQueryClient();

  const [selectedWaveId, setSelectedWaveId] = React.useState<string>("ALL");
  const [receiptPreviewOrder, setReceiptPreviewOrder] =
    React.useState<OrderRecord | null>(null);

  const [shippingModalOrder, setShippingModalOrder] =
    React.useState<OrderRecord | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = React.useState("");

  const { data: wavesData } = useQuery({
    queryKey: ["seller-waves", activeStore?.id],
    queryFn: () =>
      apiClient.get<{ waves: PreOrderWave[] }>("/api/v1/waves", {
        params: { store_id: activeStore!.id },
      }),
    enabled: Boolean(activeStore?.id),
  });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["seller-kanban-orders", activeStore?.id, selectedWaveId],
    queryFn: () =>
      apiClient.get<{ kanban: KanbanBoard; orders: OrderRecord[] }>(
        "/api/v1/orders",
        {
          params: {
            store_id: activeStore!.id,
            wave_id: selectedWaveId === "ALL" ? undefined : selectedWaveId,
            view: "kanban",
          },
        }
      ),
    enabled: Boolean(activeStore?.id),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
      tracking_number,
    }: {
      orderId: string;
      status: OrderStatus;
      tracking_number?: string | null;
    }) =>
      apiClient.patch<{ order: OrderRecord }>(
        `/api/v1/orders/${orderId}/status`,
        {
          status,
          ...(tracking_number !== undefined ? { tracking_number } : {}),
        }
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ["seller-kanban-orders", activeStore?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["seller-orders", activeStore?.id],
      });
      setShippingModalOrder(null);
      setTrackingNumberInput("");
      toast({
        title: "Order status updated",
        description: `Order moved to "${res.order.status}".`,
      });
    },
  });

  function handleAdvanceStatus(order: OrderRecord, targetStatus: OrderStatus) {
    if (targetStatus === "On Shipping") {
      setShippingModalOrder(order);
      setTrackingNumberInput(order.tracking_number ?? "");
      return;
    }
    statusMutation.mutate({
      orderId: order.id,
      status: targetStatus,
    });
  }

  function getNextStatus(current: OrderStatus): OrderStatus | null {
    const idx = ORDER_STATUSES.indexOf(current);
    if (idx < 0 || idx >= ORDER_STATUSES.length - 1) return null;
    return ORDER_STATUSES[idx + 1] ?? null;
  }

  if (!activeStore) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Please create a store from the Seller Overview tab first.
      </div>
    );
  }

  const waves = wavesData?.waves ?? [];
  const kanban = ordersData?.kanban;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-medium tracking-[-0.015em]">
            Kanban Order Fulfillment Dashboard
          </h2>
          <p className="text-xs text-muted-foreground">
            Verify manual transfer receipts, advance orders across fulfillment
            stages, and record courier tracking receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedWaveId} onValueChange={setSelectedWaveId}>
            <SelectTrigger className="w-[220px] h-9 text-xs">
              <SelectValue placeholder="Filter by Pre-Order Wave" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                All Pre-Order Waves
              </SelectItem>
              {waves.map((w) => (
                <SelectItem key={w.id} value={w.id} className="text-xs">
                  {w.name} ({w.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ORDER_STATUSES.map((columnStatus) => {
            const columnOrders = kanban?.[columnStatus] ?? [];
            return (
              <div
                key={columnStatus}
                className="w-[310px] shrink-0 rounded-xl border bg-muted/30 p-3 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="font-semibold text-xs uppercase tracking-wider">
                    {columnStatus}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {columnOrders.length}
                  </Badge>
                </div>

                <div className="space-y-3 min-h-[200px]">
                  {columnOrders.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
                      No orders in {columnStatus}
                    </div>
                  ) : (
                    columnOrders.map((order) => {
                      const orderCode = order.slug || order.id;
                      const customerName =
                        order.customer_name || order.guest_name || "Guest";
                      const customerWa =
                        order.customer_whatsapp || order.guest_whatsapp || "";
                      const nextSt = getNextStatus(order.status);

                      return (
                        <Card key={order.id} className="shadow-xs">
                          <CardHeader className="p-3.5 pb-2 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                <Link
                                  href={`/track/${encodeURIComponent(orderCode)}`}
                                  target="_blank"
                                  className="font-mono text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                >
                                  {orderCode}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(orderCode);
                                    toast({
                                      title: `Order Code ${orderCode} copied`,
                                    });
                                  }}
                                  className="p-0.5 text-muted-foreground hover:text-foreground"
                                  title="Copy Order Code"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                {formatUnixDateTime(order.created_at)}
                              </span>
                            </div>
                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                              <span>{customerName}</span>
                              {!order.customer_id && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  Guest
                                </Badge>
                              )}
                            </CardTitle>
                            {order.wave && (
                              <CardDescription className="text-[11px] truncate">
                                Wave: {order.wave.name}
                              </CardDescription>
                            )}
                          </CardHeader>

                          <CardContent className="p-3.5 pt-1 space-y-2.5 text-xs">
                            <div className="rounded-md bg-muted/60 p-2 space-y-1">
                              {order.items.map((it) => (
                                <div
                                  key={it.id}
                                  className="flex items-center justify-between gap-1"
                                >
                                  <span className="truncate">
                                    {it.product_name} × {it.quantity}
                                  </span>
                                  <span className="font-medium shrink-0">
                                    {formatCurrencyIDR(it.subtotal)}
                                  </span>
                                </div>
                              ))}
                              <div className="border-t pt-1 flex items-center justify-between font-bold">
                                <span>Total</span>
                                <span>
                                  {formatCurrencyIDR(order.total_amount)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">
                                {order.shipping_address}
                              </span>
                            </div>

                            {order.tracking_number && (
                              <div className="rounded border bg-secondary/50 px-2 py-1 text-[11px] flex items-center gap-1.5">
                                <Truck className="h-3.5 w-3.5" />
                                <span className="font-mono font-medium">
                                  {order.tracking_number}
                                </span>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                              {order.payment_receipt_url ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setReceiptPreviewOrder(order)}
                                  className="h-7 text-[11px] gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  View Receipt
                                </Button>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-warning-border bg-warning-soft text-[10px] text-warning-foreground"
                                >
                                  No Receipt Yet
                                </Badge>
                              )}

                              {customerWa && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[11px] gap-1"
                                  asChild
                                >
                                  <a
                                    href={`https://wa.me/${
                                      customerWa
                                        .replace(/[^0-9]/g, "")
                                        .startsWith("08")
                                        ? `62${customerWa
                                            .replace(/[^0-9]/g, "")
                                            .slice(1)}`
                                        : customerWa.replace(/[^0-9]/g, "")
                                    }`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <MessageCircle className="h-3 w-3" />
                                    WA
                                  </a>
                                </Button>
                              )}
                            </div>

                            <div className="pt-1 space-y-1.5 border-t">
                              {nextSt && (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={statusMutation.isPending}
                                  onClick={() =>
                                    handleAdvanceStatus(order, nextSt)
                                  }
                                  className="w-full h-7 text-[11px] gap-1"
                                >
                                  Move to {nextSt}
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              )}

                              <Select
                                value={order.status}
                                onValueChange={(val) =>
                                  handleAdvanceStatus(
                                    order,
                                    val as OrderStatus
                                  )
                                }
                              >
                                <SelectTrigger className="h-7 text-[11px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ORDER_STATUSES.map((st) => (
                                    <SelectItem
                                      key={st}
                                      value={st}
                                      className="text-xs"
                                    >
                                      {st}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(receiptPreviewOrder)}
        onOpenChange={(open) => !open && setReceiptPreviewOrder(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Transfer Receipt</DialogTitle>
            <DialogDescription>
              Order{" "}
              <span className="font-mono font-semibold text-foreground">
                {receiptPreviewOrder?.slug ||
                  receiptPreviewOrder?.id.slice(0, 8)}
              </span>{" "}
              •{" "}
              {receiptPreviewOrder
                ? formatCurrencyIDR(receiptPreviewOrder.total_amount)
                : ""}
            </DialogDescription>
          </DialogHeader>
          {receiptPreviewOrder && (
            <div className="rounded-lg border bg-muted overflow-hidden flex justify-center max-h-[65vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getOrderReceiptUrl(
                  receiptPreviewOrder.slug || receiptPreviewOrder.id,
                  receiptPreviewOrder.payment_receipt_url
                )}
                alt="Transfer Receipt"
                className="max-h-[60vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(shippingModalOrder)}
        onOpenChange={(open) => !open && setShippingModalOrder(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Order to &ldquo;On Shipping&rdquo;</DialogTitle>
            <DialogDescription>
              Enter the courier tracking number (Resi JNE, J&amp;T, SiCepat,
              GoSend, etc.) so the customer can track their shipment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Courier Tracking Number (Resi)
              </label>
              <Input
                placeholder="e.g. JNE-0123456789"
                value={trackingNumberInput}
                onChange={(e) => setTrackingNumberInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShippingModalOrder(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (!shippingModalOrder) return;
                statusMutation.mutate({
                  orderId: shippingModalOrder.id,
                  status: "On Shipping",
                  tracking_number: trackingNumberInput.trim() || null,
                });
              }}
              className="gap-1.5"
            >
              {statusMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Confirm On Shipping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
