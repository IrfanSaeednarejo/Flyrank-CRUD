import { pgTable, serial, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const task = pgTable('task', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    done: boolean("done").notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Export inferred types to use in Express and React
export type selectTask = typeof task.$inferSelect;
export type insertNewTask = typeof task.$inferInsert;
export type updateTask = Partial<selectTask>;
