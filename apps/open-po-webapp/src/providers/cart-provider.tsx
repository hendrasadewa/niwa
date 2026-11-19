"use client";

import * as React from "react";
import { toast } from "@/hooks/use-toast";

export const CART_STORAGE_KEY = "open_po_cart";

export interface CartItem {
  waveProductId: string;
  productId: string;
  productName: string;
  lockedPrice: number;
  quantity: number;
  remainingQuota: number | null;
  imageUrl: string | null;
}

export interface WaveCartState {
  waveId: string | null;
  waveName: string | null;
  storeId: string | null;
  storeSlug: string | null;
  storeName: string | null;
  items: CartItem[];
}

const EMPTY_CART: WaveCartState = {
  waveId: null,
  waveName: null,
  storeId: null,
  storeSlug: null,
  storeName: null,
  items: [],
};

export interface AddToCartPayload {
  waveId: string;
  waveName: string;
  storeId: string;
  storeSlug: string;
  storeName: string;
  item: Omit<CartItem, "quantity"> & { quantity?: number };
}

export interface CartContextValue {
  cart: WaveCartState;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  totalItems: number;
  totalAmount: number;
  addItem: (payload: AddToCartPayload) => void;
  updateQuantity: (waveProductId: string, nextQuantity: number) => void;
  removeItem: (waveProductId: string) => void;
  clearCart: () => void;
}

const CartContext = React.createContext<CartContextValue | undefined>(
  undefined
);

let cartListeners: Array<() => void> = [];
let cachedCartRaw: string | null = null;
let cachedCartSnapshot: WaveCartState = EMPTY_CART;

function subscribeToCartStorage(callback: () => void) {
  cartListeners.push(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    cartListeners = cartListeners.filter((l) => l !== callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

function emitCartChange() {
  for (const listener of cartListeners) {
    listener();
  }
}

function getCartSnapshot(): WaveCartState {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (raw === cachedCartRaw) {
      return cachedCartSnapshot;
    }
    cachedCartRaw = raw;
    if (raw) {
      const parsed = JSON.parse(raw) as WaveCartState;
      if (parsed && Array.isArray(parsed.items)) {
        cachedCartSnapshot = parsed;
        return cachedCartSnapshot;
      }
    }
  } catch {
    // ignore corrupted storage
  }
  cachedCartSnapshot = EMPTY_CART;
  return cachedCartSnapshot;
}

function getServerCartSnapshot(): WaveCartState {
  return EMPTY_CART;
}

function writeCartToStorage(
  updater: WaveCartState | ((prev: WaveCartState) => WaveCartState)
) {
  const prev = getCartSnapshot();
  const next = typeof updater === "function" ? updater(prev) : updater;
  cachedCartSnapshot = next;
  if (typeof window !== "undefined") {
    try {
      const serialized = JSON.stringify(next);
      cachedCartRaw = serialized;
      window.localStorage.setItem(CART_STORAGE_KEY, serialized);
    } catch {
      // ignore storage errors
    }
  }
  emitCartChange();
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = React.useSyncExternalStore(
    subscribeToCartStorage,
    getCartSnapshot,
    getServerCartSnapshot
  );
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  const addItem = React.useCallback((payload: AddToCartPayload) => {
    const qtyToAdd = payload.item.quantity ?? 1;

    writeCartToStorage((prev) => {
      // If adding from a different wave, replace cart with the new wave
      const isDifferentWave =
        prev.waveId !== null &&
        prev.waveId !== payload.waveId &&
        prev.items.length > 0;

      const baseItems = isDifferentWave ? [] : prev.items;
      const existingIndex = baseItems.findIndex(
        (i) => i.waveProductId === payload.item.waveProductId
      );

      const maxAllowed =
        payload.item.remainingQuota !== null
          ? payload.item.remainingQuota
          : Infinity;

      if (maxAllowed <= 0) {
        toast({
          variant: "destructive",
          title: "Sold out",
          description: `${payload.item.productName} has no remaining quota in this wave.`,
        });
        return prev;
      }

      let nextItems: CartItem[];
      if (existingIndex >= 0) {
        const existing = baseItems[existingIndex]!;
        const desiredQty = existing.quantity + qtyToAdd;
        const clampedQty = Math.min(desiredQty, maxAllowed);
        nextItems = baseItems.map((it, idx) =>
          idx === existingIndex
            ? {
                ...it,
                quantity: clampedQty,
                lockedPrice: payload.item.lockedPrice,
                remainingQuota: payload.item.remainingQuota,
              }
            : it
        );
      } else {
        const clampedQty = Math.min(qtyToAdd, maxAllowed);
        nextItems = [
          ...baseItems,
          {
            waveProductId: payload.item.waveProductId,
            productId: payload.item.productId,
            productName: payload.item.productName,
            lockedPrice: payload.item.lockedPrice,
            quantity: clampedQty,
            remainingQuota: payload.item.remainingQuota,
            imageUrl: payload.item.imageUrl,
          },
        ];
      }

      if (isDifferentWave) {
        toast({
          title: "Switched Pre-Order Wave",
          description: `Cart updated to "${payload.waveName}" (${payload.storeName}).`,
        });
      } else {
        toast({
          title: "Added to pre-order cart",
          description: `${payload.item.productName} added to your cart.`,
        });
      }

      return {
        waveId: payload.waveId,
        waveName: payload.waveName,
        storeId: payload.storeId,
        storeSlug: payload.storeSlug,
        storeName: payload.storeName,
        items: nextItems,
      };
    });
  }, []);

  const updateQuantity = React.useCallback(
    (waveProductId: string, nextQuantity: number) => {
      writeCartToStorage((prev) => {
        if (nextQuantity <= 0) {
          const filtered = prev.items.filter(
            (i) => i.waveProductId !== waveProductId
          );
          return filtered.length === 0
            ? EMPTY_CART
            : { ...prev, items: filtered };
        }

        const nextItems = prev.items.map((item) => {
          if (item.waveProductId !== waveProductId) return item;
          const maxAllowed =
            item.remainingQuota !== null ? item.remainingQuota : Infinity;
          return {
            ...item,
            quantity: Math.min(nextQuantity, maxAllowed),
          };
        });

        return { ...prev, items: nextItems };
      });
    },
    []
  );

  const removeItem = React.useCallback((waveProductId: string) => {
    writeCartToStorage((prev) => {
      const filtered = prev.items.filter(
        (i) => i.waveProductId !== waveProductId
      );
      return filtered.length === 0 ? EMPTY_CART : { ...prev, items: filtered };
    });
  }, []);

  const clearCart = React.useCallback(() => {
    writeCartToStorage(EMPTY_CART);
  }, []);

  const totalItems = React.useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items]
  );

  const totalAmount = React.useMemo(
    () =>
      cart.items.reduce(
        (sum, item) => sum + item.lockedPrice * item.quantity,
        0
      ),
    [cart.items]
  );

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      isDrawerOpen,
      setIsDrawerOpen,
      totalItems,
      totalAmount,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      cart,
      isDrawerOpen,
      totalItems,
      totalAmount,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a <CartProvider>");
  }
  return context;
}
