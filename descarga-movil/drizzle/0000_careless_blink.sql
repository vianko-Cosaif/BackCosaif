CREATE TABLE `publication` (
	`id` integer PRIMARY KEY NOT NULL,
	`release_id` text NOT NULL,
	`published_at` text NOT NULL,
	`published_by` integer NOT NULL,
	FOREIGN KEY (`release_id`) REFERENCES `releases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `publication_events` (
	`id` text PRIMARY KEY NOT NULL,
	`release_id` text NOT NULL,
	`previous_id` text,
	`created_at` text NOT NULL,
	`actor_id` integer NOT NULL,
	`actor_name` text NOT NULL,
	FOREIGN KEY (`release_id`) REFERENCES `releases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `releases` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`version_code` integer NOT NULL,
	`file_name` text NOT NULL,
	`object_key` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`min_android` text NOT NULL,
	`notes` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by` integer NOT NULL,
	`created_by_name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `releases_version_code_unique` ON `releases` (`version_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `releases_object_key_unique` ON `releases` (`object_key`);--> statement-breakpoint
CREATE INDEX `releases_created_idx` ON `releases` (`created_at`);--> statement-breakpoint
CREATE TABLE `upload_parts` (
	`upload_id` text NOT NULL,
	`part_number` integer NOT NULL,
	`etag` text NOT NULL,
	`size` integer NOT NULL,
	PRIMARY KEY(`upload_id`, `part_number`),
	FOREIGN KEY (`upload_id`) REFERENCES `uploads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`multipart_id` text NOT NULL,
	`metadata` text NOT NULL,
	`size` integer NOT NULL,
	`part_count` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`state` text NOT NULL,
	`locked_at` integer DEFAULT 0 NOT NULL
);
