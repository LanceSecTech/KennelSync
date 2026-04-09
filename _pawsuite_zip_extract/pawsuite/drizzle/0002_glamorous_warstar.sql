CREATE TABLE `roomAssignmentHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`bookingId` int NOT NULL,
	`dogId` int NOT NULL,
	`assignedBy` int NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`removedAt` timestamp,
	`notes` text,
	CONSTRAINT `roomAssignmentHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kennelId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`building` varchar(100),
	`sizeType` enum('small','medium','large','mixed','special_care') NOT NULL DEFAULT 'mixed',
	`capacity` int NOT NULL DEFAULT 1,
	`notes` text,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `roomId` int;