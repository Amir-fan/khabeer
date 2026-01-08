ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `packageId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `dailyQuestionsUsed` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `lastQuestionDate` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','inactive','suspended') DEFAULT 'active' NOT NULL;