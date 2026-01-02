import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ========== USUARIOS ==========
export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  // Auth - OAuth only (no password)
  email: varchar("email", { length: 255 }).notNull().unique(),
  googleId: varchar("google_id", { length: 255 }).unique(),
  appleId: varchar("apple_id", { length: 255 }).unique(),
  name: varchar("name", { length: 255 }),
  avatarUrl: text("avatar_url"),

  // Plan
  planType: varchar("plan_type", { length: 20 }).notNull().default("freemium"), // freemium | premium | pro

  // Banco de mensajes (saldo total disponible)
  messagesBank: integer("messages_bank").notNull().default(20), // Freemium empieza con 20
  messagesUsedThisPeriod: integer("messages_used_this_period").notNull().default(0),

  // Corral diario Premium (V5.0)
  premiumMessagesToday: integer("premium_messages_today").notNull().default(0),
  premiumLastResetDate: varchar("premium_last_reset_date", { length: 10 }), // "YYYY-MM-DD"
  
  // Reloj de recarga (source-of-truth: Stripe si hay suscripción; fallback interno si lo necesitas)
  lastRefillDate: timestamp("last_refill_date").defaultNow().notNull(),
  nextRefillAt: timestamp("next_refill_at"), // se setea por backend/webhook si decides usarlo

  // Stripe
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).unique(),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end"),

  // Auto-reload
  autoReload: boolean("auto_reload").notNull().default(false),
  autoReloadAmount: integer("auto_reload_amount").notNull().default(100), // mensajes a comprar
  autoReloadThreshold: integer("auto_reload_threshold").notNull().default(0), // activar cuando messagesBank <= threshold

  // Reminders
  remindersOptOut: boolean("reminders_opt_out").notNull().default(false),
  lastReminderSent: timestamp("last_reminder_sent"),

  // Config (perfil)
  preferredLanguage: varchar("preferred_language", { length: 5 }).notNull().default("es"),
  activeLanguage: varchar("active_language", { length: 5 }).notNull().default("es"), // redundante vs conversations.language; mantener por compatibilidad

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => ({
  emailIdx: index("users_email_idx").on(t.email),
  googleIdIdx: index("users_google_id_idx").on(t.googleId),
  appleIdIdx: index("users_apple_id_idx").on(t.appleId),
  stripeCustomerIdx: index("users_stripe_customer_id_idx").on(t.stripeCustomerId),
  stripeSubIdx: index("users_stripe_subscription_id_idx").on(t.stripeSubscriptionId),
  planTypeIdx: index("users_plan_type_idx").on(t.planType),
}));

// ========== CONVERSACIONES ==========
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  language: varchar("language", { length: 5 }).notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("conversations_user_id_idx").on(t.userId),
}));

// ========== MENSAJES ==========
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 10 }).notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  corrected: text("corrected"),
  explanations: jsonb("explanations").$type<string[]>(),

  // Telemetría (opcional pero útil)
  tokensUsed: integer("tokens_used"),
  model: varchar("model", { length: 50 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  conversationIdIdx: index("messages_conversation_id_idx").on(t.conversationId),
  createdAtIdx: index("messages_created_at_idx").on(t.createdAt),
}));

// ========== COMPRAS DE PAQUETES ==========
export const messagePurchases = pgTable("message_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // mensajes comprados
  priceCents: integer("price_cents").notNull(), // centavos
  stripePaymentId: varchar("stripe_payment_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("message_purchases_user_id_idx").on(t.userId),
  createdAtIdx: index("message_purchases_created_at_idx").on(t.createdAt),
}));

// ========== HISTORIAL DE CAMBIOS DE PLAN (fase 2 / auditoría) ==========
export const planChanges = pgTable("plan_changes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fromPlan: varchar("from_plan", { length: 20 }),
  toPlan: varchar("to_plan", { length: 20 }).notNull(),
  reason: text("reason"), // "upgrade" | "downgrade" | "initial" | etc.
  changedAt: timestamp("changed_at").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("plan_changes_user_id_idx").on(t.userId),
  changedAtIdx: index("plan_changes_changed_at_idx").on(t.changedAt),
}));

// ========== CONSTANTES DEL MODELO V5.0 ==========
export const PLAN_CONFIG = {
  freemium: {
    baseMessages: 20,
    maxTokens: 1500,
    contextTurns: 2,
    ceiling: 20,
    priceMonthlyCents: 0,
    renewable: false,      // NO se renueva nunca
    dailyLimit: null,      // Sin límite diario
    rollover: false,
  },
  premium: {
    baseMessages: 50,      // V5.0: 50/día
    maxTokens: 1500,
    contextTurns: 2,
    ceiling: 50,           // No acumula
    priceMonthlyCents: 1800, // $18
    renewable: true,
    dailyLimit: 50,        // CORRAL DIARIO
    rollover: false,       // No acumula
  },
  pro: {
    baseMessages: 4500,    // V5.0: 4500/mes
    maxTokens: 2000,
    contextTurns: 5,
    ceiling: 11250,        // V5.0: techo 2.5x
    priceMonthlyCents: 2900, // $29
    renewable: true,
    dailyLimit: null,      // SIN límite diario
    rollover: true,        // SÍ acumula
    priorityQueue: true,
  },
} as const;

export const MESSAGE_PACKAGES = {
  premium: [
    { amount: 50, priceCents: 200 },
    { amount: 100, priceCents: 360 },
    { amount: 250, priceCents: 850 },
  ],
  pro: [
    { amount: 100, priceCents: 280 },
    { amount: 250, priceCents: 650 },
    { amount: 500, priceCents: 1200 },
  ],
} as const;

// ========== SCHEMAS ZOD ==========
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastActivity: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseSchema = createInsertSchema(messagePurchases).omit({
  id: true,
  createdAt: true,
});

export const insertPlanChangeSchema = createInsertSchema(planChanges).omit({
  id: true,
  changedAt: true,
});

// ========== TYPES ==========
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type MessagePurchase = typeof messagePurchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

export type PlanChange = typeof planChanges.$inferSelect;
export type InsertPlanChange = z.infer<typeof insertPlanChangeSchema>;

export type PlanType = keyof typeof PLAN_CONFIG;

// ========== SCHEMAS DE VALIDACIÓN ==========
export const planTypeSchema = z.enum(["freemium", "premium", "pro"]);
export const languageSchema = z.enum(["es", "en", "fr", "it", "de", "pt"]);

export const conversationSettingsSchema = z.object({
  language: languageSchema,
  planType: planTypeSchema.default("freemium"),
});

export type ConversationSettings = z.infer<typeof conversationSettingsSchema>;