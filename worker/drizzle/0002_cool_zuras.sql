CREATE TABLE `render_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`postId` integer NOT NULL,
	`job_type` text NOT NULL,
	`content_hash` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer,
	`last_error` text,
	`createdAt` text,
	`updatedAt` text
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `render_status` text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `render_error` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `content_hash` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `rendered_at` text;