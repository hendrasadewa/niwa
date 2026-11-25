CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`markdown` text DEFAULT '' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`cover_image_key` text,
	`bsky_teaser` text DEFAULT '' NOT NULL,
	`crosspost_to_bsky` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `drafts_author_updated_idx` ON `drafts` (`author_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `drafts_slug_idx` ON `drafts` (`slug`);