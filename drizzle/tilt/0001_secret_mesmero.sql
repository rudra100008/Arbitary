CREATE TABLE IF NOT EXISTS "instant_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"campaign_id" uuid NOT NULL,
	"outlet_id" text NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "instant_rewards_entry_id_unique" UNIQUE("entry_id"),
	CONSTRAINT "instant_rewards_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "invited_outlets" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invited_outlets_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "tilt_users" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "lottery_entries" ADD COLUMN "phone_plain" text NOT NULL;--> statement-breakpoint
ALTER TABLE "instant_rewards" ADD CONSTRAINT "instant_rewards_entry_id_lottery_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."lottery_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instant_rewards" ADD CONSTRAINT "instant_rewards_session_id_lottery_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."lottery_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instant_rewards" ADD CONSTRAINT "instant_rewards_campaign_id_lottery_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."lottery_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "instant_rewards_claimed_at_idx" ON "instant_rewards" USING btree ("claimed_at");--> statement-breakpoint
CREATE INDEX "instant_rewards_outlet_idx" ON "instant_rewards" USING btree ("outlet_id","claimed_at");--> statement-breakpoint
CREATE INDEX "idx_lottery_campaigns_outlet" ON "lottery_campaigns" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "idx_lottery_campaigns_dates" ON "lottery_campaigns" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "idx_lottery_sessions_token" ON "lottery_sessions" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "idx_lottery_sessions_campaign" ON "lottery_sessions" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_qr_tokens_outlet" ON "qr_tokens" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "idx_qr_tokens_campaign" ON "qr_tokens" USING btree ("campaign_id");
