ALTER TABLE `payments` ADD `stripeCheckoutSessionId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);