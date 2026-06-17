ALTER TABLE "lottery_entries"
ADD COLUMN "phone_plain" text;

UPDATE "lottery_entries"
SET "phone_plain" = ''
WHERE "phone_plain" IS NULL;

ALTER TABLE "lottery_entries"
ALTER COLUMN "phone_plain" SET NOT NULL;
