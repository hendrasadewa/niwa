"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createStoreSchema,
  type CreateStoreInput,
} from "@niwa/open-po-validators";
import {
  ArrowRight,
  CalendarClock,
  KanbanSquare,
  Loader2,
  Package,
  Plus,
  Settings,
  Store as StoreIcon,
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
import type { OrderRecord, PreOrderWave, Product, Store } from "@/types/api";
import { toast } from "@/hooks/use-toast";
import { formatCurrencyIDR, formatUnixDate } from "@/lib/utils";

function CreateStoreOnboarding({
  onCreated,
  onCancel,
}: {
  onCreated: (store: Store) => void;
  onCancel?: () => void;
}) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CreateStoreInput>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      whatsapp_contact: user?.whatsapp_number ?? "",
      payment_instructions:
        "BCA 1234567890 a/n Nama Toko\nGoPay / OVO: 081234567890\nMohon unggah bukti transfer setelah pembayaran.",
    },
  });

  async function onSubmit(values: CreateStoreInput) {
    setIsSubmitting(true);
    try {
      const payload: CreateStoreInput = {
        ...values,
        slug: values.slug?.trim() ? values.slug.trim().toLowerCase() : undefined,
      };
      const res = await apiClient.post<{ store: Store }>(
        "/api/v1/stores",
        payload
      );
      toast({
        title: "Store created!",
        description: `${res.store.name} is now live at /stores/${res.store.slug}.`,
      });
      onCreated(res.store);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not create store",
        description:
          err instanceof ApiError ? err.message : "Failed to create store.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <StoreIcon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Create Your UMKM Pre-Order Store</CardTitle>
            <CardDescription>
              Set up your store identity, WhatsApp contact, and manual transfer
              payment instructions.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Dapur Bunda Bakery" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store URL Slug (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="dapur-bunda-bakery"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="whatsapp_contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seller WhatsApp Number</FormLabel>
                  <FormControl>
                    <Input placeholder="081234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Fresh homemade artisan pastries & seasonal hampers baked per pre-order batch."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manual Payment Transfer Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Bank Account / E-Wallet details shown upon checkout..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Launch UMKM Store
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function SellerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showNewStoreForm = searchParams.get("newStore") === "1";
  const {
    activeStore,
    ownedStores,
    refreshProfile,
    setActiveStoreId,
    isLoading: authLoading,
  } = useAuth();

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["seller-products", activeStore?.id],
    queryFn: () =>
      apiClient.get<{ products: Product[] }>("/api/v1/products", {
        params: { store_id: activeStore!.id, include_archived: "true" },
      }),
    enabled: Boolean(activeStore?.id),
  });

  const { data: wavesData, isLoading: wavesLoading } = useQuery({
    queryKey: ["seller-waves", activeStore?.id],
    queryFn: () =>
      apiClient.get<{ waves: PreOrderWave[] }>("/api/v1/waves", {
        params: { store_id: activeStore!.id },
      }),
    enabled: Boolean(activeStore?.id),
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["seller-orders", activeStore?.id],
    queryFn: () =>
      apiClient.get<{ orders: OrderRecord[] }>("/api/v1/orders", {
        params: { store_id: activeStore!.id },
      }),
    enabled: Boolean(activeStore?.id),
  });

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (ownedStores.length === 0 || showNewStoreForm) {
    return (
      <CreateStoreOnboarding
        onCancel={
          ownedStores.length > 0 ? () => router.push("/seller") : undefined
        }
        onCreated={async (created) => {
          await refreshProfile();
          setActiveStoreId(created.id);
          router.push("/seller");
        }}
      />
    );
  }

  if (!activeStore) return null;

  const products = productsData?.products ?? [];
  const waves = wavesData?.waves ?? [];
  const orders = ordersData?.orders ?? [];

  const activeWaves = waves.filter((w) => w.status === "Active");
  const totalRevenue = orders.reduce((acc, o) => acc + o.total_amount, 0);
  const pendingFulfillment = orders.filter(
    (o) => o.status !== "Received by Customer"
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Pre-Order Waves</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {wavesLoading ? "..." : activeWaves.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {waves.length} total campaign waves configured
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Master Catalog Products</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {productsLoading
                ? "..."
                : products.filter((p) => !p.is_archived).length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {products.filter((p) => p.is_archived).length} archived products
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Orders In Fulfillment</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {ordersLoading ? "..." : pendingFulfillment.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {orders.length} total orders received
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gross Pre-Order Volume</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {ordersLoading ? "..." : formatCurrencyIDR(totalRevenue)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Across all pre-order batches
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Pre-Order Waves</CardTitle>
              <CardDescription>
                Manage price snapshots, quotas, and wave activation status.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/seller/waves">
                Manage Waves
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {waves.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
                <p className="text-sm font-medium">No pre-order waves yet</p>
                <p className="text-xs text-muted-foreground">
                  Add products to your Master Catalog first, then open a
                  time-bound Pre-Order Wave.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/seller/products">1. Add Products</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/seller/waves">2. Create Wave</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {waves.slice(0, 5).map((wave) => (
                  <div
                    key={wave.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/seller/waves/${wave.id}`}
                          className="font-semibold text-sm hover:underline"
                        >
                          {wave.name}
                        </Link>
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
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatUnixDate(wave.start_date)} –{" "}
                        {formatUnixDate(wave.end_date)} •{" "}
                        {wave.products?.length ?? 0} products attached
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/seller/waves/${wave.id}`}>Configure</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Jump to seller workflows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Button
              variant="outline"
              className="w-full justify-start gap-2.5"
              asChild
            >
              <Link href="/seller/orders">
                <KanbanSquare className="h-4 w-4" />
                Open Kanban Order Board
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2.5"
              asChild
            >
              <Link href="/seller/products">
                <Package className="h-4 w-4" />
                Add Master Catalog Product
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2.5"
              asChild
            >
              <Link href="/seller/waves">
                <CalendarClock className="h-4 w-4" />
                Create New Pre-Order Wave
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2.5"
              asChild
            >
              <Link href="/seller/store">
                <Settings className="h-4 w-4" />
                Edit Payment & Store Logo
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SellerOverviewPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SellerDashboardContent />
    </React.Suspense>
  );
}
