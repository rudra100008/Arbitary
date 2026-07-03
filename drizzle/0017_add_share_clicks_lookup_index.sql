CREATE INDEX IF NOT EXISTS "idx_share_clicks_code_fingerprint_agent" ON "share_clicks" USING btree ("share_code","fingerprint","user_agent");
