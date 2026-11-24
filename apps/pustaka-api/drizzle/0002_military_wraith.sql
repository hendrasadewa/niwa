CREATE TABLE `libraries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`owner_id` text NOT NULL,
	`owner_name` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `libraries_slug_unique` ON `libraries` (`slug`);--> statement-breakpoint
CREATE INDEX `libraries_owner_idx` ON `libraries` (`owner_id`);--> statement-breakpoint
CREATE INDEX `libraries_visibility_idx` ON `libraries` (`visibility`);--> statement-breakpoint
CREATE TABLE `library_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`library_id` text NOT NULL,
	`code` text NOT NULL,
	`created_by` text NOT NULL,
	`max_uses` integer,
	`uses_count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`created_at` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`library_id`) REFERENCES `libraries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `library_invites_code_unique` ON `library_invites` (`code`);--> statement-breakpoint
CREATE INDEX `library_invites_library_idx` ON `library_invites` (`library_id`);--> statement-breakpoint
CREATE TABLE `library_members` (
	`id` text PRIMARY KEY NOT NULL,
	`library_id` text NOT NULL,
	`user_id` text NOT NULL,
	`username` text NOT NULL,
	`joined_at` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`library_id`) REFERENCES `libraries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `library_members_library_user_unique` ON `library_members` (`library_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `library_members_user_idx` ON `library_members` (`user_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `libraries` (`id`, `name`, `slug`, `description`, `owner_id`, `owner_name`, `visibility`, `created_at`, `updated_at`)
SELECT '00000000-0000-0000-0000-000000000001', 'Hendra''s Library', 'hendra-library', 'Default library created during multi-library migration', '0dbb321f-fa88-45a6-bae8-f10cab438278', 'Hendra Sadewa', 'public', CAST(strftime('%s', 'now') AS integer), CAST(strftime('%s', 'now') AS integer)
WHERE EXISTS (SELECT 1 FROM `bookshelves`) OR EXISTS (SELECT 1 FROM `books`);--> statement-breakpoint
PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__bak_reading_lists` AS SELECT * FROM `reading_lists`;--> statement-breakpoint
CREATE TABLE `__bak_reading_progress` AS SELECT * FROM `reading_progress`;--> statement-breakpoint
CREATE TABLE `__bak_book_reviews` AS SELECT * FROM `book_reviews`;--> statement-breakpoint
CREATE TABLE `__bak_books` AS SELECT * FROM `books`;--> statement-breakpoint
DROP TABLE `books`;--> statement-breakpoint
CREATE TABLE `__new_bookshelves` (
	`id` text PRIMARY KEY NOT NULL,
	`library_id` text NOT NULL,
	`name` text NOT NULL,
	`location` text NOT NULL,
	`created_at` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`library_id`) REFERENCES `libraries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_bookshelves`("id", "library_id", "name", "location", "created_at") SELECT "id", '00000000-0000-0000-0000-000000000001', "name", "location", 0 FROM `bookshelves`;--> statement-breakpoint
DROP TABLE `bookshelves`;--> statement-breakpoint
ALTER TABLE `__new_bookshelves` RENAME TO `bookshelves`;--> statement-breakpoint
CREATE INDEX `bookshelves_library_idx` ON `bookshelves` (`library_id`);--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`library_id` text NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`isbn` text NOT NULL,
	`total_pages` integer NOT NULL,
	`cover_image_key` text,
	`bookshelf_id` text,
	`owner_id` text,
	`owner_name` text NOT NULL,
	`created_at` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`library_id`) REFERENCES `libraries`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`bookshelf_id`) REFERENCES `bookshelves`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `books`("id", "library_id", "title", "author", "isbn", "total_pages", "cover_image_key", "bookshelf_id", "owner_id", "owner_name", "created_at") SELECT "id", '00000000-0000-0000-0000-000000000001', "title", "author", "isbn", "total_pages", "cover_image_key", "bookshelf_id", '0dbb321f-fa88-45a6-bae8-f10cab438278', 'Hendra Sadewa', "created_at" FROM `__bak_books`;--> statement-breakpoint
CREATE INDEX `books_library_isbn_idx` ON `books` (`library_id`,`isbn`);--> statement-breakpoint
CREATE INDEX `books_owner_idx` ON `books` (`owner_id`);--> statement-breakpoint
CREATE INDEX `books_bookshelf_idx` ON `books` (`bookshelf_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `reading_lists` SELECT * FROM `__bak_reading_lists`;--> statement-breakpoint
INSERT OR IGNORE INTO `reading_progress` SELECT * FROM `__bak_reading_progress`;--> statement-breakpoint
INSERT OR IGNORE INTO `book_reviews` SELECT * FROM `__bak_book_reviews`;--> statement-breakpoint
DROP TABLE `__bak_books`;--> statement-breakpoint
DROP TABLE `__bak_reading_lists`;--> statement-breakpoint
DROP TABLE `__bak_reading_progress`;--> statement-breakpoint
DROP TABLE `__bak_book_reviews`;
