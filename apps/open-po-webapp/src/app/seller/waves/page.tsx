"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  WAVE_STATUSES,
  type WaveStatus,
} from "@niwa/open-po-validators";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Lock,
  Play,
  Plus,
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
  Input,
  Button,
  Badge,
} from "@niwa/ui/primitives";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiError } from "@/lib/api";
import type { PreOrderWave } from "@/types/api";
import { toast } from "@niwa/ui/hooks";
import {
  formatCurrencyIDR,
  formatUnixDate,
  toUnixSeconds,
  unixToDateInputValue,
} from "@/lib/utils";

export default function SellerWavesPage() {
  const router = useRouter();
  const { activeStore } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [waveName, setWaveName] = React.useState("");
  const [startDateStr, setStartDateStr] = React.useState(() =>
    unixToDateInputValue(Math.floor(Date.now() / 1000))
  );
  const [endDateStr, setEndDateStr] = React.useState(() =>
    unixToDateInputValue(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7)
  );
  const [isCreating, setIsCreating] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["seller-waves", activeStore?.id, statusFilter],
    queryFn: () =>
      apiClient.get<{ waves: PreOrderWave[] }>("/api/v1/waves", {
        params: {
          store_id: activeStore!.id,
          status: statusFilter === "ALL" ? undefined : statusFilter,
        },
      }),
    enabled: Boolean(activeStore?.id),
  });

  async function handleCreateWave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeStore) return;

    if (!waveName.trim()) {
      toast({
        variant: "destructive",
        title: "Wave name required",
        description: "Please enter a campaign name (e.g. Batch 1: Ramadhan).",
      });
      return;
    }

    const startEpoch = toUnixSeconds(`${startDateStr}T00:00:00`);
    const endEpoch = toUnixSeconds(`${endDateStr}T23:59:59`);

    if (endEpoch < startEpoch) {
      toast({
        variant: "destructive",
        title: "Invalid dates",
        description: "End date must be on or after the start date.",
      });
      return;
    }

    setIsCreating(true);
    try {
      const res = await apiClient.post<{ wave: PreOrderWave }>(
        "/api/v1/waves",
        {
          store_id: activeStore.id,
          name: waveName.trim(),
          start_date: startEpoch,
          end_date: endEpoch,
          status: "Draft",
        }
      );
      await queryClient.invalidateQueries({
        queryKey: ["seller-waves", activeStore.id],
      });
      toast({
        title: "Pre-order wave created",
        description: "Now attach products and lock prices for this wave.",
      });
      setCreateOpen(false);
      setWaveName("");
      router.push(`/seller/waves/${res.wave.id}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not create wave",
        description:
          err instanceof ApiError ? err.message : "Failed to create wave.",
      });
    } finally {
      setIsCreating(false);
    }
  }

  const statusMutation = useMutation({
    mutationFn: ({
      waveId,
      status,
    }: {
      waveId: string;
      status: WaveStatus;
    }) =>
      apiClient.patch<{ wave: PreOrderWave }>(
        `/api/v1/waves/${waveId}/status`,
        { status }
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ["seller-waves", activeStore?.id],
      });
      toast({
        title: `Wave marked as ${res.wave.status}`,
        description: `${res.wave.name} is now ${res.wave.status}.`,
      });
    },
  });

  if (!activeStore) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Please create a store from the Seller Overview tab first.
      </div>
    );
  }

  const waves = data?.waves ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">
              Pre-Order Waves (Campaign Batches)
            </CardTitle>
            <CardDescription>
              Create time-bound pre-order batches, attach products with locked
              snapshot prices & quotas, and activate sales.
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            New Pre-Order Wave
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {["ALL", ...WAVE_STATUSES].map((st) => (
              <Button
                key={st}
                type="button"
                size="sm"
                variant={statusFilter === st ? "default" : "outline"}
                onClick={() => setStatusFilter(st)}
                className="h-8 text-xs"
              >
                {st === "ALL" ? "All Waves" : st}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : waves.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center space-y-2">
              <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No Pre-Order Waves Found</p>
              <p className="text-xs text-muted-foreground">
                Create a wave in Draft mode, select products from your Master
                Catalog, and activate it when ready.
              </p>
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="mt-2"
              >
                Create First Wave
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {waves.map((wave) => (
                <Card key={wave.id} className="flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">
                          <Link
                            href={`/seller/waves/${wave.id}`}
                            className="hover:underline"
                          >
                            {wave.name}
                          </Link>
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {formatUnixDate(wave.start_date)} –{" "}
                          {formatUnixDate(wave.end_date)}
                        </CardDescription>
                      </div>
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
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-medium">
                        <span>Snapshot Products Included</span>
                        <span>{wave.products?.length ?? 0} items</span>
                      </div>
                      {wave.products && wave.products.length > 0 && (
                        <div className="space-y-1 pt-1 border-t">
                          {wave.products.slice(0, 3).map((wp) => (
                            <div
                              key={wp.id}
                              className="flex items-center justify-between text-muted-foreground"
                            >
                              <span className="truncate max-w-[180px]">
                                {wp.product.name}
                              </span>
                              <span>
                                {formatCurrencyIDR(wp.locked_price)} •{" "}
                                {wp.quota !== null
                                  ? `${wp.ordered_quantity}/${wp.quota} sold`
                                  : `${wp.ordered_quantity} sold`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {wave.status === "Draft" && (
                          <Button
                            size="sm"
                            variant="default"
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                waveId: wave.id,
                                status: "Active",
                              })
                            }
                            className="h-8 gap-1 text-xs"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Activate Wave
                          </Button>
                        )}
                        {wave.status === "Active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                waveId: wave.id,
                                status: "Closed",
                              })
                            }
                            className="h-8 gap-1 text-xs"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            Close Wave
                          </Button>
                        )}
                        {wave.status === "Closed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                waveId: wave.id,
                                status: "Active",
                              })
                            }
                            className="h-8 gap-1 text-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Re-open Wave
                          </Button>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 gap-1 text-xs"
                        asChild
                      >
                        <Link href={`/seller/waves/${wave.id}`}>
                          Configure Products
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Pre-Order Wave</DialogTitle>
            <DialogDescription>
              Waves start in Draft status so you can attach products, lock their
              prices, and set item quotas before opening sales.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Wave / Batch Name</label>
              <Input
                placeholder="Batch 1: Ramadhan Hampers Special"
                value={waveName}
                onChange={(e) => setWaveName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="gap-2">
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Draft Wave
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
