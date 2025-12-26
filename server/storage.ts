import {
  conversations,
  messages,
  users,
  type Conversation,
  type Message,
  type InsertConversation,
  type InsertMessage,
  type User,
} from "../shared/schema";
import { db } from './db';
import { eq, desc } from 'drizzle-orm';

export interface IStorage {
  getUserById(userId: number): Promise<User | undefined>;
  updateUserLanguage(userId: number, language: string): Promise<void>;
  updateUserPlan(userId: number, planType: string): Promise<void>;
  decrementMessages(userId: number): Promise<number>;
  
  createConversation(userId: number, language: string): Promise<Conversation>;
  getConversation(userId: number): Promise<Conversation | undefined>;
  
  saveMessage(conversationId: number, type: string, content: string, corrected?: string, explanations?: string[]): Promise<void>;
  getConversationHistory(conversationId: number): Promise<Message[]>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(userId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user || undefined;
  }

  async updateUserLanguage(userId: number, language: string): Promise<void> {
    await db
      .update(users)
      .set({ activeLanguage: language, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserPlan(userId: number, planType: string): Promise<void> {
    await db
      .update(users)
      .set({ planType, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async decrementMessages(userId: number): Promise<number> {
    const user = await this.getUserById(userId);
    if (!user || user.messagesBank <= 0) return 0;
    
    const newBank = user.messagesBank - 1;
    await db
      .update(users)
      .set({ 
        messagesBank: newBank,
        messagesUsedThisPeriod: user.messagesUsedThisPeriod + 1,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
    
    return newBank;
  }

  async createConversation(userId: number, language: string): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({ userId, language })
      .returning();
    return conversation;
  }

  async getConversation(userId: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
    return conversation || undefined;
  }

  async saveMessage(conversationId: number, type: string, content: string, corrected?: string, explanations?: string[]): Promise<void> {
    await db.insert(messages).values({
      conversationId,
      type,
      content,
      corrected,
      explanations,
    });
  }

  async getConversationHistory(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }
}

export const storage = new DatabaseStorage();