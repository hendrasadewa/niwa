CREATE TABLE `idp_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_hash` text NOT NULL,
	`amr` text DEFAULT '["pwd"]' NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idp_sessions_session_hash_unique` ON `idp_sessions` (`session_hash`);--> statement-breakpoint
CREATE INDEX `idp_sessions_user_id_idx` ON `idp_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idp_sessions_expires_at_idx` ON `idp_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `user_app_consents` (
	`user_id` text NOT NULL,
	`app_id` text NOT NULL,
	`granted_scopes` text DEFAULT '["profile","email","roles"]' NOT NULL,
	`consented_at` integer NOT NULL,
	`revoked_at` integer,
	PRIMARY KEY(`user_id`, `app_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `allowed_origins` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD `allowed_redirect_uris` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD `default_role_name` text;--> statement-breakpoint
ALTER TABLE `apps` ADD `require_consent` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD `icon_url` text;