import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    out: './src/db/migrations', // Where SQL migration files will be stored
    schema: './src/db/schema/*.ts', // Path to your schema file
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});