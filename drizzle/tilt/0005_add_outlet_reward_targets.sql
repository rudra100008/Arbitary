CREATE TABLE IF NOT EXISTS "tilt_outlet_reward_targets" (
  "outlet_id" text PRIMARY KEY NOT NULL,
  "daily_reward_target" integer NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "updated_by" integer
);

CREATE INDEX IF NOT EXISTS "tilt_outlet_reward_targets_updated_at_idx"
  ON "tilt_outlet_reward_targets" ("updated_at");
