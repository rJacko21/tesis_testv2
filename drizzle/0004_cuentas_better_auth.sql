-- ADR-05 / RF-03: modelo de Better Auth (users, accounts, sessions, verifications)
-- y tabla de límites de peticiones. Ver docs/mejoras/cuentas.md.
CREATE TABLE `accounts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(64) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` datetime(3),
	`refresh_token_expires_at` datetime(3),
	`scope` varchar(255),
	`password` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_provider_account_uq` UNIQUE(`provider_id`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`rate_key` varchar(191) NOT NULL,
	`count` int unsigned NOT NULL,
	`window_start` datetime(3) NOT NULL,
	CONSTRAINT `rate_limits_rate_key` PRIMARY KEY(`rate_key`)
);
--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `verification_tokens`;--> statement-breakpoint
-- `sessions` cambia de clave primaria: se rehace (aún no hay sesiones reales).
DROP TABLE `sessions`;--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`token` varchar(255) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `display_username` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `name` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `image` varchar(255);--> statement-breakpoint
-- Las cuentas existentes: nombre visible = nombre de cuenta, y el nombre de
-- cuenta normalizado a minúsculas (lo exige el plugin `username`).
UPDATE `users` SET `display_username` = `username`, `name` = `username`, `username` = LOWER(`username`), `email_verified` = (`email_verified_at` IS NOT NULL);--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_token_uq` UNIQUE(`token`);--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `email_verified_at`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `password_hash`;