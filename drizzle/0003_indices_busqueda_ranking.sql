-- RF-07: búsqueda de rankings por el principio del nombre (`LIKE 'abc%'`).
CREATE INDEX `characters_name_idx` ON `characters` (`name`);--> statement-breakpoint
CREATE INDEX `guilds_name_idx` ON `guilds` (`name`);