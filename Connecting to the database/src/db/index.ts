import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/tasks.ts';

const pool = new Pool({
    connectionString:
        process.env.NODE_ENV === 'production'
            ? process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL
            : process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });