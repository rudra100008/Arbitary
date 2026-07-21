/* eslint-disable @typescript-eslint/no-require-imports */
// Run: node scripts/cleanup-admin-logs.js
// Scheduled via cron to run daily: DELETE FROM admin_activity_logs WHERE created_at < NOW() - INTERVAL '90 days'

const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

async function cleanup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM "admin_activity_logs" WHERE "created_at" < NOW() - INTERVAL '90 days'`,
    );
    console.log(`[cleanup] Deleted ${result.rowCount} old admin log entries`);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup().catch((err) => {
  console.error("[cleanup] Failed:", err);
  process.exit(1);
});
