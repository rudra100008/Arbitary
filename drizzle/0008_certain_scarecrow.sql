CREATE TABLE "youtube_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"last_heartbeat_at" timestamp DEFAULT now() NOT NULL,
	"expected_heartbeats" integer NOT NULL,
	"heartbeat_count" integer DEFAULT 0 NOT NULL,
	"challenge_second" integer NOT NULL,
	"challenge_completed" boolean DEFAULT false NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "youtube_sessions" ADD CONSTRAINT "youtube_sessions_user_task_id_user_tasks_id_fk" FOREIGN KEY ("user_task_id") REFERENCES "public"."user_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_sessions" ADD CONSTRAINT "youtube_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;