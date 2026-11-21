import { and, desc, eq, inArray, or, type SQL } from "drizzle-orm";
import {
  orderItems,
  orders,
  preOrderWaves,
  products,
  stores,
  waveProducts,
  type Database,
} from "../db";

export type OrderRecord = typeof orders.$inferSelect;
export type NewOrderRecord = typeof orders.$inferInsert;
export type NewOrderItemRecord = typeof orderItems.$inferInsert;

export function createOrderRepo(db: Database) {
  return {
    async findByIdOrSlug(idOrSlug: string): Promise<OrderRecord | null> {
      const trimmed = idOrSlug.trim();
      const upper = trimmed.toUpperCase();

      const [row] = await db
        .select()
        .from(orders)
        .where(
          or(
            eq(orders.id, trimmed),
            eq(orders.slug, upper),
            eq(orders.slug, trimmed)
          )
        )
        .limit(1);

      return row ?? null;
    },

    async findBySlug(slug: string): Promise<{ id: string } | null> {
      const [row] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.slug, slug))
        .limit(1);
      return row ?? null;
    },

    async hasOrderItemsForWaveProduct(waveProductId: string): Promise<boolean> {
      const [row] = await db
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(eq(orderItems.wave_product_id, waveProductId))
        .limit(1);
      return Boolean(row);
    },

    async hasProductInOrder(
      orderId: string,
      productId: string
    ): Promise<boolean> {
      const [row] = await db
        .select({ id: orderItems.id })
        .from(orderItems)
        .innerJoin(
          waveProducts,
          eq(orderItems.wave_product_id, waveProducts.id)
        )
        .where(
          and(
            eq(orderItems.order_id, orderId),
            eq(waveProducts.product_id, productId)
          )
        )
        .limit(1);
      return Boolean(row);
    },

    async createOrderWithItems(
      order: NewOrderRecord,
      items: NewOrderItemRecord[]
    ): Promise<void> {
      if (items.length === 0) {
        await db.insert(orders).values(order);
        return;
      }

      await db.batch([
        db.insert(orders).values(order),
        db.insert(orderItems).values(items),
      ]);
    },

    async listByCustomerId(customerId: string) {
      return db
        .select({
          id: orders.id,
          slug: orders.slug,
          wave_id: orders.wave_id,
          customer_id: orders.customer_id,
          customer_name: orders.customer_name,
          customer_whatsapp: orders.customer_whatsapp,
          shipping_address: orders.shipping_address,
          total_amount: orders.total_amount,
          payment_receipt_url: orders.payment_receipt_url,
          status: orders.status,
          tracking_number: orders.tracking_number,
          created_at: orders.created_at,
          wave: {
            id: preOrderWaves.id,
            name: preOrderWaves.name,
            status: preOrderWaves.status,
            store_id: preOrderWaves.store_id,
          },
          store: {
            id: stores.id,
            slug: stores.slug,
            name: stores.name,
            whatsapp_contact: stores.whatsapp_contact,
          },
        })
        .from(orders)
        .innerJoin(preOrderWaves, eq(orders.wave_id, preOrderWaves.id))
        .innerJoin(stores, eq(preOrderWaves.store_id, stores.id))
        .where(eq(orders.customer_id, customerId))
        .orderBy(desc(orders.created_at));
    },

    async listForDashboard(filters: {
      storeIds?: string[];
      waveId?: string;
      status?: string;
    }) {
      const conditions: SQL[] = [];

      if (filters.storeIds && filters.storeIds.length > 0) {
        if (filters.storeIds.length === 1) {
          conditions.push(eq(preOrderWaves.store_id, filters.storeIds[0]!));
        } else {
          conditions.push(inArray(preOrderWaves.store_id, filters.storeIds));
        }
      }
      if (filters.waveId) {
        conditions.push(eq(orders.wave_id, filters.waveId));
      }
      if (filters.status) {
        conditions.push(eq(orders.status, filters.status));
      }

      const baseQuery = db
        .select({
          id: orders.id,
          slug: orders.slug,
          wave_id: orders.wave_id,
          customer_id: orders.customer_id,
          customer_name: orders.customer_name,
          customer_whatsapp: orders.customer_whatsapp,
          guest_name: orders.guest_name,
          guest_whatsapp: orders.guest_whatsapp,
          shipping_address: orders.shipping_address,
          total_amount: orders.total_amount,
          payment_receipt_url: orders.payment_receipt_url,
          status: orders.status,
          tracking_number: orders.tracking_number,
          created_at: orders.created_at,
          wave: {
            id: preOrderWaves.id,
            name: preOrderWaves.name,
            store_id: preOrderWaves.store_id,
          },
        })
        .from(orders)
        .innerJoin(preOrderWaves, eq(orders.wave_id, preOrderWaves.id))
        .orderBy(desc(orders.created_at));

      return conditions.length > 0
        ? baseQuery.where(and(...conditions))
        : baseQuery;
    },

    async listByPhoneVariants(variants: string[], storeId?: string) {
      const conditions: SQL[] = [];
      const phoneMatch = or(
        inArray(orders.guest_whatsapp, variants),
        inArray(orders.customer_whatsapp, variants)
      );
      if (phoneMatch) {
        conditions.push(phoneMatch);
      }

      if (storeId) {
        conditions.push(eq(preOrderWaves.store_id, storeId));
      }

      return db
        .select({
          id: orders.id,
          slug: orders.slug,
          wave_id: orders.wave_id,
          customer_id: orders.customer_id,
          customer_name: orders.customer_name,
          customer_whatsapp: orders.customer_whatsapp,
          guest_name: orders.guest_name,
          guest_whatsapp: orders.guest_whatsapp,
          shipping_address: orders.shipping_address,
          total_amount: orders.total_amount,
          payment_receipt_url: orders.payment_receipt_url,
          status: orders.status,
          tracking_number: orders.tracking_number,
          created_at: orders.created_at,
          wave: {
            id: preOrderWaves.id,
            name: preOrderWaves.name,
            status: preOrderWaves.status,
            store_id: preOrderWaves.store_id,
          },
          store: {
            id: stores.id,
            owner_id: stores.owner_id,
            slug: stores.slug,
            name: stores.name,
            whatsapp_contact: stores.whatsapp_contact,
          },
        })
        .from(orders)
        .innerJoin(preOrderWaves, eq(orders.wave_id, preOrderWaves.id))
        .innerJoin(stores, eq(preOrderWaves.store_id, stores.id))
        .where(and(...conditions))
        .orderBy(desc(orders.created_at));
    },

    async findItemsWithProductsByOrderIds(orderIds: string[]) {
      if (orderIds.length === 0) return [];
      return db
        .select({
          id: orderItems.id,
          order_id: orderItems.order_id,
          wave_product_id: orderItems.wave_product_id,
          quantity: orderItems.quantity,
          subtotal: orderItems.subtotal,
          locked_price: waveProducts.locked_price,
          product_id: products.id,
          product_name: products.name,
          product_image_url: products.image_url,
        })
        .from(orderItems)
        .innerJoin(
          waveProducts,
          eq(orderItems.wave_product_id, waveProducts.id)
        )
        .innerJoin(products, eq(waveProducts.product_id, products.id))
        .where(inArray(orderItems.order_id, orderIds));
    },

    async findItemsForOrder(orderId: string) {
      return db
        .select({
          id: orderItems.id,
          order_id: orderItems.order_id,
          wave_product_id: orderItems.wave_product_id,
          quantity: orderItems.quantity,
          subtotal: orderItems.subtotal,
          locked_price: waveProducts.locked_price,
          product_id: products.id,
          product_name: products.name,
          product_image_url: products.image_url,
        })
        .from(orderItems)
        .innerJoin(
          waveProducts,
          eq(orderItems.wave_product_id, waveProducts.id)
        )
        .innerJoin(products, eq(waveProducts.product_id, products.id))
        .where(eq(orderItems.order_id, orderId));
    },

    async updateStatus(
      id: string,
      status: string,
      trackingNumber?: string | null
    ): Promise<void> {
      await db
        .update(orders)
        .set(
          trackingNumber !== undefined
            ? { status, tracking_number: trackingNumber }
            : { status }
        )
        .where(eq(orders.id, id));
    },

    async updateReceiptUrl(id: string, receiptUrl: string): Promise<void> {
      await db
        .update(orders)
        .set({ payment_receipt_url: receiptUrl })
        .where(eq(orders.id, id));
    },
  };
}

export type OrderRepo = ReturnType<typeof createOrderRepo>;
