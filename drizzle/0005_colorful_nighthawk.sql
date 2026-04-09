CREATE TABLE `bookingAddOns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`addOnId` int NOT NULL,
	`dogId` int,
	`price` decimal(10,2) NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookingAddOns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checkoutAddOns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kennelId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checkoutAddOns_id` PRIMARY KEY(`id`)
);
