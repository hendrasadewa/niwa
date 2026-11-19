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
import type { AuthUser } from "../types";

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
 * Masks a customer/guest name for unauthenticated guest views (e.g., "Andi Pratama" -> "A*** P******").
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return "C*******";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (part.length <= 1) return "*";
      return `${part[0]}${"*".repeat(Math.min(part.length - 1, 6))}`;
    })
    .join(" ");
}

/**
 * Masks a phone/WhatsApp number for unauthenticated guest views (e.g., "081234567890" -> "0812****7890").
 */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.trim();
  if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 2)}****`;
  }
  const prefix = cleaned.slice(0, 4);
  const suffix = cleaned.slice(-3);
  const maskedMiddleLen = Math.max(4, cleaned.length - 7);
  return `${prefix}${"*".repeat(maskedMiddleLen)}${suffix}`;
}

/**
 * Masks a shipping address for unauthenticated guest views (e.g., "Jl. Merdeka No. 10, Bandung" -> "Jl. M****** N*. **, B******").
 */
export function maskAddress(address: string | null | undefined): string {
  if (!address) return "***";
  return address
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (/^(jl\.?|jalan|rt\.?|rw\.?|kel\.?|kec\.?|kota|kab\.?)$/i.test(word)) {
        return word;
      }
      if (/^[0-9]+/.test(word)) {
        return "**";
      }
      if (word.length <= 2) {
        return `${word[0] ?? "*"}*`;
      }
      const trailingPunct = word.match(/[.,;/-]+$/)?.[0] ?? "";
      const coreLen = Math.max(1, word.length - trailingPunct.length - 1);
      return `${word[0]}${"*".repeat(Math.min(coreLen, 6))}${trailingPunct}`;
    })
    .join(" ");
}

/**
 * Determines whether an authenticated user is authorized to view/access an order's unmasked details.
 * Returns true if the user is:
 * 1. Global Admin
 * 2. Owner of the Store that manages the order's wave
 * 3. The customer who placed the order (`order.customer_id === user.id`)
 * 4. A guest who later logged in with the same WhatsApp number (`order.customer_id === null` & phone matches)
 */
export function canUserAccessOrder(
  user: AuthUser,
  order: {
    customer_id: string | null;
    guest_whatsapp: string | null;
  },
  storeOwnerId?: string | null
): boolean {
  if (user.roles.includes("admin")) {
    return true;
  }
  if (storeOwnerId && storeOwnerId === user.id) {
    return true;
  }
  if (order.customer_id && order.customer_id === user.id) {
    return true;
  }
  if (!order.customer_id && order.guest_whatsapp) {
    const userPhoneVariants = getPhoneLookupVariants(user.whatsapp_number);
    if (userPhoneVariants.includes(order.guest_whatsapp)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether two phone numbers represent the same normalized phone number.
 */
export function isSamePhoneNumber(phoneA: string, phoneB: string): boolean {
  const variantsA = getPhoneLookupVariants(phoneA);
  const normalizedB = normalizePhoneForStorage(phoneB);
  return variantsA.includes(normalizedB) || variantsA.includes(phoneB.trim());
}

/**
 * Looks up order history by guest/customer phone number (with optional store filter)
 * and applies PII masking when viewed by an unauthenticated guest.
 */
export async function lookupOrdersByPhone(
  db: Database,
  rawPhone: string,
  options?: {
    storeIdOrSlug?: string;
    viewer?: AuthUser;
  }
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

  if (options?.storeIdOrSlug) {
    const [resolvedStore] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(
        or(
          eq(stores.id, options.storeIdOrSlug),
          eq(stores.slug, options.storeIdOrSlug)
        )
      )
      .limit(1);

    conditions.push(
      eq(
        preOrderWaves.store_id,
        resolvedStore ? resolvedStore.id : options.storeIdOrSlug
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
      customer_whatsapp: users.whatsapp_number,
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
    .leftJoin(users, eq(orders.customer_id, users.id))
    .where(and(...conditions))
    .orderBy(desc(orders.created_at));

  const viewer = options?.viewer;
  // If viewer is logged in, filter out any orders they are not authorized to access
  const visibleOrders = viewer
    ? matchedOrders.filter((o) =>
        canUserAccessOrder(viewer, o, o.store.owner_id)
      )
    : matchedOrders;

  if (visibleOrders.length === 0) {
    return [];
  }

  const orderIds = visibleOrders.map((o) => o.id);
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

  return visibleOrders.map((order) => {
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
}
