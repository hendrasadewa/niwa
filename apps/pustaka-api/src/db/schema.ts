import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const libraries = sqliteTable(
  "libraries",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    owner_id: text("owner_id").notNull(),
    owner_name: text("owner_name").notNull(),
    visibility: text("visibility").notNull().default("private"),
    created_at: integer("created_at").notNull().default(0),
    updated_at: integer("updated_at").notNull().default(0),
  },
  (table) => [
    index("libraries_owner_idx").on(table.owner_id),
    index("libraries_visibility_idx").on(table.visibility),
  ]
);

export const libraryMembers = sqliteTable(
  "library_members",
  {
    id: text("id").primaryKey(),
    library_id: text("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "cascade" }),
    user_id: text("user_id").notNull(),
    username: text("username").notNull(),
    joined_at: integer("joined_at").notNull().default(0),
  },
  (table) => [
    uniqueIndex("library_members_library_user_unique").on(
      table.library_id,
      table.user_id
    ),
    index("library_members_user_idx").on(table.user_id),
  ]
);

export const libraryInvites = sqliteTable(
  "library_invites",
  {
    id: text("id").primaryKey(),
    library_id: text("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    created_by: text("created_by").notNull(),
    max_uses: integer("max_uses"),
    uses_count: integer("uses_count").notNull().default(0),
    expires_at: integer("expires_at"),
    revoked_at: integer("revoked_at"),
    created_at: integer("created_at").notNull().default(0),
  },
  (table) => [index("library_invites_library_idx").on(table.library_id)]
);

export const bookshelves = sqliteTable(
  "bookshelves",
  {
    id: text("id").primaryKey(),
    library_id: text("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: text("location").notNull(),
    created_at: integer("created_at").notNull().default(0),
  },
  (table) => [index("bookshelves_library_idx").on(table.library_id)]
);

export const books = sqliteTable(
  "books",
  {
    id: text("id").primaryKey(),
    library_id: text("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    author: text("author").notNull(),
    isbn: text("isbn").notNull(),
    total_pages: integer("total_pages").notNull(),
    cover_image_key: text("cover_image_key"),
    bookshelf_id: text("bookshelf_id").references(() => bookshelves.id, {
      onDelete: "set null",
    }),
    owner_id: text("owner_id"),
    owner_name: text("owner_name").notNull(),
    created_at: integer("created_at").notNull().default(0),
  },
  (table) => [
    index("books_library_isbn_idx").on(table.library_id, table.isbn),
    index("books_owner_idx").on(table.owner_id),
    index("books_bookshelf_idx").on(table.bookshelf_id),
  ]
);

export const readingLists = sqliteTable(
  "reading_lists",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    book_id: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    updated_at: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("reading_lists_user_book_unique").on(
      table.user_id,
      table.book_id
    ),
  ]
);

export const readingProgress = sqliteTable(
  "reading_progress",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    book_id: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    last_page_read: integer("last_page_read").notNull(),
    updated_at: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("reading_progress_user_book_unique").on(
      table.user_id,
      table.book_id
    ),
  ]
);

export const bookReviews = sqliteTable("book_reviews", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  username: text("username").notNull(),
  book_id: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  review_text: text("review_text").notNull(),
});
