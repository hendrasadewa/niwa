import { ORDER_STATUSES, type OrderStatus } from "@niwa/open-po-validators";
import { CommerceErrors } from "../errors/commerce";
import type { OrderRepo } from "../repositories/orders";
import type { StoreRepo } from "../repositories/stores";
import type { WaveRepo } from "../repositories/waves";
import type { AuthUser } from "../types/auth";
import {
  canUserAccessOrder,
  getPhoneLookupVariants,
  isSamePhoneNumber,
  maskAddress,
  maskName,
  maskPhone,
} from "../utils/order";

export type TrackingServiceDeps = {
  orderRepo: OrderRepo;
  waveRepo: WaveRepo;
  storeRepo: StoreRepo;
};

export function createTrackingService({
  orderRepo,
  waveRepo,
  storeRepo,
}: TrackingServiceDeps) {
  return {
    async lookupByPhone(input: {
      viewer?: AuthUser;
      phone?: string;
      whatsapp?: string;
      store_id?: string;
    }) {
      const targetPhone = (input.phone ?? input.whatsapp)!;
      const { viewer } = input;

      let resolvedStoreId: string | undefined;
      let resolvedStoreOwnerId: string | undefined;
      if (input.store_id) {
        const store = await storeRepo.findByIdOrSlug(input.store_id);
        resolvedStoreId = store ? store.id : input.store_id;
        resolvedStoreOwnerId = store?.owner_id;
      }

      if (viewer && !viewer.roles.includes("admin")) {
        const isAuthorizedStoreOwner =
          Boolean(resolvedStoreOwnerId) && resolvedStoreOwnerId === viewer.id;

        if (
          !isAuthorizedStoreOwner &&
          !isSamePhoneNumber(viewer.whatsapp_number, targetPhone)
        ) {
          throw CommerceErrors.lookupForbidden();
        }
      }

      const variants = getPhoneLookupVariants(targetPhone);
      const matchedOrders = await orderRepo.listByPhoneVariants(
        variants,
        resolvedStoreId
      );

      const visibleOrders = viewer
        ? matchedOrders.filter((o) =>
            canUserAccessOrder(viewer, o, o.store.owner_id)
          )
        : matchedOrders;

      if (visibleOrders.length === 0) {
        return {
          phone: viewer ? targetPhone : maskPhone(targetPhone),
          is_pii_masked: !viewer,
          total: 0,
          orders: [],
        };
      }

      const itemRows = await orderRepo.findItemsWithProductsByOrderIds(
        visibleOrders.map((o) => o.id)
      );
      const itemsByOrder = new Map<string, typeof itemRows>();
      for (const item of itemRows) {
        const list = itemsByOrder.get(item.order_id) ?? [];
        list.push(item);
        itemsByOrder.set(item.order_id, list);
      }

      const formattedOrders = visibleOrders.map((order) => {
        const isUnlocked = viewer
          ? canUserAccessOrder(viewer, order, order.store.owner_id)
          : false;
        const rawName = order.customer_name ?? order.guest_name ?? "Customer";
        const rawPhoneNum =
          order.guest_whatsapp ?? order.customer_whatsapp ?? null;

        return {
          id: order.id,
          slug: order.slug,
          wave_id: order.wave_id,
          customer_id: order.customer_id,
          is_pii_masked: !isUnlocked,
          customer_display_name: isUnlocked ? rawName : maskName(rawName),
          whatsapp_number: isUnlocked ? rawPhoneNum : maskPhone(rawPhoneNum),
          shipping_address: isUnlocked
            ? order.shipping_address
            : maskAddress(order.shipping_address),
          total_amount: order.total_amount,
          has_payment_receipt: Boolean(order.payment_receipt_url),
          payment_receipt_url: isUnlocked ? order.payment_receipt_url : null,
          status: order.status,
          tracking_number: order.tracking_number,
          created_at: order.created_at,
          tracking_url: `/api/v1/track/${order.slug}`,
          wave: order.wave,
          store: {
            id: order.store.id,
            slug: order.store.slug,
            name: order.store.name,
            whatsapp_contact: order.store.whatsapp_contact,
          },
          items: itemsByOrder.get(order.id) ?? [],
        };
      });

      return {
        phone: viewer ? targetPhone : maskPhone(targetPhone),
        is_pii_masked: !viewer,
        total: formattedOrders.length,
        orders: formattedOrders,
      };
    },

    async getTrackingTimeline(idOrSlug: string, viewer?: AuthUser) {
      const order = await orderRepo.findByIdOrSlug(idOrSlug);
      if (!order) {
        throw CommerceErrors.orderNotFound();
      }

      const wave = await waveRepo.findById(order.wave_id);
      const store = wave ? await storeRepo.findById(wave.store_id) : null;

      if (viewer && !canUserAccessOrder(viewer, order, store?.owner_id)) {
        throw CommerceErrors.orderForbidden();
      }

      const rawCustomerName =
        order.customer_name ?? order.guest_name ?? "Customer";
      const rawCustomerPhone =
        order.customer_whatsapp ?? order.guest_whatsapp ?? null;

      const items = (await orderRepo.findItemsForOrder(order.id)).map(
        (item) => ({
          id: item.id,
          wave_product_id: item.wave_product_id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_image_url: item.product_image_url,
          locked_price: item.locked_price,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })
      );

      const currentStepIndex = Math.max(
        0,
        ORDER_STATUSES.indexOf(order.status as OrderStatus)
      );

      const timeline = ORDER_STATUSES.map((stepStatus, idx) => ({
        status: stepStatus,
        step_index: idx,
        is_completed: idx <= currentStepIndex,
        is_current: idx === currentStepIndex,
      }));

      const isUnlocked = Boolean(viewer);

      return {
        order_id: order.id,
        order_slug: order.slug,
        status: order.status,
        current_step_index: currentStepIndex,
        timeline,
        tracking_number: order.tracking_number,
        total_amount: order.total_amount,
        has_payment_receipt: Boolean(order.payment_receipt_url),
        payment_receipt_url: isUnlocked ? order.payment_receipt_url : null,
        is_pii_masked: !isUnlocked,
        customer_display_name: isUnlocked
          ? rawCustomerName
          : maskName(rawCustomerName),
        whatsapp_number: isUnlocked
          ? rawCustomerPhone
          : maskPhone(rawCustomerPhone),
        shipping_address: isUnlocked
          ? order.shipping_address
          : maskAddress(order.shipping_address),
        can_review: order.status === "Received by Customer",
        created_at: order.created_at,
        wave: wave
          ? {
              id: wave.id,
              name: wave.name,
              status: wave.status,
              store_id: wave.store_id,
            }
          : null,
        store: store
          ? {
              id: store.id,
              slug: store.slug,
              name: store.name,
              logo_url: store.logo_url,
              payment_instructions: store.payment_instructions,
              whatsapp_contact: store.whatsapp_contact,
            }
          : null,
        items,
      };
    },

    async confirmReceived(idOrSlug: string, viewer?: AuthUser) {
      const order = await orderRepo.findByIdOrSlug(idOrSlug);
      if (!order) {
        throw CommerceErrors.orderNotFound();
      }

      const wave = await waveRepo.findById(order.wave_id);
      const store = wave ? await storeRepo.findById(wave.store_id) : null;

      if (viewer && !canUserAccessOrder(viewer, order, store?.owner_id)) {
        throw CommerceErrors.orderForbidden(
          "You do not have permission to modify another customer's order"
        );
      }

      if (order.customer_id && !viewer) {
        throw CommerceErrors.memberOrderAuthRequired(
          "Please log in to confirm receipt of a member order"
        );
      }

      if (
        order.status !== "Delivered" &&
        order.status !== "On Shipping" &&
        order.status !== "Received by Customer"
      ) {
        throw CommerceErrors.orderInvalidStatusForConfirm(order.status);
      }

      await orderRepo.updateStatus(order.id, "Received by Customer");

      return {
        id: order.id,
        slug: order.slug,
        status: "Received by Customer",
      };
    },
  };
}

export type TrackingService = ReturnType<typeof createTrackingService>;
