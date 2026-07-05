
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as tiltSchema from './tilt-schema';

const connectionString = process.env.TILT_DATABASE_URL;

type TiltDb = ReturnType<typeof drizzle<typeof tiltSchema>>;

let tiltDbInstance: TiltDb | null = null;

if (!connectionString) {
    // Avoid crashing the module at import time so route handlers can return proper JSON errors.
    console.error('TILT_DATABASE_URL is not set');
} else {
    const tiltPool = new Pool({
        connectionString,
        ssl: true,
        max: 50,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });

    tiltPool.on('error', (err) => {
        console.error('Unexpected error on tilt DB idle client', err);
    });

    tiltDbInstance = drizzle(tiltPool, { schema: tiltSchema });
}

export const tiltDb = new Proxy({} as TiltDb, {
    get(_target, prop, receiver) {
        if (!tiltDbInstance) {
            throw new Error('TILT_DATABASE_URL is not set');
        }

        const value = Reflect.get(tiltDbInstance, prop, receiver);
        return typeof value === 'function' ? value.bind(tiltDbInstance) : value;
    },
});