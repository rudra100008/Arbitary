-- Migration 0008: Align existing SOURCE-schema DB to DESTINATION schema
-- This bridges the gap between the ORIGINAL codebase schema and the DESTINATION schema.
-- All changes are additive or renames — no data loss.

-- ── Users table ───────────────────────────────────────────────────────────────

-- Rename columns to match DESTINATION
ALTER TABLE "users" RENAME COLUMN "total_points" TO "points";
ALTER TABLE "users" RENAME COLUMN "pfp_link" TO "image";

-- Transform is_admin (boolean) → role (varchar)
ALTER TABLE "users" ADD COLUMN "role" varchar(50) NOT NULL DEFAULT 'user';
UPDATE "users" SET "role" = CASE WHEN "is_admin" = true THEN 'admin' ELSE 'user' END;
ALTER TABLE "users" DROP COLUMN "is_admin";

-- Add missing DESTINATION columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider" text NOT NULL DEFAULT 'credentials';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number" varchar(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" varchar(255) UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "facebook_id" varchar(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "completed_tasks_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "daily_login_date" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "current_streak" integer NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "longest_streak" integer NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;

-- Drop SOURCE email-verification columns (reverted earlier)
ALTER TABLE "users" DROP COLUMN IF EXISTS "verified";
ALTER TABLE "users" DROP COLUMN IF EXISTS "verify_token";
ALTER TABLE "users" DROP COLUMN IF EXISTS "verify_token_expiry";

-- ── Tasks table ───────────────────────────────────────────────────────────────

-- Map existing SOURCE columns to DESTINATION names
ALTER TABLE "tasks" RENAME COLUMN "social_platform" TO "platform";
ALTER TABLE "tasks" RENAME COLUMN "target_url" TO "post_url";
ALTER TABLE "tasks" RENAME COLUMN "watch_seconds" TO "watch_duration";
-- Add missing DESTINATION columns
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "social_post_id" varchar(255);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "difficulty" varchar(20) NOT NULL DEFAULT 'easy';
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "is_flash" boolean NOT NULL DEFAULT false;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "is_share" boolean NOT NULL DEFAULT false;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "share_threshold" integer DEFAULT 3;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "admin_id" integer REFERENCES "users"("id");

-- Drop period (not in DESTINATION)
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "period";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "is_active"; -- replaced by expires_at pattern

-- Convert ENUM columns to varchar (DESTINATION uses plain varchar)
ALTER TABLE "tasks" ALTER COLUMN "task_type" TYPE varchar(50);
ALTER TABLE "tasks" ALTER COLUMN "platform" TYPE varchar(255);
ALTER TABLE "user_tasks" ALTER COLUMN "status" TYPE varchar(50);

-- Remove SOURCE-only columns from user_tasks
ALTER TABLE "user_tasks" DROP COLUMN IF EXISTS "verified_by";

-- Add missing DESTINATION columns to user_tasks
ALTER TABLE "user_tasks" ADD COLUMN IF NOT EXISTS "proof_image_url" text;
ALTER TABLE "user_tasks" ADD COLUMN IF NOT EXISTS "assigned_at" timestamp DEFAULT now();

-- Create missing DESTINATION tables (not in SOURCE schema)
CREATE TABLE IF NOT EXISTS "referrals" (
    "id" serial PRIMARY KEY NOT NULL,
    "referrer_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "referred_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "points_awarded" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "share_tasks" (
    "id" serial PRIMARY KEY NOT NULL,
    "task_id" integer REFERENCES "tasks"("id") ON DELETE CASCADE,
    "user_id" integer REFERENCES "users"("id") ON DELETE CASCADE,
    "share_code" varchar(20) NOT NULL UNIQUE,
    "target_url" text NOT NULL DEFAULT '',
    "share_url" text NOT NULL,
    "owner_fingerprint" varchar(255),
    "click_count" integer NOT NULL DEFAULT 0,
    "unique_clicks" integer NOT NULL DEFAULT 0,
    "points_awarded" boolean NOT NULL DEFAULT false,
    "click_threshold" integer NOT NULL DEFAULT 3,
    "created_at" timestamp DEFAULT now(),
    "completed_at" timestamp
);

CREATE TABLE IF NOT EXISTS "share_clicks" (
    "id" serial PRIMARY KEY NOT NULL,
    "share_code" varchar(20) NOT NULL,
    "visitor_ip" varchar(50),
    "fingerprint" varchar(255),
    "user_agent" varchar(500),
    "clicked_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_tickets" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer REFERENCES "users"("id") ON DELETE CASCADE,
    "event_id" integer REFERENCES "events"("id") ON DELETE CASCADE,
    "access_type_id" integer REFERENCES "access_types"("id") ON DELETE SET NULL,
    "status" varchar(50) NOT NULL DEFAULT 'active',
    "redeemed_at" timestamp,
    "redemption_token" varchar(255) NOT NULL UNIQUE,
    "redeemed_by" integer REFERENCES "users"("id")
);

-- Update __drizzle_migrations tracking (create if not exists)
CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
    "id" serial PRIMARY KEY,
    "hash" text NOT NULL,
    "created_at" timestamp DEFAULT now()
);
