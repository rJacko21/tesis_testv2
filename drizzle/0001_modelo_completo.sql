CREATE TABLE `login_attempts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`identifier` varchar(254) NOT NULL,
	`ip` varchar(45) NOT NULL,
	`succeeded` smallint NOT NULL,
	`attempted_at` datetime(3) NOT NULL,
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` char(64) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`user_agent` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `sessions_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` bigint unsigned NOT NULL,
	`role_id` bigint unsigned NOT NULL,
	CONSTRAINT `user_roles_user_id_role_id_pk` PRIMARY KEY(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`username` varchar(32) NOT NULL,
	`email` varchar(254) NOT NULL,
	`email_verified_at` datetime(3),
	`password_hash` varchar(255) NOT NULL,
	`locale` varchar(8) NOT NULL DEFAULT 'en',
	`status` enum('active','suspended','deleted') NOT NULL DEFAULT 'active',
	`ap_balance` int unsigned NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_uq` UNIQUE(`username`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`token_hash` char(64) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`purpose` enum('verify_email','reset_password') NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `verification_tokens_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`path` varchar(255) NOT NULL,
	`width` smallint unsigned NOT NULL,
	`height` smallint unsigned NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `media_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_path_unique` UNIQUE(`path`)
);
--> statement-breakpoint
CREATE TABLE `media_translations` (
	`media_id` bigint unsigned NOT NULL,
	`locale` varchar(8) NOT NULL,
	`alt` varchar(255) NOT NULL,
	CONSTRAINT `media_translations_media_id_locale_pk` PRIMARY KEY(`media_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `page_translations` (
	`page_id` bigint unsigned NOT NULL,
	`locale` varchar(8) NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	CONSTRAINT `page_translations_page_id_locale_pk` PRIMARY KEY(`page_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(60) NOT NULL,
	`version` int unsigned NOT NULL DEFAULT 1,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `pages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `post_translations` (
	`post_id` bigint unsigned NOT NULL,
	`locale` varchar(8) NOT NULL,
	`title` varchar(160) NOT NULL,
	`excerpt` varchar(300) NOT NULL,
	`body` text NOT NULL,
	`seo_title` varchar(70),
	`seo_description` varchar(160),
	CONSTRAINT `post_translations_post_id_locale_pk` PRIMARY KEY(`post_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`category` enum('news','event','update','maintenance') NOT NULL,
	`status` enum('draft','scheduled','published') NOT NULL DEFAULT 'draft',
	`published_at` datetime(3),
	`expires_at` datetime(3),
	`author_id` bigint unsigned,
	`cover_image_id` bigint unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `posts_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `promotion_translations` (
	`promotion_id` bigint unsigned NOT NULL,
	`locale` varchar(8) NOT NULL,
	`title` varchar(120) NOT NULL,
	CONSTRAINT `promotion_translations_promotion_id_locale_pk` PRIMARY KEY(`promotion_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`image_id` bigint unsigned NOT NULL,
	`target_url` varchar(255) NOT NULL,
	`starts_at` datetime(3) NOT NULL,
	`ends_at` datetime(3) NOT NULL,
	`sort_order` smallint NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `character_class_translations` (
	`class_id` bigint unsigned NOT NULL,
	`locale` varchar(8) NOT NULL,
	`role` varchar(60) NOT NULL,
	`description` varchar(300) NOT NULL,
	CONSTRAINT `character_class_translations_class_id_locale_pk` PRIMARY KEY(`class_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `character_classes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(40) NOT NULL,
	`parent_id` bigint unsigned,
	`required_level` tinyint unsigned NOT NULL,
	`sort_order` smallint NOT NULL,
	CONSTRAINT `character_classes_id` PRIMARY KEY(`id`),
	CONSTRAINT `character_classes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`server_id` bigint unsigned NOT NULL,
	`guild_id` bigint unsigned,
	`class_id` bigint unsigned NOT NULL,
	`name` varchar(24) NOT NULL,
	`land_level` tinyint unsigned NOT NULL,
	`sea_level` tinyint unsigned NOT NULL,
	`experience` int unsigned NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `characters_id` PRIMARY KEY(`id`),
	CONSTRAINT `characters_server_name_uq` UNIQUE(`server_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `guilds` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`server_id` bigint unsigned NOT NULL,
	`name` varchar(32) NOT NULL,
	CONSTRAINT `guilds_id` PRIMARY KEY(`id`),
	CONSTRAINT `guilds_server_name_uq` UNIQUE(`server_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `ranking_snapshots` (
	`taken_at` datetime(3) NOT NULL,
	`area` enum('all','land','sea') NOT NULL,
	`class_scope` bigint unsigned NOT NULL,
	`rank` int unsigned NOT NULL,
	`character_id` bigint unsigned NOT NULL,
	`previous_rank` int unsigned,
	`score` int unsigned NOT NULL,
	CONSTRAINT `ranking_snapshots_taken_at_area_class_scope_rank_pk` PRIMARY KEY(`taken_at`,`area`,`class_scope`,`rank`)
);
--> statement-breakpoint
CREATE TABLE `servers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(40) NOT NULL,
	`is_active` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `servers_id` PRIMARY KEY(`id`),
	CONSTRAINT `servers_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `ap_ledger` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`delta` int NOT NULL,
	`reason` enum('topup','purchase','refund','admin','redeem') NOT NULL,
	`reference_id` bigint unsigned,
	`balance_after` int unsigned NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `ap_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_translations` (
	`campaign_id` bigint unsigned NOT NULL,
	`locale` varchar(8) NOT NULL,
	`name` varchar(80) NOT NULL,
	CONSTRAINT `campaign_translations_campaign_id_locale_pk` PRIMARY KEY(`campaign_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(60) NOT NULL,
	`starts_at` datetime(3) NOT NULL,
	`ends_at` datetime(3) NOT NULL,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`),
	CONSTRAINT `campaigns_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`cart_id` bigint unsigned NOT NULL,
	`item_id` bigint unsigned NOT NULL,
	`quantity` smallint unsigned NOT NULL DEFAULT 1,
	CONSTRAINT `cart_items_cart_id_item_id_pk` PRIMARY KEY(`cart_id`,`item_id`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `carts_id` PRIMARY KEY(`id`),
	CONSTRAINT `carts_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `item_prices` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`item_id` bigint unsigned NOT NULL,
	`price_ap` int unsigned NOT NULL,
	`sale_price_ap` int unsigned,
	`campaign_id` bigint unsigned,
	`starts_at` datetime(3) NOT NULL,
	`ends_at` datetime(3),
	CONSTRAINT `item_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`item_id` bigint unsigned NOT NULL,
	`quantity` smallint unsigned NOT NULL,
	`unit_price_ap` int unsigned NOT NULL,
	`server_id` bigint unsigned NOT NULL,
	`character_id` bigint unsigned NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`total_ap` int unsigned NOT NULL,
	`status` enum('pending','completed','refunded','failed') NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`package_id` bigint unsigned NOT NULL,
	`provider` enum('xsolla_sandbox','mock') NOT NULL,
	`provider_payment_id` varchar(80) NOT NULL,
	`status` enum('pending','paid','failed','refunded') NOT NULL,
	`amount_cents` int unsigned NOT NULL,
	`currency` char(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_provider_uq` UNIQUE(`provider`,`provider_payment_id`)
);
--> statement-breakpoint
CREATE TABLE `shop_categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`parent_id` bigint unsigned,
	`slug` varchar(60) NOT NULL,
	`sort_order` smallint NOT NULL DEFAULT 0,
	CONSTRAINT `shop_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_categories_slug_uq` UNIQUE(`parent_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `shop_category_translations` (
	`category_id` bigint unsigned NOT NULL,
	`locale` varchar(8) NOT NULL,
	`name` varchar(80) NOT NULL,
	CONSTRAINT `shop_category_translations_category_id_locale_pk` PRIMARY KEY(`category_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `shop_item_translations` (
	`item_id` bigint unsigned NOT NULL,
	`locale` varchar(8) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text NOT NULL,
	CONSTRAINT `shop_item_translations_item_id_locale_pk` PRIMARY KEY(`item_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `shop_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`category_id` bigint unsigned NOT NULL,
	`sku` varchar(40) NOT NULL,
	`image_id` bigint unsigned,
	`validity_days` smallint unsigned,
	`is_bundle` tinyint NOT NULL DEFAULT 0,
	`is_limited` tinyint NOT NULL DEFAULT 0,
	`is_giftable` tinyint NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`sort_order` smallint NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `shop_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_items_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `topup_packages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`ap_amount` int unsigned NOT NULL,
	`price_cents` int unsigned NOT NULL,
	`currency` char(3) NOT NULL,
	`is_active` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `topup_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`actor_id` bigint unsigned,
	`action` varchar(60) NOT NULL,
	`entity` varchar(40) NOT NULL,
	`entity_id` bigint unsigned,
	`diff` json,
	`ip` varchar(45),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consents` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`anon_id` char(36),
	`categories` json NOT NULL,
	`version` int unsigned NOT NULL,
	`given_at` datetime(3) NOT NULL,
	CONSTRAINT `consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `redeem_codes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`reward_type` enum('ap','item') NOT NULL,
	`reward_ap` int unsigned,
	`reward_item_id` bigint unsigned,
	`max_uses` int unsigned,
	`per_account` smallint unsigned NOT NULL DEFAULT 1,
	`starts_at` datetime(3) NOT NULL,
	`ends_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `redeem_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `redeem_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `redeem_uses` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`character_id` bigint unsigned,
	`used_at` datetime(3) NOT NULL,
	CONSTRAINT `redeem_uses_id` PRIMARY KEY(`id`),
	CONSTRAINT `redeem_uses_code_user_uq` UNIQUE(`code_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`category` enum('account','payment','bug','migration','other') NOT NULL,
	`subject` varchar(160) NOT NULL,
	`status` enum('open','waiting_user','closed') NOT NULL DEFAULT 'open',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_messages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`ticket_id` bigint unsigned NOT NULL,
	`author_id` bigint unsigned NOT NULL,
	`body` text NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `ticket_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_locale_locales_code_fk` FOREIGN KEY (`locale`) REFERENCES `locales`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_tokens` ADD CONSTRAINT `verification_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_translations` ADD CONSTRAINT `media_translations_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_translations` ADD CONSTRAINT `media_translations_locale_locales_code_fk` FOREIGN KEY (`locale`) REFERENCES `locales`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_translations` ADD CONSTRAINT `page_translations_page_id_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_translations` ADD CONSTRAINT `page_translations_locale_locales_code_fk` FOREIGN KEY (`locale`) REFERENCES `locales`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `post_translations` ADD CONSTRAINT `post_translations_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `post_translations` ADD CONSTRAINT `post_translations_locale_locales_code_fk` FOREIGN KEY (`locale`) REFERENCES `locales`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_cover_image_id_media_id_fk` FOREIGN KEY (`cover_image_id`) REFERENCES `media`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotion_translations` ADD CONSTRAINT `promotion_translations_promotion_id_promotions_id_fk` FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotion_translations` ADD CONSTRAINT `promotion_translations_locale_locales_code_fk` FOREIGN KEY (`locale`) REFERENCES `locales`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_image_id_media_id_fk` FOREIGN KEY (`image_id`) REFERENCES `media`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `character_class_translations` ADD CONSTRAINT `character_class_translations_class_id_character_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `character_classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `character_class_translations` ADD CONSTRAINT `character_class_translations_locale_locales_code_fk` FOREIGN KEY (`locale`) REFERENCES `locales`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `character_classes` ADD CONSTRAINT `character_classes_parent_id_character_classes_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `character_classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `characters` ADD CONSTRAINT `characters_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `characters` ADD CONSTRAINT `characters_server_id_servers_id_fk` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `characters` ADD CONSTRAINT `characters_guild_id_guilds_id_fk` FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `characters` ADD CONSTRAINT `characters_class_id_character_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `character_classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guilds` ADD CONSTRAINT `guilds_server_id_servers_id_fk` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ranking_snapshots` ADD CONSTRAINT `ranking_snapshots_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ap_ledger` ADD CONSTRAINT `ap_ledger_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_translations` ADD CONSTRAINT `campaign_translations_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_translations` ADD CONSTRAINT `campaign_translations_locale_locales_code_fk` FOREIGN KEY (`locale`) REFERENCES `locales`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_carts_id_fk` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_item_id_shop_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `shop_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `carts` ADD CONSTRAINT `carts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_prices` ADD CONSTRAINT `item_prices_item_id_shop_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `shop_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_prices` ADD CONSTRAINT `item_prices_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_item_id_shop_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `shop_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_server_id_servers_id_fk` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_package_id_topup_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `topup_packages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_categories` ADD CONSTRAINT `shop_categories_parent_id_shop_categories_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `shop_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_category_translations` ADD CONSTRAINT `shop_category_translations_category_id_shop_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `shop_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_category_translations` ADD CONSTRAINT `shop_category_translations_locale_locales_code_fk` FOREIGN KEY (`locale`) REFERENCES `locales`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_item_translations` ADD CONSTRAINT `shop_item_translations_item_id_shop_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `shop_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_item_translations` ADD CONSTRAINT `shop_item_translations_locale_locales_code_fk` FOREIGN KEY (`locale`) REFERENCES `locales`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_items` ADD CONSTRAINT `shop_items_category_id_shop_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `shop_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_items` ADD CONSTRAINT `shop_items_image_id_media_id_fk` FOREIGN KEY (`image_id`) REFERENCES `media`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consents` ADD CONSTRAINT `consents_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `redeem_codes` ADD CONSTRAINT `redeem_codes_reward_item_id_shop_items_id_fk` FOREIGN KEY (`reward_item_id`) REFERENCES `shop_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `redeem_uses` ADD CONSTRAINT `redeem_uses_code_id_redeem_codes_id_fk` FOREIGN KEY (`code_id`) REFERENCES `redeem_codes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `redeem_uses` ADD CONSTRAINT `redeem_uses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `redeem_uses` ADD CONSTRAINT `redeem_uses_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_ticket_id_support_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `login_attempts_identifier_idx` ON `login_attempts` (`identifier`,`attempted_at`);--> statement-breakpoint
CREATE INDEX `login_attempts_ip_idx` ON `login_attempts` (`ip`,`attempted_at`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `verification_tokens_user_idx` ON `verification_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `posts_listing_idx` ON `posts` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `promotions_active_idx` ON `promotions` (`starts_at`,`ends_at`);--> statement-breakpoint
CREATE INDEX `characters_user_idx` ON `characters` (`user_id`);--> statement-breakpoint
CREATE INDEX `characters_guild_idx` ON `characters` (`guild_id`);--> statement-breakpoint
CREATE INDEX `ranking_character_idx` ON `ranking_snapshots` (`character_id`,`taken_at`);--> statement-breakpoint
CREATE INDEX `ap_ledger_user_idx` ON `ap_ledger` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `item_prices_item_idx` ON `item_prices` (`item_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `payments_user_idx` ON `payments` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `shop_items_category_idx` ON `shop_items` (`category_id`,`is_active`,`sort_order`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_log_actor_idx` ON `audit_log` (`actor_id`);--> statement-breakpoint
CREATE INDEX `consents_user_idx` ON `consents` (`user_id`);--> statement-breakpoint
CREATE INDEX `consents_anon_idx` ON `consents` (`anon_id`);--> statement-breakpoint
CREATE INDEX `support_tickets_user_idx` ON `support_tickets` (`user_id`);--> statement-breakpoint
CREATE INDEX `support_tickets_status_idx` ON `support_tickets` (`status`);--> statement-breakpoint
CREATE INDEX `ticket_messages_ticket_idx` ON `ticket_messages` (`ticket_id`,`created_at`);