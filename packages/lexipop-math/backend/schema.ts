import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean
} from "drizzle-orm/pg-core";

export const users = pgTable("lm_users", {
  id: serial("id").primaryKey(),

  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  googleId: text("google_id").notNull().unique(),
  avatarUrl: text("avatar_url"),

  // 🔹 Progreso
  exercisesCount: integer("exercises_count")
    .notNull()
    .default(0),

  // 🔹 Stripe
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),

  subscriptionStatus: text("subscription_status"), 
  // ej: "active", "canceled", "past_due", etc.

  subscriptionEndsAt: timestamp("subscription_ends_at"),

  // 🔹 Acceso rápido (cache lógico)
  isPro: boolean("is_pro")
    .notNull()
    .default(false),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
