ALTER TABLE "user_tasks" DROP CONSTRAINT "user_tasks_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "post_url" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "platform" varchar(100);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "social_post_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "action_type" varchar(100);--> statement-breakpoint
ALTER TABLE "user_tasks" ADD COLUMN "proof_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_number" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "Location" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number");