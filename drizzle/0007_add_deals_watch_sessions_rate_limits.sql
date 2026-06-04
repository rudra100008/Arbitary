-- Migration 0007: Add deals/rewards store, watch sessions, rate limiting, points log
-- All additions are non-breaking — no existing columns/tables are modified or dropped.

-- Add columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rank" varchar(255) DEFAULT 'Iron';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lifetime_points" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_by" integer REFERENCES "users"("id");
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_rewarded" boolean DEFAULT false;


-- Points Log (transaction history for all point changes)
CREATE TABLE IF NOT EXISTS "points_log" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL REFERENCES "users"("id"),
    "task_id" integer REFERENCES "tasks"("id"),
    "points" integer NOT NULL,
    "reason" text,
    "created_at" timestamp DEFAULT now()
);

-- Watch Sessions (video progress tracking with anti-cheat)
CREATE TABLE IF NOT EXISTS "watch_sessions" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL REFERENCES "users"("id"),
    "task_id" integer NOT NULL REFERENCES "tasks"("id"),
    "watched_seconds" integer DEFAULT 0 NOT NULL,
    "last_position_seconds" integer DEFAULT 0 NOT NULL,
    "last_checkpoint_at" timestamp,
    "completed_at" timestamp,
    "created_at" timestamp DEFAULT now()
);

-- Rate Limits (atomic fixed-window rate limiting)
CREATE TABLE IF NOT EXISTS "rate_limits" (
    "key" varchar(255) PRIMARY KEY NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);

-- Deals / Rewards Store
CREATE TABLE IF NOT EXISTS "deals" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar(255) NOT NULL,
    "description" text NOT NULL,
    "points_cost" integer NOT NULL,
    "discount_type" varchar(20) DEFAULT 'percent' NOT NULL,
    "discount_value" integer DEFAULT 0 NOT NULL,
    "discount_max_amount" integer,
    "image_url" text,
    "stock" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT now()
);

-- Deal Codes (encrypted discount codes per deal)
CREATE TABLE IF NOT EXISTS "deal_codes" (
    "id" serial PRIMARY KEY NOT NULL,
    "deal_id" integer NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
    "code" text NOT NULL,
    "is_redeemed" boolean DEFAULT false NOT NULL,
    "redeemed_at" timestamp,
    "created_at" timestamp DEFAULT now()
);

-- Redemptions (user purchase records)
CREATE TABLE IF NOT EXISTS "redemptions" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL REFERENCES "users"("id"),
    "deal_id" integer NOT NULL REFERENCES "deals"("id"),
    "points_spent" integer NOT NULL,
    "status" varchar(20) DEFAULT 'pending' NOT NULL,
    "revealed_code" text,
    "created_at" timestamp DEFAULT now()
);
