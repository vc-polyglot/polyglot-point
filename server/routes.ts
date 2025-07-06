import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { voiceController } from "./controllers/voiceController.js";
import { conversationService } from "./services/conversation.js";
import { conversationSettingsSchema, voiceMessageSchema } from "@shared/schema.js";
import { storage } from "./storage.js";
import { languageManager } from "./services/languageManager.js";
import { subscriptionManager } from "./services/subscriptionManager.js";
import subscriptionRoutes from "./subscriptionRoutes.js";
import OpenAI from "openai";

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Privacy Policy route
  app.get("/privacy-policy", (req, res) => {
    const privacyPolicyPath = path.join(process.cwd(), 'public', 'privacy-policy.html');
    if (fs.existsSync(privacyPolicyPath)) {
      res.sendFile(privacyPolicyPath);
    } else {
      res.status(404).send('Privacy Policy not found');
    }
  });

  // Voice API Routes
  app.post("/api/voice/upload", upload.single('audio'), voiceController.processAudio.bind(voiceController));
  app.post("/api/voice/generate", voiceController.generateResponse.bind(voiceController));
  app.post("/api/voice/text", voiceController.processText.bind(voiceController));
  app.get("/api/voice/history/:sessionId", voiceController.getHistory.bind(voiceController));
  app.post("/api/voice/clear", voiceController.clearConversation.bind(voiceController));
  
  // Simple text conversation endpoint for conversation-simple page
  app.post("/api/conversation", async (req, res) => {
    try {
      const { sessionId, message, settings } = req.body;
      
      if (!message || !settings) {
        return res.status(400).json({ error: "Message and settings are required" });
      }

      const fullSettings = {
        ...settings,
        subscriptionType: settings.subscriptionType || 'freemium',
        availableLanguages: settings.availableLanguages || [settings.language],
        activeLanguage: settings.activeLanguage || settings.language
      };

      const result = await conversationService.processTextMessage(
        message,
        sessionId || `session_${Date.now()}`,
        fullSettings
      );
      
      res.json(result);
      
    } catch (error: any) {
      console.error("Conversation error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // TTS on-demand endpoint for PLAY buttons
  app.post("/api/tts/generate", async (req, res) => {
    try {
      const { text, language } = req.body;
      
      if (!text || !language) {
        return res.status(400).json({ error: "Text and language are required" });
      }

      const { googleTTSService } = await import("./services/googleTTS.js");
      const sessionId = `tts_${Date.now()}`;
      const result = await googleTTSService.synthesizeSpeech(text, language, sessionId);
      
      // Return audio as base64 for easy frontend consumption
      const audioBase64 = result.buffer.toString('base64');
      
      res.json({ 
        success: true, 
        audio: audioBase64,
        mimeType: 'audio/mpeg'
      });
      
    } catch (error: any) {
      console.error("TTS generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/api/voice/test", voiceController.testConnections.bind(voiceController));

  // Subscription and language management routes
  app.use("/api/subscription", subscriptionRoutes);

  // TTS endpoint for generating audio from text
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, language } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const audioBuffer = await voiceController.generateTTS(text, language || 'en');
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.send(audioBuffer);
    } catch (error) {
      console.error('TTS Error:', error);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });



  // CRITICAL: Language Change Endpoint - Centralized synchronization
  app.post("/api/language/change", async (req, res) => {
    try {
      console.log(`🚨 LANGUAGE CHANGE API CALLED:`, req.body);
      
      const { language, sessionId } = req.body;
      
      if (!language || !sessionId) {
        console.error(`❌ MISSING PARAMETERS: language=${language}, sessionId=${sessionId}`);
        return res.status(400).json({ error: "Language and sessionId are required" });
      }

      console.log(`🔄 LANGUAGE CHANGE REQUEST: ${language} for session ${sessionId}`);
      
      // Block if language change already in progress
      if (languageManager.isLanguageChanging()) {
        return res.status(429).json({ 
          error: "Language change in progress", 
          message: "Please wait for current language change to complete" 
        });
      }

      const result = await languageManager.changeLanguage(language, sessionId);
      
      if (result.success) {
        console.log(`✅ LANGUAGE CHANGE SUCCESSFUL: ${result.oldLanguage} → ${result.newLanguage}`);
        res.json(result);
      } else {
        console.error(`❌ LANGUAGE CHANGE FAILED: ${result.errors.join(', ')}`);
        res.status(500).json(result);
      }
    } catch (error: any) {
      console.error(`💥 LANGUAGE CHANGE EXCEPTION: ${error.message}`);
      res.status(500).json({ 
        error: "Language change failed", 
        message: error.message 
      });
    }
  });

  // Serve audio files
  app.use("/api/audio", (req, res, next) => {
    // Add CORS headers for audio files
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  // Audio file serving endpoint
  app.get("/api/audio/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const filepath = path.join(process.cwd(), 'audio', filename);
      
      console.log('Attempting to serve audio file:', filepath);
      
      if (!fs.existsSync(filepath)) {
        console.error('Audio file not found:', filepath);
        res.status(404).json({ error: 'Audio file not found' });
        return;
      }

      const stat = fs.statSync(filepath);
      console.log('Audio file found, size:', stat.size);

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Accept-Ranges', 'bytes');
      
      const audioStream = fs.createReadStream(filepath);
      audioStream.pipe(res);
    } catch (error) {
      console.error('Error serving audio file:', error);
      res.status(500).json({ error: 'Failed to serve audio file' });
    }
  });

  // WebSocket Server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  interface ExtendedWebSocket extends WebSocket {
    sessionId?: string;
    isAlive?: boolean;
    inactivityTimer?: NodeJS.Timeout;
    warningTimer?: NodeJS.Timeout;
  }

  // Session timeout management
  const SESSION_WARNING_TIME = 10 * 60 * 1000; // 10 minutes
  const SESSION_TIMEOUT_TIME = 15 * 60 * 1000; // 15 minutes
  
  function resetInactivityTimers(ws: ExtendedWebSocket) {
    // Clear existing timers
    if (ws.warningTimer) {
      clearTimeout(ws.warningTimer);
    }
    if (ws.inactivityTimer) {
      clearTimeout(ws.inactivityTimer);
    }
    
    // Set warning timer (10 minutes)
    ws.warningTimer = setTimeout(async () => {
      if (ws.readyState === WebSocket.OPEN && ws.sessionId) {
        try {
          const hasWarning = await storage.hasInactivityWarning(ws.sessionId);
          if (!hasWarning) {
            await storage.setInactivityWarning(ws.sessionId);
            
            // Send warning message in user's preferred language
            const settings = await storage.getSessionSettings(ws.sessionId);
            const language = settings?.language || 'es';
            
            const warningMessages = {
              es: "¿Estás ahí? Tu sesión se cerrará en 5 minutos por inactividad.",
              en: "Are you there? Your session will close in 5 minutes due to inactivity.",
              fr: "Tu es là ? Ta session se fermera dans 5 minutes par inactivité.",
              it: "Ci sei? La tua sessione si chiuderà tra 5 minuti per inattività.",
              de: "Bist du da? Deine Sitzung wird in 5 Minuten wegen Inaktivität geschlossen.",
              pt: "Estás aí? Tua sessão será fechada em 5 minutos por inatividade."
            };
            
            ws.send(JSON.stringify({
              type: 'message',
              data: {
                id: `warning_${Date.now()}`,
                type: 'ai',
                content: warningMessages[language] || warningMessages.es,
                timestamp: new Date().toISOString()
              }
            }));
          }
        } catch (error) {
          console.error('Error sending inactivity warning:', error);
        }
      }
    }, SESSION_WARNING_TIME);
    
    // Set timeout timer (15 minutes)
    ws.inactivityTimer = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log(`Session ${ws.sessionId} timed out due to inactivity`);
        ws.close(1000, 'Session timeout due to inactivity');
      }
    }, SESSION_TIMEOUT_TIME);
  }

  wss.on('connection', async (ws: ExtendedWebSocket, req) => {
    console.log('New WebSocket connection established');
    
    ws.isAlive = true;

    // Send connection confirmation and wait for client to send sessionId
    ws.send(JSON.stringify({ 
      type: 'connection',
      message: 'WebSocket connected'
    }));
    
    // Handle pong responses
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const parsedMessage = voiceMessageSchema.parse(message);
        
        // Update activity tracker for any message and reset inactivity timers
        if (ws.sessionId) {
          await storage.updateLastActivity(ws.sessionId);
          resetInactivityTimers(ws);
        }
        
        // Set session ID for this connection and restore language preferences
        if (!ws.sessionId) {
          ws.sessionId = parsedMessage.sessionId;
          
          // CRITICAL: Synchronize language manager with session's saved language
          await languageManager.initializeFromSession(ws.sessionId);
          
          // Clear any previous repetition history for this session to prevent false positives
          conversationService.clearRepetitionHistory(ws.sessionId);
          
          // Try to load preferred language from user profile
          try {
            const profile = await storage.getUserProfile(ws.sessionId);
            if (profile) {
              // User has a saved language preference
              const settings = {
                language: profile.preferredLanguage as 'es' | 'en' | 'fr' | 'it' | 'de' | 'pt',
                speechSpeed: 1.0,
                voiceVolume: 80,
                enableCorrections: true,
                enableSuggestions: true,
              };
              await storage.saveSessionSettings(ws.sessionId, settings);
              
              ws.send(JSON.stringify({ 
                type: 'language_restored', 
                language: profile.preferredLanguage 
              }));
              console.log(`Language restored for session ${ws.sessionId}: ${profile.preferredLanguage}`);
            }
          } catch (error) {
            console.log('No previous language preference found for session');
          }
          
          // Start inactivity timers for new session
          resetInactivityTimers(ws);
        }

        console.log(`Received WebSocket message:`, parsedMessage.type);

        switch (parsedMessage.type) {
          case 'audio':
            await handleAudioMessage(ws, parsedMessage);
            break;
            
          case 'text':
            await handleTextMessage(ws, parsedMessage);
            break;
            
          case 'text_conversation':
            await handleTextConversation(ws, parsedMessage);
            break;
            
          case 'control':
            await handleControlMessage(ws, parsedMessage);
            break;
            
          default:
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Unknown message type'
            }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format',
          details: error.message
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      
      // Clear inactivity timers
      if (ws.warningTimer) {
        clearTimeout(ws.warningTimer);
      }
      if (ws.inactivityTimer) {
        clearTimeout(ws.inactivityTimer);
      }
      
      if (ws.sessionId) {
        conversationService.clearRepetitionHistory(ws.sessionId);
        console.log(`Repetition history cleared for session ${ws.sessionId}`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Initialize session - settings will be updated when client sends them
    console.log(`New session created: ${ws.sessionId}`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      message: 'WebSocket connection established'
    }));
  });

  // Handle audio messages via WebSocket
  async function handleAudioMessage(ws: ExtendedWebSocket, message: any) {
    try {
      // Decode base64 audio data
      const audioBuffer = Buffer.from(message.data, 'base64');
      
      // Use language from client message instead of language manager
      const requestedLanguage = message.language || 'en';
      console.log(`🚨 CRITICAL LANGUAGE CHECK: Client requested = ${requestedLanguage}`);
      
      // Update session settings with client language
      let settings = await storage.getSessionSettings(message.sessionId);
      
      const newSettings = {
        language: requestedLanguage as any,
        speechSpeed: settings?.speechSpeed || 1.0,
        voiceVolume: settings?.voiceVolume || 80,
        enableCorrections: settings?.enableCorrections || true,
        enableSuggestions: settings?.enableSuggestions || true,
      };
      await storage.saveSessionSettings(message.sessionId, newSettings);
      settings = newSettings;
      
      console.log(`🚨 CRITICAL: Using client requested language: ${requestedLanguage}`);

      // Process audio message using regular flow (not auto-detection)
      const userMessage = await conversationService.processAudioMessage(
        audioBuffer,
        message.sessionId,
        settings
      );

      // Send user message back to client
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'message',
          data: userMessage
        }));
      }

      // Set VAD timeout for AI response with critical timeout protection
      conversationService.setVADTimeout(message.sessionId, async () => {
        const AI_RESPONSE_TIMEOUT = 25000; // 25 seconds max - enough for complex AI responses
        let timeoutHandler: NodeJS.Timeout;
        
        try {
          console.log(`🎯 AI RESPONSE GENERATION START for session ${message.sessionId}`);
          
          // Critical timeout protection
          const timeoutPromise = new Promise((_, reject) => {
            timeoutHandler = setTimeout(() => {
              reject(new Error('TIMEOUT: AI response generation exceeded 25 seconds'));
            }, AI_RESPONSE_TIMEOUT);
          });

          // Longer delay to ensure user message is saved to storage
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Race between AI generation and timeout
          const aiMessage = await Promise.race([
            conversationService.generateAIResponse(message.sessionId, settings),
            timeoutPromise
          ]);

          clearTimeout(timeoutHandler);
          console.log(`✅ AI RESPONSE GENERATION COMPLETE`);

          // Send AI response
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'message',
              data: aiMessage
            }));
          }
        } catch (error) {
          clearTimeout(timeoutHandler);
          console.error('🚨 CRITICAL ERROR in AI response generation:', error);
          
          if (ws.readyState === WebSocket.OPEN) {
            const isTimeout = error.message.includes('TIMEOUT');
            const errorMessage = isTimeout 
              ? "Sorry, I had trouble processing that. Could you try again?"
              : "I encountered an error. Please try speaking again.";
              
            // Send immediate recovery message
            ws.send(JSON.stringify({
              type: 'message',
              data: {
                id: `error_${Date.now()}`,
                type: 'ai',
                content: errorMessage,
                timestamp: new Date().toISOString(),
                audioUrl: null
              }
            }));
            
            ws.send(JSON.stringify({
              type: 'error',
              error: 'AI response generation failed',
              details: error.message,
              recoverable: true
            }));
          }
        }
      });

    } catch (error: any) {
      console.error('Error handling audio message:', error);
      
      if (ws.readyState === WebSocket.OPEN) {
        const isTimeout = error.message.includes('TIMEOUT');
        const isTranscriptionError = error.message.includes('transcribe');
        
        let errorMessage = "I encountered an error processing your audio. Please try speaking again.";
        let showTextFallback = false;
        
        if (error.message.includes('NO_SPEECH_DETECTED') || error.message.includes('SILENCE_WITH_FALSE_CONTENT')) {
          // Use language from client message for error response
          const sessionLanguage = message.language || 'en';
          const noSpeechMessages = {
            'es': "¿Estás ahí? No escuché nada, ¿quieres intentarlo de nuevo?",
            'en': "Are you there? I didn't hear anything, would you like to try again?",
            'fr': "Êtes-vous là? Je n'ai rien entendu, voulez-vous réessayer?",
            'it': "Ci sei? Non ho sentito nulla, vuoi riprovare?",
            'de': "Bist du da? Ich habe nichts gehört, möchtest du es nochmal versuchen?",
            'pt': "Você está aí? Não ouvi nada, quer tentar novamente?"
          };
          errorMessage = noSpeechMessages[sessionLanguage as keyof typeof noSpeechMessages] || noSpeechMessages['en'];
          showTextFallback = false;
        } else if (isTimeout) {
          errorMessage = "Audio processing is taking too long. You can try speaking shorter, or use the text input below as an alternative.";
          showTextFallback = true;
        } else if (isTranscriptionError) {
          errorMessage = "I had trouble understanding the audio. You can try speaking again, or use text input instead.";
          showTextFallback = true;
        }
        
        // Send immediate recovery message
        ws.send(JSON.stringify({
          type: 'message',
          data: {
            id: `error_${Date.now()}`,
            type: 'ai',
            content: errorMessage,
            timestamp: new Date().toISOString(),
            audioUrl: null
          }
        }));
        
        // Don't send separate error message for NO_SPEECH_DETECTED since we already sent the user-friendly message
        if (!error.message.includes('NO_SPEECH_DETECTED') && !error.message.includes('SILENCE_WITH_FALSE_CONTENT')) {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Audio processing failed',
            details: error.message,
            recoverable: true,
            showTextFallback: showTextFallback
          }));
        }
      }
    }
  }

  // Handle text messages via WebSocket
  async function handleTextMessage(ws: ExtendedWebSocket, message: any) {
    try {
      // CRITICAL: Always respect explicit language selection from UI
      let settings = await storage.getSessionSettings(message.sessionId);
      
      // If user explicitly set language via UI, ALWAYS use that language
      if (message.language && message.language !== settings?.language) {
        console.log(`User explicitly selected language: ${message.language}, updating settings`);
        settings = {
          language: message.language,
          speechSpeed: settings?.speechSpeed || 1.0,
          voiceVolume: settings?.voiceVolume || 80,
          enableCorrections: settings?.enableCorrections || true,
          enableSuggestions: settings?.enableSuggestions || true,
        };
        await storage.saveSessionSettings(message.sessionId, settings);
        console.log(`Language settings updated to respect user selection: ${message.language}`);
      }
      
      if (!settings) {
        console.log(`No settings found, using default language for session ${message.sessionId}`);
        settings = {
          language: message.language || 'en',
          speechSpeed: 1.0,
          voiceVolume: 80,
          enableCorrections: true,
          enableSuggestions: true,
        };
        await storage.saveSessionSettings(message.sessionId, settings);
        console.log(`Default settings saved with language: ${settings.language}`);
      }

      // Process text message with critical timeout protection
      const TEXT_PROCESSING_TIMEOUT = 25000; // 25 seconds max - enough for complex AI responses
      let timeoutHandler: NodeJS.Timeout;
      
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandler = setTimeout(() => {
          reject(new Error('TIMEOUT: Text processing exceeded 25 seconds'));
        }, TEXT_PROCESSING_TIMEOUT);
      });

      console.log(`🎯 TEXT PROCESSING START for session ${message.sessionId}`);
      
      // Race between processing and timeout
      const result = await Promise.race([
        conversationService.processTextMessage(message.data, message.sessionId, settings),
        timeoutPromise
      ]);

      clearTimeout(timeoutHandler);
      console.log(`✅ TEXT PROCESSING COMPLETE`);

      // Send both messages back to client
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'message',
          data: result.userMessage
        }));

        ws.send(JSON.stringify({
          type: 'message',
          data: result.aiMessage
        }));
      }

    } catch (error) {
      clearTimeout(timeoutHandler);
      console.error('🚨 CRITICAL ERROR in text processing:', error);
      
      if (ws.readyState === WebSocket.OPEN) {
        const isTimeout = error.message.includes('TIMEOUT');
        const errorMessage = isTimeout 
          ? "Sorry, I had trouble processing that. Could you try again?"
          : "I encountered an error processing your message. Please try again.";
          
        // Send immediate recovery message
        ws.send(JSON.stringify({
          type: 'message',
          data: {
            id: `error_${Date.now()}`,
            type: 'ai',
            content: errorMessage,
            timestamp: new Date().toISOString(),
            audioUrl: null
          }
        }));
        
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Text processing failed',
          details: error.message,
          recoverable: true
        }));
      }
    }
  }

  // Handle text conversation messages via WebSocket
  async function handleTextConversation(ws: ExtendedWebSocket, message: any) {
    try {
      const { text, settings } = message.data;
      
      if (!text || !ws.sessionId) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Text and session ID are required'
        }));
        return;
      }

      // Initialize user profile and get subscription status
      await subscriptionManager.initializeUserProfile(ws.sessionId);
      const activeLanguage = await subscriptionManager.getActiveLanguageForResponse(ws.sessionId);
      const subscriptionStatus = await subscriptionManager.getSubscriptionStatus(ws.sessionId);
      
      // Build complete settings with subscription enforcement
      const completeSettings = {
        language: settings?.language || activeLanguage,
        speechSpeed: settings?.speechSpeed || 1.0,
        voiceVolume: settings?.voiceVolume || 80,
        enableCorrections: settings?.enableCorrections || true,
        enableSuggestions: settings?.enableSuggestions || true,
        subscriptionType: subscriptionStatus.subscriptionType,
        availableLanguages: subscriptionStatus.availableLanguages,
        activeLanguage: activeLanguage
      };

      // Process text message
      const result = await conversationService.processTextMessage(
        text,
        ws.sessionId,
        completeSettings
      );

      // Send user message
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'message',
          data: {
            id: result.userMessage.id,
            sender: 'user',
            content: result.userMessage.content,
            timestamp: result.userMessage.timestamp.toISOString(),
            isError: false
          }
        }));

        // Send AI response
        ws.send(JSON.stringify({
          type: 'message',
          data: {
            id: result.aiMessage.id,
            sender: 'assistant',
            content: result.aiMessage.content,
            timestamp: result.aiMessage.timestamp.toISOString(),
            isError: false
          }
        }));
      }
    } catch (error: any) {
      console.error('Error handling text conversation:', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process text message',
          details: error.message
        }));
      }
    }
  }

  // Handle control messages via WebSocket
  async function handleControlMessage(ws: ExtendedWebSocket, message: any) {
    try {
      const controlData = JSON.parse(message.data);
      console.log(`Control message received:`, controlData);

      switch (controlData.action) {
        case 'clear_conversation':
          await conversationService.clearConversation(message.sessionId);
          ws.send(JSON.stringify({
            type: 'control',
            action: 'conversation_cleared'
          }));
          break;

        case 'update_settings':
          console.log(`Updating settings for session ${message.sessionId}:`, controlData.settings);
          const settings = conversationSettingsSchema.parse(controlData.settings);
          await storage.saveSessionSettings(message.sessionId, settings);
          console.log(`Settings saved successfully:`, settings);
          
          // Save language preference to user profile
          try {
            await storage.saveUserProfile({
              sessionId: message.sessionId,
              preferredLanguage: settings.language,
            });
            console.log(`User profile saved with language: ${settings.language}`);
          } catch (error) {
            console.log('Error saving user profile:', error);
          }
          
          ws.send(JSON.stringify({
            type: 'control',
            action: 'settings_updated'
          }));
          break;

        case 'get_stats':
          const stats = await conversationService.getConversationStats(message.sessionId);
          ws.send(JSON.stringify({
            type: 'stats',
            data: stats
          }));
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Unknown control action'
          }));
      }
    } catch (error) {
      console.error('Error handling control message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process control message',
        details: error.message
      }));
    }
  }

  // Heartbeat to keep connections alive
  const interval = setInterval(() => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('Voice conversation routes and WebSocket server initialized');
  return httpServer;
}
