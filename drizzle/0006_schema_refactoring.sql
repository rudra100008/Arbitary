-- Schema refactoring: fix column types, naming, and defaults
-- eventDate: text -> timestamp
ALTER TABLE "events" ALTER COLUMN "event_date" TYPE timestamp USING "event_date"::timestamp;
-- dailyLoginDate: text -> timestamp
ALTER TABLE "users" ALTER COLUMN "daily_login_date" TYPE timestamp USING "daily_login_date"::timestamp;
-- location: rename "Location" -> "location" (snake_case convention)
ALTER TABLE "users" RENAME COLUMN "Location" TO "location";
-- redeemedAt: remove defaultNow() so ticket starts as null until redeemed
ALTER TABLE "user_tickets" ALTER COLUMN "redeemed_at" DROP DEFAULT;
