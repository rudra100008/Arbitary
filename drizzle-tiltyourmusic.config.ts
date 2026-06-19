// drizzle-tilde.config.ts
// Separate Drizzle config pointing to the Tilde Neon database.
// Usage: npx drizzle-kit push --config=drizzle-tilde.config.ts

import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

if (!process.env.TILT_DATABASE_URL) {
    throw new Error('TILT_DATABASE_URL is not set in .env or .env.local');
}

export default defineConfig({
    schema: './src/db/tilt-schema.ts',
    out: './drizzle/tilt',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.TILT_DATABASE_URL!,
    },
});