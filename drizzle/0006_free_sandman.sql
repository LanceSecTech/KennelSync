CREATE TABLE `businessHours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kennelId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`openTime` varchar(10),
	`closeTime` varchar(10),
	`isClosed` boolean NOT NULL DEFAULT false,
	CONSTRAINT `businessHours_id` PRIMARY KEY(`id`)
);
