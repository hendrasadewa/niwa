"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type WaveStatus } from "@niwa/open-po-validators";
import {
  ArrowLeft,
  Loader2,
  Lock,
  PackagePlus,
  Play,
  Save,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiError } from "@/lib/api";
import type { PreOrderWave, Product } from "@/types/api";
import { toast } from "@/hooks/use-toast";
import {
  formatCurrencyIDR,
  formatUnixDate,
  toUnixSeconds,
  unixToDateInputValue,
} from "@/lib/utils";

export default function SellerWaveDetailPage() {
  const params = useParams<{ id: string }>();
  const waveId = params.id;
  const { activeStore } = useAuth();
  const queryClient = useQueryClient();

  const [selectedProductId, setSelectedProductId] = React.useState<string>("");
  const [lockedPriceInput, setLockedPriceInput] = React.useState<string>("");
  const [quotaInput, setQuotaInput] = React.useState<string>("");

  const [editNameOverride, setEditName] = React.useState<string | null>(null);
  const [editStartOverride, setEditStart] = React.useState<string | null>(null);
  const [editEndOverride, setEditEnd] = React.useState<string | null>(null);

  const { data: waveData, isLoading: waveLoading } = useQuery({
    queryKey: ["seller-wave-detail", waveId],
    queryFn: () =>
      apiClient.get<{ wave: PreOrderWave }>(`/api/v1/waves/${waveId}`),
    enabled: Boolean(waveId),
  });

  const wave = waveData?.wave;
  const editName = editNameOverride ?? wave?.name ?? "";
  const editStart =
    editStartOverride ?? unixToDateInputValue(wave?.start_date);
  const editEnd = editEndOverride ?? unixToDateInputValue(wave?.end_date);

  const { data: catalogData } = useQuery({
    queryKey: ["seller-products", wave?.store_id ?? activeStore?.id, false],
    queryFn: () =>
      apiClient.get<{ products: Product[] }>("/api/v1/products", {
        params: {
          store_id: wave?.store_id ?? activeStore!.id,
          include_archived: "false",
        },
      }),
    enabled: Boolean(wave?.store_id || activeStore?.id),
  });

  const catalogProducts = catalogData?.products ?? [];

  function handleSelectProduct(prodId: string) {
    setSelectedProductId(prodId);
    const matched = catalogProducts.find((p) => p.id === prodId);
    if (matched) {
      setLockedPriceInput(String(matched.base_price));
    }
  }

  const updateMetaMutation = useMutation({
    mutationFn: () =>
      apiClient.put<{ wave: PreOrderWave }>(`/api/v1/waves/${waveId}`, {
        name: editName.trim(),
        start_date: toUnixSeconds(`${editStart}T00:00:00`),
        end_date: toUnixSeconds(`${editEnd}T23:59:59`),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["seller-wave-detail", waveId],
      });
      queryClient.invalidateQueries({
        queryKey: ["seller-waves"],
      });
      toast({
        title: "Wave schedule updated",
        description: "Wave name and dates have been saved.",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: WaveStatus) =>
      apiClient.patch<{ wave: PreOrderWave }>(
        `/api/v1/waves/${waveId}/status`,
        { status }
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ["seller-wave-detail", waveId],
      });
      queryClient.invalidateQueries({
        queryKey: ["seller-waves"],
      });
      toast({
        title: `Wave is now ${res.wave.status}`,
        description:
          res.wave.status === "Active"
            ? "Customers can now browse and place orders in this wave."
            : `Wave status changed to ${res.wave.status}.`,
      });
    },
  });

  const upsertProductMutation = useMutation({
    mutationFn: (payload: {
      product_id: string;
      locked_price: number;
      quota: number | null;
    }) => apiClient.post(`/api/v1/waves/${waveId}/products`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["seller-wave-detail", waveId],
      });
      queryClient.invalidateQueries({
        queryKey: ["seller-waves"],
      });
      setSelectedProductId("");
      setLockedPriceInput("");
      setQuotaInput("");
      toast({
        title: "Wave product snapshot saved",
        description:
          "Locked price and quota updated for this pre-order wave.",
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not attach product",
        description:
          err instanceof ApiError ? err.message : "Failed to attach product.",
      });
    },
  });

  const removeProductMutation = useMutation({
    mutationFn: (waveProductId: string) =>
      apiClient.delete(`/api/v1/waves/${waveId}/products/${waveProductId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["seller-wave-detail", waveId],
      });
      queryClient.invalidateQueries({
        queryKey: ["seller-waves"],
      });
      toast({
        title: "Product removed from wave",
      });
    },
  });

  function handleAttachSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId) {
      toast({
        variant: "destructive",
        title: "Select a product",
        description: "Choose a product from your Master Catalog.",
      });
      return;
    }

    const lockedPrice = parseInt(lockedPriceInput, 10);
    if (Number.isNaN(lockedPrice) || lockedPrice < 0) {
      toast({
        variant: "destructive",
        title: "Invalid locked price",
        description: "Enter a valid non-negative integer price.",
      });
      return;
    }

    const parsedQuota =
      quotaInput.trim() === "" ? null : parseInt(quotaInput.trim(), 10);

    if (parsedQuota !== null && (Number.isNaN(parsedQuota) || parsedQuota <= 0)) {
      toast({
        variant: "destructive",
        title: "Invalid quota",
        description: "Quota must be a positive integer or left empty.",
      });
      return;
    }

    upsertProductMutation.mutate({
      product_id: selectedProductId,
      locked_price: lockedPrice,
      quota: parsedQuota,
    });
  }

  if (waveLoading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!wave) {
    return (
      <div className="rounded-lg border p-8 text-center space-y-3">
        <p className="text-sm font-medium">Pre-order wave not found</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/seller/waves">Back to Waves</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/seller/waves">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-medium tracking-[-0.015em]">{wave.name}</h2>
              <Badge
                variant={
                  wave.status === "Active"
                    ? "default"
                    : wave.status === "Draft"
                      ? "secondary"
                      : "outline"
                }
              >
                {wave.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatUnixDate(wave.start_date)} –{" "}
              {formatUnixDate(wave.end_date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {wave.status !== "Active" && (
            <Button
              size="sm"
              onClick={() => statusMutation.mutate("Active")}
              disabled={statusMutation.isPending}
              className="gap-1.5"
            >
              <Play className="h-4 w-4" />
              Activate Wave (Open Sales)
            </Button>
          )}
          {wave.status === "Active" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => statusMutation.mutate("Closed")}
              disabled={statusMutation.isPending}
              className="gap-1.5"
            >
              <Lock className="h-4 w-4" />
              Close Wave
            </Button>
          )}
          {wave.status === "Active" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => statusMutation.mutate("Draft")}
              disabled={statusMutation.isPending}
              className="gap-1.5"
            >
              Move to Draft
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Attach Product Snapshot
            </CardTitle>
            <CardDescription>
              Pick a product from your Master Catalog, lock its price for this
              wave, and optionally set an item quota.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAttachSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Master Catalog Product
                </label>
                <Select
                  value={selectedProductId}
                  onValueChange={handleSelectProduct}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({formatCurrencyIDR(p.base_price)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Locked Wave Price (IDR)
                </label>
                <Input
                  type="number"
                  min={0}
                  step={500}
                  placeholder="e.g. 85000"
                  value={lockedPriceInput}
                  onChange={(e) => setLockedPriceInput(e.target.value)}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Locked for all orders in this wave even if base catalog price
                  changes later.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Wave Quota (Optional)
                </label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Leave empty for unlimited quota"
                  value={quotaInput}
                  onChange={(e) => setQuotaInput(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={
                  upsertProductMutation.isPending ||
                  catalogProducts.length === 0
                }
                className="w-full gap-2"
              >
                {upsertProductMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackagePlus className="h-4 w-4" />
                )}
                Add / Update in Wave
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Wave Products & Quota Tracking ({wave.products.length})
            </CardTitle>
            <CardDescription>
              Products included in this campaign batch along with real-time sold
              quantities and remaining quotas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {wave.products.length === 0 ? (
              <div className="rounded-lg border border-dashed py-10 text-center space-y-2">
                <p className="text-sm font-medium">
                  No products attached to this wave yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Use the form on the left to attach products from your Master
                  Catalog.
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Base Price</TableHead>
                      <TableHead>Locked Price</TableHead>
                      <TableHead>Quota & Sold</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wave.products.map((wp) => {
                      const pct =
                        wp.quota && wp.quota > 0
                          ? Math.min(
                              100,
                              Math.round((wp.ordered_quantity / wp.quota) * 100)
                            )
                          : 0;
                      return (
                        <TableRow key={wp.id}>
                          <TableCell className="font-medium text-sm">
                            {wp.product.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatCurrencyIDR(wp.product.base_price)}
                          </TableCell>
                          <TableCell className="font-semibold text-sm">
                            {formatCurrencyIDR(wp.locked_price)}
                          </TableCell>
                          <TableCell className="w-[180px]">
                            {wp.quota !== null ? (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>
                                    {wp.ordered_quantity} / {wp.quota} ordered
                                  </span>
                                  <span className="font-medium">
                                    {wp.remaining_quota} left
                                  </span>
                                </div>
                                <Progress value={pct} className="h-1.5" />
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {wp.ordered_quantity} ordered (Unlimited)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedProductId(wp.product_id);
                                  setLockedPriceInput(String(wp.locked_price));
                                  setQuotaInput(
                                    wp.quota !== null ? String(wp.quota) : ""
                                  );
                                }}
                                className="h-8 text-xs"
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={
                                  wp.ordered_quantity > 0 ||
                                  removeProductMutation.isPending
                                }
                                onClick={() =>
                                  removeProductMutation.mutate(wp.id)
                                }
                                title={
                                  wp.ordered_quantity > 0
                                    ? "Cannot remove product with existing orders"
                                    : "Remove from wave"
                                }
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wave Schedule & Metadata</CardTitle>
          <CardDescription>
            Update the campaign title or adjust the pre-order start and end
            dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium">Wave Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Start Date</label>
              <Input
                type="date"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">End Date</label>
              <Input
                type="date"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={updateMetaMutation.isPending}
              onClick={() => updateMetaMutation.mutate()}
              className="gap-1.5"
            >
              {updateMetaMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Wave Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
