-- Migration 0009: Add social_platform, target_url, and is_active columns to tasks table
-- Aligns Destination schema with Source schema structure.

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "social_platform" varchar(50);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "target_url" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
