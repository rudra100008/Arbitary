import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
    console.log("Unexcepted error on idle client", err);
})

export const db = drizzle(pool, { schema });
