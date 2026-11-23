"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Package,
  Star,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient, getProductImageUrl } from "@/lib/api";
import type { Product, ProductReview, ReviewSummary } from "@/types/api";
import { formatCurrencyIDR, formatUnixDate } from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: () =>
      apiClient.get<{ product: Product }>(
        `/api/v1/products/${encodeURIComponent(productId)}`
      ),
    enabled: Boolean(productId),
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: () =>
      apiClient.get<{
        product_id: string;
        summary: ReviewSummary;
        reviews: ProductReview[];
      }>(`/api/v1/products/${encodeURIComponent(productId)}/reviews`),
    enabled: Boolean(productId),
  });

  if (productLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const product = productData?.product;
  if (!product) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-3">
        <Package className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="font-serif text-2xl font-medium">Product Not Found</h1>
        <Button variant="outline" asChild>
          <Link href="/">Back to Explore</Link>
        </Button>
      </div>
    );
  }

  const summary = reviewsData?.summary ??
    product.review_summary ?? { average_rating: 0, total_reviews: 0 };
  const reviews = reviewsData?.reviews ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
          <Link href={`/stores/${product.store_id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Storefront
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-2xl border bg-muted overflow-hidden flex items-center justify-center">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getProductImageUrl(product.id, product.image_url)}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Package className="h-16 w-16 text-muted-foreground" />
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Master Catalog Item</Badge>
            {product.is_archived && <Badge variant="outline">Archived</Badge>}
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-[-0.015em]">
            {product.name}
          </h1>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-warning">
              <Star className="h-4 w-4 fill-current" />
              <span className="font-bold text-sm text-foreground">
                {summary.average_rating.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              ({summary.total_reviews} verified{" "}
              {summary.total_reviews === 1 ? "review" : "reviews"})
            </span>
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground">Base Catalog Price</p>
            <p className="text-2xl font-bold">
              {formatCurrencyIDR(product.base_price)}
            </p>
          </div>

          <div className="rounded-xl border bg-muted/40 p-4 text-sm leading-relaxed">
            {product.description}
          </div>

          <Button className="w-full" asChild>
            <Link href={`/stores/${product.store_id}`}>
              View Active Pre-Order Waves for This Store
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Verified Post-Delivery Customer Reviews ({summary.total_reviews})
          </CardTitle>
          <CardDescription>
            Reviews can only be submitted by members after their pre-order is
            marked as &ldquo;Received by Customer&rdquo;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviewsLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              No reviews submitted for this product yet.
            </div>
          ) : (
            <div className="divide-y">
              {reviews.map((rev) => (
                <div key={rev.id} className="py-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">
                      {rev.customer_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatUnixDate(rev.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 text-warning">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`h-3.5 w-3.5 ${
                          idx < rev.rating
                            ? "fill-current"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/90 pt-1">
                    {rev.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
