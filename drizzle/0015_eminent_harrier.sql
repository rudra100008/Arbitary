CREATE TABLE "upload_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"phash" varchar(16),
	"exif_flags" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "upload_analysis_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "priority" varchar(10) DEFAULT 'low' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "image_type" varchar(50) DEFAULT 'photo' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "event_time" varchar(100);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "accent_color" varchar(50) DEFAULT '#FACC15' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_tasks" ADD COLUMN "submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_fingerprint_flagged" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dismissed_until" timestamp;--> statement-breakpoint
ALTER TABLE "upload_analysis" ADD CONSTRAINT "upload_analysis_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_upload_analysis_public_id" ON "upload_analysis" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "idx_events_event_date" ON "events" USING btree ("event_date" desc);--> statement-breakpoint
CREATE INDEX "idx_points_log_user_id_created_at" ON "points_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_rate_limits_expires" ON "rate_limits" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_referrals_referrer" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_created_at" ON "tasks" USING btree ("created_at" desc);--> statement-breakpoint
CREATE INDEX "idx_tasks_is_active_created" ON "tasks" USING btree ("is_active","created_at" desc);--> statement-breakpoint
CREATE INDEX "idx_tasks_type_active" ON "tasks" USING btree ("task_type","is_active");--> statement-breakpoint
CREATE INDEX "idx_user_tasks_composite" ON "user_tasks" USING btree ("user_id","task_id","status");--> statement-breakpoint
CREATE INDEX "idx_users_last_login_at" ON "users" USING btree ("last_login_at");--> statement-breakpoint
CREATE INDEX "idx_users_fraud_risk_score" ON "users" USING btree ("fraud_risk_score");--> statement-breakpoint
CREATE INDEX "idx_users_is_flagged" ON "users" USING btree ("is_flagged");--> statement-breakpoint
CREATE INDEX "idx_users_monthly_points" ON "users" USING btree ("monthly_points" desc);