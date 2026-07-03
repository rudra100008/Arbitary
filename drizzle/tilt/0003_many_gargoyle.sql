ALTER TABLE "lottery_entries" ADD COLUMN "age_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lottery_entries" ADD COLUMN "data_consent" boolean DEFAULT false NOT NULL;