ALTER TABLE "tasks" ADD COLUMN "watch_duration" integer;--> statement-breakpoint
CREATE INDEX "idx_user_tasks_user_id" ON "user_tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_tasks_task_id" ON "user_tasks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_user_tasks_status" ON "user_tasks" USING btree ("status");--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "action_type";