ALTER TABLE "tasks" ADD COLUMN "points" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(50) DEFAULT 'user' NOT NULL;