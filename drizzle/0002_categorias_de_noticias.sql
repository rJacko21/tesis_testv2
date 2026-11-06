-- RF-08: categorías de noticia según la especificación.
-- En tres pasos para no perder filas: con `sql_mode` estricto, cambiar el
-- ENUM directamente falla si alguna fila tiene un valor que desaparece.
-- 1) se amplía el ENUM con los valores nuevos, 2) se convierten los antiguos
-- (`news` y `update` pasan a `announcement`) y 3) se quitan los antiguos.
ALTER TABLE `posts` MODIFY COLUMN `category` enum('news','update','announcement','event','shop','redeem','maintenance') NOT NULL;--> statement-breakpoint
UPDATE `posts` SET `category` = 'announcement' WHERE `category` IN ('news','update');--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `category` enum('announcement','event','shop','redeem','maintenance') NOT NULL;
