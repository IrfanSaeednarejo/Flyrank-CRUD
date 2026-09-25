// src/db/schema/profiles.ts
import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';

export const userProfiles = pgTable('user_profiles', {
    userId: text('user_id').primaryKey(), // References neon_auth.user.id
    fullName: varchar('full_name', { length: 255 }).notNull(),
    department: varchar('department', { length: 100 }).notNull(),
    bio: text('bio'),
    project: varchar('project', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()),
});

export type insertUserProfile = typeof userProfiles.$inferInsert;
export type selectUserProfile = typeof userProfiles.$inferSelect;
export type updateUserProfile = Partial<Omit<selectUserProfile, 'userId' | 'createdAt'>>;