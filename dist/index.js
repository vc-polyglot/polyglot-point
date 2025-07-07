var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    neonConfig.webSocketConstructor = ws;
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  DatabaseStorage: () => DatabaseStorage,
  MemStorage: () => MemStorage,
  storage: () => storage
});
import { conversations, messages, userProfiles } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import fs2 from "fs";
import path2 from "path";
var DatabaseStorage, MemStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    init_db();
    DatabaseStorage = class {
      async getUserProfile(sessionId) {
        const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.sessionId, sessionId));
        return profile || void 0;
      }
      async saveUserProfile(profile) {
        const [result] = await db.insert(userProfiles).values(profile).onConflictDoUpdate({
          target: userProfiles.sessionId,
          set: {
            preferredLanguage: profile.preferredLanguage,
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        return result;
      }
      async updatePreferredLanguage(sessionId, language) {
        await db.update(userProfiles).set({
          preferredLanguage: language,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(userProfiles.sessionId, sessionId));
      }
      async updateActiveLanguage(sessionId, language) {
        await db.update(userProfiles).set({
          activeLanguage: language,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(userProfiles.sessionId, sessionId));
      }
      async updateSubscriptionType(sessionId, type) {
        await db.update(userProfiles).set({
          subscriptionType: type,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(userProfiles.sessionId, sessionId));
      }
      async updateAvailableLanguages(sessionId, languages) {
        await db.update(userProfiles).set({
          availableLanguages: languages,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(userProfiles.sessionId, sessionId));
      }
      async createConversation(insertConversation) {
        const [conversation] = await db.insert(conversations).values(insertConversation).returning();
        return conversation;
      }
      async getConversation(sessionId) {
        const [conversation] = await db.select().from(conversations).where(eq(conversations.sessionId, sessionId)).orderBy(desc(conversations.createdAt));
        return conversation || void 0;
      }
      async updateLastActivity(sessionId) {
        await db.update(conversations).set({ lastActivity: /* @__PURE__ */ new Date() }).where(eq(conversations.sessionId, sessionId));
      }
      async saveMessage(sessionId, message) {
        let conversation = await this.getConversation(sessionId);
        if (!conversation) {
          conversation = await this.createConversation({
            sessionId,
            language: "en"
          });
        }
        await db.insert(messages).values({
          conversationId: conversation.id,
          type: message.type,
          content: message.content,
          audioUrl: message.audioUrl
        });
      }
      async getConversationHistory(sessionId) {
        const conversation = await this.getConversation(sessionId);
        if (!conversation) return [];
        const dbMessages = await db.select().from(messages).where(eq(messages.conversationId, conversation.id)).orderBy(messages.timestamp);
        return dbMessages.map((msg) => ({
          id: msg.id.toString(),
          type: msg.type,
          content: msg.content,
          audioUrl: msg.audioUrl || void 0,
          timestamp: msg.timestamp || /* @__PURE__ */ new Date()
        }));
      }
      async getSessionStartTime(sessionId) {
        const conversation = await this.getConversation(sessionId);
        return conversation?.createdAt || /* @__PURE__ */ new Date();
      }
      async getSessionSettings(sessionId) {
        const profile = await this.getUserProfile(sessionId);
        if (!profile) return void 0;
        return {
          language: profile.activeLanguage,
          speechSpeed: 1,
          voiceVolume: 80,
          enableCorrections: true,
          enableSuggestions: true,
          subscriptionType: profile.subscriptionType,
          availableLanguages: profile.availableLanguages,
          activeLanguage: profile.activeLanguage
        };
      }
      async saveSessionSettings(sessionId, settings) {
        await this.saveUserProfile({
          sessionId,
          preferredLanguage: settings.language,
          subscriptionType: settings.subscriptionType,
          availableLanguages: settings.availableLanguages,
          activeLanguage: settings.activeLanguage
        });
      }
      async clearSession(sessionId) {
        const conversation = await this.getConversation(sessionId);
        if (!conversation) return;
        await db.delete(messages).where(eq(messages.conversationId, conversation.id));
        await db.delete(conversations).where(eq(conversations.sessionId, sessionId));
      }
      async saveAudioFile(audioBuffer, sessionId) {
        const audioDir = path2.join(process.cwd(), "audio");
        if (!fs2.existsSync(audioDir)) {
          fs2.mkdirSync(audioDir, { recursive: true });
        }
        const filename = `${sessionId}_${Date.now()}.mp3`;
        const filepath = path2.join(audioDir, filename);
        fs2.writeFileSync(filepath, audioBuffer);
        return filename;
      }
      getAudioFile(filename) {
        const audioDir = path2.join(process.cwd(), "audio");
        const filepath = path2.join(audioDir, filename);
        try {
          if (fs2.existsSync(filepath)) {
            return fs2.readFileSync(filepath);
          }
          return void 0;
        } catch (error) {
          console.error("Error reading audio file:", error);
          return void 0;
        }
      }
      async getLastActivity(sessionId) {
        const conversation = await this.getConversation(sessionId);
        return conversation?.lastActivity || /* @__PURE__ */ new Date();
      }
      async setInactivityWarning(sessionId) {
        const conversation = await this.getConversation(sessionId);
        if (conversation) {
          await db.update(conversations).set({ lastActivity: /* @__PURE__ */ new Date() }).where(eq(conversations.id, conversation.id));
        }
      }
      async hasInactivityWarning(sessionId) {
        const lastActivity = await this.getLastActivity(sessionId);
        const now = /* @__PURE__ */ new Date();
        const timeDiff = now.getTime() - lastActivity.getTime();
        const tenMinutes = 10 * 60 * 1e3;
        return timeDiff > tenMinutes;
      }
    };
    MemStorage = class {
      conversations;
      messages;
      sessionSettings;
      sessionStartTimes;
      audioFiles;
      userProfiles;
      inactivityWarnings;
      currentId;
      constructor() {
        this.conversations = /* @__PURE__ */ new Map();
        this.messages = /* @__PURE__ */ new Map();
        this.sessionSettings = /* @__PURE__ */ new Map();
        this.sessionStartTimes = /* @__PURE__ */ new Map();
        this.audioFiles = /* @__PURE__ */ new Map();
        this.userProfiles = /* @__PURE__ */ new Map();
        this.inactivityWarnings = /* @__PURE__ */ new Map();
        this.currentId = 1;
        this.ensureAudioDirectory();
      }
      ensureAudioDirectory() {
        const audioDir = path2.join(process.cwd(), "public", "audio");
        if (!fs2.existsSync(audioDir)) {
          fs2.mkdirSync(audioDir, { recursive: true });
        }
      }
      async createConversation(insertConversation) {
        const id = this.currentId++;
        const conversation = {
          id,
          userId: insertConversation.userId || null,
          sessionId: insertConversation.sessionId,
          language: insertConversation.language,
          lastActivity: /* @__PURE__ */ new Date(),
          createdAt: /* @__PURE__ */ new Date()
        };
        this.conversations.set(insertConversation.sessionId, conversation);
        this.sessionStartTimes.set(insertConversation.sessionId, /* @__PURE__ */ new Date());
        return conversation;
      }
      async getConversation(sessionId) {
        return this.conversations.get(sessionId);
      }
      async updateLastActivity(sessionId) {
        const conversation = this.conversations.get(sessionId);
        if (conversation) {
          conversation.lastActivity = /* @__PURE__ */ new Date();
          this.conversations.set(sessionId, conversation);
        }
      }
      async getUserProfile(sessionId) {
        return this.userProfiles.get(sessionId);
      }
      async saveUserProfile(profile) {
        const id = this.currentId++;
        const userProfile = {
          id,
          sessionId: profile.sessionId,
          preferredLanguage: profile.preferredLanguage || "es",
          subscriptionType: profile.subscriptionType || "freemium",
          availableLanguages: profile.availableLanguages || ["es"],
          activeLanguage: profile.activeLanguage || "es",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.userProfiles.set(profile.sessionId, userProfile);
        return userProfile;
      }
      async updatePreferredLanguage(sessionId, language) {
        const profile = this.userProfiles.get(sessionId);
        if (profile) {
          profile.preferredLanguage = language;
          profile.updatedAt = /* @__PURE__ */ new Date();
          this.userProfiles.set(sessionId, profile);
        }
      }
      async updateActiveLanguage(sessionId, language) {
        const profile = this.userProfiles.get(sessionId);
        if (profile) {
          profile.activeLanguage = language;
          profile.updatedAt = /* @__PURE__ */ new Date();
          this.userProfiles.set(sessionId, profile);
        }
      }
      async updateSubscriptionType(sessionId, type) {
        const profile = this.userProfiles.get(sessionId);
        if (profile) {
          profile.subscriptionType = type;
          profile.updatedAt = /* @__PURE__ */ new Date();
          this.userProfiles.set(sessionId, profile);
        }
      }
      async updateAvailableLanguages(sessionId, languages) {
        const profile = this.userProfiles.get(sessionId);
        if (profile) {
          profile.availableLanguages = languages;
          profile.updatedAt = /* @__PURE__ */ new Date();
          this.userProfiles.set(sessionId, profile);
        }
      }
      async saveMessage(sessionId, message) {
        let conversation = await this.getConversation(sessionId);
        if (!conversation) {
          conversation = await this.createConversation({
            userId: null,
            sessionId,
            language: "en"
          });
        }
        if (!this.messages.has(sessionId)) {
          this.messages.set(sessionId, []);
        }
        const messages2 = this.messages.get(sessionId);
        messages2.push(message);
        console.log(`Message saved for session ${sessionId}: ${message.type} - "${message.content}"`);
      }
      async getConversationHistory(sessionId) {
        return this.messages.get(sessionId) || [];
      }
      async getSessionStartTime(sessionId) {
        const startTime = this.sessionStartTimes.get(sessionId);
        if (!startTime) {
          const now = /* @__PURE__ */ new Date();
          this.sessionStartTimes.set(sessionId, now);
          return now;
        }
        return startTime;
      }
      async getSessionSettings(sessionId) {
        return this.sessionSettings.get(sessionId);
      }
      async saveSessionSettings(sessionId, settings) {
        this.sessionSettings.set(sessionId, settings);
        console.log(`Settings saved for session ${sessionId}:`, settings);
      }
      async clearSession(sessionId) {
        this.messages.delete(sessionId);
        this.sessionSettings.delete(sessionId);
        this.sessionStartTimes.delete(sessionId);
        this.conversations.delete(sessionId);
        const audioKeys = Array.from(this.audioFiles.keys()).filter((key) => key.includes(sessionId));
        audioKeys.forEach((key) => this.audioFiles.delete(key));
        console.log(`Session ${sessionId} cleared`);
      }
      async saveAudioFile(audioBuffer, sessionId) {
        const timestamp = Date.now();
        const filename = `${sessionId}_${timestamp}.mp3`;
        const filepath = path2.join("public", "audio", filename);
        const publicUrl = `/api/audio/${filename}`;
        try {
          const fullPath = path2.join(process.cwd(), filepath);
          await fs2.promises.writeFile(fullPath, audioBuffer);
          this.audioFiles.set(filename, audioBuffer);
          console.log(`Audio file saved: ${filename}`);
          return publicUrl;
        } catch (error) {
          console.error("Error saving audio file:", error);
          throw new Error(`Failed to save audio file: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      // Additional method to serve audio files
      getAudioFile(filename) {
        return this.audioFiles.get(filename);
      }
      async getLastActivity(sessionId) {
        const conversation = this.conversations.get(sessionId);
        return conversation?.lastActivity || /* @__PURE__ */ new Date();
      }
      async setInactivityWarning(sessionId) {
        this.inactivityWarnings.set(sessionId, true);
      }
      async hasInactivityWarning(sessionId) {
        return this.inactivityWarnings.get(sessionId) || false;
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/services/languageManager.ts
var LanguageManager, languageManager;
var init_languageManager = __esm({
  "server/services/languageManager.ts"() {
    LanguageManager = class {
      currentLanguage = "en";
      isChangingLanguage = false;
      sessionId = null;
      constructor() {
        this.loadLanguagePreference();
      }
      loadLanguagePreference() {
        let globalLang = global.preferredLanguage;
        if (!globalLang) {
          try {
            import("fs").then((fs5) => {
              import("path").then((path6) => {
                const langFile = path6.join(process.cwd(), ".language-preference");
                if (fs5.existsSync(langFile)) {
                  globalLang = fs5.readFileSync(langFile, "utf8").trim();
                  global.preferredLanguage = globalLang;
                  if (globalLang !== this.currentLanguage) {
                    this.currentLanguage = globalLang;
                    console.log(`\u{1F4C1} LOADED LANGUAGE FROM FILE: ${globalLang}`);
                  }
                }
              });
            });
          } catch (error) {
          }
        }
        if (globalLang) {
          this.currentLanguage = globalLang;
          console.log(`\u{1F3D7}\uFE0F LANGUAGE MANAGER CREATED - Loaded: ${this.currentLanguage}`);
        } else {
          console.log(`\u{1F3D7}\uFE0F LANGUAGE MANAGER CREATED - Default: ${this.currentLanguage}`);
        }
      }
      /**
       * Initialize language manager with session's saved language
       */
      async initializeFromSession(sessionId) {
        try {
          const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
          const settings = await storage2.getSessionSettings(sessionId);
          console.log(`\u{1F50D} SESSION SETTINGS CHECK for ${sessionId}:`, settings);
          if (settings && settings.language && settings.language !== this.currentLanguage) {
            console.log(`\u{1F504} INITIALIZING LANGUAGE MANAGER FROM SESSION: ${this.currentLanguage} \u2192 ${settings.language}`);
            this.currentLanguage = settings.language;
            console.log(`\u2705 LANGUAGE MANAGER SYNCHRONIZED TO SESSION: ${this.currentLanguage}`);
          } else {
            console.log(`\u{1F50D} CHECKING GLOBAL LANGUAGE PREFERENCES...`);
            const globalLang = global.preferredLanguage;
            if (globalLang && globalLang !== this.currentLanguage) {
              console.log(`\u{1F504} LOADING FROM GLOBAL PREFERENCE: ${this.currentLanguage} \u2192 ${globalLang}`);
              this.currentLanguage = globalLang;
              console.log(`\u2705 LANGUAGE MANAGER SET FROM GLOBAL: ${this.currentLanguage}`);
            } else {
              console.log(`\u26A0\uFE0F No saved language preference found, using default: ${this.currentLanguage}`);
            }
          }
        } catch (error) {
          console.log(`\u26A0\uFE0F Could not initialize language from session, using default: ${this.currentLanguage}`);
        }
      }
      /**
       * CRITICAL: Centralized language change handler
       * Stops all operations and synchronizes ALL modules
       */
      async changeLanguage(newLanguage, sessionId) {
        const oldLanguage = this.currentLanguage;
        const timestamp = Date.now();
        const modulesSynced = [];
        const errors = [];
        console.log(`\u{1F504} LANGUAGE CHANGE INITIATED: ${oldLanguage} \u2192 ${newLanguage} for session ${sessionId}`);
        this.isChangingLanguage = true;
        this.sessionId = sessionId;
        try {
          console.log(`\u{1F9F9} CLEARING SESSION CONTEXT...`);
          await this.clearSessionContext(sessionId);
          modulesSynced.push("session_context");
          console.log(`\u{1F3A4} RESETTING STT MODULE...`);
          await this.resetSTTModule(newLanguage);
          modulesSynced.push("stt");
          console.log(`\u{1F50A} RESETTING TTS MODULE...`);
          await this.resetTTSModule(newLanguage);
          modulesSynced.push("tts");
          console.log(`\u{1F916} UPDATING CLARA LANGUAGE CONTEXT...`);
          await this.updateClaraLanguage(newLanguage);
          modulesSynced.push("clara");
          console.log(`\u{1F4AC} RESETTING CONVERSATION HISTORY...`);
          await this.resetConversationHistory(sessionId);
          modulesSynced.push("conversation");
          console.log(`\u{1F527} UPDATING INTERNAL LANGUAGE STATE: ${this.currentLanguage} \u2192 ${newLanguage}`);
          this.currentLanguage = newLanguage;
          console.log(`\u{1F310} SAVING LANGUAGE GLOBALLY...`);
          global.preferredLanguage = newLanguage;
          try {
            const fs5 = __require("fs");
            const path6 = __require("path");
            const langFile = path6.join(process.cwd(), ".language-preference");
            fs5.writeFileSync(langFile, newLanguage);
            console.log(`\u{1F4C1} LANGUAGE SAVED TO FILE: ${newLanguage}`);
          } catch (error) {
            console.log(`\u26A0\uFE0F Could not save language to file: ${error}`);
          }
          console.log(`\u2705 GLOBAL LANGUAGE PREFERENCE SET: ${newLanguage}`);
          console.log(`\u{1F4BE} SAVING LANGUAGE TO SESSION STORAGE...`);
          await this.saveLanguageToSession(sessionId, newLanguage);
          modulesSynced.push("session_storage");
          console.log(`\u{1F527} LANGUAGE STATE UPDATED: ${this.currentLanguage}`);
          console.log(`\u2705 LANGUAGE CHANGE COMPLETED: ${oldLanguage} \u2192 ${newLanguage}`);
          console.log(`\u{1F527} MODULES SYNCED: ${modulesSynced.join(", ")}`);
          return {
            success: true,
            oldLanguage,
            newLanguage,
            timestamp,
            modulesSynced,
            errors
          };
        } catch (error) {
          const errorMsg = `Language change failed: ${error.message}`;
          errors.push(errorMsg);
          console.error(`\u274C LANGUAGE CHANGE FAILED: ${errorMsg}`);
          return {
            success: false,
            oldLanguage,
            newLanguage,
            timestamp,
            modulesSynced,
            errors
          };
        } finally {
          this.isChangingLanguage = false;
        }
      }
      /**
       * Check if language change is in progress
       */
      isLanguageChanging() {
        return this.isChangingLanguage;
      }
      /**
       * Get current active language
       */
      getCurrentLanguage() {
        console.log(`\u{1F50D} LANGUAGE MANAGER QUERY: Current language = ${this.currentLanguage}`);
        return this.currentLanguage;
      }
      /**
       * Clear session context to prevent contamination
       */
      async clearSessionContext(sessionId) {
        global.conversationHistory = global.conversationHistory || {};
        if (global.conversationHistory[sessionId]) {
          delete global.conversationHistory[sessionId];
        }
        global.repetitionHistory = global.repetitionHistory || {};
        if (global.repetitionHistory[sessionId]) {
          delete global.repetitionHistory[sessionId];
        }
      }
      /**
       * Reset STT module for new language
       */
      async resetSTTModule(language) {
        global.sttContext = global.sttContext || {};
        global.sttContext.currentLanguage = language;
        global.sttContext.lastReset = Date.now();
      }
      /**
       * Reset TTS module for new language
       */
      async resetTTSModule(language) {
        global.ttsContext = global.ttsContext || {};
        global.ttsContext.currentLanguage = language;
        global.ttsContext.lastReset = Date.now();
      }
      /**
       * Update Clara's language context
       */
      async updateClaraLanguage(language) {
        global.claraContext = global.claraContext || {};
        global.claraContext.currentLanguage = language;
        global.claraContext.lastReset = Date.now();
      }
      /**
       * Reset conversation history
       */
      async resetConversationHistory(sessionId) {
        global.conversationMemory = global.conversationMemory || {};
        if (global.conversationMemory[sessionId]) {
          delete global.conversationMemory[sessionId];
        }
      }
      /**
       * Save language to session storage
       */
      async saveLanguageToSession(sessionId, language) {
        try {
          const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
          let settings = await storage2.getSessionSettings(sessionId);
          if (!settings) {
            settings = {
              language,
              speechSpeed: 1,
              voiceVolume: 80,
              enableCorrections: true,
              enableSuggestions: true
            };
          } else {
            settings.language = language;
          }
          await storage2.saveSessionSettings(sessionId, settings);
          console.log(`\u{1F4BE} LANGUAGE SAVED TO SESSION: ${language}`);
        } catch (error) {
          console.error(`\u274C Failed to save language to session: ${error}`);
          throw error;
        }
      }
    };
    languageManager = new LanguageManager();
  }
});

// server/services/googleTTS.ts
var googleTTS_exports = {};
__export(googleTTS_exports, {
  GoogleTTSService: () => GoogleTTSService,
  googleTTSService: () => googleTTSService
});
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import * as fs3 from "fs";
import * as path3 from "path";
var GoogleTTSService, googleTTSService;
var init_googleTTS = __esm({
  "server/services/googleTTS.ts"() {
    init_languageManager();
    GoogleTTSService = class {
      client;
      constructor() {
        try {
          const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS || "{}");
          this.client = new TextToSpeechClient({
            credentials,
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
          });
        } catch (error) {
          console.error("Error parsing Google Cloud credentials:", error);
          this.client = new TextToSpeechClient();
        }
      }
      /**
       * Convert text to speech with appropriate voice for language
       */
      /**
       * Clean Markdown formatting from text for TTS
       */
      cleanMarkdownForTTS(text) {
        return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1").replace(/(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g, "$1").replace(/(?<!_)_(?!_)([^_]+?)_(?!_)/g, "$1").replace(/```[\s\S]*?```/g, "").replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/~~(.*?)~~/g, "$1").replace(/\s+/g, " ").trim();
      }
      async synthesizeSpeech(text, language, sessionId) {
        try {
          if (languageManager.isLanguageChanging()) {
            throw new Error("LANGUAGE_CHANGE_IN_PROGRESS");
          }
          const targetLanguage = language || languageManager.getCurrentLanguage();
          console.log(`\u{1F3AF} TTS TEXT ANALYSIS: "${text}"`);
          console.log(`\u{1F3AF} REQUESTED LANGUAGE: ${language}`);
          console.log(`\u{1F3AF} FINAL TTS LANGUAGE: ${targetLanguage} (forced from request, no auto-detection)`);
          const cleanText = this.cleanMarkdownForTTS(text);
          if (cleanText.length > 4e3) {
            const chunks = this.splitTextIntoChunks(cleanText, 4e3);
            return await this.synthesizeMultipleChunks(chunks, targetLanguage, sessionId);
          }
          const voiceConfig = this.getVoiceConfig(targetLanguage);
          console.log(`\u{1F6A8} TTS LANGUAGE CHECK: Requested language = ${language}`);
          console.log(`\u{1F6A8} TTS VOICE CONFIG: ${voiceConfig.languageCode} - ${voiceConfig.voiceName}`);
          const request = {
            input: { text: cleanText },
            voice: {
              languageCode: voiceConfig.languageCode,
              name: voiceConfig.voiceName,
              ssmlGender: voiceConfig.ssmlGender
            },
            audioConfig: {
              audioEncoding: "MP3",
              speakingRate: 1,
              volumeGainDb: 0
            }
          };
          console.log("Sending request to Google TTS:", JSON.stringify(request, null, 2));
          const [response] = await this.client.synthesizeSpeech(request);
          console.log("Google TTS response received, audioContent size:", response.audioContent?.length || 0);
          if (!response.audioContent) {
            throw new Error("No audio content received from Google TTS");
          }
          const audioBuffer = Buffer.from(response.audioContent);
          console.log("Audio buffer created, size:", audioBuffer.length);
          const filename = `${sessionId}_${Date.now()}.mp3`;
          const filepath = path3.join(process.cwd(), "audio", filename);
          const audioDir = path3.dirname(filepath);
          console.log("Audio directory:", audioDir);
          if (!fs3.existsSync(audioDir)) {
            console.log("Creating audio directory...");
            fs3.mkdirSync(audioDir, { recursive: true });
          }
          console.log("Writing audio file to:", filepath);
          console.log("Buffer size before write:", audioBuffer.length);
          fs3.writeFileSync(filepath, audioBuffer);
          const writtenSize = fs3.statSync(filepath).size;
          console.log("File written, size on disk:", writtenSize);
          if (writtenSize !== audioBuffer.length) {
            console.error("Size mismatch! Expected:", audioBuffer.length, "Got:", writtenSize);
          }
          return { buffer: audioBuffer, filename };
        } catch (error) {
          console.error("Error synthesizing speech:", error);
          throw new Error(`No se pudo reproducir el audio. Intenta de nuevo.`);
        }
      }
      /**
       * Split text into logical chunks at sentence boundaries
       */
      splitTextIntoChunks(text, maxLength) {
        const chunks = [];
        const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        let currentChunk = "";
        for (const sentence of sentences) {
          const trimmedSentence = sentence.trim();
          if (currentChunk.length + trimmedSentence.length + 1 <= maxLength) {
            currentChunk += (currentChunk ? ". " : "") + trimmedSentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk + ".");
            }
            currentChunk = trimmedSentence;
          }
        }
        if (currentChunk) {
          chunks.push(currentChunk + ".");
        }
        return chunks;
      }
      /**
       * Synthesize multiple text chunks and combine them
       */
      async synthesizeMultipleChunks(chunks, language, sessionId) {
        const audioBuffers = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunkResult = await this.synthesizeSingleChunk(chunks[i], language, `${sessionId}_chunk${i}`);
          audioBuffers.push(chunkResult.buffer);
        }
        const combinedBuffer = Buffer.concat(audioBuffers);
        const filename = `${sessionId}_${Date.now()}.mp3`;
        const filepath = path3.join(process.cwd(), "audio", filename);
        fs3.writeFileSync(filepath, combinedBuffer);
        return { buffer: combinedBuffer, filename };
      }
      /**
       * Synthesize a single text chunk
       */
      async synthesizeSingleChunk(text, language, sessionId) {
        const voiceConfig = this.getVoiceConfig(language);
        const request = {
          input: { text },
          voice: {
            languageCode: voiceConfig.languageCode,
            name: voiceConfig.voiceName,
            ssmlGender: voiceConfig.ssmlGender
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1,
            volumeGainDb: 0
          }
        };
        const [response] = await this.client.synthesizeSpeech(request);
        if (!response.audioContent) {
          throw new Error("No audio content received from Google TTS");
        }
        return { buffer: Buffer.from(response.audioContent), filename: `${sessionId}.mp3` };
      }
      /**
       * Get voice configuration for each supported language
       */
      getVoiceConfig(language) {
        const voiceConfigs = {
          es: {
            languageCode: "es-US",
            voiceName: "es-US-Neural2-A",
            ssmlGender: "FEMALE"
          },
          en: {
            languageCode: "en-US",
            voiceName: "en-US-Neural2-F",
            ssmlGender: "FEMALE"
          },
          fr: {
            languageCode: "fr-FR",
            voiceName: "fr-FR-Neural2-A",
            ssmlGender: "FEMALE"
          },
          it: {
            languageCode: "it-IT",
            voiceName: "it-IT-Neural2-A",
            ssmlGender: "FEMALE"
          },
          de: {
            languageCode: "de-DE",
            voiceName: "de-DE-Neural2-A",
            ssmlGender: "FEMALE"
          },
          pt: {
            languageCode: "pt-BR",
            voiceName: "pt-BR-Neural2-A",
            ssmlGender: "FEMALE"
          }
        };
        return voiceConfigs[language] || voiceConfigs.en;
      }
      /**
       * Convert volume percentage to gain decibels
       */
      volumeToGainDb(volume) {
        const normalizedVolume = Math.max(0, Math.min(100, volume));
        return (normalizedVolume - 50) * 0.4;
      }
      /**
       * Detect the language of the text to match appropriate TTS voice
       */
      detectTextLanguage(text) {
        const patterns = {
          en: /\b(hello|hi|thank|you|very|good|well|am|doing|glad|reaching|practice|english|here|chat|feel|free|ask|anything|tell|about|day|i'm|i am|today|would|like)\b/i,
          es: /\b(hola|gracias|muy|bien|estoy|como|estas|que|para|con|pero|español|me|alegra|aprendiendo|gustaría|hablar|quiero|practicar)\b/i,
          fr: /\b(bonjour|salut|merci|très|bien|suis|comment|allez|vous|français|que|pour|avec|mais|j'ai|apprends|voudrais|parler)\b/i,
          it: /\b(ciao|grazie|molto|bene|sono|come|stai|italiano|che|per|con|ma|ho|sto|imparando|vorrei|parlare)\b/i,
          de: /\b(hallo|guten|danke|sehr|gut|bin|wie|geht|deutsch|was|für|mit|aber|habe|lerne|möchte|sprechen)\b/i,
          pt: /\b(olá|oi|obrigado|muito|bem|estou|como|está|português|que|para|com|mas|tenho|sou|aprendendo|gostaria|falar)\b/i
        };
        const scores = {};
        for (const [lang, pattern] of Object.entries(patterns)) {
          const matches = text.match(pattern) || [];
          scores[lang] = matches.length;
        }
        const maxScore = Math.max(...Object.values(scores));
        if (maxScore === 0) {
          return null;
        }
        if (maxScore < 2) {
          return null;
        }
        const detectedLang = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || null;
        console.log(`\u{1F50D} TTS LANGUAGE DETECTION: "${text}" \u2192 ${detectedLang} (score: ${maxScore})`);
        return detectedLang;
      }
      /**
       * Test TTS service availability
       */
      async testService() {
        try {
          await this.synthesizeSpeech("Hello, world!", "en", "test_session");
          return true;
        } catch (error) {
          console.error("TTS service test failed:", error);
          return false;
        }
      }
    };
    googleTTSService = new GoogleTTSService();
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path4 from "path";
import fs4 from "fs";

// server/services/openai.ts
import OpenAI2 from "openai";
import * as fs from "fs";
import * as path from "path";

// server/services/universalErrorDetector.ts
import OpenAI from "openai";
var UniversalErrorDetector = class {
  client;
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }
  /**
   * Basic error detector for spelling, grammar, and syntax
   * Catches obvious mistakes before checking artificial constructions
   */
  async detectBasicErrors(userInput, language) {
    try {
      console.log(`\u{1F50D} BASIC ERROR DETECTION: Analyzing "${userInput}" in ${language}`);
      const validCommonPhrases = [
        "hi",
        "hello",
        "hey",
        "good",
        "morning",
        "afternoon",
        "evening",
        "night",
        "hola",
        "buenos",
        "buenas",
        "dias",
        "tardes",
        "noches",
        "bonjour",
        "bonsoir",
        "salut",
        "ciao",
        "buongiorno",
        "buonasera",
        "hallo",
        "guten",
        "tag",
        "abend",
        "ola",
        "bom",
        "dia",
        "tarde",
        "noite",
        "yes",
        "no",
        "si",
        "oui",
        "non",
        "ja",
        "nein",
        "sim",
        "nao",
        "n\xE3o",
        "thanks",
        "thank",
        "you",
        "gracias",
        "merci",
        "grazie",
        "danke",
        "obrigado",
        "fine",
        "bien",
        "bene",
        "gut",
        "okay",
        "ok"
      ];
      const trimmedInput = userInput.trim().toLowerCase();
      if (validCommonPhrases.some((phrase) => {
        const words = trimmedInput.split(/\s+/);
        return words.length <= 3 && words.some((word) => word === phrase);
      })) {
        console.log(`\u2705 SKIPPING ERROR DETECTION: "${userInput}" is a valid common phrase`);
        return [];
      }
      const prompt = `Analyze this user input for basic errors in spelling, grammar, capitalization, and syntax. Look for:

1. Spelling mistakes (hawo \u2192 how, LIOKE \u2192 like)
2. Incorrect capitalization (aRE \u2192 are)
3. Grammar errors (IS DIFFICULT FOR MY \u2192 it's difficult for me)
4. Wrong word usage (YOU NOW \u2192 you know)
5. Missing words or articles
6. Incorrect verb forms

User input: "${userInput}"
Target language: ${language}

If you find basic errors, respond with JSON format:
{
  "hasErrors": true,
  "errors": [
    {
      "wrong": "exact error from input",
      "correct": "corrected version"
    }
  ],
  "correctedSentence": "complete corrected sentence"
}

If the input has no basic errors, respond:
{
  "hasErrors": false,
  "errors": [],
  "correctedSentence": null
}

Focus on obvious mistakes that any native speaker would immediately notice.`;
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: "You are a language error detection system. Always respond with valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 500
      });
      const result = JSON.parse(response.choices[0].message.content || '{"hasErrors": false, "errors": []}');
      if (result.hasErrors && result.errors) {
        console.log(`\u2705 BASIC ERRORS FOUND: ${result.errors.length} errors`);
        console.log(`\u{1F527} CORRECTED SENTENCE: ${result.correctedSentence || "Not provided"}`);
        return result.errors.map((error) => ({
          wrong: error.wrong,
          correct: error.correct
        }));
      }
      console.log(`\u2705 NO BASIC ERRORS DETECTED`);
      return [];
    } catch (error) {
      console.error("Error in basic error detection:", error);
      return [];
    }
  }
  /**
   * Universal AI-powered artificial construction detector
   * Works across all languages automatically
   */
  async detectArtificialConstructions(userInput, language) {
    try {
      console.log(`\u{1F50D} UNIVERSAL ERROR DETECTION: Analyzing "${userInput}" in ${language}`);
      const prompt = `Analyze this user input for artificial/robotic constructions that don't sound natural to native speakers. Look for:

1. Overly literal translations from other languages
2. Formal/textbook constructions instead of natural speech  
3. Word-for-word translations that create unnatural flow
4. Missing articles, prepositions, or natural contractions
5. Artificial verb tenses or constructions
6. Expressions that sound translated rather than naturally thought in the target language

User input: "${userInput}"
Target language: ${language}

If you find artificial constructions, respond with JSON format:
{
  "hasErrors": true,
  "errors": [
    {
      "wrong": "exact artificial phrase from input",
      "correct": "natural alternative that native speakers would use"
    }
  ]
}

If the input sounds natural to native speakers, respond:
{
  "hasErrors": false,
  "errors": []
}

Focus only on making speech sound natural and fluent, not on minor grammar details.`;
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: "You are an expert linguistics teacher who helps students sound more natural and fluent. Detect artificial constructions that make speech sound robotic or translated." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });
      const result = JSON.parse(response.choices[0].message.content || '{"hasErrors": false, "errors": []}');
      if (result.hasErrors && result.errors?.length > 0) {
        console.log(`\u2705 UNIVERSAL DETECTOR FOUND ${result.errors.length} artificial constructions`);
        return result.errors;
      } else {
        console.log(`\u2705 UNIVERSAL DETECTOR: Input sounds natural`);
        return [];
      }
    } catch (error) {
      console.log(`\u274C Universal error detection failed:`, error);
      return [];
    }
  }
};

// server/services/openai.ts
var OpenAIService = class {
  openai;
  universalDetector;
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.openai = new OpenAI2({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.universalDetector = new UniversalErrorDetector(process.env.OPENAI_API_KEY);
  }
  async transcribeAudio(audioBuffer, sessionId, targetLanguage) {
    console.log(`\u{1F3A4} WHISPER TRANSCRIPTION: Starting for session ${sessionId}`);
    let timeoutHandler2 = null;
    let tempFilePath;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const timeoutMs = 15e3;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutHandler2 = setTimeout(() => {
            reject(new Error(`TIMEOUT_ATTEMPT_${attempt}`));
          }, timeoutMs);
        });
        const tempDir = path.join(process.cwd(), "temp");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        tempFilePath = path.join(tempDir, `audio_${sessionId}_${Date.now()}.webm`);
        fs.writeFileSync(tempFilePath, audioBuffer);
        const transcriptionPromise = this.openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: "whisper-1",
          language: targetLanguage || void 0,
          response_format: "text"
        });
        const result = await Promise.race([transcriptionPromise, timeoutPromise]);
        if (timeoutHandler2) {
          clearTimeout(timeoutHandler2);
          timeoutHandler2 = null;
        }
        try {
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (cleanupError) {
          console.log(`Could not clean up temp file: ${cleanupError}`);
        }
        const transcription = typeof result === "string" ? result : result.text;
        console.log(`\u2705 WHISPER SUCCESS (attempt ${attempt}): "${transcription}"`);
        return transcription;
      } catch (error) {
        if (timeoutHandler2) {
          clearTimeout(timeoutHandler2);
          timeoutHandler2 = null;
        }
        try {
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (cleanupError) {
          console.log(`Could not clean up temp file: ${cleanupError}`);
        }
        console.error(`\u274C WHISPER ATTEMPT ${attempt} FAILED: ${error.message}`);
        if (attempt === 3) {
          throw new Error(`Transcription failed after 3 attempts: ${error.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 1e3 * attempt));
      }
    }
    throw new Error("Transcription failed");
  }
  async generateResponse(userMessage, language, conversationHistory, settings, customSystemPrompt) {
    console.log(`Generating AI response for: "${userMessage}"`);
    console.log(`\u{1F3AF} CLARA LANGUAGE: ${language}`);
    const languageNames = {
      "en": "English",
      "es": "Spanish",
      "fr": "French",
      "it": "Italian",
      "pt": "Portuguese",
      "de": "German"
    };
    const selectedLanguageName = languageNames[language] || "English";
    const finalSystemPrompt = customSystemPrompt || `You are Clara, a language tutor. The user has selected the ${selectedLanguageName} tab, so you MUST respond ONLY in ${selectedLanguageName}. 

CRITICAL RULES:
- NEVER suggest changing languages or practicing other languages when a specific language tab is selected
- ALWAYS respond in ${selectedLanguageName} regardless of what language the user writes in
- If user writes in a different language, gently correct them IN ${selectedLanguageName}
- Use natural correction format: show original \u2192 corrected version \u2192 brief explanation \u2192 encouragement
- NO emojis, decorative formatting, or markdown
- Be warm, natural, and encouraging like a real person

Example correction format:
"Hello, how you are?"
"Hello, how are you?"
You need "are" instead of "you are" in questions. Good job practicing! Want to try again?`;
    const messages2 = [
      {
        role: "system",
        content: finalSystemPrompt
      }
    ];
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg) => {
        if (msg.role === "user" || msg.role === "assistant") {
          messages2.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }
    messages2.push({
      role: "user",
      content: userMessage
    });
    console.log(`\u{1F525} SENDING TO OPENAI:`, JSON.stringify(messages2, null, 2));
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: messages2,
      max_tokens: 150,
      temperature: 0.7
    });
    const responseContent = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    return {
      content: responseContent
    };
  }
  // Simplified error detection methods
  async detectBasicErrors(userInput, language) {
    return [];
  }
  async detectTranslationErrors(userInput, language) {
    return [];
  }
};
var openaiService = new OpenAIService();

// server/services/conversation.ts
init_googleTTS();

// server/services/subscriptionManager.ts
init_storage();
var SubscriptionManager = class {
  FREEMIUM_LANGUAGES = 1;
  PREMIUM_LANGUAGES = 6;
  ALL_LANGUAGES = ["es", "en", "fr", "it", "de", "pt"];
  /**
   * Initialize user profile with subscription-based language access
   */
  async initializeUserProfile(sessionId, defaultLanguage = "es") {
    let profile = await storage.getUserProfile(sessionId);
    if (!profile) {
      profile = await storage.saveUserProfile({
        sessionId,
        preferredLanguage: defaultLanguage,
        subscriptionType: "freemium",
        availableLanguages: [defaultLanguage],
        activeLanguage: defaultLanguage
      });
      console.log(`\u{1F195} FREEMIUM PROFILE CREATED: ${sessionId} with language ${defaultLanguage}`);
    }
    return profile;
  }
  /**
   * Upgrade user to premium with access to all languages
   */
  async upgradeToPremium(sessionId) {
    await storage.updateSubscriptionType(sessionId, "premium");
    await storage.updateAvailableLanguages(sessionId, [...this.ALL_LANGUAGES]);
    const profile = await storage.getUserProfile(sessionId);
    console.log(`\u2B50 UPGRADED TO PREMIUM: ${sessionId} - All languages unlocked`);
    return profile;
  }
  /**
   * Downgrade user to freemium (keeps current active language only)
   */
  async downgradeToFreemium(sessionId) {
    const profile = await storage.getUserProfile(sessionId);
    if (!profile) throw new Error("Profile not found");
    await storage.updateSubscriptionType(sessionId, "freemium");
    await storage.updateAvailableLanguages(sessionId, [profile.activeLanguage]);
    console.log(`\u{1F4C9} DOWNGRADED TO FREEMIUM: ${sessionId} - Locked to ${profile.activeLanguage}`);
    return await storage.getUserProfile(sessionId);
  }
  /**
   * Check if user can access a specific language
   */
  async canAccessLanguage(sessionId, language) {
    const profile = await storage.getUserProfile(sessionId);
    if (!profile) return false;
    return profile.availableLanguages.includes(language);
  }
  /**
   * Switch active language (only if user has access)
   */
  async switchActiveLanguage(sessionId, language) {
    const profile = await storage.getUserProfile(sessionId);
    if (!profile) {
      return { success: false, message: "Profile not found" };
    }
    if (!profile.availableLanguages.includes(language)) {
      if (profile.subscriptionType === "freemium") {
        return {
          success: false,
          message: `Language ${language} requires premium subscription. Upgrade to access all languages.`
        };
      } else {
        return {
          success: false,
          message: `Language ${language} not available in your subscription.`
        };
      }
    }
    await storage.updateActiveLanguage(sessionId, language);
    console.log(`\u{1F504} LANGUAGE SWITCHED: ${sessionId} \u2192 ${language}`);
    return {
      success: true,
      message: `Active language changed to ${language}`
    };
  }
  /**
   * Get user's subscription status and language access
   */
  async getSubscriptionStatus(sessionId) {
    const profile = await this.initializeUserProfile(sessionId);
    return {
      subscriptionType: profile.subscriptionType,
      activeLanguage: profile.activeLanguage,
      availableLanguages: profile.availableLanguages,
      canSwitchLanguages: profile.subscriptionType === "premium"
    };
  }
  /**
   * Validate and enforce active language for Clara responses
   */
  async getActiveLanguageForResponse(sessionId) {
    const profile = await this.initializeUserProfile(sessionId);
    console.log(`\u{1F3AF} ACTIVE LANGUAGE ENFORCED: ${profile.activeLanguage} for session ${sessionId}`);
    console.log(`\u{1F512} SUBSCRIPTION: ${profile.subscriptionType.toUpperCase()}`);
    return profile.activeLanguage;
  }
  /**
   * Check if mixed language input should be processed based on subscription
   */
  async shouldProcessMixedLanguage(sessionId, detectedLanguages) {
    const profile = await this.initializeUserProfile(sessionId);
    const activeLanguage = profile.activeLanguage;
    const hasActiveLanguage = detectedLanguages.includes(activeLanguage);
    if (!hasActiveLanguage && detectedLanguages.length > 1) {
      console.log(`\u26A0\uFE0F MIXED LANGUAGE DETECTED: User spoke ${detectedLanguages.join(", ")} but active language is ${activeLanguage}`);
      return {
        shouldProcess: true,
        activeLanguage,
        message: `Input contains mixed languages but system will respond in active language: ${activeLanguage}`
      };
    }
    return {
      shouldProcess: true,
      activeLanguage
    };
  }
};
var subscriptionManager = new SubscriptionManager();

// server/services/languageEnforcer.ts
var LanguageEnforcer = class {
  LANGUAGE_NAMES = {
    es: "espa\xF1ol",
    en: "English",
    fr: "fran\xE7ais",
    it: "italiano",
    de: "Deutsch",
    pt: "portugu\xEAs"
  };
  prompts = {
    es: `Eres Clara, una profesora de idiomas experta y emp\xE1tica que ayuda a estudiantes a mejorar sus habilidades conversacionales.

REGLA CR\xCDTICA DE IDIOMA:
- SIEMPRE responde EXCLUSIVAMENTE en espa\xF1ol
- NUNCA cambies de idioma sin importar en qu\xE9 idioma te hable el usuario
- NUNCA invites al usuario a cambiar de idioma ni preguntes en qu\xE9 idioma quiere practicar
- Respeta estrictamente el idioma seleccionado por el bot\xF3n del usuario
- Incluso si el input contiene errores o mezcla idiomas, mant\xE9n tu respuesta en espa\xF1ol
- Conc\xE9ntrate en el idioma seleccionado en la pesta\xF1a y no sugieras de ninguna forma algo que pueda sacar al usuario del uso del idioma seleccionado

PERSONALIDAD:
- C\xE1lida, paciente y alentadora
- Prioriza SIEMPRE las correcciones al inicio de tu respuesta
- Responde con m\xE1ximo 1-2 oraciones despu\xE9s de corregir
- Evita explicaciones largas o ejemplos extensos

COMPORTAMIENTO DE CORRECCI\xD3N EXHAUSTIVA:
- OBLIGATORIO: Detecta y corrige TODOS los errores sin excepci\xF3n:
  * Errores de ortograf\xEDa (palabras mal escritas, letras faltantes o incorrectas)
  * Errores de may\xFAsculas (inicio de frase, nombres propios)
  * Errores de acentos (s\xED/si, est\xE1/esta, qu\xE9/que)
  * Errores de gram\xE1tica (concordancia, tiempos verbales)
  * Errores de preposiciones y art\xEDculos
  * Errores de puntuaci\xF3n
- Si el input es correcto, responde naturalmente sin usar formato de correcci\xF3n
- NUNCA uses emojis, s\xEDmbolos decorativos, negritas, comillas estilizadas ni formato markdown
- SIEMPRE habla con naturalidad absoluta, como una persona real inteligente y emp\xE1tica
- NO suenes como sistema rob\xF3tico ni plantilla gen\xE9rica de servicio al cliente
- Cuando existan errores reales, usa este flujo conversacional natural:
  - Comienza con "Escribiste:" seguido de la frase original EXACTA
  - Luego "Deber\xEDa ser:" con la correcci\xF3n COMPLETA
  - Explicaci\xF3n OBLIGATORIA de TODOS los errores espec\xEDficos encontrados:
    * Para errores de ortograf\xEDa: "Escribiste 'civo' en lugar de 'cibo'"
    * Para errores de may\xFAsculas: "La primera palabra debe empezar con may\xFAscula"
    * Para errores de acentos: "Se escribe 's\xED' con acento, no 'si'"
    * Para errores de gram\xE1tica: "El verbo debe concordar con el sujeto"
    * Para errores de preposiciones: "Con este verbo se usa la preposici\xF3n 'de'"
    * Para errores de art\xEDculos: "Delante de esta palabra va el art\xEDculo 'la'"
  - Refuerzo positivo como "\xA1Buen esfuerzo!" o "\xA1Bien hecho!" o "\xA1Qu\xE9 bueno!"
  - Termina con invitaciones variadas como "\xBFQuieres intentarlo otra vez?" o "\xBFC\xF3mo lo escribir\xEDas ahora?" o "\xBFProbamos de nuevo?"
- Cuando el input sea correcto, responde conversacionalmente sin formato de correcci\xF3n
- Responde directamente al input del usuario sin forzar correcciones innecesarias
- Adapta el tono al estado de \xE1nimo del usuario naturalmente
- El usuario debe tener ganas de seguir hablando contigo`,
    en: `You are Clara, an expert and empathetic language teacher who helps students improve their conversational skills.

CRITICAL LANGUAGE RULE:
- ALWAYS respond EXCLUSIVELY in English
- NEVER switch languages regardless of what language the user speaks
- NEVER invite the user to change languages or ask what language they want to practice
- Strictly respect the language selected by the user's button
- Even if input contains errors or mixed languages, keep your response in English
- Focus on the language selected in the tab and do not suggest in any way something that could take the user away from using the selected language

PERSONALITY:
- Warm, patient and encouraging
- ALWAYS prioritize corrections at the beginning of your response
- Respond with maximum 1-2 sentences after correcting
- Avoid long explanations or extended examples

EXHAUSTIVE CORRECTION BEHAVIOR:
- MANDATORY: Detect and correct ALL errors without exception:
  * Spelling errors (misspelled words, missing or incorrect letters)
  * Capitalization errors (sentence beginnings, proper nouns)
  * Grammar errors (subject-verb agreement, tense consistency)
  * Preposition and article errors
  * Punctuation errors
  * Apostrophe errors (it's/its, you're/your)
- If the input is correct, respond naturally without using correction format
- NEVER use emojis, decorative symbols, bold, stylized quotes, or markdown formatting
- ALWAYS speak with absolute naturalness, like a real intelligent and empathetic person
- DO NOT sound like robotic system or generic customer service template
- When actual errors exist, use this natural conversational flow:
  - Start with "You wrote:" followed by the original phrase EXACTLY
  - Then "It should be:" with the COMPLETE correction
  - MANDATORY explanation of ALL specific errors found:
    * For spelling errors: "You wrote 'civo' instead of 'cibo'"
    * For capitalization errors: "The first word should start with a capital letter"
    * For grammar errors: "The verb must agree with the subject"
    * For preposition errors: "With this verb, use the preposition 'of'"
    * For article errors: "Before this word, use the article 'the'"
  - Positive reinforcement like "Great effort!" or "Nice try!" or "Good work!"
  - End with varied invitations like "Want to try again?" or "Give it another shot?" or "How would you write it now?"
- When input is correct, respond conversationally without correction format
- NEVER use numbered lists (1. 2.), "Original:" labels, or formal structured formatting
- Respond directly to the user's input without forcing unnecessary corrections
- Adapt tone to user's mood naturally
- User must want to keep talking with you`,
    fr: `Tu es Clara, une professeure de langues experte et empathique qui aide les \xE9tudiants \xE0 am\xE9liorer leurs comp\xE9tences conversationnelles.

R\xC8GLE CRITIQUE DE LANGUE:
- R\xE9ponds TOUJOURS EXCLUSIVEMENT en fran\xE7ais
- NE CHANGE JAMAIS de langue peu importe la langue que parle l'utilisateur
- N'invite JAMAIS l'utilisateur \xE0 changer de langue ni ne demande dans quelle langue il veut pratiquer
- Respecte strictement la langue s\xE9lectionn\xE9e par le bouton de l'utilisateur
- M\xEAme si l'entr\xE9e contient des erreurs ou m\xE9lange les langues, garde ta r\xE9ponse en fran\xE7ais
- Concentre-toi sur la langue s\xE9lectionn\xE9e dans l'onglet et ne sugg\xE8re d'aucune fa\xE7on quelque chose qui pourrait faire sortir l'utilisateur de l'usage de la langue s\xE9lectionn\xE9e

PERSONNALIT\xC9:
- Chaleureuse, patiente et encourageante
- Priorise TOUJOURS les corrections au d\xE9but de ta r\xE9ponse
- R\xE9ponds avec maximum 1-2 phrases apr\xE8s avoir corrig\xE9
- \xC9vite les explications longues ou les exemples \xE9tendus

COMPORTEMENT DE CORRECTION EXHAUSTIVE:
- OBLIGATOIRE: D\xE9tecte et corrige TOUTES les erreurs sans exception:
  * Erreurs d'orthographe (mots mal \xE9crits, lettres manquantes ou incorrectes)
  * Erreurs de majuscules (d\xE9but de phrase, noms propres)
  * Erreurs d'accents (\xE0/a, o\xF9/ou, \xE9/\xE8)
  * Erreurs de grammaire (accord, temps verbaux)
  * Erreurs de pr\xE9positions et articles
  * Erreurs de ponctuation
- Si l'entr\xE9e est correcte, r\xE9ponds naturellement sans format de correction
- N'utilise JAMAIS d'emojis, symboles d\xE9coratifs, gras, guillemets stylis\xE9s ou formatage markdown
- Parle TOUJOURS avec naturalit\xE9 absolue, comme une personne r\xE9elle intelligente et empathique
- NE sonne PAS comme un syst\xE8me robotique ou mod\xE8le g\xE9n\xE9rique de service client
- Pour corriger les erreurs, utilise ce flux conversationnel naturel:
  - Commence par "Tu as \xE9crit:" suivi de la phrase originale EXACTE
  - Puis "Ce devrait \xEAtre:" avec la correction COMPL\xC8TE
  - Explication OBLIGATOIRE de TOUTES les erreurs sp\xE9cifiques trouv\xE9es:
    * Pour les erreurs d'orthographe: "Tu as \xE9crit 'civo' au lieu de 'cibo'"
    * Pour les erreurs de majuscules: "Le premier mot doit commencer par une majuscule"
    * Pour les erreurs d'accents: "On \xE9crit 'o\xF9' avec accent, pas 'ou'"
    * Pour les erreurs de grammaire: "Le verbe doit s'accorder avec le sujet"
    * Pour les erreurs de pr\xE9positions: "Avec ce verbe, on utilise la pr\xE9position 'de'"
    * Pour les erreurs d'articles: "Devant ce mot, on utilise l'article 'la'"
  - Renforcement positif comme "Bon effort!" ou "Bien essay\xE9!" ou "C'est bien!"
  - Termine avec invitations vari\xE9es comme "Tu veux r\xE9essayer?" ou "Comment l'\xE9crirais-tu maintenant?" ou "On essaie encore?"
- R\xE9ponds directement \xE0 l'entr\xE9e de l'utilisateur sans \xE9viter la correction
- Adapte le ton \xE0 l'humeur de l'utilisateur naturellement
- L'utilisateur doit avoir envie de continuer \xE0 te parler`,
    it: `Sei Clara, un'insegnante di lingue esperta ed empatica che aiuta gli studenti a migliorare le loro competenze conversazionali.

REGOLA CRITICA DELLA LINGUA:
- Rispondi SEMPRE ESCLUSIVAMENTE in italiano
- NON cambiare mai lingua indipendentemente dalla lingua che parla l'utente
- NON invitare MAI l'utente a cambiare lingua n\xE9 chiedere in che lingua vuole praticare
- Rispetta rigorosamente la lingua selezionata dal pulsante dell'utente
- Anche se l'input contiene errori o mescola lingue, mantieni la tua risposta in italiano
- Concentrati sulla lingua selezionata nella scheda e non suggerire in nessun modo qualcosa che possa portare l'utente fuori dall'uso della lingua selezionata

PERSONALIT\xC0:
- Calorosa, paziente e incoraggiante
- Prioriza SEMPRE le correzioni all'inizio della tua risposta
- Rispondi con massimo 1-2 frasi dopo aver corretto
- Evita spiegazioni lunghe o esempi estesi

COMPORTAMENTO DI CORREZIONE ESAUSTIVA:
- OBBLIGATORIO: Rileva e correggi TUTTI gli errori senza eccezione:
  * Errori di ortografia (parole sbagliate, lettere mancanti o errate)
  * Errori di maiuscole CRITICI (SEMPRE controllare se la PRIMA PAROLA inizia con maiuscola)
  * Errori di accenti (s\xEC/si, \xE8/e, perch\xE9/perche)
  * Errori di grammatica (concordanza, tempi verbali)
  * Errori di preposizioni e articoli
  * Errori di punteggiatura
- REGOLA CRITICA MAIUSCOLE: Se la frase NON inizia con maiuscola, SEMPRE correggerla
- Se l'input \xE8 corretto, rispondi naturalmente senza usare formato di correzione
- NON usare MAI emoji, simboli decorativi, grassetto, virgolette stilizzate o formattazione markdown
- Parla SEMPRE con naturalezza assoluta, come una persona reale intelligente ed empatica
- NON suonare come sistema robotico o modello generico di servizio clienti
- Quando esistono errori reali, usa questo flusso conversazionale naturale:
  - Inizia con "Hai scritto:" seguito dalla frase originale ESATTA
  - Poi "Dovrebbe essere:" con la correzione COMPLETA
  - Spiegazione OBBLIGATORIA di TUTTI gli errori specifici trovati:
    * Per errori di ortografia: "Hai scritto 'bemne' invece di 'bene'"
    * Per errori di maiuscole: "La prima parola 'bemne' deve iniziare con maiuscola: 'Bemne'"
    * Per errori di accenti: "Si scrive 's\xEC' con l'accento, non 'si'"
    * Per errori di grammatica: "Il verbo deve concordare con il soggetto"
    * Per errori di preposizioni: "Con questo verbo si usa la preposizione 'di'"
    * Per errori di articoli: "Davanti a questa parola va l'articolo 'la'"
  - Rinforzo positivo come "Bravo per averci provato!" o "Sei sulla strada giusta!" o "\xC8 bello che tu stia praticando!"
  - Termina con inviti variati come "Vuoi provare di nuovo?" o "Come lo scriveresti ora?" o "Proviamo ancora?"
- Quando l'input \xE8 corretto, rispondi conversazionalmente senza formato di correzione
- Rispondi direttamente all'input dell'utente senza forzare correzioni inutili
- Adatta il tono all'umore dell'utente naturalmente
- L'utente deve aver voglia di continuare a parlarti`,
    de: `Du bist Clara, eine erfahrene und einf\xFChlsame Sprachlehrerin, die Sch\xFClern hilft, ihre Konversationsf\xE4higkeiten zu verbessern.

KRITISCHE SPRACHREGEL:
- Antworte IMMER AUSSCHLIESSLICH auf Deutsch
- Wechsle NIEMALS die Sprache, egal in welcher Sprache der Benutzer spricht
- Lade den Benutzer NIEMALS ein, die Sprache zu wechseln oder frage nicht, in welcher Sprache er \xFCben m\xF6chte
- Respektiere strikt die vom Benutzer-Button gew\xE4hlte Sprache
- Auch wenn die Eingabe Fehler enth\xE4lt oder Sprachen mischt, behalte deine Antwort auf Deutsch
- Konzentriere dich auf die in der Registerkarte ausgew\xE4hlte Sprache und schlage auf keinen Fall etwas vor, das den Benutzer vom Gebrauch der ausgew\xE4hlten Sprache abbringen k\xF6nnte

PERS\xD6NLICHKEIT:
- Warm, geduldig und ermutigend
- Priorisiere IMMER Korrekturen am Anfang deiner Antwort
- Antworte mit maximal 1-2 S\xE4tzen nach der Korrektur
- Vermeide lange Erkl\xE4rungen oder erweiterte Beispiele

EXHAUSTIVES KORREKTURVERHALTEN:
- OBLIGATORISCH: Erkenne und korrigiere ALLE Fehler ohne Ausnahme:
  * Rechtschreibfehler (falsch geschriebene W\xF6rter, fehlende oder falsche Buchstaben)
  * Gro\xDFschreibfehler (Satzanfang, Eigennamen)
  * Umlaute und Sonderzeichen (\xE4/ae, \xF6/oe, \xFC/ue, \xDF/ss)
  * Grammatikfehler (\xDCbereinstimmung, Zeitformen)
  * Pr\xE4positions- und Artikelfehler
  * Zeichensetzungsfehler
- Wenn die Eingabe korrekt ist, antworte nat\xFCrlich ohne Korrekturformat
- Verwende NIEMALS Emojis, dekorative Symbole, Fettdruck, stilisierte Anf\xFChrungszeichen oder Markdown-Formatierung
- Sprich IMMER mit absoluter Nat\xFCrlichkeit, wie eine echte intelligente und empathische Person
- Klinge NICHT wie ein robotisches System oder generische Kundendienstvorlage
- Zum Korrigieren von Fehlern folge GENAU diesem Schema:
  1. Den urspr\xFCnglichen Satz mit Fehlern zeigen, wie er EXAKT geschrieben wurde
  2. Die VOLLST\xC4NDIGE korrigierte Version in der n\xE4chsten Zeile geben
  3. OBLIGATORISCHE Erkl\xE4rung ALLER spezifischen Fehler:
    * F\xFCr Rechtschreibfehler: "Du hast 'civo' anstatt 'cibo' geschrieben"
    * F\xFCr Gro\xDFschreibfehler: "Das erste Wort muss mit einem Gro\xDFbuchstaben beginnen"
    * F\xFCr Grammatikfehler: "Das Verb muss mit dem Subjekt \xFCbereinstimmen"
    * F\xFCr Pr\xE4positionsfehler: "Mit diesem Verb verwendet man die Pr\xE4position 'von'"
    * F\xFCr Artikelfehler: "Vor diesem Wort steht der Artikel 'die'"
  4. Positive nat\xFCrliche Verst\xE4rkung einschlie\xDFen: "Gut gemacht, dass du es versuchst." oder "Du bist auf dem richtigen Weg." oder "Sch\xF6n, dass du \xFCbst."
  5. Mit direkter Einladung enden: "M\xF6chtest du es nochmal versuchen?" oder "Wenn du willst, k\xF6nnen wir auch weitermachen." oder "Du entscheidest, ob du korrigieren oder weitermachen m\xF6chtest."
- Antworte direkt auf die Eingabe des Benutzers ohne Korrektur zu vermeiden
- Passe den Ton an die Stimmung des Benutzers nat\xFCrlich an
- Der Benutzer muss Lust haben, weiter mit dir zu reden`,
    pt: `Voc\xEA \xE9 Clara, uma professora de idiomas experiente e emp\xE1tica que ajuda estudantes a melhorar suas habilidades conversacionais.

REGRA CR\xCDTICA DE IDIOMA:
- SEMPRE responda EXCLUSIVAMENTE em portugu\xEAs
- NUNCA mude de idioma independentemente do idioma que o usu\xE1rio fale
- NUNCA convide o usu\xE1rio a mudar de idioma nem pergunte em que idioma quer praticar
- Respeite rigorosamente o idioma selecionado pelo bot\xE3o do usu\xE1rio
- Mesmo se a entrada contiver erros ou misturar idiomas, mantenha sua resposta em portugu\xEAs
- Concentre-se no idioma selecionado na aba e n\xE3o sugira de forma alguma algo que possa tirar o usu\xE1rio do uso do idioma selecionado

PERSONALIDADE:
- Calorosa, paciente e encorajadora
- Priorize SEMPRE as corre\xE7\xF5es no in\xEDcio da sua resposta
- Responda com m\xE1ximo 1-2 frases depois de corrigir
- Evite explica\xE7\xF5es longas ou exemplos extensos

COMPORTAMENTO DE CORRE\xC7\xC3O EXAUSTIVA:
- OBRIGAT\xD3RIO: Detecte e corrija TODOS os erros sem exce\xE7\xE3o:
  * Erros de ortografia (palavras mal escritas, letras faltantes ou incorretas)
  * Erros de mai\xFAsculas (in\xEDcio de frase, nomes pr\xF3prios)
  * Erros de acentos (\xE9/e, \xE0/a, \xF4/o, \xE7/c)
  * Erros de gram\xE1tica (concord\xE2ncia, tempos verbais)
  * Erros de preposi\xE7\xF5es e artigos
  * Erros de pontua\xE7\xE3o
- Se a entrada estiver correta, responda naturalmente sem usar formato de corre\xE7\xE3o
- NUNCA use emojis, s\xEDmbolos decorativos, negrito, aspas estilizadas ou formata\xE7\xE3o markdown
- Fale SEMPRE com naturalidade absoluta, como uma pessoa real inteligente e emp\xE1tica
- N\xC3O soe como sistema rob\xF3tico ou modelo gen\xE9rico de atendimento ao cliente
- Para corrigir erros, siga EXATAMENTE este esquema:
  1. Mostrar a frase original com erros como foi escrita EXATAMENTE
  2. Dar a vers\xE3o corrigida COMPLETA na linha seguinte
  3. Explica\xE7\xE3o OBRIGAT\xD3RIA de TODOS os erros espec\xEDficos encontrados:
    * Para erros de ortografia: "Voc\xEA escreveu 'civo' em vez de 'cibo'"
    * Para erros de mai\xFAsculas: "A primeira palavra deve come\xE7ar com mai\xFAscula"
    * Para erros de acentos: "Escreve-se '\xE9' com acento, n\xE3o 'e'"
    * Para erros de gram\xE1tica: "O verbo deve concordar com o sujeito"
    * Para erros de preposi\xE7\xF5es: "Com este verbo usa-se a preposi\xE7\xE3o 'de'"
    * Para erros de artigos: "Antes desta palavra usa-se o artigo 'a'"
  4. Incluir frase de refor\xE7o positiva e natural: "Bem feito por tentar." ou "Voc\xEA est\xE1 no caminho certo." ou "Que bom que est\xE1 praticando."
  5. Terminar com convite direto: "Quer tentar escrever de novo?" ou "Se preferir, tamb\xE9m podemos seguir em frente." ou "Voc\xEA decide se quer corrigir ou continuar."
- Responda diretamente \xE0 entrada do usu\xE1rio sem evitar a corre\xE7\xE3o
- Adapte o tom ao humor do usu\xE1rio naturalmente
- O usu\xE1rio deve ter vontade de continuar conversando com voc\xEA`
  };
  /**
   * Get Clara's system prompt enforcing the active language
   */
  async getClaraSystemPrompt(sessionId) {
    const activeLanguage = await subscriptionManager.getActiveLanguageForResponse(sessionId);
    return this.prompts[activeLanguage] || this.prompts.en;
  }
  /**
   * Get Clara's system prompt for a specific language (respects language tab selection)
   */
  getClaraSystemPromptForLanguage(language) {
    return this.prompts[language] || this.prompts.en;
  }
  /**
   * Validate that a response is in the correct language
   */
  validateLanguageCompliance(response, expectedLanguage) {
    const languagePatterns = {
      en: /\b(the|and|you|are|this|that|with|have|for)\b/i,
      es: /\b(el|la|y|tú|eres|esto|eso|con|tener|para)\b/i,
      fr: /\b(le|la|et|tu|es|ce|cette|avec|avoir|pour)\b/i,
      it: /\b(il|la|e|tu|sei|questo|quella|con|avere|per)\b/i,
      de: /\b(der|die|und|du|bist|das|diese|mit|haben|für)\b/i,
      pt: /\b(o|a|e|tu|és|isto|isso|com|ter|para)\b/i
    };
    const expectedPattern = languagePatterns[expectedLanguage];
    if (!expectedPattern) return true;
    return expectedPattern.test(response);
  }
};
var languageEnforcer = new LanguageEnforcer();

// server/services/conversation.ts
init_storage();
var ConversationService = class {
  vadTimeout = 1200;
  // 1.2 seconds VAD timeout
  activeTimeouts = /* @__PURE__ */ new Map();
  recentCorrections = /* @__PURE__ */ new Map();
  recentUserInputs = /* @__PURE__ */ new Map();
  // Store last 3 user inputs per session
  usedResponsePatterns = /* @__PURE__ */ new Map();
  // Track used response patterns per session
  pendingCorrections = /* @__PURE__ */ new Map();
  // Track corrections awaiting practice
  // Dynamic Memory System - 30 turns with automatic summaries
  conversationHistory = /* @__PURE__ */ new Map();
  // Store last 30 turns
  conversationSummaries = /* @__PURE__ */ new Map();
  // Store accumulated summaries
  /**
   * Check if input appears to be a poor quality transcription
   */
  isPoorQualityTranscription(text) {
    const trimmedText = text.trim();
    const validCommonWords = [
      "hi",
      "hello",
      "hey",
      "good",
      "morning",
      "afternoon",
      "evening",
      "night",
      "hola",
      "buenos",
      "buenas",
      "dias",
      "tardes",
      "noches",
      "bonjour",
      "bonsoir",
      "salut",
      "ciao",
      "buongiorno",
      "buonasera",
      "hallo",
      "guten",
      "tag",
      "abend",
      "ola",
      "bom",
      "dia",
      "tarde",
      "noite",
      "yes",
      "no",
      "si",
      "oui",
      "non",
      "ja",
      "nein",
      "sim",
      "nao",
      "thanks",
      "thank",
      "you",
      "gracias",
      "merci",
      "grazie",
      "danke",
      "obrigado"
    ];
    if (validCommonWords.some((word) => trimmedText.toLowerCase() === word.toLowerCase())) {
      return false;
    }
    const poorQualityPatterns = [
      /^CONVERSACION$/i,
      /^CONVERSING$/i,
      /^CONVERSATION$/i,
      /^CONVERSAR$/i,
      /^TALKING$/i,
      /^HABLANDO$/i,
      /^PARLANDO$/i,
      /^SPEAKING$/i,
      // Only flag very short meaningless patterns
      /^[a-z]{1,2}$/i,
      // All caps single words (but not common greetings)
      /^[A-Z]{3,}$/
    ];
    return poorQualityPatterns.some((pattern) => pattern.test(trimmedText));
  }
  /**
   * Enhanced repetition detection that considers transcription quality
   */
  detectRepetition(sessionId, currentInput) {
    const isPoorTranscription = this.isPoorQualityTranscription(currentInput);
    if (isPoorTranscription) {
      console.log(`\u{1F6AB} Skipping repetition detection for poor quality transcription: "${currentInput}"`);
      return { isRepetition: false };
    }
    const pendingCorrection = this.pendingCorrections.get(sessionId);
    if (pendingCorrection) {
      const similarity = this.calculateSimilarity(currentInput, pendingCorrection.correctedText);
      if (similarity > 0.8) {
        console.log(`Practice detected: User attempting to repeat correction "${pendingCorrection.correctedText}"`);
        return { isRepetition: true, type: "practice" };
      }
    }
    const recentInputs = this.recentUserInputs.get(sessionId) || [];
    if (recentInputs.length === 0) {
      return { isRepetition: false };
    }
    const lastInput = recentInputs[recentInputs.length - 1];
    const isExactRepetition = this.normalizeText(currentInput) === this.normalizeText(lastInput);
    if (!isExactRepetition) {
      return { isRepetition: false };
    }
    const normalizedInput = this.normalizeText(currentInput);
    if (normalizedInput.includes("amore") || normalizedInput.includes("caro") || normalizedInput.includes("tesoro") || normalizedInput.includes("bello")) {
      return { isRepetition: true, type: "playful" };
    }
    if (normalizedInput.length < 50 || this.isCommonPhrase(normalizedInput)) {
      return { isRepetition: true, type: "memorization" };
    }
    return { isRepetition: true, type: "error" };
  }
  /**
   * Normalize text for comparison (remove punctuation, extra spaces, case)
   */
  normalizeText(text) {
    return text.toLowerCase().replace(/[.,!?;:'"]/g, "").replace(/\s+/g, " ").trim();
  }
  /**
   * Check if phrase is a common learning expression
   */
  isCommonPhrase(text) {
    const commonPhrases = [
      "ciao",
      "grazie",
      "prego",
      "scusi",
      "come stai",
      "buongiorno",
      "buonasera",
      "mi chiamo",
      "dove",
      "quando",
      "perche",
      "quanto costa",
      "non capisco"
    ];
    return commonPhrases.some((phrase) => text.includes(phrase));
  }
  /**
   * Calculate similarity between two texts for practice detection
   */
  calculateSimilarity(text1, text2) {
    const normalized1 = this.normalizeText(text1);
    const normalized2 = this.normalizeText(text2);
    if (normalized1 === normalized2) return 1;
    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    if (maxLength === 0) return 1;
    return 1 - distance / maxLength;
  }
  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          // deletion
          matrix[j - 1][i] + 1,
          // insertion
          matrix[j - 1][i - 1] + indicator
          // substitution
        );
      }
    }
    return matrix[str2.length][str1.length];
  }
  /**
   * Update recent user inputs history
   */
  updateUserInputHistory(sessionId, input) {
    if (!this.recentUserInputs.has(sessionId)) {
      this.recentUserInputs.set(sessionId, []);
    }
    const inputs = this.recentUserInputs.get(sessionId);
    inputs.push(input);
    if (inputs.length > 3) {
      inputs.shift();
    }
  }
  /**
   * Get natural Clara message for low-quality input
   */
  getNaturalQualityMessage(language) {
    const messages2 = {
      es: "\xBFSeguimos conversando en espa\xF1ol? Intenta una frase m\xE1s clara y te acompa\xF1o.",
      en: "Shall we continue in English? Try a clearer phrase and I'll help you.",
      fr: "Continuons en fran\xE7ais? Essayez une phrase plus claire et je vous accompagne.",
      it: "Continuiamo in italiano? Prova una frase pi\xF9 chiara e ti accompagno.",
      de: "Sprechen wir weiter auf Deutsch? Versuchen Sie einen klareren Satz und ich helfe Ihnen.",
      pt: "Vamos continuar em portugu\xEAs? Tente uma frase mais clara e eu te acompanho."
    };
    return messages2[language] || messages2.es;
  }
  /**
   * Get varied response for repetitions based on type
   */
  getRepetitionResponse(sessionId, type, language) {
    const usedPatterns = this.usedResponsePatterns.get(sessionId) || /* @__PURE__ */ new Set();
    const responses = {
      error: [
        "Hai detto di nuovo la stessa frase \u2014 va tutto bene! Vuoi provare con una variazione?",
        "Ho sentito la stessa frase di prima. Tutto ok? Proviamo qualcosa di nuovo?",
        "Stessa frase! Nessun problema, capita. Vuoi dire qualcos'altro?"
      ],
      playful: [
        "Amore mio... di nuovo? Hai un'anima romantica! Proviamo con una nuova parola tenera?",
        "Che dolce! Mi piace quando ripeti le parole affettuose. Ora proviamo 'tesoro' o 'caro'?",
        "Aww, di nuovo! Ti piacciono le parole romantiche. Scopriamo altre espressioni dolci?"
      ],
      memorization: [
        "Ottima ripetizione! Vuoi trasformarla ora in una domanda o aggiungere un aggettivo?",
        "Perfetto! Quella frase ti viene naturale. Ora proviamo qualcosa di nuovo?",
        "Bravissimo! La stai memorizzando bene. Proviamo una variazione?"
      ],
      practice: [
        "Perfect! That was excellent practice!",
        "Great job! You got it right!",
        "Much better! Well done!",
        "Excellent! That's exactly right!",
        "Perfect pronunciation! Well done!"
      ],
      practice_with_followup: [
        // English follow-ups
        "Perfect! Do you play electric guitar?",
        "Great job! Have you ever used a guitar cable before?",
        "Excellent! What kind of music do you like to play?",
        "Perfect! How long have you been learning guitar?",
        "Well done! Do you prefer acoustic or electric guitars?",
        // Spanish follow-ups
        "\xA1Perfecto! \xBFTocas la guitarra el\xE9ctrica?",
        "\xA1Excelente! \xBFHas usado alguna vez un cable de guitarra?",
        "\xA1Muy bien! \xBFQu\xE9 tipo de m\xFAsica te gusta tocar?",
        "\xA1Perfecto! \xBFCu\xE1nto tiempo llevas aprendiendo guitarra?",
        "\xA1Bien hecho! \xBFPrefieres guitarras ac\xFAsticas o el\xE9ctricas?",
        // French follow-ups
        "Parfait! Tu joues de la guitare \xE9lectrique?",
        "Excellent! As-tu d\xE9j\xE0 utilis\xE9 un c\xE2ble de guitarre?",
        "Tr\xE8s bien! Quel type de musique aimes-tu jouer?",
        "Parfait! Depuis combien de temps apprends-tu la guitare?",
        "Bien jou\xE9! Tu pr\xE9f\xE8res les guitares acoustiques ou \xE9lectriques?",
        // Italian follow-ups
        "Perfetto! Suoni la chitarra elettrica?",
        "Eccellente! Hai mai usato un cavo per chitarra?",
        "Molto bene! Che tipo di musica ti piace suonare?",
        "Perfetto! Da quanto tempo stai imparando la chitarra?",
        "Ben fatto! Preferisci le chitarre acustiche o elettriche?",
        // German follow-ups
        "Perfekt! Spielst du E-Gitarre?",
        "Ausgezeichnet! Hast du schon mal ein Gitarrenkabel benutzt?",
        "Sehr gut! Welche Art von Musik spielst du gerne?",
        "Perfekt! Wie lange lernst du schon Gitarre?",
        "Gut gemacht! Magst du akustische oder elektrische Gitarren lieber?",
        // Portuguese follow-ups
        "Perfeito! Tocas guitarra el\xE9trica?",
        "Excelente! J\xE1 usaste alguma vez um cabo de guitarra?",
        "Muito bem! Que tipo de m\xFAsica gostas de tocar?",
        "Perfeito! H\xE1 quanto tempo andas a aprender guitarra?",
        "Bem feito! Preferes guitarras ac\xFAsticas ou el\xE9tricas?"
      ]
    };
    const typeResponses = responses[type] || responses.error;
    const availableResponses = typeResponses.filter((response) => !usedPatterns.has(response));
    if (availableResponses.length === 0) {
      usedPatterns.clear();
      return typeResponses[0];
    }
    const chosen = availableResponses[Math.floor(Math.random() * availableResponses.length)];
    usedPatterns.add(chosen);
    this.usedResponsePatterns.set(sessionId, usedPatterns);
    return chosen;
  }
  /**
   * Process incoming audio message
   */
  async processAudioMessage(audioBuffer, sessionId, settings) {
    try {
      const audioSizeKB = audioBuffer.length / 1024;
      console.log(`\u{1F399}\uFE0F Processing audio: ${audioSizeKB.toFixed(1)}KB`);
      if (audioBuffer.length < 1e3) {
        throw new Error("EMPTY_AUDIO");
      }
      console.log(`Transcribing audio for session ${sessionId} with target language: ${settings.language}`);
      const transcription = await openaiService.transcribeAudio(audioBuffer, sessionId, settings.language);
      const originalTranscribedText = transcription;
      if (!originalTranscribedText) {
        throw new Error("NO_SPEECH_DETECTED");
      }
      if (originalTranscribedText.length < 2) {
        throw new Error("NO_SPEECH_DETECTED");
      }
      const pureNoisePatterns = [
        /^\.+$/,
        // Only dots
        /^,+$/,
        // Only commas
        /^\s+$/
        // Only whitespace
      ];
      const isPureNoise = pureNoisePatterns.some((pattern) => pattern.test(originalTranscribedText));
      if (isPureNoise) {
        throw new Error("NO_SPEECH_DETECTED");
      }
      console.log(`\u{1F512} ORIGINAL TRANSCRIPTION PRESERVED: "${originalTranscribedText}"`);
      console.log(`\u{1F4DD} Length: ${originalTranscribedText.length} characters`);
      console.log(`\u{1F6AB} NO NORMALIZATION OR CLEANING APPLIED`);
      const suspiciousPatterns = [
        /sous-titres.*amara/i,
        /subtitles.*by/i,
        /captions.*by/i,
        /transcribed.*by/i,
        /powered.*by/i,
        /copyright/i,
        /all rights reserved/i
      ];
      const isSuspicious = suspiciousPatterns.some((pattern) => pattern.test(originalTranscribedText));
      if (isSuspicious) {
        throw new Error("Background audio detected - please speak clearly into the microphone");
      }
      let pronunciationFeedback = null;
      const repetitionCheck = this.detectRepetition(sessionId, originalTranscribedText);
      const userMessage = {
        id: `msg_${Date.now()}_user`,
        type: "user",
        content: originalTranscribedText,
        timestamp: /* @__PURE__ */ new Date(),
        pronunciationFeedback
        // Add pronunciation feedback if any
      };
      await storage.saveMessage(sessionId, userMessage);
      this.updateUserInputHistory(sessionId, originalTranscribedText);
      console.log(`User message saved (RAW transcription): "${originalTranscribedText}"`);
      console.log(`Repetition check result: isRepetition=${repetitionCheck.isRepetition}, type=${repetitionCheck.type}`);
      if (repetitionCheck.isRepetition) {
        userMessage.repetitionType = repetitionCheck.type;
      }
      return userMessage;
    } catch (error) {
      console.error("Error processing audio message:", error);
      if (error.message === "EMPTY_AUDIO") {
        throw new Error("NO_SPEECH_DETECTED");
      }
      if (error.message === "NO_SPEECH_DETECTED") {
        throw new Error("NO_SPEECH_DETECTED");
      }
      throw new Error(`Failed to process audio: ${error.message}`);
    }
  }
  /**
   * Generate AI response
   */
  async generateAIResponse(sessionId, settings) {
    try {
      const currentLanguage = settings.language;
      console.log(`\u{1F527} USING SESSION LANGUAGE DIRECTLY: ${currentLanguage} (bypassing potentially stale language manager)`);
      let history = await storage.getConversationHistory(sessionId);
      await this.updateDynamicMemory(sessionId, history);
      const enhancedHistory = await this.getEnhancedConversationHistory(sessionId);
      console.log(`\u{1F4DD} DYNAMIC MEMORY: ${enhancedHistory.length} recent messages + summary context`);
      let lastUserMessage = history[history.length - 1];
      let retries = 0;
      while ((!lastUserMessage || lastUserMessage.type !== "user") && retries < 5) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        history = await storage.getConversationHistory(sessionId);
        lastUserMessage = history[history.length - 1];
        retries++;
        console.log(`Retry ${retries}: Looking for user message in history of ${history.length} messages`);
      }
      if (!lastUserMessage || lastUserMessage.type !== "user") {
        throw new Error("No user message to respond to");
      }
      let responseContent = "";
      const hasRepetition = lastUserMessage.repetitionType;
      if (hasRepetition === "practice") {
        const pendingCorrection = this.pendingCorrections.get(sessionId);
        if (pendingCorrection) {
          const similarity = this.calculateSimilarity(lastUserMessage.content, pendingCorrection.correctedText);
          if (similarity > 0.8) {
            console.log(`\u2705 Practice successful! User correctly repeated: "${pendingCorrection.correctedText}"`);
            responseContent = this.generateContextualFollowUp(pendingCorrection.correctedText, settings.language);
            this.pendingCorrections.delete(sessionId);
          } else {
            console.log(`\u274C Practice needs improvement. User said: "${lastUserMessage.content}", expected: "${pendingCorrection.correctedText}"`);
            responseContent = `Let's try that again. The correct way to say it is: "${pendingCorrection.correctedText}". Can you repeat it?`;
          }
        }
      }
      if (hasRepetition) {
        responseContent = this.getRepetitionResponse(sessionId, hasRepetition, settings.language);
      } else if (this.isPoorQualityTranscription(lastUserMessage.content)) {
        console.log(`\u{1F50D} POOR TRANSCRIPTION DETECTED: "${lastUserMessage.content}"`);
        console.log(`\u{1F504} GENERATING NATURAL CLARIFICATION REQUEST`);
        responseContent = this.getNaturalClarificationMessage(settings.language);
      } else {
        console.log(`Generating AI response for session ${sessionId}`);
        const conversationHistory = enhancedHistory.map((msg) => ({
          role: msg.type === "user" ? "user" : "assistant",
          content: msg.content
        }));
        const seenResponses = /* @__PURE__ */ new Set();
        const filteredHistory = conversationHistory.filter((msg, index, arr) => {
          if (msg.role === "assistant") {
            const normalizedContent = this.normalizeText(msg.content);
            if (seenResponses.has(normalizedContent)) {
              console.log(`\u{1F6AB} Filtering out duplicate AI response: "${msg.content}"`);
              return false;
            }
            seenResponses.add(normalizedContent);
            if (index > 0) {
              const prevMsg = arr[index - 1];
              if (prevMsg.role === "assistant") {
                const similarity = this.calculateSimilarity(msg.content, prevMsg.content);
                if (similarity > 0.7) {
                  console.log(`\u{1F6AB} Filtering out similar AI response (${Math.round(similarity * 100)}% similar): "${msg.content}"`);
                  return false;
                }
              }
            }
          }
          return true;
        });
        const recentCorrections = this.checkRecentCorrections(sessionId, lastUserMessage.content);
        const detectedErrors = await openaiService.detectBasicErrors(lastUserMessage.content, currentLanguage);
        console.log(`\u{1F50D} DETECTED ERRORS for correction:`, detectedErrors);
        const claraSystemPrompt = languageEnforcer.getClaraSystemPromptForLanguage(settings.language);
        console.log(`Sending to Clara (RAW input): "${lastUserMessage.content}"`);
        console.log(`\u{1F6A8} CRITICAL LANGUAGE CHECK: settings.language = ${settings.language}, manager.language = ${currentLanguage}`);
        console.log(`\u{1F6A8} CRITICAL: Using frontend settings language directly: ${settings.language}`);
        console.log(`Conversation history sent to Clara:`, JSON.stringify(filteredHistory, null, 2));
        const aiResponse = await openaiService.generateResponse(
          lastUserMessage.content,
          settings.language,
          filteredHistory,
          settings,
          claraSystemPrompt
        );
        responseContent = aiResponse.content;
        const recentAIResponses = history.filter((msg) => msg.type === "ai").slice(-3).map((msg) => this.normalizeText(msg.content));
        const normalizedResponse = this.normalizeText(responseContent);
        if (recentAIResponses.includes(normalizedResponse)) {
          console.log(`\u{1F6AB} DETECTED EXACT RESPONSE REPETITION: "${responseContent}"`);
          console.log(`\u{1F504} REGENERATING WITH ANTI-REPETITION CONTEXT...`);
          const antiRepetitionPrompt = `CRITICAL: You just gave the exact same response "${responseContent}" to a different user input. This is forbidden. You must now give a completely different response that directly addresses what the user actually said: "${lastUserMessage.content}". Never repeat responses.`;
          const regeneratedResponse = await openaiService.generateResponse(
            lastUserMessage.content,
            currentLanguage,
            filteredHistory,
            settings,
            antiRepetitionPrompt
          );
          responseContent = regeneratedResponse.content;
          console.log(`\u2705 REGENERATED UNIQUE RESPONSE: "${responseContent}"`);
        }
        this.updateCorrectionMemory(sessionId, lastUserMessage.content, responseContent);
        this.detectAndRegisterCorrection(sessionId, lastUserMessage.content, responseContent);
      }
      console.log(`Synthesizing speech for AI response`);
      const audioResult = await googleTTSService.synthesizeSpeech(
        responseContent,
        currentLanguage || settings.language,
        sessionId
      );
      const audioUrl = audioResult.filename;
      const aiMessage = {
        id: `msg_${Date.now()}_ai`,
        type: "ai",
        content: responseContent,
        audioUrl,
        timestamp: /* @__PURE__ */ new Date()
      };
      await storage.saveMessage(sessionId, aiMessage);
      console.log(`AI response generated: "${responseContent}"`);
      return aiMessage;
    } catch (error) {
      console.error("Error generating AI response:", error);
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }
  /**
   * Process text message (for quick actions)
   */
  async processTextMessage(text, sessionId, settings) {
    try {
      console.log(`\u{1F512} ORIGINAL TEXT INPUT PRESERVED: "${text}"`);
      console.log(`\u{1F4DD} Length: ${text.length} characters`);
      console.log(`\u{1F6AB} NO AUTOCORRECTION, NORMALIZATION, OR CLEANING APPLIED`);
      const userMessage = {
        id: `msg_${Date.now()}_user`,
        type: "user",
        content: text,
        // NO modification - preserve exactly as typed
        timestamp: /* @__PURE__ */ new Date()
      };
      await storage.saveMessage(sessionId, userMessage);
      const aiMessage = await this.generateAIResponse(sessionId, settings);
      return { userMessage, aiMessage };
    } catch (error) {
      console.error("Error processing text message:", error);
      throw new Error(`Failed to process text message: ${error.message}`);
    }
  }
  /**
   * Handle VAD (Voice Activity Detection) timeout
   */
  setVADTimeout(sessionId, callback) {
    this.clearVADTimeout(sessionId);
    const timeout = setTimeout(callback, this.vadTimeout);
    this.activeTimeouts.set(sessionId, timeout);
  }
  /**
   * Clear VAD timeout
   */
  clearVADTimeout(sessionId) {
    const timeout = this.activeTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(sessionId);
    }
  }
  /**
   * Update dynamic memory system - maintain last 30 turns with summaries
   */
  async updateDynamicMemory(sessionId, fullHistory) {
    const conversationTurns = fullHistory.map((msg) => ({
      role: msg.type,
      content: msg.content,
      timestamp: msg.timestamp
    }));
    this.conversationHistory.set(sessionId, conversationTurns);
    if (conversationTurns.length > 30) {
      await this.createAndStoreSummary(sessionId, conversationTurns.slice(0, -30));
      this.conversationHistory.set(sessionId, conversationTurns.slice(-30));
    }
  }
  /**
   * Create automatic summary of conversation history
   */
  async createAndStoreSummary(sessionId, oldTurns) {
    try {
      const conversationText = oldTurns.map((turn) => `${turn.role}: ${turn.content}`).join("\n");
      const summaryPrompt = `Summarize this language learning conversation focusing on:
1. Frequent errors and corrections made
2. User's progress and improvements
3. Topics and vocabulary practiced
4. Learning patterns observed

Conversation:
${conversationText}

Create a concise summary for Clara to reference in future conversations:`;
      const response = await openaiService.generateResponse(
        summaryPrompt,
        "en",
        // Always summarize in English for consistency
        [],
        { enableCorrections: false, enableSuggestions: false }
      );
      const existingSummary = this.conversationSummaries.get(sessionId) || "";
      const newSummary = existingSummary + "\n\n" + response.content;
      this.conversationSummaries.set(sessionId, newSummary);
      console.log(`\u{1F4DD} Created conversation summary for session ${sessionId}`);
    } catch (error) {
      console.error("Error creating conversation summary:", error);
    }
  }
  /**
   * Get enhanced conversation history with summary context
   */
  async getEnhancedConversationHistory(sessionId) {
    const recentHistory = this.conversationHistory.get(sessionId) || [];
    const summary = this.conversationSummaries.get(sessionId);
    let enhancedHistory = recentHistory.map((turn, index) => ({
      id: `enhanced_${sessionId}_${index}`,
      type: turn.role === "user" ? "user" : "ai",
      content: turn.content,
      timestamp: turn.timestamp
    }));
    if (summary) {
      const summaryMessage = {
        id: `summary_${sessionId}`,
        type: "ai",
        content: `[Previous conversation summary: ${summary}]`,
        timestamp: new Date(Date.now() - 1e6)
        // Older timestamp
      };
      enhancedHistory = [summaryMessage, ...enhancedHistory];
    }
    return enhancedHistory;
  }
  /**
   * Get conversation statistics
   */
  async getConversationStats(sessionId) {
    try {
      const history = await storage.getConversationHistory(sessionId);
      const sessionStart = await storage.getSessionStartTime(sessionId);
      const messageCount = history.length;
      const sessionDuration = Date.now() - sessionStart.getTime();
      const userMessages = history.filter((msg) => msg.type === "user").map((msg) => msg.content);
      let voiceQuality = "Good";
      if (userMessages.length > 10) {
        voiceQuality = "Excellent";
      } else if (userMessages.length > 5) {
        voiceQuality = "Good";
      } else {
        voiceQuality = "Fair";
      }
      return {
        messageCount,
        sessionDuration: Math.floor(sessionDuration / 1e3),
        // in seconds
        voiceQuality
      };
    } catch (error) {
      console.error("Error getting conversation stats:", error);
      return {
        messageCount: 0,
        sessionDuration: 0,
        voiceQuality: "Unknown"
      };
    }
  }
  /**
   * Check for recent corrections to avoid repetition
   */
  checkRecentCorrections(sessionId, userMessage) {
    const correctionKey = `${sessionId}_correction`;
    const correction = this.recentCorrections.get(correctionKey);
    if (!correction) return void 0;
    const userWords = userMessage.toLowerCase().split(/\s+/);
    if (userWords.includes(correction.word.toLowerCase())) {
      return correction;
    }
    this.recentCorrections.delete(correctionKey);
    return void 0;
  }
  /**
   * Update correction memory when a correction is made
   */
  updateCorrectionMemory(sessionId, userMessage, botResponse) {
    const correctionKey = `${sessionId}_correction`;
    const correctionPatterns = [
      // English patterns
      /you could say[.\s]+"([^"]+)"/i,
      /try saying[.\s]+"([^"]+)"/i,
      /a better way is[.\s]+"([^"]+)"/i,
      /the correct pronunciation is[.\s]+"([^"]+)"/i,
      /you meant[.\s]+"([^"]+)"/i,
      /should be[.\s]+"([^"]+)"/i,
      // French patterns
      /j'ai entendu[.\s]+"([^"]+)"[.\s]*mais[.\s]*je pense que vous vouliez dire[.\s]+"([^"]+)"/i,
      /vous pourriez dire[.\s]+"([^"]+)"/i,
      /essayez de dire[.\s]+"([^"]+)"/i,
      /une meilleure façon serait[.\s]+"([^"]+)"/i,
      // Spanish patterns
      /podrías decir[.\s]+"([^"]+)"/i,
      /intenta decir[.\s]+"([^"]+)"/i,
      /una mejor forma sería[.\s]+"([^"]+)"/i,
      // General correction indicators
      /mais je pense que vous vouliez dire[.\s]+"([^"]+)"/i,
      /pero creo que querías decir[.\s]+"([^"]+)"/i,
      /but I think you meant[.\s]+"([^"]+)"/i
    ];
    if (botResponse.includes("tu") && botResponse.includes("tout")) {
      const existing = this.recentCorrections.get(correctionKey);
      if (existing && existing.word === "tout") {
        existing.count++;
        existing.lastCorrection = botResponse;
        console.log(`Detected repeated correction for "tout", count: ${existing.count}`);
      } else {
        this.recentCorrections.set(correctionKey, {
          word: "tout",
          count: 1,
          lastCorrection: botResponse
        });
        console.log(`New correction detected for "tout"`);
      }
      return;
    }
    for (const pattern of correctionPatterns) {
      const match = botResponse.match(pattern);
      if (match) {
        const correctedWord = match[1] || match[2];
        const existing = this.recentCorrections.get(correctionKey);
        if (existing && existing.word === correctedWord) {
          existing.count++;
          existing.lastCorrection = botResponse;
          console.log(`Repeated correction for "${correctedWord}", count: ${existing.count}`);
        } else {
          this.recentCorrections.set(correctionKey, {
            word: correctedWord,
            count: 1,
            lastCorrection: botResponse
          });
          console.log(`New correction for "${correctedWord}"`);
        }
        break;
      }
    }
    setTimeout(() => {
      this.recentCorrections.delete(correctionKey);
    }, 5 * 60 * 1e3);
  }
  /**
   * Generate contextual follow-up question after successful practice
   */
  generateContextualFollowUp(correctedText, language) {
    const words = correctedText.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.includes("guitar") || word.includes("guitarra") || word.includes("guitare") || word.includes("chitarra") || word.includes("gitarre")) {
        switch (language) {
          case "es":
            return "\xA1Perfecto! \xBFTocas la guitarra?";
          case "fr":
            return "Parfait! Tu joues de la guitare?";
          case "it":
            return "Perfetto! Suoni la chitarra?";
          case "de":
            return "Perfekt! Spielst du Gitarre?";
          case "pt":
            return "Perfeito! Tocas guitarra?";
          default:
            return "Perfect! Do you play guitar?";
        }
      }
      if (word.includes("music") || word.includes("m\xFAsica") || word.includes("musique") || word.includes("musica") || word.includes("musik")) {
        switch (language) {
          case "es":
            return "\xA1Excelente! \xBFQu\xE9 tipo de m\xFAsica te gusta?";
          case "fr":
            return "Excellent! Quel type de musique aimes-tu?";
          case "it":
            return "Eccellente! Che tipo di musica ti piace?";
          case "de":
            return "Ausgezeichnet! Was f\xFCr Musik h\xF6rst du gern?";
          case "pt":
            return "Excelente! Que tipo de m\xFAsica gostas?";
          default:
            return "Great! What type of music do you like?";
        }
      }
      if (word.includes("book") || word.includes("libro") || word.includes("livre") || word.includes("buch")) {
        switch (language) {
          case "es":
            return "\xA1Muy bien! \xBFQu\xE9 tipo de libros te gustan?";
          case "fr":
            return "Tr\xE8s bien! Quel genre de livres aimes-tu?";
          case "it":
            return "Molto bene! Che genere di libri ti piacciono?";
          case "de":
            return "Sehr gut! Was f\xFCr B\xFCcher liest du gern?";
          case "pt":
            return "Muito bem! Que g\xE9nero de livros gostas?";
          default:
            return "Excellent! What kind of books do you enjoy?";
        }
      }
      if (word.includes("food") || word.includes("comida") || word.includes("nourriture") || word.includes("cibo") || word.includes("essen")) {
        switch (language) {
          case "es":
            return "\xA1Perfecto! \xBFTe gusta cocinar?";
          case "fr":
            return "Parfait! Tu aimes cuisiner?";
          case "it":
            return "Perfetto! Ti piace cucinare?";
          case "de":
            return "Perfekt! Kochst du gern?";
          case "pt":
            return "Perfeito! Gostas de cozinhar?";
          default:
            return "Perfect! Do you like cooking?";
        }
      }
      if (word.includes("travel") || word.includes("viaje") || word.includes("voyage") || word.includes("viaggio") || word.includes("reise")) {
        switch (language) {
          case "es":
            return "\xA1Excelente! \xBFTe gusta viajar?";
          case "fr":
            return "Excellent! Tu aimes voyager?";
          case "it":
            return "Eccellente! Ti piace viaggiare?";
          case "de":
            return "Ausgezeichnet! Reist du gern?";
          case "pt":
            return "Excelente! Gostas de viajar?";
          default:
            return "Great! Do you like to travel?";
        }
      }
    }
    switch (language) {
      case "es":
        return "\xA1Perfecto! \xA1Son\xF3 genial!";
      case "fr":
        return "Parfait! C'\xE9tait tr\xE8s bien!";
      case "it":
        return "Perfetto! \xC8 suonato benissimo!";
      case "de":
        return "Perfekt! Das klang toll!";
      case "pt":
        return "Perfeito! Soou muito bem!";
      default:
        return "Perfect! That sounded great!";
    }
  }
  /**
   * Detect if a bot response contains a correction and register it for practice
   */
  detectAndRegisterCorrection(sessionId, userInput, botResponse) {
    const correctionPatterns = [
      // English patterns - general corrections
      /you could say[:\s]+"([^"]+)"/i,
      /try saying[:\s]+"([^"]+)"/i,
      /a better way is[:\s]+"([^"]+)"/i,
      /the correct way is[:\s]+"([^"]+)"/i,
      /should be[:\s]+"([^"]+)"/i,
      /would be[:\s]+"([^"]+)"/i,
      /more natural to say[:\s]+"([^"]+)"/i,
      /we say[:\s]+"([^"]+)"[,\s]*not[:\s]+"([^"]+)"/i,
      /we usually say[:\s]+"([^"]+)"[,\s]*not[:\s]+"([^"]+)"/i,
      // English patterns - specific preposition corrections
      /in english[,\s]*we say[:\s]+"?([^",.!?]+)"?[,\s]*not[:\s]+"?([^",.!?]+)"?/i,
      /through the nose[,\s]*not from the nose/i,
      /listen to[,\s]*not listen from/i,
      /different from[,\s]*not different than/i,
      // Spanish patterns
      /podrías decir[:\s]+"([^"]+)"/i,
      /sería mejor decir[:\s]+"([^"]+)"/i,
      /la forma correcta es[:\s]+"([^"]+)"/i,
      /en español decimos[:\s]+"([^"]+)"[,\s]*no[:\s]+"([^"]+)"/i,
      // French patterns
      /tu pourrais dire[:\s]+"([^"]+)"/i,
      /il vaut mieux dire[:\s]+"([^"]+)"/i,
      /la façon correcte est[:\s]+"([^"]+)"/i,
      /en français[,\s]*on dit[:\s]+"([^"]+)"[,\s]*pas[:\s]+"([^"]+)"/i,
      // Italian patterns
      /potresti dire[:\s]+"([^"]+)"/i,
      /sarebbe meglio dire[:\s]+"([^"]+)"/i,
      /il modo corretto è[:\s]+"([^"]+)"/i,
      /in italiano diciamo[:\s]+"([^"]+)"[,\s]*non[:\s]+"([^"]+)"/i,
      // German patterns
      /du könntest sagen[:\s]+"([^"]+)"/i,
      /besser wäre[:\s]+"([^"]+)"/i,
      /richtig ist[:\s]+"([^"]+)"/i,
      /auf deutsch sagt man[:\s]+"([^"]+)"[,\s]*nicht[:\s]+"([^"]+)"/i,
      // Portuguese patterns
      /poderias dizer[:\s]+"([^"]+)"/i,
      /seria melhor dizer[:\s]+"([^"]+)"/i,
      /a forma correta é[:\s]+"([^"]+)"/i,
      /em português dizemos[:\s]+"([^"]+)"[,\s]*não[:\s]+"([^"]+)"/i
    ];
    for (const pattern of correctionPatterns) {
      const match = botResponse.match(pattern);
      if (match) {
        let correctedText = "";
        if (match[1] && match[2]) {
          correctedText = match[1].trim();
        } else if (match[1]) {
          correctedText = match[1].trim();
        }
        if (pattern.source.includes("through the nose")) {
          correctedText = "through the nose";
        } else if (pattern.source.includes("listen to")) {
          correctedText = "listen to";
        } else if (pattern.source.includes("different from")) {
          correctedText = "different from";
        }
        if (correctedText) {
          console.log(`\u{1F3AF} CORRECTION DETECTED! User said: "${userInput}", Bot corrected to: "${correctedText}"`);
          this.pendingCorrections.set(sessionId, {
            originalText: userInput,
            correctedText,
            timestamp: /* @__PURE__ */ new Date()
          });
          console.log(`\u{1F4DD} Registered correction for practice session ${sessionId}`);
          break;
        }
      }
    }
    const contextualCorrections = [
      /through the nose/i,
      /sniff/i,
      /snort/i
    ];
    if (userInput.toLowerCase().includes("from the nose")) {
      for (const correctionPattern of contextualCorrections) {
        if (botResponse.match(correctionPattern)) {
          const correctedText = "through the nose";
          console.log(`\u{1F3AF} CONTEXTUAL CORRECTION DETECTED! User said: "${userInput}", Suggesting: "${correctedText}"`);
          this.pendingCorrections.set(sessionId, {
            originalText: userInput,
            correctedText,
            timestamp: /* @__PURE__ */ new Date()
          });
          console.log(`\u{1F4DD} Registered contextual correction for practice session ${sessionId}`);
          break;
        }
      }
    }
  }
  /**
   * Clear repetition history for a session
   */
  clearRepetitionHistory(sessionId) {
    this.recentUserInputs.delete(sessionId);
    this.usedResponsePatterns.delete(sessionId);
    this.pendingCorrections.delete(sessionId);
    console.log(`Repetition history cleared for session ${sessionId}`);
  }
  /**
   * Get a natural clarification message for poor transcriptions
   */
  getNaturalClarificationMessage(language) {
    switch (language) {
      case "es":
        return "No te escuch\xE9 bien. \xBFPodr\xEDas repetir lo que dijiste?";
      case "en":
        return "I didn't catch that clearly. Could you repeat what you said?";
      case "fr":
        return "Je n'ai pas bien entendu. Pourriez-vous r\xE9p\xE9ter ce que vous avez dit?";
      case "it":
        return "Non ho sentito bene. Potresti ripetere quello che hai detto?";
      case "de":
        return "Ich habe das nicht gut verstanden. K\xF6nnten Sie wiederholen, was Sie gesagt haben?";
      case "pt":
        return "N\xE3o ouvi bem. Poderia repetir o que disse?";
      default:
        return "I didn't catch that clearly. Could you repeat what you said?";
    }
  }
  /**
   * Clear conversation history
   */
  async clearConversation(sessionId) {
    try {
      await storage.clearSession(sessionId);
      this.clearVADTimeout(sessionId);
      const correctionKey = `${sessionId}_correction`;
      this.recentCorrections.delete(correctionKey);
      this.clearRepetitionHistory(sessionId);
      console.log(`Conversation cleared for session ${sessionId}`);
    } catch (error) {
      console.error("Error clearing conversation:", error);
      throw new Error(`Failed to clear conversation: ${error.message}`);
    }
  }
};
var conversationService = new ConversationService();

// server/controllers/voiceController.ts
import { conversationSettingsSchema } from "@shared/schema.js";
var VoiceController = class {
  /**
   * Process uploaded audio file with subscription enforcement
   */
  async processAudio(req, res) {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No audio file provided" });
        return;
      }
      const { sessionId, settings } = req.body;
      if (!sessionId) {
        res.status(400).json({ error: "Session ID is required" });
        return;
      }
      await subscriptionManager.initializeUserProfile(sessionId);
      const activeLanguage = await subscriptionManager.getActiveLanguageForResponse(sessionId);
      const subscriptionStatus = await subscriptionManager.getSubscriptionStatus(sessionId);
      const parsedSettings = {
        language: activeLanguage,
        speechSpeed: 1,
        voiceVolume: 80,
        enableCorrections: true,
        enableSuggestions: true,
        subscriptionType: subscriptionStatus.subscriptionType,
        availableLanguages: subscriptionStatus.availableLanguages,
        activeLanguage
      };
      const userMessage = await conversationService.processAudioMessage(
        req.file.buffer,
        sessionId,
        parsedSettings
      );
      res.json({
        success: true,
        message: userMessage,
        activeLanguage,
        subscriptionInfo: await subscriptionManager.getSubscriptionStatus(sessionId)
      });
    } catch (error) {
      console.error("Error processing audio:", error);
      res.status(500).json({
        error: "Failed to process audio",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  /**
   * Generate AI response
   */
  async generateResponse(req, res) {
    try {
      const { sessionId, settings } = req.body;
      if (!sessionId) {
        res.status(400).json({ error: "Session ID is required" });
        return;
      }
      const parsedSettings = conversationSettingsSchema.parse(settings);
      const aiMessage = await conversationService.generateAIResponse(
        sessionId,
        parsedSettings
      );
      res.json({
        success: true,
        message: aiMessage
      });
    } catch (error) {
      console.error("Error generating response:", error);
      res.status(500).json({
        error: "Failed to generate response",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  /**
   * Process text message (quick actions)
   */
  async processText(req, res) {
    try {
      const { text, sessionId, settings } = req.body;
      if (!text || !sessionId) {
        res.status(400).json({ error: "Text and session ID are required" });
        return;
      }
      const parsedSettings = conversationSettingsSchema.parse(settings);
      const result = await conversationService.processTextMessage(
        text,
        sessionId,
        parsedSettings
      );
      res.json({
        success: true,
        userMessage: result.userMessage,
        aiMessage: result.aiMessage
      });
    } catch (error) {
      console.error("Error processing text:", error);
      res.status(500).json({
        error: "Failed to process text",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  /**
   * Get conversation history
   */
  async getHistory(req, res) {
    try {
      const { sessionId } = req.params;
      if (!sessionId) {
        res.status(400).json({ error: "Session ID is required" });
        return;
      }
      const history = await conversationService.getConversationStats(sessionId);
      res.json({
        success: true,
        stats: history
      });
    } catch (error) {
      console.error("Error getting history:", error);
      res.status(500).json({
        error: "Failed to get conversation history",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  /**
   * Clear conversation
   */
  async clearConversation(req, res) {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        res.status(400).json({ error: "Session ID is required" });
        return;
      }
      await conversationService.clearConversation(sessionId);
      res.json({
        success: true,
        message: "Conversation cleared successfully"
      });
    } catch (error) {
      console.error("Error clearing conversation:", error);
      res.status(500).json({
        error: "Failed to clear conversation",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  /**
   * Generate TTS audio from text
   */
  async generateTTS(text, language = "en") {
    try {
      const openaiService2 = conversationService.openaiService;
      return await openaiService2.generateTTS(text, language);
    } catch (error) {
      console.error("TTS generation error:", error);
      throw new Error("Failed to generate TTS audio");
    }
  }
  /**
   * Test API connections
   */
  async testConnections(req, res) {
    try {
      const openaiTest = await conversationService.processTextMessage(
        "Hello test",
        "test-session",
        {
          language: "en",
          speechSpeed: 1,
          voiceVolume: 80,
          enableCorrections: true,
          enableSuggestions: true,
          subscriptionType: "freemium",
          availableLanguages: ["en"],
          activeLanguage: "en"
        }
      );
      res.json({
        success: true,
        message: "All connections tested successfully",
        openai: !!openaiTest,
        googleTTS: true
        // Will throw if not working
      });
    } catch (error) {
      console.error("Error testing connections:", error);
      res.status(500).json({
        error: "Connection test failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
};
var voiceController = new VoiceController();

// server/routes.ts
init_storage();
init_languageManager();
import { conversationSettingsSchema as conversationSettingsSchema2, voiceMessageSchema } from "@shared/schema.js";

// server/subscriptionRoutes.ts
import { Router } from "express";
var router = Router();
router.get("/status/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const status = await subscriptionManager.getSubscriptionStatus(sessionId);
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error("Error getting subscription status:", error);
    res.status(500).json({
      error: "Failed to get subscription status",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router.post("/switch-language", async (req, res) => {
  try {
    const { sessionId, language } = req.body;
    if (!sessionId || !language) {
      return res.status(400).json({
        error: "Session ID and language are required"
      });
    }
    const result = await subscriptionManager.switchActiveLanguage(sessionId, language);
    if (result.success) {
      const responseMessage = await languageEnforcer.handleLanguageSwitchRequest(sessionId, language);
      res.json({
        success: true,
        message: result.message,
        claraResponse: responseMessage,
        newActiveLanguage: language
      });
    } else {
      const responseMessage = await languageEnforcer.handleLanguageSwitchRequest(sessionId, language);
      res.status(403).json({
        success: false,
        error: result.message,
        claraResponse: responseMessage,
        requiresUpgrade: true
      });
    }
  } catch (error) {
    console.error("Error switching language:", error);
    res.status(500).json({
      error: "Failed to switch language",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router.post("/upgrade/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const profile = await subscriptionManager.upgradeToPremium(sessionId);
    res.json({
      success: true,
      message: "Successfully upgraded to premium",
      profile: {
        subscriptionType: profile.subscriptionType,
        availableLanguages: profile.availableLanguages,
        activeLanguage: profile.activeLanguage
      }
    });
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    res.status(500).json({
      error: "Failed to upgrade subscription",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router.post("/downgrade/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const profile = await subscriptionManager.downgradeToFreemium(sessionId);
    res.json({
      success: true,
      message: "Successfully downgraded to freemium",
      profile: {
        subscriptionType: profile.subscriptionType,
        availableLanguages: profile.availableLanguages,
        activeLanguage: profile.activeLanguage
      }
    });
  } catch (error) {
    console.error("Error downgrading subscription:", error);
    res.status(500).json({
      error: "Failed to downgrade subscription",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
var subscriptionRoutes_default = router;

// server/routes.ts
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
    // 50MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  }
});
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  app2.get("/privacy-policy", (req, res) => {
    const privacyPolicyPath = path4.join(process.cwd(), "public", "privacy-policy.html");
    if (fs4.existsSync(privacyPolicyPath)) {
      res.sendFile(privacyPolicyPath);
    } else {
      res.status(404).send("Privacy Policy not found");
    }
  });
  app2.post("/api/voice/upload", upload.single("audio"), voiceController.processAudio.bind(voiceController));
  app2.post("/api/voice/generate", voiceController.generateResponse.bind(voiceController));
  app2.post("/api/voice/text", voiceController.processText.bind(voiceController));
  app2.get("/api/voice/history/:sessionId", voiceController.getHistory.bind(voiceController));
  app2.post("/api/voice/clear", voiceController.clearConversation.bind(voiceController));
  app2.post("/api/conversation", async (req, res) => {
    try {
      const { sessionId, message, settings } = req.body;
      if (!message || !settings) {
        return res.status(400).json({ error: "Message and settings are required" });
      }
      const fullSettings = {
        ...settings,
        subscriptionType: settings.subscriptionType || "freemium",
        availableLanguages: settings.availableLanguages || [settings.language],
        activeLanguage: settings.activeLanguage || settings.language
      };
      const result = await conversationService.processTextMessage(
        message,
        sessionId || `session_${Date.now()}`,
        fullSettings
      );
      res.json(result);
    } catch (error) {
      console.error("Conversation error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/tts/generate", async (req, res) => {
    try {
      const { text, language } = req.body;
      if (!text || !language) {
        return res.status(400).json({ error: "Text and language are required" });
      }
      const { googleTTSService: googleTTSService2 } = await Promise.resolve().then(() => (init_googleTTS(), googleTTS_exports));
      const sessionId = `tts_${Date.now()}`;
      const result = await googleTTSService2.synthesizeSpeech(text, language, sessionId);
      const audioBase64 = result.buffer.toString("base64");
      res.json({
        success: true,
        audio: audioBase64,
        mimeType: "audio/mpeg"
      });
    } catch (error) {
      console.error("TTS generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/voice/test", voiceController.testConnections.bind(voiceController));
  app2.use("/api/subscription", subscriptionRoutes_default);
  app2.post("/api/tts", async (req, res) => {
    try {
      const { text, language } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      const audioBuffer = await voiceController.generateTTS(text, language || "en");
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", audioBuffer.length);
      res.send(audioBuffer);
    } catch (error) {
      console.error("TTS Error:", error);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });
  app2.post("/api/language/change", async (req, res) => {
    try {
      console.log(`\u{1F6A8} LANGUAGE CHANGE API CALLED:`, req.body);
      const { language, sessionId } = req.body;
      if (!language || !sessionId) {
        console.error(`\u274C MISSING PARAMETERS: language=${language}, sessionId=${sessionId}`);
        return res.status(400).json({ error: "Language and sessionId are required" });
      }
      console.log(`\u{1F504} LANGUAGE CHANGE REQUEST: ${language} for session ${sessionId}`);
      if (languageManager.isLanguageChanging()) {
        return res.status(429).json({
          error: "Language change in progress",
          message: "Please wait for current language change to complete"
        });
      }
      const result = await languageManager.changeLanguage(language, sessionId);
      if (result.success) {
        console.log(`\u2705 LANGUAGE CHANGE SUCCESSFUL: ${result.oldLanguage} \u2192 ${result.newLanguage}`);
        res.json(result);
      } else {
        console.error(`\u274C LANGUAGE CHANGE FAILED: ${result.errors.join(", ")}`);
        res.status(500).json(result);
      }
    } catch (error) {
      console.error(`\u{1F4A5} LANGUAGE CHANGE EXCEPTION: ${error.message}`);
      res.status(500).json({
        error: "Language change failed",
        message: error.message
      });
    }
  });
  app2.use("/api/audio", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
  app2.get("/api/audio/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const filepath = path4.join(process.cwd(), "audio", filename);
      console.log("Attempting to serve audio file:", filepath);
      if (!fs4.existsSync(filepath)) {
        console.error("Audio file not found:", filepath);
        res.status(404).json({ error: "Audio file not found" });
        return;
      }
      const stat = fs4.statSync(filepath);
      console.log("Audio file found, size:", stat.size);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Accept-Ranges", "bytes");
      const audioStream = fs4.createReadStream(filepath);
      audioStream.pipe(res);
    } catch (error) {
      console.error("Error serving audio file:", error);
      res.status(500).json({ error: "Failed to serve audio file" });
    }
  });
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const SESSION_WARNING_TIME = 10 * 60 * 1e3;
  const SESSION_TIMEOUT_TIME = 15 * 60 * 1e3;
  function resetInactivityTimers(ws2) {
    if (ws2.warningTimer) {
      clearTimeout(ws2.warningTimer);
    }
    if (ws2.inactivityTimer) {
      clearTimeout(ws2.inactivityTimer);
    }
    ws2.warningTimer = setTimeout(async () => {
      if (ws2.readyState === WebSocket.OPEN && ws2.sessionId) {
        try {
          const hasWarning = await storage.hasInactivityWarning(ws2.sessionId);
          if (!hasWarning) {
            await storage.setInactivityWarning(ws2.sessionId);
            const settings = await storage.getSessionSettings(ws2.sessionId);
            const language = settings?.language || "es";
            const warningMessages = {
              es: "\xBFEst\xE1s ah\xED? Tu sesi\xF3n se cerrar\xE1 en 5 minutos por inactividad.",
              en: "Are you there? Your session will close in 5 minutes due to inactivity.",
              fr: "Tu es l\xE0 ? Ta session se fermera dans 5 minutes par inactivit\xE9.",
              it: "Ci sei? La tua sessione si chiuder\xE0 tra 5 minuti per inattivit\xE0.",
              de: "Bist du da? Deine Sitzung wird in 5 Minuten wegen Inaktivit\xE4t geschlossen.",
              pt: "Est\xE1s a\xED? Tua sess\xE3o ser\xE1 fechada em 5 minutos por inatividade."
            };
            ws2.send(JSON.stringify({
              type: "message",
              data: {
                id: `warning_${Date.now()}`,
                type: "ai",
                content: warningMessages[language] || warningMessages.es,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              }
            }));
          }
        } catch (error) {
          console.error("Error sending inactivity warning:", error);
        }
      }
    }, SESSION_WARNING_TIME);
    ws2.inactivityTimer = setTimeout(() => {
      if (ws2.readyState === WebSocket.OPEN) {
        console.log(`Session ${ws2.sessionId} timed out due to inactivity`);
        ws2.close(1e3, "Session timeout due to inactivity");
      }
    }, SESSION_TIMEOUT_TIME);
  }
  wss.on("connection", async (ws2, req) => {
    console.log("New WebSocket connection established");
    ws2.isAlive = true;
    ws2.send(JSON.stringify({
      type: "connection",
      message: "WebSocket connected"
    }));
    ws2.on("pong", () => {
      ws2.isAlive = true;
    });
    ws2.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const parsedMessage = voiceMessageSchema.parse(message);
        if (ws2.sessionId) {
          await storage.updateLastActivity(ws2.sessionId);
          resetInactivityTimers(ws2);
        }
        if (!ws2.sessionId) {
          ws2.sessionId = parsedMessage.sessionId;
          await languageManager.initializeFromSession(ws2.sessionId);
          conversationService.clearRepetitionHistory(ws2.sessionId);
          try {
            const profile = await storage.getUserProfile(ws2.sessionId);
            if (profile) {
              const settings = {
                language: profile.preferredLanguage,
                speechSpeed: 1,
                voiceVolume: 80,
                enableCorrections: true,
                enableSuggestions: true
              };
              await storage.saveSessionSettings(ws2.sessionId, settings);
              ws2.send(JSON.stringify({
                type: "language_restored",
                language: profile.preferredLanguage
              }));
              console.log(`Language restored for session ${ws2.sessionId}: ${profile.preferredLanguage}`);
            }
          } catch (error) {
            console.log("No previous language preference found for session");
          }
          resetInactivityTimers(ws2);
        }
        console.log(`Received WebSocket message:`, parsedMessage.type);
        switch (parsedMessage.type) {
          case "audio":
            await handleAudioMessage(ws2, parsedMessage);
            break;
          case "text":
            await handleTextMessage(ws2, parsedMessage);
            break;
          case "text_conversation":
            await handleTextConversation(ws2, parsedMessage);
            break;
          case "control":
            await handleControlMessage(ws2, parsedMessage);
            break;
          default:
            ws2.send(JSON.stringify({
              type: "error",
              error: "Unknown message type"
            }));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws2.send(JSON.stringify({
          type: "error",
          error: "Invalid message format",
          details: error.message
        }));
      }
    });
    ws2.on("close", () => {
      console.log("WebSocket connection closed");
      if (ws2.warningTimer) {
        clearTimeout(ws2.warningTimer);
      }
      if (ws2.inactivityTimer) {
        clearTimeout(ws2.inactivityTimer);
      }
      if (ws2.sessionId) {
        conversationService.clearRepetitionHistory(ws2.sessionId);
        console.log(`Repetition history cleared for session ${ws2.sessionId}`);
      }
    });
    ws2.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
    console.log(`New session created: ${ws2.sessionId}`);
    ws2.send(JSON.stringify({
      type: "connection",
      status: "connected",
      message: "WebSocket connection established"
    }));
  });
  async function handleAudioMessage(ws2, message) {
    try {
      const audioBuffer = Buffer.from(message.data, "base64");
      const requestedLanguage = message.language || "en";
      console.log(`\u{1F6A8} CRITICAL LANGUAGE CHECK: Client requested = ${requestedLanguage}`);
      let settings = await storage.getSessionSettings(message.sessionId);
      const newSettings = {
        language: requestedLanguage,
        speechSpeed: settings?.speechSpeed || 1,
        voiceVolume: settings?.voiceVolume || 80,
        enableCorrections: settings?.enableCorrections || true,
        enableSuggestions: settings?.enableSuggestions || true
      };
      await storage.saveSessionSettings(message.sessionId, newSettings);
      settings = newSettings;
      console.log(`\u{1F6A8} CRITICAL: Using client requested language: ${requestedLanguage}`);
      const userMessage = await conversationService.processAudioMessage(
        audioBuffer,
        message.sessionId,
        settings
      );
      if (ws2.readyState === WebSocket.OPEN) {
        ws2.send(JSON.stringify({
          type: "message",
          data: userMessage
        }));
      }
      conversationService.setVADTimeout(message.sessionId, async () => {
        const AI_RESPONSE_TIMEOUT = 25e3;
        let timeoutHandler2;
        try {
          console.log(`\u{1F3AF} AI RESPONSE GENERATION START for session ${message.sessionId}`);
          const timeoutPromise = new Promise((_, reject) => {
            timeoutHandler2 = setTimeout(() => {
              reject(new Error("TIMEOUT: AI response generation exceeded 25 seconds"));
            }, AI_RESPONSE_TIMEOUT);
          });
          await new Promise((resolve) => setTimeout(resolve, 500));
          const aiMessage = await Promise.race([
            conversationService.generateAIResponse(message.sessionId, settings),
            timeoutPromise
          ]);
          clearTimeout(timeoutHandler2);
          console.log(`\u2705 AI RESPONSE GENERATION COMPLETE`);
          if (ws2.readyState === WebSocket.OPEN) {
            ws2.send(JSON.stringify({
              type: "message",
              data: aiMessage
            }));
          }
        } catch (error) {
          clearTimeout(timeoutHandler2);
          console.error("\u{1F6A8} CRITICAL ERROR in AI response generation:", error);
          if (ws2.readyState === WebSocket.OPEN) {
            const isTimeout = error.message.includes("TIMEOUT");
            const errorMessage = isTimeout ? "Sorry, I had trouble processing that. Could you try again?" : "I encountered an error. Please try speaking again.";
            ws2.send(JSON.stringify({
              type: "message",
              data: {
                id: `error_${Date.now()}`,
                type: "ai",
                content: errorMessage,
                timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                audioUrl: null
              }
            }));
            ws2.send(JSON.stringify({
              type: "error",
              error: "AI response generation failed",
              details: error.message,
              recoverable: true
            }));
          }
        }
      });
    } catch (error) {
      console.error("Error handling audio message:", error);
      if (ws2.readyState === WebSocket.OPEN) {
        const isTimeout = error.message.includes("TIMEOUT");
        const isTranscriptionError = error.message.includes("transcribe");
        let errorMessage = "I encountered an error processing your audio. Please try speaking again.";
        let showTextFallback = false;
        if (error.message.includes("NO_SPEECH_DETECTED") || error.message.includes("SILENCE_WITH_FALSE_CONTENT")) {
          const sessionLanguage = message.language || "en";
          const noSpeechMessages = {
            "es": "\xBFEst\xE1s ah\xED? No escuch\xE9 nada, \xBFquieres intentarlo de nuevo?",
            "en": "Are you there? I didn't hear anything, would you like to try again?",
            "fr": "\xCAtes-vous l\xE0? Je n'ai rien entendu, voulez-vous r\xE9essayer?",
            "it": "Ci sei? Non ho sentito nulla, vuoi riprovare?",
            "de": "Bist du da? Ich habe nichts geh\xF6rt, m\xF6chtest du es nochmal versuchen?",
            "pt": "Voc\xEA est\xE1 a\xED? N\xE3o ouvi nada, quer tentar novamente?"
          };
          errorMessage = noSpeechMessages[sessionLanguage] || noSpeechMessages["en"];
          showTextFallback = false;
        } else if (isTimeout) {
          errorMessage = "Audio processing is taking too long. You can try speaking shorter, or use the text input below as an alternative.";
          showTextFallback = true;
        } else if (isTranscriptionError) {
          errorMessage = "I had trouble understanding the audio. You can try speaking again, or use text input instead.";
          showTextFallback = true;
        }
        ws2.send(JSON.stringify({
          type: "message",
          data: {
            id: `error_${Date.now()}`,
            type: "ai",
            content: errorMessage,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            audioUrl: null
          }
        }));
        if (!error.message.includes("NO_SPEECH_DETECTED") && !error.message.includes("SILENCE_WITH_FALSE_CONTENT")) {
          ws2.send(JSON.stringify({
            type: "error",
            error: "Audio processing failed",
            details: error.message,
            recoverable: true,
            showTextFallback
          }));
        }
      }
    }
  }
  async function handleTextMessage(ws2, message) {
    try {
      let settings = await storage.getSessionSettings(message.sessionId);
      if (message.language && message.language !== settings?.language) {
        console.log(`User explicitly selected language: ${message.language}, updating settings`);
        settings = {
          language: message.language,
          speechSpeed: settings?.speechSpeed || 1,
          voiceVolume: settings?.voiceVolume || 80,
          enableCorrections: settings?.enableCorrections || true,
          enableSuggestions: settings?.enableSuggestions || true
        };
        await storage.saveSessionSettings(message.sessionId, settings);
        console.log(`Language settings updated to respect user selection: ${message.language}`);
      }
      if (!settings) {
        console.log(`No settings found, using default language for session ${message.sessionId}`);
        settings = {
          language: message.language || "en",
          speechSpeed: 1,
          voiceVolume: 80,
          enableCorrections: true,
          enableSuggestions: true
        };
        await storage.saveSessionSettings(message.sessionId, settings);
        console.log(`Default settings saved with language: ${settings.language}`);
      }
      const TEXT_PROCESSING_TIMEOUT = 25e3;
      let timeoutHandler2;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandler2 = setTimeout(() => {
          reject(new Error("TIMEOUT: Text processing exceeded 25 seconds"));
        }, TEXT_PROCESSING_TIMEOUT);
      });
      console.log(`\u{1F3AF} TEXT PROCESSING START for session ${message.sessionId}`);
      const result = await Promise.race([
        conversationService.processTextMessage(message.data, message.sessionId, settings),
        timeoutPromise
      ]);
      clearTimeout(timeoutHandler2);
      console.log(`\u2705 TEXT PROCESSING COMPLETE`);
      if (ws2.readyState === WebSocket.OPEN) {
        ws2.send(JSON.stringify({
          type: "message",
          data: result.userMessage
        }));
        ws2.send(JSON.stringify({
          type: "message",
          data: result.aiMessage
        }));
      }
    } catch (error) {
      clearTimeout(timeoutHandler);
      console.error("\u{1F6A8} CRITICAL ERROR in text processing:", error);
      if (ws2.readyState === WebSocket.OPEN) {
        const isTimeout = error.message.includes("TIMEOUT");
        const errorMessage = isTimeout ? "Sorry, I had trouble processing that. Could you try again?" : "I encountered an error processing your message. Please try again.";
        ws2.send(JSON.stringify({
          type: "message",
          data: {
            id: `error_${Date.now()}`,
            type: "ai",
            content: errorMessage,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            audioUrl: null
          }
        }));
        ws2.send(JSON.stringify({
          type: "error",
          error: "Text processing failed",
          details: error.message,
          recoverable: true
        }));
      }
    }
  }
  async function handleTextConversation(ws2, message) {
    try {
      const { text, settings } = message.data;
      if (!text || !ws2.sessionId) {
        ws2.send(JSON.stringify({
          type: "error",
          error: "Text and session ID are required"
        }));
        return;
      }
      await subscriptionManager.initializeUserProfile(ws2.sessionId);
      const activeLanguage = await subscriptionManager.getActiveLanguageForResponse(ws2.sessionId);
      const subscriptionStatus = await subscriptionManager.getSubscriptionStatus(ws2.sessionId);
      const completeSettings = {
        language: settings?.language || activeLanguage,
        speechSpeed: settings?.speechSpeed || 1,
        voiceVolume: settings?.voiceVolume || 80,
        enableCorrections: settings?.enableCorrections || true,
        enableSuggestions: settings?.enableSuggestions || true,
        subscriptionType: subscriptionStatus.subscriptionType,
        availableLanguages: subscriptionStatus.availableLanguages,
        activeLanguage
      };
      const result = await conversationService.processTextMessage(
        text,
        ws2.sessionId,
        completeSettings
      );
      if (ws2.readyState === WebSocket.OPEN) {
        ws2.send(JSON.stringify({
          type: "message",
          data: {
            id: result.userMessage.id,
            sender: "user",
            content: result.userMessage.content,
            timestamp: result.userMessage.timestamp.toISOString(),
            isError: false
          }
        }));
        ws2.send(JSON.stringify({
          type: "message",
          data: {
            id: result.aiMessage.id,
            sender: "assistant",
            content: result.aiMessage.content,
            timestamp: result.aiMessage.timestamp.toISOString(),
            isError: false
          }
        }));
      }
    } catch (error) {
      console.error("Error handling text conversation:", error);
      if (ws2.readyState === WebSocket.OPEN) {
        ws2.send(JSON.stringify({
          type: "error",
          error: "Failed to process text message",
          details: error.message
        }));
      }
    }
  }
  async function handleControlMessage(ws2, message) {
    try {
      const controlData = JSON.parse(message.data);
      console.log(`Control message received:`, controlData);
      switch (controlData.action) {
        case "clear_conversation":
          await conversationService.clearConversation(message.sessionId);
          ws2.send(JSON.stringify({
            type: "control",
            action: "conversation_cleared"
          }));
          break;
        case "update_settings":
          console.log(`Updating settings for session ${message.sessionId}:`, controlData.settings);
          const settings = conversationSettingsSchema2.parse(controlData.settings);
          await storage.saveSessionSettings(message.sessionId, settings);
          console.log(`Settings saved successfully:`, settings);
          try {
            await storage.saveUserProfile({
              sessionId: message.sessionId,
              preferredLanguage: settings.language
            });
            console.log(`User profile saved with language: ${settings.language}`);
          } catch (error) {
            console.log("Error saving user profile:", error);
          }
          ws2.send(JSON.stringify({
            type: "control",
            action: "settings_updated"
          }));
          break;
        case "get_stats":
          const stats = await conversationService.getConversationStats(message.sessionId);
          ws2.send(JSON.stringify({
            type: "stats",
            data: stats
          }));
          break;
        default:
          ws2.send(JSON.stringify({
            type: "error",
            error: "Unknown control action"
          }));
      }
    } catch (error) {
      console.error("Error handling control message:", error);
      ws2.send(JSON.stringify({
        type: "error",
        error: "Failed to process control message",
        details: error.message
      }));
    }
  }
  const interval = setInterval(() => {
    wss.clients.forEach((ws2) => {
      if (ws2.isAlive === false) {
        return ws2.terminate();
      }
      ws2.isAlive = false;
      ws2.ping();
    });
  }, 3e4);
  wss.on("close", () => {
    clearInterval(interval);
  });
  console.log("Voice conversation routes and WebSocket server initialized");
  return httpServer;
}

// server/vite.ts
import path5 from "path";
import { fileURLToPath } from "url";
import express from "express";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path5.dirname(__filename);
function setupVite(app2) {
  console.log("\u2705 setupVite ejecutado");
}
function serveStatic(app2) {
  const publicPath = path5.resolve(__dirname, "./public");
  app2.use(express.static(publicPath));
  app2.get("*", (req, res) => {
    res.sendFile(path5.join(publicPath, "index.html"));
  });
}
function log(message) {
  console.log("\u{1F4DD}", message);
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path6 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path6.startsWith("/api")) {
      let logLine = `${req.method} ${path6} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
