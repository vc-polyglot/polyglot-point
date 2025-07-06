import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  subscriptionType: text("subscription_type").notNull().default("freemium"),
  availableLanguages: text("available_languages").array().notNull().default(["es"]),
  activeLanguage: text("active_language").notNull().default("es"),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  sessionId: text("session_id").notNull(),
  language: text("language").notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  preferredLanguage: text("preferred_language").notNull().default("es"),
  subscriptionType: text("subscription_type").notNull().default("freemium"), // 'freemium' | 'premium'
  availableLanguages: text("available_languages").array().notNull().default(["es"]), // Array of language codes
  activeLanguage: text("active_language").notNull().default("es"), // Currently selected language
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  type: text("type").notNull(), // 'user' | 'ai'
  content: text("content").notNull(),
  audioUrl: text("audio_url"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastActivity: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// Voice conversation types
export const voiceMessageSchema = z.object({
  type: z.enum(['audio', 'text', 'text_conversation', 'control']),
  data: z.union([z.string(), z.object({
    text: z.string(),
    settings: z.object({
      language: z.string().optional(),
      speechSpeed: z.number().optional(),
      voiceVolume: z.number().optional(),
      enableCorrections: z.boolean().optional(),
      enableSuggestions: z.boolean().optional(),
    }).optional()
  })]),
  language: z.string().optional(),
  sessionId: z.string(),
});

export const conversationSettingsSchema = z.object({
  language: z.enum(['es', 'en', 'fr', 'it', 'de', 'pt']),
  speechSpeed: z.number().min(0.5).max(2.0).default(1.0),
  voiceVolume: z.number().min(0).max(100).default(80),
  enableCorrections: z.boolean().default(true),
  enableSuggestions: z.boolean().default(true),
  subscriptionType: z.enum(['freemium', 'premium']).default('freemium'),
  availableLanguages: z.array(z.enum(['es', 'en', 'fr', 'it', 'de', 'pt'])).default(['es']),
  activeLanguage: z.enum(['es', 'en', 'fr', 'it', 'de', 'pt']).default('es'),
});

export type VoiceMessage = z.infer<typeof voiceMessageSchema>;
export type ConversationSettings = z.infer<typeof conversationSettingsSchema>;
