/**
 * create-admin.js
 *
 * Creates (or upgrades) a user with role = "ADMIN" in the Arbitary database
 * (the `users` table pointed to by DATABASE_URL).
 *
 * Usage:
 *   node create-admin.js <email> <password> [name]
 *
 * Example:
 *   node create-admin.js admin@arbitary.com SuperSecret123 "Ashum Admin"
 *
 * Notes:
 * - If a user with this email already exists, it updates their password
 *   and role instead of creating a duplicate (ON CONFLICT ... DO UPDATE).
 * - Reads DATABASE_URL from .env.local or .env, same as your app.
 * - Uses bcryptjs to hash the password, matching what your app's login
 *   flow expects (bcryptjs is already in your dependencies).
 */

require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

async function main() {
  const [, , email, password, name] = process.argv;

  if (!email || !password) {
    console.error("Usage: node create-admin.js <email> <password> [name]");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set in .env or .env.local");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: false, // matches your current self-hosted EC2 setup (no SSL configured)
  });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const displayName = name || "Admin";

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, provider, "Is_Verified", created_at)
   VALUES ($1, $2, $3, 'ADMIN', 'credentials', true, NOW())
   ON CONFLICT (email)
   DO UPDATE SET password = EXCLUDED.password, role = 'ADMIN', "Is_Verified" = true
   RETURNING id, email, role, "Is_Verified";`,
      [displayName, email, hashedPassword],
    );

    console.log("Admin user ready:");
    console.log(result.rows[0]);
  } catch (err) {
    console.error("Failed to create admin user:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
