"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  PackageSearch,
  ShoppingBag,
  Sparkles,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient, getStoreLogoUrl } from "@/lib/api";
import type { PreOrderWave, Store } from "@/types/api";
import { formatCurrencyIDR, formatUnixDate } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const [trackingIdInput, setTrackingIdInput] = React.useState("");

  const { data: storesData, isLoading: storesLoading } = useQuery({
    queryKey: ["public-stores"],
    queryFn: () => apiClient.get<{ stores: Store[] }>("/api/v1/stores"),
  });

  const { data: activeWavesData, isLoading: wavesLoading } = useQuery({
    queryKey: ["public-active-waves"],
    queryFn: () =>
      apiClient.get<{ waves: PreOrderWave[] }>("/api/v1/waves/active"),
  });

  const stores = React.useMemo(
    () => storesData?.stores ?? [],
    [storesData?.stores]
  );
  const activeWaves = activeWavesData?.waves ?? [];

  const storesMap = React.useMemo(() => {
    const map = new Map<string, Store>();
    for (const s of stores) {
      map.set(s.id, s);
    }
    return map;
  }, [stores]);

  function handleTrackSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = trackingIdInput.trim();
    if (!trimmed) return;
    router.push(`/track/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="space-y-12 pb-16">
      <section className="border-b bg-gradient-to-b from-secondary/50 to-background py-14">
        <div className="mx-auto max-w-5xl px-4 text-center space-y-6">
          <Badge variant="secondary" className="px-3 py-1 text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Built for UMKM Pre-Order Batches & Manual WhatsApp Workflows
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Seamless Pre-Orders for{" "}
            <span className="underline decoration-primary/30 underline-offset-8">
              Local UMKM Stores
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground">
            Browse live pre-order waves with locked batch prices and real-time
            quotas, checkout as a Guest or Member, upload manual transfer
            receipts, and track every stage of fulfillment.
          </p>

          <form
            onSubmit={handleTrackSubmit}
            className="mx-auto flex max-w-lg flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2"
          >
            <div className="relative flex-1">
              <PackageSearch className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Have an Order ID? Paste it here to track..."
                value={trackingIdInput}
                onChange={(e) => setTrackingIdInput(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <Button type="submit" className="gap-1.5 shrink-0">
              Track Order
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Live Pre-Order Waves
              </h2>
              <p className="text-xs text-muted-foreground">
                Reserve items from currently open campaign batches before their
                quotas run out.
              </p>
            </div>
          </div>

          {wavesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-52 w-full rounded-xl" />
              ))}
            </div>
          ) : activeWaves.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-2">
                <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  No active pre-order waves right now
                </p>
                <p className="text-xs text-muted-foreground">
                  Are you a seller? Sign in and activate your first Pre-Order
                  Wave from the Seller Console.
                </p>
                <Button size="sm" variant="outline" className="mt-2" asChild>
                  <Link href="/seller">Open Seller Console</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeWaves.map((wave) => {
                const store = storesMap.get(wave.store_id);
                const storeSlug = store?.slug ?? wave.store_id;
                return (
                  <Card
                    key={wave.id}
                    className="flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="default" className="text-[11px]">
                          Active Wave
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Closes {formatUnixDate(wave.end_date)}
                        </span>
                      </div>
                      <CardTitle className="text-lg pt-1">
                        {wave.name}
                      </CardTitle>
                      {store && (
                        <CardDescription className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <StoreIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {store.name}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {wave.products.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No products attached yet.
                        </p>
                      ) : (
                        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-xs">
                          {wave.products.slice(0, 3).map((wp) => (
                            <div
                              key={wp.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="font-medium truncate">
                                {wp.product.name}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-semibold">
                                  {formatCurrencyIDR(wp.locked_price)}
                                </span>
                                {wp.remaining_quota !== null && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {wp.remaining_quota} left
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {wave.products.length > 3 && (
                            <p className="text-[11px] text-muted-foreground pt-1">
                              +{wave.products.length - 3} more products
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Button className="w-full gap-1.5" size="sm" asChild>
                        <Link
                          href={`/stores/${encodeURIComponent(storeSlug)}?wave=${encodeURIComponent(wave.id)}`}
                        >
                          Shop This Pre-Order Wave
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <StoreIcon className="h-5 w-5" />
              UMKM Stores Directory
            </h2>
            <p className="text-xs text-muted-foreground">
              Explore verified local sellers and browse their product catalogs &
              active waves.
            </p>
          </div>

          {storesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : stores.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No stores registered yet. Be the first to create an UMKM store!
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {stores.map((store) => (
                <Card
                  key={store.id}
                  className="flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <CardHeader className="flex flex-row items-start gap-3.5 space-y-0">
                    <div className="h-12 w-12 rounded-xl border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                      {store.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getStoreLogoUrl(store.id, store.logo_url)}
                          alt={store.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <StoreIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        {store.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        /{store.slug}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {store.description}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5"
                      asChild
                    >
                      <Link href={`/stores/${encodeURIComponent(store.slug)}`}>
                        Visit Storefront
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
