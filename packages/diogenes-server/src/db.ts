import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const db = drizzle(pool);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  googleId: text('google_id').unique().notNull(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  avatar: text('avatar'),
  isPremium: boolean('is_premium').default(false),
  dailyQueries: integer('daily_queries').default(0),
  lastQueryDate: text('last_query_date'),
  language: text('language').default('es'),
  createdAt: timestamp('created_at').defaultNow()
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;