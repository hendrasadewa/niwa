import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const bookshelves = sqliteTable("bookshelves", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
});

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  isbn: text("isbn").notNull().unique(),
  total_pages: integer("total_pages").notNull(),
  cover_image_key: text("cover_image_key"),
  bookshelf_id: text("bookshelf_id")
    .notNull()
    .references(() => bookshelves.id, { onDelete: "restrict" }),
  created_at: integer("created_at").notNull().default(0),
});

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
