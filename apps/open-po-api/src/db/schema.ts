import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  name: text("name").notNull(),
  whatsapp_number: text("whatsapp_number").notNull(),
  default_shipping_address: text("default_shipping_address"),
  created_at: integer("created_at").notNull(),
});

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
});

export const userRoles = sqliteTable(
  "user_roles",
  {
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role_id: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.user_id, table.role_id] })]
);

export const permissions = sqliteTable("permissions", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
});

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    role_id: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permission_id: text("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.role_id, table.permission_id] })]
);

export const stores = sqliteTable("stores", {
  id: text("id").primaryKey(),
  owner_id: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  logo_url: text("logo_url"),
  payment_instructions: text("payment_instructions").notNull(),
  whatsapp_contact: text("whatsapp_contact").notNull(),
  created_at: integer("created_at").notNull(),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  store_id: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  base_price: integer("base_price").notNull(),
  image_url: text("image_url"),
  is_archived: integer("is_archived", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const preOrderWaves = sqliteTable("pre_order_waves", {
  id: text("id").primaryKey(),
  store_id: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  start_date: integer("start_date").notNull(),
  end_date: integer("end_date").notNull(),
  status: text("status").notNull().default("Draft"),
});

export const waveProducts = sqliteTable(
  "wave_products",
  {
    id: text("id").primaryKey(),
    wave_id: text("wave_id")
      .notNull()
      .references(() => preOrderWaves.id, { onDelete: "cascade" }),
    product_id: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    locked_price: integer("locked_price").notNull(),
    quota: integer("quota"),
  },
  (table) => [
    uniqueIndex("wave_products_wave_product_unique").on(
      table.wave_id,
      table.product_id
    ),
  ]
);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  wave_id: text("wave_id")
    .notNull()
    .references(() => preOrderWaves.id, { onDelete: "restrict" }),
  customer_id: text("customer_id").references(() => users.id, {
    onDelete: "set null",
  }),
  guest_name: text("guest_name"),
  guest_whatsapp: text("guest_whatsapp"),
  shipping_address: text("shipping_address").notNull(),
  total_amount: integer("total_amount").notNull(),
  payment_receipt_url: text("payment_receipt_url"),
  status: text("status").notNull().default("Received"),
  tracking_number: text("tracking_number"),
  created_at: integer("created_at").notNull(),
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  order_id: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  wave_product_id: text("wave_product_id")
    .notNull()
    .references(() => waveProducts.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  subtotal: integer("subtotal").notNull(),
});

export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    product_id: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    order_id: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customer_id: text("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    created_at: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("reviews_order_product_customer_unique").on(
      table.order_id,
      table.product_id,
      table.customer_id
    ),
  ]
);
