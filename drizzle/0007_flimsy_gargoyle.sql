CREATE TABLE "share_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"share_code" varchar(20) NOT NULL,
	"visitor_ip" varchar(50),
	"fingerprint" varchar(255),
	"user_agent" varchar(500),
	"clicked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "share_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer,
	"user_id" integer,
	"share_code" varchar(20) NOT NULL,
	"target_url" text DEFAULT '' NOT NULL,
	"share_url" text NOT NULL,
	"owner_fingerprint" varchar(255),
	"click_count" integer DEFAULT 0 NOT NULL,
	"unique_clicks" integer DEFAULT 0 NOT NULL,
	"points_awarded" boolean DEFAULT false NOT NULL,
	"click_threshold" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "share_tasks_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "event_date" SET DATA TYPE timestamp USING event_date::timestamp;--> statement-breakpoint
ALTER TABLE "user_tickets" ALTER COLUMN "redeemed_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "daily_login_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "difficulty" varchar(20) DEFAULT 'easy' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "is_flash" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "is_share" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "share_threshold" integer DEFAULT 3;--> statement-breakpoint
ALTER TABLE "user_tasks" ADD COLUMN "submission_fingerprint" varchar(255);--> statement-breakpoint
ALTER TABLE "user_tasks" ADD COLUMN "completion_duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "user_tickets" ADD COLUMN "redemption_token" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "user_tickets" ADD COLUMN "redeemed_by" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "completed_tasks_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_streak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "longest_streak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fraud_risk_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_flagged" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "share_tasks" ADD CONSTRAINT "share_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_tasks" ADD CONSTRAINT "share_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tickets" ADD CONSTRAINT "user_tickets_redeemed_by_users_id_fk" FOREIGN KEY ("redeemed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tickets" ADD CONSTRAINT "user_tickets_redemption_token_unique" UNIQUE("redemption_token");