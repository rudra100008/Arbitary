CREATE TABLE IF NOT EXISTS "tilt_settings" (
  "key" varchar(100) PRIMARY KEY NOT NULL,
  "value" integer NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "tilt_settings" ("key", "value")
VALUES ('daily_reward_target', 10)
ON CONFLICT ("key") DO NOTHING;
