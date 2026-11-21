CREATE TABLE `verification_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purpose` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verification_tokens_token_hash_unique` ON `verification_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `verification_tokens_user_id_idx` ON `verification_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_tokens_expires_at_idx` ON `verification_tokens` (`expires_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified_at` integer;