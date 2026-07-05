/**
 * create-tilt-superadmin.js
 *
 * Creates (or upgrades) a user with role = "SUPERADMIN" in the
 * Tilt Your Music database (the `tilt_users` table pointed to by
 * TILT_DATABASE_URL).
 *
 * Usage:
 *   node create-tilt-superadmin.js <email> <password> [name]
 *
 * Example:
 *   node create-tilt-superadmin.js super@tiltyourmusic.com SuperSecret123 "Tilt Super Admin"
 *
 * Notes:
 * - If a user with this email already exists, it updates their password
 *   and role instead of creating a duplicate (ON CONFLICT ... DO UPDATE).
 * - Reads TILT_DATABASE_URL from .env.local or .env, same as your
 *   drizzle-tilde.config.ts does.
 * - tilt_users.email_verified is set to true so the new superadmin
 *   isn't blocked by an email verification flow.
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const [, , email, password, name] = process.argv;

  if (!email || !password) {
    console.error('Usage: node create-tilt-superadmin.js <email> <password> [name]');
    process.exit(1);
  }

  const connectionString = process.env.TILT_DATABASE_URL;
  if (!connectionString) {
    console.error('TILT_DATABASE_URL is not set in .env or .env.local');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: false, // matches your current self-hosted EC2 setup (no SSL configured)
  });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const displayName = name || 'Super Admin';

    const result = await pool.query(
      `INSERT INTO tilt_users (name, email, password_hash, role, email_verified, created_at)
       VALUES ($1, $2, $3, 'SUPERADMIN', true, NOW())
       ON CONFLICT (email)
       DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'SUPERADMIN'
       RETURNING id, email, role;`,
      [displayName, email, hashedPassword]
    );

    console.log('Tilt superadmin ready:');
    console.log(result.rows[0]);
  } catch (err) {
    console.error('Failed to create tilt superadmin:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
