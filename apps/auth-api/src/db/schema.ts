import {
  index,
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
  email_verified_at: integer("email_verified_at"),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
});

export const apps = sqliteTable("apps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  allowed_origins: text("allowed_origins").notNull().default("[]"),
  allowed_redirect_uris: text("allowed_redirect_uris").notNull().default("[]"),
  default_role_name: text("default_role_name"),
  require_consent: integer("require_consent", { mode: "boolean" })
    .notNull()
    .default(true),
  icon_url: text("icon_url"),
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

export const refreshTokens = sqliteTable(
  "refresh_tokens",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    family_id: text("family_id").notNull(),
    token_hash: text("token_hash").notNull().unique(),
    expires_at: integer("expires_at").notNull(),
    revoked_at: integer("revoked_at"),
    replaced_by_id: text("replaced_by_id"),
    user_agent: text("user_agent"),
    created_at: integer("created_at").notNull(),
  },
  (table) => [
    index("refresh_tokens_user_id_idx").on(table.user_id),
    index("refresh_tokens_family_id_idx").on(table.family_id),
  ]
);

export const idpSessions = sqliteTable(
  "idp_sessions",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    session_hash: text("session_hash").notNull().unique(),
    amr: text("amr").notNull().default('["pwd"]'),
    ip_address: text("ip_address"),
    user_agent: text("user_agent"),
    last_seen_at: integer("last_seen_at").notNull(),
    expires_at: integer("expires_at").notNull(),
    revoked_at: integer("revoked_at"),
    created_at: integer("created_at").notNull(),
  },
  (table) => [
    index("idp_sessions_user_id_idx").on(table.user_id),
    index("idp_sessions_expires_at_idx").on(table.expires_at),
  ]
);

export const userAppConsents = sqliteTable(
  "user_app_consents",
  {
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    app_id: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    granted_scopes: text("granted_scopes")
      .notNull()
      .default('["profile","email","roles"]'),
    consented_at: integer("consented_at").notNull(),
    revoked_at: integer("revoked_at"),
  },
  (table) => [primaryKey({ columns: [table.user_id, table.app_id] })]
);

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(), // "email_verify" | "password_reset"
    token_hash: text("token_hash").notNull().unique(),
    expires_at: integer("expires_at").notNull(),
    consumed_at: integer("consumed_at"),
    created_at: integer("created_at").notNull(),
  },
  (table) => [
    index("verification_tokens_user_id_idx").on(table.user_id),
    index("verification_tokens_expires_at_idx").on(table.expires_at),
  ]
);

export const webauthnCredentials = sqliteTable(
  "webauthn_credentials",
  {
    id: text("id").primaryKey(), // base64url credential ID
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    public_key: text("public_key").notNull(), // base64url-encoded public key bytes
    counter: integer("counter").notNull().default(0),
    transports: text("transports").notNull().default("[]"), // JSON array of transports
    device_type: text("device_type").notNull(), // "singleDevice" | "multiDevice"
    backed_up: integer("backed_up", { mode: "boolean" })
      .notNull()
      .default(false),
    name: text("name").notNull(),
    created_at: integer("created_at").notNull(),
    last_used_at: integer("last_used_at"),
  },
  (table) => [index("webauthn_credentials_user_id_idx").on(table.user_id)]
);

export const webauthnChallenges = sqliteTable(
  "webauthn_challenges",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    challenge: text("challenge").notNull().unique(),
    purpose: text("purpose").notNull(), // "register" | "authenticate"
    expires_at: integer("expires_at").notNull(),
    consumed_at: integer("consumed_at"),
    created_at: integer("created_at").notNull(),
  },
  (table) => [
    index("webauthn_challenges_user_id_idx").on(table.user_id),
    index("webauthn_challenges_expires_at_idx").on(table.expires_at),
  ]
);
