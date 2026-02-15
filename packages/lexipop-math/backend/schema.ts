import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// ─── Users ────────────────────────────────────────────────────────────────────
// Prefijo "lm_" para no colisionar si comparte la misma DB con Polyglot Point.
export const users = pgTable("lm_users", {
  id:        serial("id").primaryKey(),
  email:     text("email").notNull().unique(),
  name:      text("name").notNull(),
  googleId:  text("google_id").notNull().unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User    = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;