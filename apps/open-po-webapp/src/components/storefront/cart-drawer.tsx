"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/providers/cart-provider";
import { getProductImageUrl } from "@/lib/api";
import { formatCurrencyIDR } from "@/lib/utils";

export function CartDrawer() {
  const router = useRouter();
  const {
    cart,
    isDrawerOpen,
    setIsDrawerOpen,
    totalItems,
    totalAmount,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const handleCheckout = () => {
    setIsDrawerOpen(false);
    router.push("/checkout");
  };

  return (
    <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Pre-Order Cart
            {totalItems > 0 && (
              <Badge variant="secondary" className="ml-1">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {cart.waveName ? (
              <span className="flex items-center gap-1.5 text-xs">
                <Store className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">
                  {cart.storeName}
                </span>
                <span>•</span>
                <span>Wave: {cart.waveName}</span>
              </span>
            ) : (
              "Select products from an active pre-order wave to place your order."
            )}
          </DialogDescription>
        </DialogHeader>

        {cart.items.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-sm">Your pre-order cart is empty</p>
              <p className="text-xs text-muted-foreground mt-1">
                Explore active UMKM pre-order waves to reserve items before the
                batch closes.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setIsDrawerOpen(false)}
              asChild
            >
              <Link href="/">Browse Active Waves</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-border pr-1 -mr-1">
              {cart.items.map((item) => (
                <div
                  key={item.waveProductId}
                  className="py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-14 w-14 rounded-md border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getProductImageUrl(
                            item.productId,
                            item.imageUrl
                          )}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrencyIDR(item.lockedPrice)} / item
                      </p>
                      {item.remainingQuota !== null && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                          Remaining quota: {item.remainingQuota}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border rounded-md">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.waveProductId, item.quantity - 1)
                        }
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={
                          item.remainingQuota !== null &&
                          item.quantity >= item.remainingQuota
                        }
                        onClick={() =>
                          updateQuantity(item.waveProductId, item.quantity + 1)
                        }
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.waveProductId)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated Total</span>
                <span className="text-base font-bold">
                  {formatCurrencyIDR(totalAmount)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  className="text-xs"
                >
                  Clear Cart
                </Button>
                <Button
                  type="button"
                  onClick={handleCheckout}
                  className="flex-1 gap-2"
                >
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
