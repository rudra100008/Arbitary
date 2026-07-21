ALTER TABLE "users" ADD COLUMN "fb_user_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_user_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_page_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_page_name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_page_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_ig_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_ig_username" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_connected_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_data_access_expires_at" timestamp;
