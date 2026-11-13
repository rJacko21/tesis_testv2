CREATE TABLE `shop_item_previews` (
	`item_id` bigint unsigned NOT NULL,
	`media_id` bigint unsigned NOT NULL,
	`sort_order` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `shop_item_previews_item_id_media_id_pk` PRIMARY KEY(`item_id`,`media_id`)
);
--> statement-breakpoint
ALTER TABLE `shop_item_previews` ADD CONSTRAINT `shop_item_previews_item_id_shop_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `shop_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_item_previews` ADD CONSTRAINT `shop_item_previews_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE cascade ON UPDATE no action;