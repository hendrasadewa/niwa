import { ORDER_STATUSES, type OrderStatus } from "@niwa/open-po-validators";
import { CommerceErrors } from "../errors/commerce";
import type { MediaStorageRepo } from "../repositories/media-storage";
import type {
  NewOrderItemRecord,
  NewOrderRecord,
  OrderRepo,
} from "../repositories/orders";
import type { StoreRepo } from "../repositories/stores";
import type { WaveRepo } from "../repositories/waves";
import type { AuthUser } from "../types/auth";
import type { UploadedImageInput } from "../types/commerce";
import { validateImageUpload } from "../utils/media";
import {
  canUserAccessOrder,
  formatWhatsAppPhone,
  generateOrderSlug,
  normalizePhoneForStorage,
} from "../utils/order";
import { assertStoreOwnership } from "./stores";

export type OrderServiceDeps = {
  orderRepo: OrderRepo;
  waveRepo: WaveRepo;
  storeRepo: StoreRepo;
  mediaStorageRepo: MediaStorageRepo;
};

export function createOrderService({
  orderRepo,
  waveRepo,
  storeRepo,
  mediaStorageRepo,
}: OrderServiceDeps) {
  return {
    async checkout(input: {
      user?: AuthUser;
      payload: {
        wave_id: string;
        slug?: string;
        guest_name?: string;
        guest_whatsapp?: string;
        shipping_address?: string;
        items: Array<{ wave_product_id: string; quantity: number }>;
      };
    }) {
      const { user, payload } = input;
      const wave = await waveRepo.findById(payload.wave_id);
      if (!wave) {
        throw CommerceErrors.waveNotFound();
      }

      if (wave.status !== "Active") {
        throw CommerceErrors.waveNotActive(wave.status);
      }

      const now = Math.floor(Date.now() / 1000);
      if (now > wave.end_date) {
        throw CommerceErrors.waveEnded();
      }

      const store = await storeRepo.findById(wave.store_id);
      if (!store) {
        throw CommerceErrors.storeNotFound();
      }

      const shippingAddress =
        payload.shipping_address ?? user?.default_shipping_address ?? null;
      if (!shippingAddress) {
        throw CommerceErrors.shippingAddressRequired();
      }

      if (!user && (!payload.guest_name || !payload.guest_whatsapp)) {
        throw CommerceErrors.guestCheckoutFieldsRequired();
      }

      let orderSlug = payload.slug;
      if (orderSlug) {
        const existingSlug = await orderRepo.findBySlug(orderSlug);
        if (existingSlug) {
          throw CommerceErrors.orderSlugConflict(orderSlug);
        }
      } else {
        const storePrefix =
          store.slug
            .split("-")[0]
            ?.toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 4) || "PO";
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = generateOrderSlug(storePrefix);
          const dup = await orderRepo.findBySlug(candidate);
          if (!dup) {
            orderSlug = candidate;
            break;
          }
        }
        if (!orderSlug) {
          orderSlug = generateOrderSlug("PO");
        }
      }

      const quantityByWaveProduct = new Map<string, number>();
      for (const item of payload.items) {
        const prev = quantityByWaveProduct.get(item.wave_product_id) ?? 0;
        quantityByWaveProduct.set(item.wave_product_id, prev + item.quantity);
      }

      const requestedWpIds = Array.from(quantityByWaveProduct.keys());
      const wpRecords = await waveRepo.findWaveProductsWithProductByIds(
        wave.id,
        requestedWpIds
      );

      if (wpRecords.length !== requestedWpIds.length) {
        throw CommerceErrors.waveItemsInvalid();
      }

      const orderedMap =
        await waveRepo.getOrderedTotalsByWaveProductIds(requestedWpIds);

      for (const wp of wpRecords) {
        const requestedQty = quantityByWaveProduct.get(wp.id) ?? 0;
        if (wp.quota !== null) {
          const alreadyOrdered = orderedMap.get(wp.id) ?? 0;
          const remaining = Math.max(0, wp.quota - alreadyOrdered);
          if (requestedQty > remaining) {
            throw CommerceErrors.insufficientQuota(
              wp.product_name,
              requestedQty,
              remaining
            );
          }
        }
      }

      const orderId = crypto.randomUUID();
      let totalAmount = 0;

      const orderItemsToInsert: NewOrderItemRecord[] = [];
      const enrichedItems: Array<{
        id: string;
        order_id: string;
        wave_product_id: string;
        product_id: string;
        product_name: string;
        locked_price: number;
        quantity: number;
        subtotal: number;
      }> = [];

      for (const wp of wpRecords) {
        const quantity = quantityByWaveProduct.get(wp.id) ?? 0;
        const subtotal = wp.locked_price * quantity;
        totalAmount += subtotal;

        const itemId = crypto.randomUUID();
        orderItemsToInsert.push({
          id: itemId,
          order_id: orderId,
          wave_product_id: wp.id,
          quantity,
          subtotal,
        });

        enrichedItems.push({
          id: itemId,
          order_id: orderId,
          wave_product_id: wp.id,
          product_id: wp.product_id,
          product_name: wp.product_name,
          locked_price: wp.locked_price,
          quantity,
          subtotal,
        });
      }

      const normalizedGuestWhatsapp = payload.guest_whatsapp
        ? normalizePhoneForStorage(payload.guest_whatsapp)
        : null;
      const normalizedCustomerWhatsapp = user?.whatsapp_number
        ? normalizePhoneForStorage(user.whatsapp_number)
        : null;

      const newOrder: NewOrderRecord = {
        id: orderId,
        slug: orderSlug,
        wave_id: wave.id,
        customer_id: user ? user.id : null,
        customer_name: user ? user.name : null,
        customer_whatsapp: user ? normalizedCustomerWhatsapp : null,
        guest_name: user ? null : (payload.guest_name ?? null),
        guest_whatsapp: user ? null : normalizedGuestWhatsapp,
        shipping_address: shippingAddress,
        total_amount: totalAmount,
        payment_receipt_url: null,
        status: "Received",
        tracking_number: null,
        created_at: now,
      };

      await orderRepo.createOrderWithItems(newOrder, orderItemsToInsert);

      const customerName = user
        ? user.name
        : (payload.guest_name ?? "Customer");
      const itemsText = enrichedItems
        .map(
          (item) => `- ${item.product_name} x${item.quantity} (${item.subtotal})`
        )
        .join("\n");
      const waMessage = `Halo ${store.name}, saya ${customerName} ingin konfirmasi pembayaran Pre-Order (${wave.name}).\n\nOrder Code: ${orderSlug}\n${itemsText}\nTotal: ${totalAmount}`;
      const waPhone = formatWhatsAppPhone(store.whatsapp_contact);
      const whatsappRedirectUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;

      return {
        order: {
          ...newOrder,
          items: enrichedItems,
        },
        payment_instructions: store.payment_instructions,
        whatsapp_redirect_url: whatsappRedirectUrl,
        tracking_url: `/api/v1/track/${orderSlug}`,
      };
    },

    async listDashboardOrders(input: {
      user: AuthUser;
      filters: {
        store_id?: string;
        wave_id?: string;
        status?: string;
        view?: string;
      };
    }) {
      const { user, filters } = input;
      let storeIds: string[] | undefined;

      if (filters.store_id) {
        const store = await assertStoreOwnership(
          storeRepo,
          filters.store_id,
          user
        );
        storeIds = [store.id];
      } else if (filters.wave_id) {
        const wave = await waveRepo.findById(filters.wave_id);
        if (!wave) {
          throw CommerceErrors.waveNotFound();
        }
        await assertStoreOwnership(storeRepo, wave.store_id, user);
      } else if (!user.roles.includes("admin")) {
        const ownedStores = await storeRepo.findByOwnerId(user.id);
        if (ownedStores.length === 0) {
          return {
            orders: [],
            ...(filters.view === "kanban"
              ? {
                  kanban: Object.fromEntries(
                    ORDER_STATUSES.map((s) => [s, []])
                  ),
                }
              : {}),
          };
        }
        storeIds = ownedStores.map((s) => s.id);
      }

      const orderRows = await orderRepo.listForDashboard({
        storeIds,
        waveId: filters.wave_id,
        status: filters.status,
      });

      const items = await orderRepo.findItemsWithProductsByOrderIds(
        orderRows.map((o) => o.id)
      );
      const itemsByOrder = new Map<
        string,
        Array<{
          id: string;
          order_id: string;
          wave_product_id: string;
          quantity: number;
          subtotal: number;
          locked_price: number;
          product_id: string;
          product_name: string;
        }>
      >();

      for (const item of items) {
        const list = itemsByOrder.get(item.order_id) ?? [];
        list.push({
          id: item.id,
          order_id: item.order_id,
          wave_product_id: item.wave_product_id,
          quantity: item.quantity,
          subtotal: item.subtotal,
          locked_price: item.locked_price,
          product_id: item.product_id,
          product_name: item.product_name,
        });
        itemsByOrder.set(item.order_id, list);
      }

      const enrichedOrders = orderRows.map((order) => ({
        ...order,
        items: itemsByOrder.get(order.id) ?? [],
      }));

      if (filters.view === "kanban") {
        const kanban: Record<OrderStatus, typeof enrichedOrders> = {
          Received: [],
          "In Preparation": [],
          "Waiting for Shipment": [],
          "On Shipping": [],
          Delivered: [],
          "Received by Customer": [],
        };

        for (const order of enrichedOrders) {
          const key = order.status as OrderStatus;
          if (kanban[key]) {
            kanban[key].push(order);
          }
        }

        return {
          kanban,
          orders: enrichedOrders,
        };
      }

      return { orders: enrichedOrders };
    },

    async getOrderDetails(user: AuthUser, idOrSlug: string) {
      const order = await orderRepo.findByIdOrSlug(idOrSlug);
      if (!order) {
        throw CommerceErrors.orderNotFound();
      }

      const wave = await waveRepo.findById(order.wave_id);
      const store = wave ? await storeRepo.findById(wave.store_id) : null;

      if (!canUserAccessOrder(user, order, store?.owner_id)) {
        throw CommerceErrors.orderForbidden();
      }

      const items = await orderRepo.findItemsForOrder(order.id);

      return {
        ...order,
        is_pii_masked: false,
        wave: wave ?? null,
        store: store ?? null,
        items,
      };
    },

    async updateOrderStatus(input: {
      user: AuthUser;
      idOrSlug: string;
      status: string;
      tracking_number?: string | null;
    }) {
      const order = await orderRepo.findByIdOrSlug(input.idOrSlug);
      if (!order) {
        throw CommerceErrors.orderNotFound();
      }

      const wave = await waveRepo.findById(order.wave_id);
      if (!wave) {
        throw CommerceErrors.waveNotFound(
          "Associated pre-order wave not found"
        );
      }

      await assertStoreOwnership(storeRepo, wave.store_id, input.user);

      const resolvedTrackingNumber =
        input.tracking_number !== undefined
          ? input.tracking_number
          : order.tracking_number;

      await orderRepo.updateStatus(
        order.id,
        input.status,
        resolvedTrackingNumber
      );

      return {
        ...order,
        status: input.status,
        tracking_number: resolvedTrackingNumber,
      };
    },

    async uploadReceipt(input: {
      user?: AuthUser;
      idOrSlug: string;
      image: UploadedImageInput;
    }) {
      const order = await orderRepo.findByIdOrSlug(input.idOrSlug);
      if (!order) {
        throw CommerceErrors.orderNotFound();
      }

      const wave = await waveRepo.findById(order.wave_id);
      const store = wave ? await storeRepo.findById(wave.store_id) : null;

      if (input.user && !canUserAccessOrder(input.user, order, store?.owner_id)) {
        throw CommerceErrors.orderForbidden(
          "You do not have permission to upload a payment receipt for another customer's order"
        );
      }

      if (order.customer_id && !input.user) {
        throw CommerceErrors.memberOrderAuthRequired(
          "Please log in to upload a payment receipt for a member order"
        );
      }

      const { extension, mimeType } = validateImageUpload(input.image);
      const objectKey = `receipts/${order.id}/${crypto.randomUUID()}.${extension}`;

      await mediaStorageRepo.put(objectKey, input.image.fileBuffer, mimeType);

      if (
        order.payment_receipt_url &&
        order.payment_receipt_url !== objectKey
      ) {
        await mediaStorageRepo.delete(order.payment_receipt_url);
      }

      await orderRepo.updateReceiptUrl(order.id, objectKey);

      return {
        order: {
          id: order.id,
          slug: order.slug,
          status: order.status,
          has_payment_receipt: true,
          payment_receipt_url: input.user ? objectKey : null,
        },
        payment_receipt_url: input.user ? objectKey : null,
      };
    },

    async getReceipt(user: AuthUser, idOrSlug: string): Promise<R2ObjectBody> {
      const order = await orderRepo.findByIdOrSlug(idOrSlug);
      if (!order || !order.payment_receipt_url) {
        throw CommerceErrors.mediaNotFound("Payment receipt image not found");
      }

      const wave = await waveRepo.findById(order.wave_id);
      const store = wave ? await storeRepo.findById(wave.store_id) : null;

      if (!canUserAccessOrder(user, order, store?.owner_id)) {
        throw CommerceErrors.orderForbidden(
          "You do not have permission to view another customer's payment receipt"
        );
      }

      const object = await mediaStorageRepo.get(order.payment_receipt_url);
      if (!object) {
        throw CommerceErrors.mediaNotFound(
          "Payment receipt object not found in storage"
        );
      }

      return object;
    },
  };
}

export type OrderService = ReturnType<typeof createOrderService>;
