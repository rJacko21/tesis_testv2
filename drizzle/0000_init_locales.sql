CREATE TABLE `locales` (
	`code` varchar(8) NOT NULL,
	`name` varchar(40) NOT NULL,
	`sort_order` smallint NOT NULL,
	`is_default` boolean NOT NULL DEFAULT false,
	CONSTRAINT `locales_code` PRIMARY KEY(`code`)
);
