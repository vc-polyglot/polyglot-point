import { conversations, messages, userProfiles, type Conversation, type Message, type InsertConversation, type InsertMessage, type ConversationSettings, type UserProfile, type InsertUserProfile } from "@shared/schema";
import type { ProcessedMessage } from "./services/conversation.js";
import { db } from './db';
import { eq, desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export interface IStorage {
  // Conversation methods
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(sessionId: string): Promise<Conversation | undefined>;
  updateLastActivity(sessionId: string): Promise<void>;
  
  // Message methods
  saveMessage(sessionId: string, message: ProcessedMessage): Promise<void>;
  getConversationHistory(sessionId: string): Promise<ProcessedMessage[]>;
  
  // Session methods
  getSessionStartTime(sessionId: string): Promise<Date>;
  getSessionSettings(sessionId: string): Promise<ConversationSettings | undefined>;
  saveSessionSettings(sessionId: string, settings: ConversationSettings): Promise<void>;
  clearSession(sessionId: string): Promise<void>;
  
  // User profile methods
  getUserProfile(sessionId: string): Promise<UserProfile | undefined>;
  saveUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updatePreferredLanguage(sessionId: string, language: string): Promise<void>;
  updateActiveLanguage(sessionId: string, language: string): Promise<void>;
  updateSubscriptionType(sessionId: string, type: 'freemium' | 'premium'): Promise<void>;
  updateAvailableLanguages(sessionId: string, languages: string[]): Promise<void>;
  
  // Audio file methods
  saveAudioFile(audioBuffer: Buffer, sessionId: string): Promise<string>;
  
  // Session timeout methods
  getLastActivity(sessionId: string): Promise<Date>;
  updateLastActivity(sessionId: string): Promise<void>;
  setInactivityWarning(sessionId: string): Promise<void>;
  hasInactivityWarning(sessionId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUserProfile(sessionId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.sessionId, sessionId));
    return profile || undefined;
  }

  async saveUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [result] = await db
      .insert(userProfiles)
      .values(profile)
      .onConflictDoUpdate({
        target: userProfiles.sessionId,
        set: {
          preferredLanguage: profile.preferredLanguage,
          updatedAt: new Date(),
        }
      })
      .returning();
    return result;
  }

  async updatePreferredLanguage(sessionId: string, language: string): Promise<void> {
    await db
      .update(userProfiles)
      .set({ 
        preferredLanguage: language,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.sessionId, sessionId));
  }

  async updateActiveLanguage(sessionId: string, language: string): Promise<void> {
    await db
      .update(userProfiles)
      .set({ 
        activeLanguage: language,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.sessionId, sessionId));
  }

  async updateSubscriptionType(sessionId: string, type: 'freemium' | 'premium'): Promise<void> {
    await db
      .update(userProfiles)
      .set({ 
        subscriptionType: type,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.sessionId, sessionId));
  }

  async updateAvailableLanguages(sessionId: string, languages: string[]): Promise<void> {
    await db
      .update(userProfiles)
      .set({ 
        availableLanguages: languages,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.sessionId, sessionId));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async getConversation(sessionId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.sessionId, sessionId))
      .orderBy(desc(conversations.createdAt));
    return conversation || undefined;
  }

  async updateLastActivity(sessionId: string): Promise<void> {
    await db
      .update(conversations)
      .set({ lastActivity: new Date() })
      .where(eq(conversations.sessionId, sessionId));
  }

  async saveMessage(sessionId: string, message: ProcessedMessage): Promise<void> {
    let conversation = await this.getConversation(sessionId);
    
    // Create conversation if it doesn't exist
    if (!conversation) {
      conversation = await this.createConversation({
        sessionId,
        language: 'en',
      });
    }

    await db.insert(messages).values({
      conversationId: conversation.id,
      type: message.type,
      content: message.content,
      audioUrl: message.audioUrl,
    });
  }

  async getConversationHistory(sessionId: string): Promise<ProcessedMessage[]> {
    const conversation = await this.getConversation(sessionId);
    if (!conversation) return [];

    const dbMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.timestamp);

    return dbMessages.map(msg => ({
      id: msg.id.toString(),
      type: msg.type as 'user' | 'ai',
      content: msg.content,
      audioUrl: msg.audioUrl || undefined,
      timestamp: msg.timestamp || new Date(),
    }));
  }

  async getSessionStartTime(sessionId: string): Promise<Date> {
    const conversation = await this.getConversation(sessionId);
    return conversation?.createdAt || new Date();
  }

  async getSessionSettings(sessionId: string): Promise<ConversationSettings | undefined> {
    const profile = await this.getUserProfile(sessionId);
    if (!profile) return undefined;

    return {
      language: profile.activeLanguage as any,
      speechSpeed: 1.0,
      voiceVolume: 80,
      enableCorrections: true,
      enableSuggestions: true,
      subscriptionType: profile.subscriptionType as any,
      availableLanguages: profile.availableLanguages as any,
      activeLanguage: profile.activeLanguage as any,
    };
  }

  async saveSessionSettings(sessionId: string, settings: ConversationSettings): Promise<void> {
    await this.saveUserProfile({
      sessionId,
      preferredLanguage: settings.language,
      subscriptionType: settings.subscriptionType,
      availableLanguages: settings.availableLanguages,
      activeLanguage: settings.activeLanguage,
    });
  }

  async clearSession(sessionId: string): Promise<void> {
    const conversation = await this.getConversation(sessionId);
    if (!conversation) return;

    await db.delete(messages).where(eq(messages.conversationId, conversation.id));
    await db.delete(conversations).where(eq(conversations.sessionId, sessionId));
  }

  async saveAudioFile(audioBuffer: Buffer, sessionId: string): Promise<string> {
    const audioDir = path.join(process.cwd(), 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const filename = `${sessionId}_${Date.now()}.mp3`;
    const filepath = path.join(audioDir, filename);
    
    fs.writeFileSync(filepath, audioBuffer);
    return filename;
  }

  getAudioFile(filename: string): Buffer | undefined {
    const audioDir = path.join(process.cwd(), 'audio');
    const filepath = path.join(audioDir, filename);
    
    try {
      if (fs.existsSync(filepath)) {
        return fs.readFileSync(filepath);
      }
      return undefined;
    } catch (error) {
      console.error('Error reading audio file:', error);
      return undefined;
    }
  }

  async getLastActivity(sessionId: string): Promise<Date> {
    const conversation = await this.getConversation(sessionId);
    return conversation?.lastActivity || new Date();
  }

  async setInactivityWarning(sessionId: string): Promise<void> {
    // For DatabaseStorage, we could store this in a separate table
    // For now, we'll use the conversation's lastActivity field
    const conversation = await this.getConversation(sessionId);
    if (conversation) {
      await db.update(conversations)
        .set({ lastActivity: new Date() })
        .where(eq(conversations.id, conversation.id));
    }
  }

  async hasInactivityWarning(sessionId: string): Promise<boolean> {
    // For DatabaseStorage, check if warning was sent based on time difference
    const lastActivity = await this.getLastActivity(sessionId);
    const now = new Date();
    const timeDiff = now.getTime() - lastActivity.getTime();
    const tenMinutes = 10 * 60 * 1000;
    return timeDiff > tenMinutes;
  }
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;
  private messages: Map<string, ProcessedMessage[]>;
  private sessionSettings: Map<string, ConversationSettings>;
  private sessionStartTimes: Map<string, Date>;
  private audioFiles: Map<string, Buffer>;
  private userProfiles: Map<string, UserProfile>;
  private inactivityWarnings: Map<string, boolean>;
  private currentId: number;

  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this.sessionSettings = new Map();
    this.sessionStartTimes = new Map();
    this.audioFiles = new Map();
    this.userProfiles = new Map();
    this.inactivityWarnings = new Map();
    this.currentId = 1;
    
    // Ensure audio directory exists
    this.ensureAudioDirectory();
  }

  private ensureAudioDirectory(): void {
    const audioDir = path.join(process.cwd(), 'public', 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.currentId++;
    const conversation: Conversation = {
      id,
      userId: insertConversation.userId || null,
      sessionId: insertConversation.sessionId,
      language: insertConversation.language,
      lastActivity: new Date(),
      createdAt: new Date()
    };
    
    this.conversations.set(insertConversation.sessionId, conversation);
    this.sessionStartTimes.set(insertConversation.sessionId, new Date());
    
    return conversation;
  }

  async getConversation(sessionId: string): Promise<Conversation | undefined> {
    return this.conversations.get(sessionId);
  }

  async updateLastActivity(sessionId: string): Promise<void> {
    const conversation = this.conversations.get(sessionId);
    if (conversation) {
      conversation.lastActivity = new Date();
      this.conversations.set(sessionId, conversation);
    }
  }

  async getUserProfile(sessionId: string): Promise<UserProfile | undefined> {
    return this.userProfiles.get(sessionId);
  }

  async saveUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const id = this.currentId++;
    const userProfile: UserProfile = {
      id,
      sessionId: profile.sessionId,
      preferredLanguage: profile.preferredLanguage || 'es',
      subscriptionType: profile.subscriptionType || 'freemium',
      availableLanguages: profile.availableLanguages || ['es'],
      activeLanguage: profile.activeLanguage || 'es',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.userProfiles.set(profile.sessionId, userProfile);
    return userProfile;
  }

  async updatePreferredLanguage(sessionId: string, language: string): Promise<void> {
    const profile = this.userProfiles.get(sessionId);
    if (profile) {
      profile.preferredLanguage = language;
      profile.updatedAt = new Date();
      this.userProfiles.set(sessionId, profile);
    }
  }

  async updateActiveLanguage(sessionId: string, language: string): Promise<void> {
    const profile = this.userProfiles.get(sessionId);
    if (profile) {
      profile.activeLanguage = language;
      profile.updatedAt = new Date();
      this.userProfiles.set(sessionId, profile);
    }
  }

  async updateSubscriptionType(sessionId: string, type: 'freemium' | 'premium'): Promise<void> {
    const profile = this.userProfiles.get(sessionId);
    if (profile) {
      profile.subscriptionType = type;
      profile.updatedAt = new Date();
      this.userProfiles.set(sessionId, profile);
    }
  }

  async updateAvailableLanguages(sessionId: string, languages: string[]): Promise<void> {
    const profile = this.userProfiles.get(sessionId);
    if (profile) {
      profile.availableLanguages = languages;
      profile.updatedAt = new Date();
      this.userProfiles.set(sessionId, profile);
    }
  }

  async saveMessage(sessionId: string, message: ProcessedMessage): Promise<void> {
    // Ensure conversation exists
    let conversation = await this.getConversation(sessionId);
    if (!conversation) {
      conversation = await this.createConversation({
        userId: null,
        sessionId,
        language: 'en'
      });
    }

    // Save message
    if (!this.messages.has(sessionId)) {
      this.messages.set(sessionId, []);
    }
    
    const messages = this.messages.get(sessionId)!;
    messages.push(message);
    
    console.log(`Message saved for session ${sessionId}: ${message.type} - "${message.content}"`);
  }

  async getConversationHistory(sessionId: string): Promise<ProcessedMessage[]> {
    return this.messages.get(sessionId) || [];
  }

  async getSessionStartTime(sessionId: string): Promise<Date> {
    const startTime = this.sessionStartTimes.get(sessionId);
    if (!startTime) {
      // If no start time exists, create one
      const now = new Date();
      this.sessionStartTimes.set(sessionId, now);
      return now;
    }
    return startTime;
  }

  async getSessionSettings(sessionId: string): Promise<ConversationSettings | undefined> {
    return this.sessionSettings.get(sessionId);
  }

  async saveSessionSettings(sessionId: string, settings: ConversationSettings): Promise<void> {
    this.sessionSettings.set(sessionId, settings);
    console.log(`Settings saved for session ${sessionId}:`, settings);
  }

  async clearSession(sessionId: string): Promise<void> {
    this.messages.delete(sessionId);
    this.sessionSettings.delete(sessionId);
    this.sessionStartTimes.delete(sessionId);
    this.conversations.delete(sessionId);
    
    // Clean up audio files for this session
    const audioKeys = Array.from(this.audioFiles.keys()).filter(key => key.includes(sessionId));
    audioKeys.forEach(key => this.audioFiles.delete(key));
    
    console.log(`Session ${sessionId} cleared`);
  }

  async saveAudioFile(audioBuffer: Buffer, sessionId: string): Promise<string> {
    const timestamp = Date.now();
    const filename = `${sessionId}_${timestamp}.mp3`;
    const filepath = path.join('public', 'audio', filename);
    const publicUrl = `/api/audio/${filename}`;
    
    try {
      // Save to filesystem
      const fullPath = path.join(process.cwd(), filepath);
      await fs.promises.writeFile(fullPath, audioBuffer);
      
      // Also keep in memory for quick access
      this.audioFiles.set(filename, audioBuffer);
      
      console.log(`Audio file saved: ${filename}`);
      return publicUrl;
    } catch (error) {
      console.error('Error saving audio file:', error);
      throw new Error(`Failed to save audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Additional method to serve audio files
  getAudioFile(filename: string): Buffer | undefined {
    return this.audioFiles.get(filename);
  }

  async getLastActivity(sessionId: string): Promise<Date> {
    const conversation = this.conversations.get(sessionId);
    return conversation?.lastActivity || new Date();
  }

  async setInactivityWarning(sessionId: string): Promise<void> {
    this.inactivityWarnings.set(sessionId, true);
  }

  async hasInactivityWarning(sessionId: string): Promise<boolean> {
    return this.inactivityWarnings.get(sessionId) || false;
  }
}

export const storage = new DatabaseStorage();
