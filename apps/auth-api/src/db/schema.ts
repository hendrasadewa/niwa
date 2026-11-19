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
  is_active: integer("is_active", { mode: "boolean" }).notNull().default(true),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
});

export const apps = sqliteTable("apps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const roles = sqliteTable(
  "roles",
  {
    id: text("id").primaryKey(),
    app_id: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
  },
  (table) => [
    uniqueIndex("roles_app_id_name_unique").on(table.app_id, table.name),
  ]
);

export const userAppRoles = sqliteTable(
  "user_app_roles",
  {
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    app_id: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    role_id: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.user_id, table.app_id, table.role_id] }),
  ]
);

export const permissions = sqliteTable(
  "permissions",
  {
    id: text("id").primaryKey(),
    app_id: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
  },
  (table) => [
    uniqueIndex("permissions_app_id_slug_unique").on(table.app_id, table.slug),
  ]
);

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
