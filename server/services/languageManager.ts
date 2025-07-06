/**
 * CRITICAL: Central Language Manager
 * Ensures all system modules sync properly when language changes
 * Prevents desynchronization between STT, TTS, Clara, and UI
 */

// Language Manager - Central control for language synchronization

interface LanguageChangeResult {
  success: boolean;
  oldLanguage: string;
  newLanguage: string;
  timestamp: number;
  modulesSynced: string[];
  errors: string[];
}

export class LanguageManager {
  private currentLanguage: string = 'en';
  private isChangingLanguage: boolean = false;
  private sessionId: string | null = null;

  constructor() {
    this.loadLanguagePreference();
  }

  private loadLanguagePreference(): void {
    // Check for existing global language preference
    let globalLang = (global as any).preferredLanguage;
    
    // If no global preference, try to load from file using dynamic import
    if (!globalLang) {
      try {
        import('fs').then(fs => {
          import('path').then(path => {
            const langFile = path.join(process.cwd(), '.language-preference');
            if (fs.existsSync(langFile)) {
              globalLang = fs.readFileSync(langFile, 'utf8').trim();
              (global as any).preferredLanguage = globalLang;
              if (globalLang !== this.currentLanguage) {
                this.currentLanguage = globalLang;
                console.log(`📁 LOADED LANGUAGE FROM FILE: ${globalLang}`);
              }
            }
          });
        });
      } catch (error) {
        // Silent fallback
      }
    }
    
    if (globalLang) {
      this.currentLanguage = globalLang;
      console.log(`🏗️ LANGUAGE MANAGER CREATED - Loaded: ${this.currentLanguage}`);
    } else {
      console.log(`🏗️ LANGUAGE MANAGER CREATED - Default: ${this.currentLanguage}`);
    }
  }

  /**
   * Initialize language manager with session's saved language
   */
  async initializeFromSession(sessionId: string): Promise<void> {
    try {
      const { storage } = await import('../storage.js');
      const settings = await storage.getSessionSettings(sessionId);
      
      console.log(`🔍 SESSION SETTINGS CHECK for ${sessionId}:`, settings);
      
      if (settings && settings.language && settings.language !== this.currentLanguage) {
        console.log(`🔄 INITIALIZING LANGUAGE MANAGER FROM SESSION: ${this.currentLanguage} → ${settings.language}`);
        this.currentLanguage = settings.language;
        console.log(`✅ LANGUAGE MANAGER SYNCHRONIZED TO SESSION: ${this.currentLanguage}`);
      } else {
        // Try to load from localStorage or global preference
        console.log(`🔍 CHECKING GLOBAL LANGUAGE PREFERENCES...`);
        const globalLang = (global as any).preferredLanguage;
        if (globalLang && globalLang !== this.currentLanguage) {
          console.log(`🔄 LOADING FROM GLOBAL PREFERENCE: ${this.currentLanguage} → ${globalLang}`);
          this.currentLanguage = globalLang;
          console.log(`✅ LANGUAGE MANAGER SET FROM GLOBAL: ${this.currentLanguage}`);
        } else {
          console.log(`⚠️ No saved language preference found, using default: ${this.currentLanguage}`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not initialize language from session, using default: ${this.currentLanguage}`);
    }
  }

  /**
   * CRITICAL: Centralized language change handler
   * Stops all operations and synchronizes ALL modules
   */
  async changeLanguage(newLanguage: string, sessionId: string): Promise<LanguageChangeResult> {
    const oldLanguage = this.currentLanguage;
    const timestamp = Date.now();
    const modulesSynced: string[] = [];
    const errors: string[] = [];

    console.log(`🔄 LANGUAGE CHANGE INITIATED: ${oldLanguage} → ${newLanguage} for session ${sessionId}`);
    
    // Block new operations during language change
    this.isChangingLanguage = true;
    this.sessionId = sessionId;

    try {
      // 1. Clear session context to prevent language contamination
      console.log(`🧹 CLEARING SESSION CONTEXT...`);
      await this.clearSessionContext(sessionId);
      modulesSynced.push('session_context');

      // 2. Reset STT module
      console.log(`🎤 RESETTING STT MODULE...`);
      await this.resetSTTModule(newLanguage);
      modulesSynced.push('stt');

      // 3. Reset TTS module  
      console.log(`🔊 RESETTING TTS MODULE...`);
      await this.resetTTSModule(newLanguage);
      modulesSynced.push('tts');

      // 4. Update Clara's language context
      console.log(`🤖 UPDATING CLARA LANGUAGE CONTEXT...`);
      await this.updateClaraLanguage(newLanguage);
      modulesSynced.push('clara');

      // 5. Reset conversation history
      console.log(`💬 RESETTING CONVERSATION HISTORY...`);
      await this.resetConversationHistory(sessionId);
      modulesSynced.push('conversation');

      // 6. Update current language - CRITICAL STATE CHANGE
      console.log(`🔧 UPDATING INTERNAL LANGUAGE STATE: ${this.currentLanguage} → ${newLanguage}`);
      this.currentLanguage = newLanguage;
      
      // 7. Save language globally for persistence across reconnections  
      console.log(`🌐 SAVING LANGUAGE GLOBALLY...`);
      (global as any).preferredLanguage = newLanguage;
      
      // Also save to file for server restart persistence
      try {
        const fs = require('fs');
        const path = require('path');
        const langFile = path.join(process.cwd(), '.language-preference');
        fs.writeFileSync(langFile, newLanguage);
        console.log(`📁 LANGUAGE SAVED TO FILE: ${newLanguage}`);
      } catch (error) {
        console.log(`⚠️ Could not save language to file: ${error}`);
      }
      
      console.log(`✅ GLOBAL LANGUAGE PREFERENCE SET: ${newLanguage}`);
      
      // 8. CRITICAL: Save language to session storage to prevent contamination
      console.log(`💾 SAVING LANGUAGE TO SESSION STORAGE...`);
      await this.saveLanguageToSession(sessionId, newLanguage);
      modulesSynced.push('session_storage');
      
      console.log(`🔧 LANGUAGE STATE UPDATED: ${this.currentLanguage}`);
      
      console.log(`✅ LANGUAGE CHANGE COMPLETED: ${oldLanguage} → ${newLanguage}`);
      console.log(`🔧 MODULES SYNCED: ${modulesSynced.join(', ')}`);

      return {
        success: true,
        oldLanguage,
        newLanguage,
        timestamp,
        modulesSynced,
        errors
      };

    } catch (error: any) {
      const errorMsg = `Language change failed: ${error.message}`;
      errors.push(errorMsg);
      console.error(`❌ LANGUAGE CHANGE FAILED: ${errorMsg}`);
      
      return {
        success: false,
        oldLanguage,
        newLanguage,
        timestamp,
        modulesSynced,
        errors
      };
    } finally {
      // Always unlock operations
      this.isChangingLanguage = false;
    }
  }

  /**
   * Check if language change is in progress
   */
  isLanguageChanging(): boolean {
    return this.isChangingLanguage;
  }

  /**
   * Get current active language
   */
  getCurrentLanguage(): string {
    console.log(`🔍 LANGUAGE MANAGER QUERY: Current language = ${this.currentLanguage}`);
    return this.currentLanguage;
  }

  /**
   * Clear session context to prevent contamination
   */
  private async clearSessionContext(sessionId: string): Promise<void> {
    // Clear any cached conversation state
    (global as any).conversationHistory = (global as any).conversationHistory || {};
    if ((global as any).conversationHistory[sessionId]) {
      delete (global as any).conversationHistory[sessionId];
    }
    
    // Clear repetition history
    (global as any).repetitionHistory = (global as any).repetitionHistory || {};
    if ((global as any).repetitionHistory[sessionId]) {
      delete (global as any).repetitionHistory[sessionId];
    }
  }

  /**
   * Reset STT module for new language
   */
  private async resetSTTModule(language: string): Promise<void> {
    // Reset any STT-specific caches or configurations
    (global as any).sttContext = (global as any).sttContext || {};
    (global as any).sttContext.currentLanguage = language;
    (global as any).sttContext.lastReset = Date.now();
  }

  /**
   * Reset TTS module for new language
   */
  private async resetTTSModule(language: string): Promise<void> {
    // Reset TTS voice settings
    (global as any).ttsContext = (global as any).ttsContext || {};
    (global as any).ttsContext.currentLanguage = language;
    (global as any).ttsContext.lastReset = Date.now();
  }

  /**
   * Update Clara's language context
   */
  private async updateClaraLanguage(language: string): Promise<void> {
    // Reset Clara's conversation context
    (global as any).claraContext = (global as any).claraContext || {};
    (global as any).claraContext.currentLanguage = language;
    (global as any).claraContext.lastReset = Date.now();
  }

  /**
   * Reset conversation history
   */
  private async resetConversationHistory(sessionId: string): Promise<void> {
    // Clear conversation memory
    (global as any).conversationMemory = (global as any).conversationMemory || {};
    if ((global as any).conversationMemory[sessionId]) {
      delete (global as any).conversationMemory[sessionId];
    }
  }

  /**
   * Save language to session storage
   */
  private async saveLanguageToSession(sessionId: string, language: string): Promise<void> {
    try {
      const { storage } = await import('../storage.js');
      let settings = await storage.getSessionSettings(sessionId);
      
      if (!settings) {
        settings = {
          language: language as any,
          speechSpeed: 1.0,
          voiceVolume: 80,
          enableCorrections: true,
          enableSuggestions: true,
        };
      } else {
        settings.language = language as any;
      }
      
      await storage.saveSessionSettings(sessionId, settings);
      console.log(`💾 LANGUAGE SAVED TO SESSION: ${language}`);
    } catch (error) {
      console.error(`❌ Failed to save language to session: ${error}`);
      throw error;
    }
  }
}

// Singleton instance
export const languageManager = new LanguageManager();