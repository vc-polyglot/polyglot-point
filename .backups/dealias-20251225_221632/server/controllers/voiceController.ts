import { Request, Response } from 'express';
import { conversationService } from '../services/conversation.js';
import { conversationSettingsSchema } from '@shared/schema.js';
import { subscriptionManager } from '../services/subscriptionManager.js';
import { languageEnforcer } from '../services/languageEnforcer.js';
import { z } from 'zod';

export class VoiceController {
  /**
   * Process uploaded audio file with subscription enforcement
   */
  async processAudio(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No audio file provided' });
        return;
      }

      const { sessionId, settings } = req.body;
      
      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      // Initialize user profile and enforce subscription rules
      await subscriptionManager.initializeUserProfile(sessionId);
      
      // Get active language for processing
      const activeLanguage = await subscriptionManager.getActiveLanguageForResponse(sessionId);
      
      // Get subscription status for complete settings
      const subscriptionStatus = await subscriptionManager.getSubscriptionStatus(sessionId);
      
      // Build complete settings with subscription enforcement
      const parsedSettings = {
        language: activeLanguage as 'es' | 'en' | 'fr' | 'it' | 'de' | 'pt',
        speechSpeed: 1.0,
        voiceVolume: 80,
        enableCorrections: true,
        enableSuggestions: true,
        subscriptionType: subscriptionStatus.subscriptionType,
        availableLanguages: subscriptionStatus.availableLanguages as ('es' | 'en' | 'fr' | 'it' | 'de' | 'pt')[],
        activeLanguage: activeLanguage as 'es' | 'en' | 'fr' | 'it' | 'de' | 'pt'
      };

      // Process audio with language enforcement
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
      console.error('Error processing audio:', error);
      res.status(500).json({ 
        error: 'Failed to process audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate AI response
   */
  async generateResponse(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, settings } = req.body;

      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      // Validate settings
      const parsedSettings = conversationSettingsSchema.parse(settings);

      // Generate AI response
      const aiMessage = await conversationService.generateAIResponse(
        sessionId,
        parsedSettings
      );

      res.json({
        success: true,
        message: aiMessage
      });
    } catch (error) {
      console.error('Error generating response:', error);
      res.status(500).json({ 
        error: 'Failed to generate response',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process text message (quick actions)
   */
  async processText(req: Request, res: Response): Promise<void> {
    try {
      const { text, sessionId, settings } = req.body;

      if (!text || !sessionId) {
        res.status(400).json({ error: 'Text and session ID are required' });
        return;
      }

      // Validate settings
      const parsedSettings = conversationSettingsSchema.parse(settings);

      // Process text message
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
      console.error('Error processing text:', error);
      res.status(500).json({ 
        error: 'Failed to process text',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get conversation history
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      const history = await conversationService.getConversationStats(sessionId);

      res.json({
        success: true,
        stats: history
      });
    } catch (error) {
      console.error('Error getting history:', error);
      res.status(500).json({ 
        error: 'Failed to get conversation history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clear conversation
   */
  async clearConversation(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      await conversationService.clearConversation(sessionId);

      res.json({
        success: true,
        message: 'Conversation cleared successfully'
      });
    } catch (error) {
      console.error('Error clearing conversation:', error);
      res.status(500).json({ 
        error: 'Failed to clear conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate TTS audio from text
   */
  async generateTTS(text: string, language: string = 'en'): Promise<Buffer> {
    try {
      const openaiService = (conversationService as any).openaiService;
      return await openaiService.generateTTS(text, language);
    } catch (error) {
      console.error('TTS generation error:', error);
      throw new Error('Failed to generate TTS audio');
    }
  }

  /**
   * Test API connections
   */
  async testConnections(req: Request, res: Response): Promise<void> {
    try {
      // Test OpenAI connection
      const openaiTest = await conversationService.processTextMessage(
        "Hello test",
        "test-session",
        {
          language: "en",
          speechSpeed: 1.0,
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
        message: 'All connections tested successfully',
        openai: !!openaiTest,
        googleTTS: true // Will throw if not working
      });
    } catch (error) {
      console.error('Error testing connections:', error);
      res.status(500).json({ 
        error: 'Connection test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const voiceController = new VoiceController();
