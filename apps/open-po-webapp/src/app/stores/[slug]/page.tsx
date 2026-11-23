"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ExternalLink,
  Loader2,
  MessageCircle,
  Package,
  Plus,
  ShoppingBag,
  Store as StoreIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiClient, getProductImageUrl, getStoreLogoUrl } from "@/lib/api";
import type { PreOrderWave, Product, Store } from "@/types/api";
import { useCart } from "@/providers/cart-provider";
import { formatCurrencyIDR, formatUnixDate } from "@/lib/utils";

function StorefrontContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const preferredWaveId = searchParams.get("wave");

  const { addItem, setIsDrawerOpen } = useCart();
  const [selectedWaveId, setSelectedWaveId] = React.useState<string | null>(
    preferredWaveId
  );

  const { data: activeWaveData, isLoading: waveLoading } = useQuery({
    queryKey: ["storefront-active-waves", slug],
    queryFn: () =>
      apiClient.get<{ store: Store; waves: PreOrderWave[] }>(
        `/api/v1/stores/${encodeURIComponent(slug)}/waves/active`
      ),
    enabled: Boolean(slug),
  });

  const store = activeWaveData?.store;
  const activeWaves = React.useMemo(
    () => activeWaveData?.waves ?? [],
    [activeWaveData?.waves]
  );

  const { data: catalogData } = useQuery({
    queryKey: ["storefront-catalog", store?.id ?? slug],
    queryFn: () =>
      apiClient.get<{ products: Product[] }>("/api/v1/products", {
        params: { store_id: store?.id ?? slug, include_archived: "false" },
      }),
    enabled: Boolean(store?.id || slug),
  });

  if (waveLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-3">
        <StoreIcon className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="font-serif text-2xl font-medium">Store not found</h1>
        <p className="text-sm text-muted-foreground">
          The UMKM store you are looking for does not exist or may have changed
          its slug.
        </p>
        <Button variant="outline" asChild>
          <Link href="/">Back to Explore</Link>
        </Button>
      </div>
    );
  }

  const currentWave =
    activeWaves.find((w) => w.id === selectedWaveId) ?? activeWaves[0] ?? null;
  const catalogProducts = catalogData?.products ?? [];

  const cleanWa = store.whatsapp_contact.replace(/[^0-9]/g, "");
  const waHref = `https://wa.me/${
    cleanWa.startsWith("08") ? `62${cleanWa.slice(1)}` : cleanWa
  }`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      <div className="rounded-[var(--radius-2xl)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="h-20 w-20 rounded-[var(--radius-xl)] border border-border bg-surface-muted overflow-hidden shrink-0 flex items-center justify-center">
            {store.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getStoreLogoUrl(store.id, store.logo_url)}
                alt={store.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <StoreIcon className="h-9 w-9 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-[-0.015em]">
                {store.name}
              </h1>
              <Badge variant="secondary" className="text-xs">
                /{store.slug}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {store.description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={waHref} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              Chat Seller on WhatsApp
            </a>
          </Button>
        </div>
      </div>

      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-medium tracking-[-0.015em] flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Active Pre-Order Waves
            </h2>
            <p className="text-xs text-muted-foreground">
              Select a pre-order wave below to add items at locked batch prices.
            </p>
          </div>

          {activeWaves.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {activeWaves.map((w) => (
                <Button
                  key={w.id}
                  type="button"
                  size="sm"
                  variant={currentWave?.id === w.id ? "default" : "outline"}
                  onClick={() => setSelectedWaveId(w.id)}
                >
                  {w.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {!currentWave ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-2">
              <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                No active pre-order wave is open at the moment
              </p>
              <p className="text-xs text-muted-foreground">
                Check out the store&apos;s Master Catalog below or contact the
                seller via WhatsApp for the next batch schedule.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border bg-secondary/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Badge variant="default">Open Batch</Badge>
                <span className="font-semibold text-sm">
                  {currentWave.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Pre-Order Period: {formatUnixDate(currentWave.start_date)} –{" "}
                {formatUnixDate(currentWave.end_date)}
              </span>
            </div>

            {currentWave.products.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  The seller has not attached any products to this wave yet.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {currentWave.products.map((wp) => {
                  const isSoldOut =
                    wp.remaining_quota !== null && wp.remaining_quota <= 0;
                  const pctSold =
                    wp.quota && wp.quota > 0
                      ? Math.min(
                          100,
                          Math.round((wp.ordered_quantity / wp.quota) * 100)
                        )
                      : 0;

                  return (
                    <Card
                      key={wp.id}
                      className="flex flex-col justify-between overflow-hidden"
                    >
                      <div>
                        <div className="aspect-[16/10] w-full bg-muted border-b overflow-hidden relative flex items-center justify-center">
                          {wp.product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getProductImageUrl(
                                wp.product.id,
                                wp.product.image_url
                              )}
                              alt={wp.product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-10 w-10 text-muted-foreground" />
                          )}
                          <div className="absolute top-2.5 right-2.5">
                            {isSoldOut ? (
                              <Badge variant="destructive">Sold Out</Badge>
                            ) : wp.remaining_quota !== null ? (
                              <Badge variant="secondary">
                                {wp.remaining_quota} quota left
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Open Quota</Badge>
                            )}
                          </div>
                        </div>

                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-start justify-between gap-2">
                            <Link
                              href={`/products/${wp.product.id}`}
                              className="hover:underline"
                            >
                              {wp.product.name}
                            </Link>
                          </CardTitle>
                          <CardDescription className="text-xs line-clamp-2">
                            {wp.product.description}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold">
                              {formatCurrencyIDR(wp.locked_price)}
                            </span>
                            {wp.locked_price !== wp.product.base_price && (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatCurrencyIDR(wp.product.base_price)}
                              </span>
                            )}
                          </div>

                          {wp.quota !== null && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] text-muted-foreground">
                                <span>
                                  {wp.ordered_quantity} / {wp.quota} reserved
                                </span>
                                <span>{pctSold}%</span>
                              </div>
                              <Progress value={pctSold} className="h-1.5" />
                            </div>
                          )}
                        </CardContent>
                      </div>

                      <CardFooter className="pt-2 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          asChild
                        >
                          <Link href={`/products/${wp.product.id}`}>
                            Reviews
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          disabled={isSoldOut}
                          onClick={() => {
                            addItem({
                              waveId: currentWave.id,
                              waveName: currentWave.name,
                              storeId: store.id,
                              storeSlug: store.slug,
                              storeName: store.name,
                              item: {
                                waveProductId: wp.id,
                                productId: wp.product.id,
                                productName: wp.product.name,
                                lockedPrice: wp.locked_price,
                                remainingQuota: wp.remaining_quota,
                                imageUrl: wp.product.image_url,
                                quantity: 1,
                              },
                            });
                            setIsDrawerOpen(true);
                          }}
                          className="flex-1 gap-1.5"
                        >
                          <Plus className="h-4 w-4" />
                          {isSoldOut ? "Quota Full" : "Add to Pre-Order"}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {catalogProducts.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-border">
          <div>
            <h2 className="font-serif text-xl font-medium tracking-[-0.015em]">
              Store Master Catalog ({catalogProducts.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              All signature products from {store.name}. Click any item to read
              verified customer reviews.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {catalogProducts.map((prod) => (
              <Card key={prod.id} className="flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    <Link
                      href={`/products/${prod.id}`}
                      className="hover:underline"
                    >
                      {prod.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {prod.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-2 flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    Base: {formatCurrencyIDR(prod.base_price)}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <Link href={`/products/${prod.id}`}>Details & Reviews</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function StorefrontPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-20 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <StorefrontContent />
    </React.Suspense>
  );
}
