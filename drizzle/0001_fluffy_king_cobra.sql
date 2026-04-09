CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kennelId` int NOT NULL,
	`targetUserId` int,
	`type` enum('vaccination_expiring','vaccination_expired','booking_conflict','payment_due','check_in_reminder','capacity_warning','general') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`isRead` boolean NOT NULL DEFAULT false,
	`relatedDogId` int,
	`relatedBookingId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kennelId` int NOT NULL,
	`customerId` int NOT NULL,
	`dogId` int NOT NULL,
	`serviceId` int NOT NULL,
	`status` enum('pending','confirmed','checked_in','checked_out','cancelled','completed') NOT NULL DEFAULT 'pending',
	`checkInDate` date NOT NULL,
	`checkOutDate` date,
	`totalPrice` decimal(10,2),
	`notes` text,
	`checkedInAt` timestamp,
	`checkedOutAt` timestamp,
	`checkedInBy` int,
	`checkedOutBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`breed` varchar(100),
	`age` int,
	`weight` decimal(5,1),
	`sex` enum('male','female'),
	`isSpayedNeutered` boolean DEFAULT false,
	`photoUrl` text,
	`feedingInstructions` text,
	`medications` text,
	`behaviorNotes` text,
	`specialNeeds` text,
	`vetName` varchar(200),
	`vetPhone` varchar(20),
	`emergencyContactName` varchar(200),
	`emergencyContactPhone` varchar(20),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kennelFavorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kennelId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kennelFavorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kennels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`address` text,
	`city` varchar(100),
	`state` varchar(50),
	`zip` varchar(20),
	`phone` varchar(20),
	`email` varchar(320),
	`logoUrl` text,
	`totalCapacity` int NOT NULL DEFAULT 20,
	`hoursOpen` varchar(10) DEFAULT '07:00',
	`hoursClose` varchar(10) DEFAULT '19:00',
	`policies` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kennels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`customerId` int NOT NULL,
	`kennelId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`type` enum('full','deposit','balance','refund') NOT NULL DEFAULT 'full',
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`stripePaymentId` varchar(255),
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kennelId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('boarding','daycare','grooming','bath') NOT NULL,
	`description` text,
	`pricePerUnit` decimal(10,2) NOT NULL,
	`unitType` enum('per_night','per_day','per_session') NOT NULL DEFAULT 'per_day',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vaccinations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dogId` int NOT NULL,
	`vaccineName` varchar(100) NOT NULL,
	`dateAdministered` date,
	`expirationDate` date,
	`documentUrl` text,
	`status` enum('current','expiring_soon','expired','missing') NOT NULL DEFAULT 'missing',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vaccinations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('owner','employee','customer') NOT NULL DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `kennelId` int;