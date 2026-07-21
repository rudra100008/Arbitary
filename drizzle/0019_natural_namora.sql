ALTER TABLE "feature_flags" ALTER COLUMN "key" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "feature_flags" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD COLUMN "updated_by_admin_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "date_of_birth" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_user_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_user_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_page_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_page_name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_page_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_ig_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_ig_username" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_connected_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fb_data_access_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_updated_by_admin_id_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;