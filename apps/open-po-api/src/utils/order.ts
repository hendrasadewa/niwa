import { and, desc, eq, inArray, or, type SQL } from "drizzle-orm";
import {
  orderItems,
  orders,
  preOrderWaves,
  products,
  stores,
  users,
  waveProducts,
  type Database,
} from "../db";

const UNAMBIGUOUS_ALPHANUM = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generates a short, human-readable, easy-to-type order slug (e.g., `PO-261118-K7M9`).
 */
export function generateOrderSlug(prefix = "PO"): string {
  const cleanPrefix =
    prefix
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6) || "PO";

  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");

  const randomBytes = crypto.getRandomValues(new Uint8Array(4));
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    const idx = (randomBytes[i] ?? 0) % UNAMBIGUOUS_ALPHANUM.length;
    suffix += UNAMBIGUOUS_ALPHANUM[idx];
  }

  return `${cleanPrefix}-${yy}${mm}${dd}-${suffix}`;
}

/**
 * Resolves a single order record by either its UUID (`id`) or human-readable `slug` (case-insensitive).
 */
export async function findOrderByIdOrSlug(
  db: Database,
  idOrSlug: string
): Promise<typeof orders.$inferSelect | undefined> {
  const trimmed = idOrSlug.trim();
  const upper = trimmed.toUpperCase();

  const [order] = await db
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

  return order;
}

/**
 * Normalizes a phone/WhatsApp number to digits (converting `628...` to `08...` for consistent storage).
 */
export function normalizePhoneForStorage(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("628")) {
    return `0${digits.slice(2)}`;
  }
  return digits || phone.trim();
}

/**
 * Produces all common Indonesian/international phone number variants (`08...`, `628...`, `+628...`, raw digits)
 * so guest order lookups by phone number match regardless of formatting.
 */
export function getPhoneLookupVariants(input: string): string[] {
  const trimmed = input.trim();
  const digits = trimmed.replace(/[^0-9]/g, "");
  const variants = new Set<string>([trimmed]);

  if (digits) {
    variants.add(digits);
    if (digits.startsWith("0")) {
      const withoutZero = digits.slice(1);
      variants.add(`62${withoutZero}`);
      variants.add(`+62${withoutZero}`);
    } else if (digits.startsWith("62")) {
      const withoutCountry = digits.slice(2);
      variants.add(`0${withoutCountry}`);
      variants.add(`+${digits}`);
    } else if (digits.startsWith("8")) {
      variants.add(`0${digits}`);
      variants.add(`62${digits}`);
      variants.add(`+62${digits}`);
    }
  }

  return Array.from(variants);
}

/**
 * Looks up order history by guest/customer phone number (with optional store filter).
 */
export async function lookupOrdersByPhone(
  db: Database,
  rawPhone: string,
  storeIdOrSlug?: string
) {
  const variants = getPhoneLookupVariants(rawPhone);
  const conditions: SQL[] = [];

  const phoneMatch = or(
    inArray(orders.guest_whatsapp, variants),
    inArray(users.whatsapp_number, variants)
  );
  if (phoneMatch) {
    conditions.push(phoneMatch);
  }

  if (storeIdOrSlug) {
    const [resolvedStore] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(
        or(eq(stores.id, storeIdOrSlug), eq(stores.slug, storeIdOrSlug))
      )
      .limit(1);

    conditions.push(
      eq(
        preOrderWaves.store_id,
        resolvedStore ? resolvedStore.id : storeIdOrSlug
      )
    );
  }

  const matchedOrders = await db
    .select({
      id: orders.id,
      slug: orders.slug,
      wave_id: orders.wave_id,
      customer_id: orders.customer_id,
      customer_name: users.name,
      guest_name: orders.guest_name,
      guest_whatsapp: orders.guest_whatsapp,
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
    .leftJoin(users, eq(orders.customer_id, users.id))
    .where(and(...conditions))
    .orderBy(desc(orders.created_at));

  if (matchedOrders.length === 0) {
    return [];
  }

  const orderIds = matchedOrders.map((o) => o.id);
  const itemRows = await db
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
    .innerJoin(waveProducts, eq(orderItems.wave_product_id, waveProducts.id))
    .innerJoin(products, eq(waveProducts.product_id, products.id))
    .where(inArray(orderItems.order_id, orderIds));

  const itemsByOrder = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return matchedOrders.map((order) => ({
    ...order,
    customer_display_name:
      order.customer_name ?? order.guest_name ?? "Customer",
    has_payment_receipt: Boolean(order.payment_receipt_url),
    tracking_url: `/api/v1/track/${order.slug}`,
    items: itemsByOrder.get(order.id) ?? [],
  }));
}
