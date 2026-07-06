ALTER TABLE "tilt_users"
  ADD COLUMN IF NOT EXISTS "operating_hours_start" time NOT NULL DEFAULT '10:00:00',
  ADD COLUMN IF NOT EXISTS "operating_hours_end" time NOT NULL DEFAULT '22:00:00',
  ADD COLUMN IF NOT EXISTS "avg_daily_entries" numeric(10, 2);

CREATE TABLE IF NOT EXISTS "daily_reward_buckets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "outlet_id" text NOT NULL,
  "reward_date" date NOT NULL,
  "bucket_index" integer NOT NULL,
  "bucket_start" timestamp NOT NULL,
  "bucket_end" timestamp NOT NULL,
  "target_winners" integer DEFAULT 1 NOT NULL,
  "winners_given_in_bucket" integer DEFAULT 0 NOT NULL,
  "estimated_entries" numeric(10, 2) NOT NULL,
  "rollover_applied" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_reward_buckets_outlet_date_bucket_idx"
  ON "daily_reward_buckets" ("outlet_id", "reward_date", "bucket_index");

CREATE INDEX IF NOT EXISTS "daily_reward_buckets_lookup_idx"
  ON "daily_reward_buckets" ("outlet_id", "reward_date", "bucket_start", "bucket_end");

CREATE INDEX IF NOT EXISTS "daily_reward_buckets_rollover_idx"
  ON "daily_reward_buckets" ("outlet_id", "reward_date", "rollover_applied", "bucket_end");

CREATE TABLE IF NOT EXISTS "daily_reward_counters" (
  "outlet_id" text NOT NULL,
  "reward_date" date NOT NULL,
  "winners_given_today" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "daily_reward_counters_outlet_date_pk" PRIMARY KEY ("outlet_id", "reward_date")
);
