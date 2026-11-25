import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const drafts = sqliteTable(
  "drafts",
  {
    id: text("id").primaryKey(),
    author_id: text("author_id").notNull(),
    title: text("title").notNull().default(""),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    markdown: text("markdown").notNull().default(""),
    tags_json: text("tags_json").notNull().default("[]"),
    cover_image_key: text("cover_image_key"),
    bsky_teaser: text("bsky_teaser").notNull().default(""),
    crosspost_to_bsky: integer("crosspost_to_bsky", { mode: "boolean" })
      .notNull()
      .default(true),
    created_at: integer("created_at").notNull(),
    updated_at: integer("updated_at").notNull(),
  },
  (table) => [
    index("drafts_author_updated_idx").on(table.author_id, table.updated_at),
    index("drafts_slug_idx").on(table.slug),
  ]
);

export type DraftRow = typeof drafts.$inferSelect;
export type NewDraftRow = typeof drafts.$inferInsert;
