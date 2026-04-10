import { pgTable, serial, text, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";

// ─── Users ────────────────────────────────────────────────────────────────────
// Prefijo "ld_" para no colisionar con lm_ (lexipop-math) y pp_ (polyglot-point)
export const users = pgTable("ld_users", {
  id:        serial("id").primaryKey(),
  email:     text("email").notNull().unique(),
  name:      text("name").notNull(),
  googleId:  text("google_id").notNull().unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Decisions ────────────────────────────────────────────────────────────────
export const decisions = pgTable("ld_decisions", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").references(() => users.id),
  title:       text("title").notNull(),
  level:       text("level").notNull(),         // cotidiana | carrera | financiera
  inputJson:   jsonb("input_json").notNull(),    // DecisionInput completo
  metricsJson: jsonb("metrics_json").notNull(),  // DecisionMetrics
  analysisJson:jsonb("analysis_json"),           // AIAnalysis (puede llegar después)
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export type User        = typeof users.$inferSelect;
export type NewUser     = typeof users.$inferInsert;
export type Decision    = typeof decisions.$inferSelect;
export type NewDecision = typeof decisions.$inferInsert;