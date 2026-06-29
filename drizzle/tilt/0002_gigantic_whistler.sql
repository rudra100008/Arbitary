DROP INDEX "lottery_entries_campaign_email_idx";--> statement-breakpoint
DROP INDEX "lottery_entries_campaign_phone_hash_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "lottery_entries_campaign_email_idx" ON "lottery_entries" USING btree ("campaign_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "lottery_entries_campaign_phone_hash_idx" ON "lottery_entries" USING btree ("campaign_id","phone_hash");