import { storage } from '../storage.js';
import type { UserProfile } from '@shared/schema.js';

export class SubscriptionManager {
  private readonly FREEMIUM_LANGUAGES = 1;
  private readonly PREMIUM_LANGUAGES = 6;
  
  private readonly ALL_LANGUAGES = ['es', 'en', 'fr', 'it', 'de', 'pt'] as const;
  
  /**
   * Initialize user profile with subscription-based language access
   */
  async initializeUserProfile(sessionId: string, defaultLanguage: string = 'es'): Promise<UserProfile> {
    let profile = await storage.getUserProfile(sessionId);
    
    if (!profile) {
      // Create new freemium profile with single language
      profile = await storage.saveUserProfile({
        sessionId,
        preferredLanguage: defaultLanguage,
        subscriptionType: 'freemium',
        availableLanguages: [defaultLanguage],
        activeLanguage: defaultLanguage,
      });
      
      console.log(`🆕 FREEMIUM PROFILE CREATED: ${sessionId} with language ${defaultLanguage}`);
    }
    
    return profile;
  }
  
  /**
   * Upgrade user to premium with access to all languages
   */
  async upgradeToPremium(sessionId: string): Promise<UserProfile> {
    await storage.updateSubscriptionType(sessionId, 'premium');
    await storage.updateAvailableLanguages(sessionId, [...this.ALL_LANGUAGES]);
    
    const profile = await storage.getUserProfile(sessionId);
    console.log(`⭐ UPGRADED TO PREMIUM: ${sessionId} - All languages unlocked`);
    
    return profile!;
  }
  
  /**
   * Downgrade user to freemium (keeps current active language only)
   */
  async downgradeToFreemium(sessionId: string): Promise<UserProfile> {
    const profile = await storage.getUserProfile(sessionId);
    if (!profile) throw new Error('Profile not found');
    
    await storage.updateSubscriptionType(sessionId, 'freemium');
    await storage.updateAvailableLanguages(sessionId, [profile.activeLanguage]);
    
    console.log(`📉 DOWNGRADED TO FREEMIUM: ${sessionId} - Locked to ${profile.activeLanguage}`);
    
    return (await storage.getUserProfile(sessionId))!;
  }
  
  /**
   * Check if user can access a specific language
   */
  async canAccessLanguage(sessionId: string, language: string): Promise<boolean> {
    const profile = await storage.getUserProfile(sessionId);
    if (!profile) return false;
    
    return profile.availableLanguages.includes(language);
  }
  
  /**
   * Switch active language (only if user has access)
   */
  async switchActiveLanguage(sessionId: string, language: string): Promise<{ success: boolean; message: string }> {
    const profile = await storage.getUserProfile(sessionId);
    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }
    
    // Check if user has access to this language
    if (!profile.availableLanguages.includes(language)) {
      if (profile.subscriptionType === 'freemium') {
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
    
    // Switch active language
    await storage.updateActiveLanguage(sessionId, language);
    
    console.log(`🔄 LANGUAGE SWITCHED: ${sessionId} → ${language}`);
    
    return { 
      success: true, 
      message: `Active language changed to ${language}` 
    };
  }
  
  /**
   * Get user's subscription status and language access
   */
  async getSubscriptionStatus(sessionId: string): Promise<{
    subscriptionType: 'freemium' | 'premium';
    activeLanguage: string;
    availableLanguages: string[];
    canSwitchLanguages: boolean;
  }> {
    const profile = await this.initializeUserProfile(sessionId);
    
    return {
      subscriptionType: profile.subscriptionType as 'freemium' | 'premium',
      activeLanguage: profile.activeLanguage,
      availableLanguages: profile.availableLanguages,
      canSwitchLanguages: profile.subscriptionType === 'premium'
    };
  }
  
  /**
   * Validate and enforce active language for Clara responses
   */
  async getActiveLanguageForResponse(sessionId: string): Promise<string> {
    const profile = await this.initializeUserProfile(sessionId);
    
    console.log(`🎯 ACTIVE LANGUAGE ENFORCED: ${profile.activeLanguage} for session ${sessionId}`);
    console.log(`🔒 SUBSCRIPTION: ${profile.subscriptionType.toUpperCase()}`);
    
    return profile.activeLanguage;
  }
  
  /**
   * Check if mixed language input should be processed based on subscription
   */
  async shouldProcessMixedLanguage(sessionId: string, detectedLanguages: string[]): Promise<{
    shouldProcess: boolean;
    activeLanguage: string;
    message?: string;
  }> {
    const profile = await this.initializeUserProfile(sessionId);
    const activeLanguage = profile.activeLanguage;
    
    // Always respond in active language regardless of input
    // Mixed language errors are expected when not speaking in active language
    const hasActiveLanguage = detectedLanguages.includes(activeLanguage);
    
    if (!hasActiveLanguage && detectedLanguages.length > 1) {
      console.log(`⚠️ MIXED LANGUAGE DETECTED: User spoke ${detectedLanguages.join(', ')} but active language is ${activeLanguage}`);
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
}

export const subscriptionManager = new SubscriptionManager();
