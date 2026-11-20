CREATE TABLE `book_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`username` text NOT NULL,
	`book_id` text NOT NULL,
	`rating` integer NOT NULL,
	`review_text` text NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`isbn` text NOT NULL,
	`total_pages` integer NOT NULL,
	`cover_image_key` text,
	`bookshelf_id` text NOT NULL,
	FOREIGN KEY (`bookshelf_id`) REFERENCES `bookshelves`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `books_isbn_unique` ON `books` (`isbn`);--> statement-breakpoint
CREATE TABLE `bookshelves` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`location` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reading_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`book_id` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reading_lists_user_book_unique` ON `reading_lists` (`user_id`,`book_id`);--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`book_id` text NOT NULL,
	`last_page_read` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reading_progress_user_book_unique` ON `reading_progress` (`user_id`,`book_id`);