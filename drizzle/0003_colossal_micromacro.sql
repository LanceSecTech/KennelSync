CREATE TABLE `bookingDogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`dogId` int NOT NULL,
	`roomId` int,
	CONSTRAINT `bookingDogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerKennels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kennelId` int NOT NULL,
	`isFavorite` boolean NOT NULL DEFAULT false,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customerKennels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kennelRequiredVaccines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kennelId` int NOT NULL,
	`vaccineName` varchar(100) NOT NULL,
	`isRequired` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kennelRequiredVaccines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `paymentOption` enum('pay_now','pay_later') DEFAULT 'pay_later' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `paymentStatus` enum('unpaid','deposit_paid','paid','partial') DEFAULT 'unpaid' NOT NULL;