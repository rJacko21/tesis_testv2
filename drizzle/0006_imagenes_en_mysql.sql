ALTER TABLE `media` ADD `mime_type` varchar(32) DEFAULT 'image/webp' NOT NULL;--> statement-breakpoint
ALTER TABLE `media` ADD `data` mediumblob;