CREATE INDEX IF NOT EXISTS "idx_share_tasks_user_task" ON "share_tasks" USING btree ("user_id","task_id");
