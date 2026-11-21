CREATE TABLE `webauthn_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`challenge` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webauthn_challenges_challenge_unique` ON `webauthn_challenges` (`challenge`);--> statement-breakpoint
CREATE INDEX `webauthn_challenges_user_id_idx` ON `webauthn_challenges` (`user_id`);--> statement-breakpoint
CREATE INDEX `webauthn_challenges_expires_at_idx` ON `webauthn_challenges` (`expires_at`);--> statement-breakpoint
CREATE TABLE `webauthn_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`transports` text DEFAULT '[]' NOT NULL,
	`device_type` text NOT NULL,
	`backed_up` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webauthn_credentials_user_id_idx` ON `webauthn_credentials` (`user_id`);