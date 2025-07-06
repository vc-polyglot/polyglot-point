import { openaiService } from './openai.js';
import { googleTTSService } from './googleTTS.js';
import { pronunciationAnalyzer } from './pronunciationAnalyzer.js';
import { languageEnforcer } from './languageEnforcer.js';
import { subscriptionManager } from './subscriptionManager.js';
import type { ConversationSettings } from '@shared/schema.js';
import { storage } from '../storage.js';

export interface ProcessedMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  audioUrl?: string;
  timestamp: Date;
  corrections?: string[];
  suggestions?: string[];
  pronunciationFeedback?: string | null;
  repetitionType?: 'error' | 'playful' | 'memorization' | 'practice';
}

export class ConversationService {
  private vadTimeout = 1200; // 1.2 seconds VAD timeout
  private activeTimeouts = new Map<string, NodeJS.Timeout>();
  private recentCorrections = new Map<string, { word: string; count: number; lastCorrection: string }>();
  private recentUserInputs = new Map<string, string[]>(); // Store last 3 user inputs per session
  private usedResponsePatterns = new Map<string, Set<string>>(); // Track used response patterns per session
  private pendingCorrections = new Map<string, { originalText: string; correctedText: string; timestamp: Date }>(); // Track corrections awaiting practice
  
  // Dynamic Memory System - 30 turns with automatic summaries
  private conversationHistory = new Map<string, Array<{role: 'user' | 'assistant', content: string, timestamp: Date}>>(); // Store last 30 turns
  private conversationSummaries = new Map<string, string>(); // Store accumulated summaries

  /**
   * Check if input appears to be a poor quality transcription
   */
  private isPoorQualityTranscription(text: string): boolean {
    const trimmedText = text.trim();
    
    // Common valid greetings and words that should NOT be flagged as poor quality
    const validCommonWords = [
      'hi', 'hello', 'hey', 'good', 'morning', 'afternoon', 'evening', 'night',
      'hola', 'buenos', 'buenas', 'dias', 'tardes', 'noches',
      'bonjour', 'bonsoir', 'salut',
      'ciao', 'buongiorno', 'buonasera',
      'hallo', 'guten', 'tag', 'abend',
      'ola', 'bom', 'dia', 'tarde', 'noite',
      'yes', 'no', 'si', 'oui', 'non', 'ja', 'nein', 'sim', 'nao',
      'thanks', 'thank', 'you', 'gracias', 'merci', 'grazie', 'danke', 'obrigado'
    ];
    
    // Check if it's a valid common word (case insensitive)
    if (validCommonWords.some(word => trimmedText.toLowerCase() === word.toLowerCase())) {
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
    
    return poorQualityPatterns.some(pattern => pattern.test(trimmedText));
  }

  /**
   * Enhanced repetition detection that considers transcription quality
   */
  private detectRepetition(sessionId: string, currentInput: string): { isRepetition: boolean; type?: 'error' | 'playful' | 'memorization' | 'practice' } {
    // Skip repetition detection for poor quality transcriptions
    const isPoorTranscription = this.isPoorQualityTranscription(currentInput);
    if (isPoorTranscription) {
      console.log(`🚫 Skipping repetition detection for poor quality transcription: "${currentInput}"`);
      return { isRepetition: false };
    }

    // First check if this matches a pending correction (practice)
    const pendingCorrection = this.pendingCorrections.get(sessionId);
    if (pendingCorrection) {
      const similarity = this.calculateSimilarity(currentInput, pendingCorrection.correctedText);
      if (similarity > 0.8) { // 80% similarity threshold
        console.log(`Practice detected: User attempting to repeat correction "${pendingCorrection.correctedText}"`);
        return { isRepetition: true, type: 'practice' };
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

    // Classify repetition type based on content
    const normalizedInput = this.normalizeText(currentInput);
    
    // Playful/affectionate repetitions
    if (normalizedInput.includes('amore') || normalizedInput.includes('caro') || 
        normalizedInput.includes('tesoro') || normalizedInput.includes('bello')) {
      return { isRepetition: true, type: 'playful' };
    }

    // Learning/memorization repetitions (short phrases, common expressions)
    if (normalizedInput.length < 50 || this.isCommonPhrase(normalizedInput)) {
      return { isRepetition: true, type: 'memorization' };
    }

    // Default to error/technical repetition
    return { isRepetition: true, type: 'error' };
  }

  /**
   * Normalize text for comparison (remove punctuation, extra spaces, case)
   */
  private normalizeText(text: string): string {
    return text.toLowerCase()
      .replace(/[.,!?;:'"]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if phrase is a common learning expression
   */
  private isCommonPhrase(text: string): boolean {
    const commonPhrases = [
      'ciao', 'grazie', 'prego', 'scusi', 'come stai', 'buongiorno', 'buonasera',
      'mi chiamo', 'dove', 'quando', 'perche', 'quanto costa', 'non capisco'
    ];
    return commonPhrases.some(phrase => text.includes(phrase));
  }

  /**
   * Calculate similarity between two texts for practice detection
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const normalized1 = this.normalizeText(text1);
    const normalized2 = this.normalizeText(text2);
    
    if (normalized1 === normalized2) return 1.0;
    
    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    
    if (maxLength === 0) return 1.0;
    
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Update recent user inputs history
   */
  private updateUserInputHistory(sessionId: string, input: string): void {
    if (!this.recentUserInputs.has(sessionId)) {
      this.recentUserInputs.set(sessionId, []);
    }
    
    const inputs = this.recentUserInputs.get(sessionId)!;
    inputs.push(input);
    
    // Keep only last 3 inputs
    if (inputs.length > 3) {
      inputs.shift();
    }
  }

  /**
   * Get natural Clara message for low-quality input
   */
  private getNaturalQualityMessage(language: string): string {
    const messages = {
      es: "¿Seguimos conversando en español? Intenta una frase más clara y te acompaño.",
      en: "Shall we continue in English? Try a clearer phrase and I'll help you.",
      fr: "Continuons en français? Essayez une phrase plus claire et je vous accompagne.",
      it: "Continuiamo in italiano? Prova una frase più chiara e ti accompagno.",
      de: "Sprechen wir weiter auf Deutsch? Versuchen Sie einen klareren Satz und ich helfe Ihnen.",
      pt: "Vamos continuar em português? Tente uma frase mais clara e eu te acompanho."
    };
    
    return messages[language as keyof typeof messages] || messages.es;
  }

  /**
   * Get varied response for repetitions based on type
   */
  private getRepetitionResponse(sessionId: string, type: 'error' | 'playful' | 'memorization' | 'practice', language: string): string {
    const usedPatterns = this.usedResponsePatterns.get(sessionId) || new Set();
    
    const responses = {
      error: [
        "Hai detto di nuovo la stessa frase — va tutto bene! Vuoi provare con una variazione?",
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
        "¡Perfecto! ¿Tocas la guitarra eléctrica?",
        "¡Excelente! ¿Has usado alguna vez un cable de guitarra?",
        "¡Muy bien! ¿Qué tipo de música te gusta tocar?",
        "¡Perfecto! ¿Cuánto tiempo llevas aprendiendo guitarra?",
        "¡Bien hecho! ¿Prefieres guitarras acústicas o eléctricas?",
        // French follow-ups
        "Parfait! Tu joues de la guitare électrique?",
        "Excellent! As-tu déjà utilisé un câble de guitarre?",
        "Très bien! Quel type de musique aimes-tu jouer?",
        "Parfait! Depuis combien de temps apprends-tu la guitare?",
        "Bien joué! Tu préfères les guitares acoustiques ou électriques?",
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
        "Perfeito! Tocas guitarra elétrica?",
        "Excelente! Já usaste alguma vez um cabo de guitarra?",
        "Muito bem! Que tipo de música gostas de tocar?",
        "Perfeito! Há quanto tempo andas a aprender guitarra?",
        "Bem feito! Preferes guitarras acústicas ou elétricas?"
      ]
    };

    // Get available responses (not used yet)
    const typeResponses = responses[type] || responses.error; // Fallback to error responses
    const availableResponses = typeResponses.filter((response: string) => !usedPatterns.has(response));
    
    // If all responses used, reset and use first one
    if (availableResponses.length === 0) {
      usedPatterns.clear();
      return typeResponses[0];
    }

    // Pick random available response
    const chosen = availableResponses[Math.floor(Math.random() * availableResponses.length)];
    usedPatterns.add(chosen);
    this.usedResponsePatterns.set(sessionId, usedPatterns);
    
    return chosen;
  }

  /**
   * Process incoming audio message
   */
  async processAudioMessage(
    audioBuffer: Buffer,
    sessionId: string,
    settings: ConversationSettings
  ): Promise<ProcessedMessage> {
    try {
      // Voice Activity Detection - Check for actual voice content
      const audioSizeKB = audioBuffer.length / 1024;
      console.log(`🎙️ Processing audio: ${audioSizeKB.toFixed(1)}KB`);
      
      // Minimum viable audio size check (prevent tiny accidental recordings)
      if (audioBuffer.length < 1000) {
        throw new Error('EMPTY_AUDIO');
      }

      // Step 1: Transcribe audio using Whisper with forced target language
      // CRITICAL: Pass target language to prevent auto-translation
      console.log(`Transcribing audio for session ${sessionId} with target language: ${settings.language}`);
      const transcription = await openaiService.transcribeAudio(audioBuffer, sessionId, settings.language);
      
      // Enhanced Voice Activity Detection
      // CRITICAL: Preserve original transcription text WITHOUT any normalization or cleaning
      const originalTranscribedText = transcription; // transcription is already a string from openaiService
      
      if (!originalTranscribedText) {
        throw new Error('NO_SPEECH_DETECTED');
      }
      
      // Only check for very short transcriptions (likely silence/noise) - minimal filtering
      if (originalTranscribedText.length < 2) {
        throw new Error('NO_SPEECH_DETECTED');
      }
      
      // Minimal noise detection - only for pure silence/noise, NOT for user errors
      const pureNoisePatterns = [
        /^\.+$/, // Only dots
        /^,+$/, // Only commas
        /^\s+$/ // Only whitespace
      ];
      
      const isPureNoise = pureNoisePatterns.some(pattern => pattern.test(originalTranscribedText));
      if (isPureNoise) {
        throw new Error('NO_SPEECH_DETECTED');
      }

      console.log(`🔒 ORIGINAL TRANSCRIPTION PRESERVED: "${originalTranscribedText}"`);
      console.log(`📝 Length: ${originalTranscribedText.length} characters`);
      console.log(`🚫 NO NORMALIZATION OR CLEANING APPLIED`);
      
      // Filter out common subtitle/watermark text that might be picked up from background audio
      const suspiciousPatterns = [
        /sous-titres.*amara/i,
        /subtitles.*by/i,
        /captions.*by/i,
        /transcribed.*by/i,
        /powered.*by/i,
        /copyright/i,
        /all rights reserved/i
      ];

      const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(originalTranscribedText));
      if (isSuspicious) {
        throw new Error("Background audio detected - please speak clearly into the microphone");
      }

      // Step 2: Disable automatic pronunciation feedback to prevent conflicts with memory system
      let pronunciationFeedback = null;

      // Step 3: Check for repetition BEFORE updating history
      const repetitionCheck = this.detectRepetition(sessionId, originalTranscribedText);

      // Step 4: Save user message and update history AFTER checking repetition
      const userMessage: ProcessedMessage = {
        id: `msg_${Date.now()}_user`,
        type: 'user',
        content: originalTranscribedText,
        timestamp: new Date(),
        pronunciationFeedback, // Add pronunciation feedback if any
      };

      await storage.saveMessage(sessionId, userMessage);
      this.updateUserInputHistory(sessionId, originalTranscribedText);

      console.log(`User message saved (RAW transcription): "${originalTranscribedText}"`);
      console.log(`Repetition check result: isRepetition=${repetitionCheck.isRepetition}, type=${repetitionCheck.type}`);
      
      // Step 6: If repetition detected, store the type for AI response generation
      if (repetitionCheck.isRepetition) {
        userMessage.repetitionType = repetitionCheck.type;
      }

      // Step 7: Store quality context for AI response generation
      // Quality context removed for simplified processing
      
      return userMessage;
    } catch (error: any) {
      console.error("Error processing audio message:", error);
      
      // Handle Voice Activity Detection errors with specific messages
      if (error.message === 'EMPTY_AUDIO') {
        throw new Error('NO_SPEECH_DETECTED');
      }
      
      if (error.message === 'NO_SPEECH_DETECTED') {
        throw new Error('NO_SPEECH_DETECTED');
      }
      
      throw new Error(`Failed to process audio: ${error.message}`);
    }
  }

  /**
   * Generate AI response
   */
  async generateAIResponse(
    sessionId: string,
    settings: ConversationSettings
  ): Promise<ProcessedMessage> {
    try {
      // CRITICAL: Use the session's language setting directly to avoid desync
      const currentLanguage = settings.language;
      console.log(`🔧 USING SESSION LANGUAGE DIRECTLY: ${currentLanguage} (bypassing potentially stale language manager)`);
      
      // Get conversation history and manage dynamic memory (30 turns max)
      let history = await storage.getConversationHistory(sessionId);
      
      // Update dynamic memory system
      await this.updateDynamicMemory(sessionId, history);
      
      // Get enhanced history with summary context
      const enhancedHistory = await this.getEnhancedConversationHistory(sessionId);
      
      console.log(`📝 DYNAMIC MEMORY: ${enhancedHistory.length} recent messages + summary context`);
      
      let lastUserMessage = history[history.length - 1];

      // Retry mechanism to ensure user message is available
      let retries = 0;
      while ((!lastUserMessage || lastUserMessage.type !== 'user') && retries < 5) {
        await new Promise(resolve => setTimeout(resolve, 300));
        history = await storage.getConversationHistory(sessionId);
        lastUserMessage = history[history.length - 1];
        retries++;
        console.log(`Retry ${retries}: Looking for user message in history of ${history.length} messages`);
      }

      if (!lastUserMessage || lastUserMessage.type !== 'user') {
        throw new Error("No user message to respond to");
      }

      // Step 1: Check if this is a repetition and handle accordingly
      let responseContent = '';
      const hasRepetition = lastUserMessage.repetitionType;
      
      // Step 1.1: Handle practice sessions (when user repeats after correction)
      if (hasRepetition === 'practice') {
        const pendingCorrection = this.pendingCorrections.get(sessionId);
        if (pendingCorrection) {
          const similarity = this.calculateSimilarity(lastUserMessage.content, pendingCorrection.correctedText);
          
          if (similarity > 0.8) {
            console.log(`✅ Practice successful! User correctly repeated: "${pendingCorrection.correctedText}"`);
            // Generate contextual follow-up question based on the corrected vocabulary
            responseContent = this.generateContextualFollowUp(pendingCorrection.correctedText, settings.language);
            // Clear the pending correction as practice is complete
            this.pendingCorrections.delete(sessionId);
          } else {
            console.log(`❌ Practice needs improvement. User said: "${lastUserMessage.content}", expected: "${pendingCorrection.correctedText}"`);
            responseContent = `Let's try that again. The correct way to say it is: "${pendingCorrection.correctedText}". Can you repeat it?`;
          }
        }
      }

      if (hasRepetition) {
        // Use specialized repetition response
        responseContent = this.getRepetitionResponse(sessionId, hasRepetition, settings.language);
      } else if (this.isPoorQualityTranscription(lastUserMessage.content)) {
        // Handle poor quality transcriptions with natural Clara message  
        console.log(`🔍 POOR TRANSCRIPTION DETECTED: "${lastUserMessage.content}"`);
        console.log(`🔄 GENERATING NATURAL CLARIFICATION REQUEST`);
        responseContent = this.getNaturalClarificationMessage(settings.language);
      } else {
        // Generate normal AI response
        // Generate normal AI response using GPT-4o
        console.log(`Generating AI response for session ${sessionId}`);
        
        // Use enhanced conversation history with dynamic memory
        const conversationHistory = enhancedHistory.map((msg: ProcessedMessage) => ({
          role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content
        }));

        // Remove duplicate consecutive AI responses and detect exact repetitions
        const seenResponses = new Set<string>();
        const filteredHistory = conversationHistory.filter((msg, index, arr) => {
          if (msg.role === 'assistant') {
            const normalizedContent = this.normalizeText(msg.content);
            
            // Skip exact duplicates
            if (seenResponses.has(normalizedContent)) {
              console.log(`🚫 Filtering out duplicate AI response: "${msg.content}"`);
              return false;
            }
            seenResponses.add(normalizedContent);
            
            // Skip very similar responses
            if (index > 0) {
              const prevMsg = arr[index - 1];
              if (prevMsg.role === 'assistant') {
                const similarity = this.calculateSimilarity(msg.content, prevMsg.content);
                if (similarity > 0.7) {
                  console.log(`🚫 Filtering out similar AI response (${Math.round(similarity * 100)}% similar): "${msg.content}"`);
                  return false;
                }
              }
            }
          }
          return true;
        });

        // Check for recent corrections to avoid repetition
        const recentCorrections = this.checkRecentCorrections(sessionId, lastUserMessage.content);

        // Detect basic errors in user input
        const detectedErrors = await openaiService.detectBasicErrors(lastUserMessage.content, currentLanguage);
        console.log(`🔍 DETECTED ERRORS for correction:`, detectedErrors);

        // Get Clara's system prompt with enforced language from settings
        const claraSystemPrompt = languageEnforcer.getClaraSystemPromptForLanguage(settings.language);
        
        console.log(`Sending to Clara (RAW input): "${lastUserMessage.content}"`);
        console.log(`🚨 CRITICAL LANGUAGE CHECK: settings.language = ${settings.language}, manager.language = ${currentLanguage}`);
        console.log(`🚨 CRITICAL: Using frontend settings language directly: ${settings.language}`);
        console.log(`Conversation history sent to Clara:`, JSON.stringify(filteredHistory, null, 2));
        const aiResponse = await openaiService.generateResponse(
          lastUserMessage.content,
          settings.language,
          filteredHistory,
          settings,
          claraSystemPrompt
        );
        responseContent = aiResponse.content;

        // Check for exact response repetition and regenerate if needed
        const recentAIResponses = history
          .filter(msg => msg.type === 'ai')
          .slice(-3)
          .map(msg => this.normalizeText(msg.content));
        
        const normalizedResponse = this.normalizeText(responseContent);
        
        if (recentAIResponses.includes(normalizedResponse)) {
          console.log(`🚫 DETECTED EXACT RESPONSE REPETITION: "${responseContent}"`);
          console.log(`🔄 REGENERATING WITH ANTI-REPETITION CONTEXT...`);
          
          // Add explicit anti-repetition instruction
          const antiRepetitionPrompt = `CRITICAL: You just gave the exact same response "${responseContent}" to a different user input. This is forbidden. You must now give a completely different response that directly addresses what the user actually said: "${lastUserMessage.content}". Never repeat responses.`;
          
          const regeneratedResponse = await openaiService.generateResponse(
            lastUserMessage.content,
            currentLanguage,
            filteredHistory,
            settings,
            antiRepetitionPrompt
          );
          
          responseContent = regeneratedResponse.content;
          console.log(`✅ REGENERATED UNIQUE RESPONSE: "${responseContent}"`);
        }

        // Update correction memory
        this.updateCorrectionMemory(sessionId, lastUserMessage.content, responseContent);
        
        // CRITICAL: Detect if this response contains a correction and register it for practice
        this.detectAndRegisterCorrection(sessionId, lastUserMessage.content, responseContent);
      }

      // Step 2: Generate audio using Google TTS with correct language
      console.log(`Synthesizing speech for AI response`);
      const audioResult = await googleTTSService.synthesizeSpeech(
        responseContent,
        currentLanguage || settings.language,
        sessionId
      );

      // Step 3: Use the exact filename that was already created
      const audioUrl = audioResult.filename;

      // Step 4: Create and save AI message
      const aiMessage: ProcessedMessage = {
        id: `msg_${Date.now()}_ai`,
        type: 'ai',
        content: responseContent,
        audioUrl,
        timestamp: new Date(),
      };

      await storage.saveMessage(sessionId, aiMessage);

      console.log(`AI response generated: "${responseContent}"`);
      return aiMessage;
    } catch (error: any) {
      console.error("Error generating AI response:", error);
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }

  /**
   * Process text message (for quick actions)
   */
  async processTextMessage(
    text: string,
    sessionId: string,
    settings: ConversationSettings
  ): Promise<{ userMessage: ProcessedMessage; aiMessage: ProcessedMessage }> {
    try {
      // CRITICAL: Preserve original text input WITHOUT any normalization or cleaning
      console.log(`🔒 ORIGINAL TEXT INPUT PRESERVED: "${text}"`);
      console.log(`📝 Length: ${text.length} characters`);
      console.log(`🚫 NO AUTOCORRECTION, NORMALIZATION, OR CLEANING APPLIED`);
      
      // Save user message with exact original text
      const userMessage: ProcessedMessage = {
        id: `msg_${Date.now()}_user`,
        type: 'user',
        content: text, // NO modification - preserve exactly as typed
        timestamp: new Date(),
      };

      await storage.saveMessage(sessionId, userMessage);

      // Generate AI response
      const aiMessage = await this.generateAIResponse(sessionId, settings);

      return { userMessage, aiMessage };
    } catch (error: any) {
      console.error("Error processing text message:", error);
      throw new Error(`Failed to process text message: ${error.message}`);
    }
  }

  /**
   * Handle VAD (Voice Activity Detection) timeout
   */
  setVADTimeout(sessionId: string, callback: () => void): void {
    // Clear existing timeout
    this.clearVADTimeout(sessionId);

    // Set new timeout
    const timeout = setTimeout(callback, this.vadTimeout);
    this.activeTimeouts.set(sessionId, timeout);
  }

  /**
   * Clear VAD timeout
   */
  clearVADTimeout(sessionId: string): void {
    const timeout = this.activeTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(sessionId);
    }
  }

  /**
   * Update dynamic memory system - maintain last 30 turns with summaries
   */
  async updateDynamicMemory(sessionId: string, fullHistory: ProcessedMessage[]): Promise<void> {
    // Convert to conversation format
    const conversationTurns = fullHistory.map(msg => ({
      role: msg.type as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.timestamp
    }));

    // Store current conversation history
    this.conversationHistory.set(sessionId, conversationTurns);

    // If we have more than 30 turns, create summary and truncate
    if (conversationTurns.length > 30) {
      await this.createAndStoreSummary(sessionId, conversationTurns.slice(0, -30));
      
      // Keep only the last 30 turns
      this.conversationHistory.set(sessionId, conversationTurns.slice(-30));
    }
  }

  /**
   * Create automatic summary of conversation history
   */
  private async createAndStoreSummary(sessionId: string, oldTurns: Array<{role: 'user' | 'assistant', content: string, timestamp: Date}>): Promise<void> {
    try {
      const conversationText = oldTurns.map(turn => `${turn.role}: ${turn.content}`).join('\n');
      
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
        'en', // Always summarize in English for consistency
        [],
        { enableCorrections: false, enableSuggestions: false }
      );

      // Append to existing summary
      const existingSummary = this.conversationSummaries.get(sessionId) || '';
      const newSummary = existingSummary + '\n\n' + response.content;
      
      this.conversationSummaries.set(sessionId, newSummary);
      console.log(`📝 Created conversation summary for session ${sessionId}`);
      
    } catch (error) {
      console.error('Error creating conversation summary:', error);
    }
  }

  /**
   * Get enhanced conversation history with summary context
   */
  async getEnhancedConversationHistory(sessionId: string): Promise<ProcessedMessage[]> {
    const recentHistory = this.conversationHistory.get(sessionId) || [];
    const summary = this.conversationSummaries.get(sessionId);

    // Convert back to ProcessedMessage format
    let enhancedHistory = recentHistory.map((turn, index) => ({
      id: `enhanced_${sessionId}_${index}`,
      type: turn.role === 'user' ? 'user' as const : 'ai' as const,
      content: turn.content,
      timestamp: turn.timestamp
    }));

    // If we have a summary, add it as context at the beginning
    if (summary) {
      const summaryMessage: ProcessedMessage = {
        id: `summary_${sessionId}`,
        type: 'ai',
        content: `[Previous conversation summary: ${summary}]`,
        timestamp: new Date(Date.now() - 1000000) // Older timestamp
      };
      enhancedHistory = [summaryMessage, ...enhancedHistory];
    }

    return enhancedHistory;
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(sessionId: string): Promise<{
    messageCount: number;
    sessionDuration: number;
    voiceQuality: string;
  }> {
    try {
      const history = await storage.getConversationHistory(sessionId);
      const sessionStart = await storage.getSessionStartTime(sessionId);
      
      const messageCount = history.length;
      const sessionDuration = Date.now() - sessionStart.getTime();
      
      // Analyze conversation quality
      const userMessages = history
        .filter(msg => msg.type === 'user')
        .map(msg => msg.content);
      
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
        sessionDuration: Math.floor(sessionDuration / 1000), // in seconds
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
  private checkRecentCorrections(sessionId: string, userMessage: string): { word: string; count: number; lastCorrection: string } | undefined {
    const correctionKey = `${sessionId}_correction`;
    const correction = this.recentCorrections.get(correctionKey);
    
    if (!correction) return undefined;
    
    // Check if user is still making the same mistake
    const userWords = userMessage.toLowerCase().split(/\s+/);
    if (userWords.includes(correction.word.toLowerCase())) {
      return correction;
    }
    
    // Clean up old correction if user moved on
    this.recentCorrections.delete(correctionKey);
    return undefined;
  }

  /**
   * Update correction memory when a correction is made
   */
  private updateCorrectionMemory(sessionId: string, userMessage: string, botResponse: string): void {
    const correctionKey = `${sessionId}_correction`;
    
    // Check if bot response contains a correction pattern (multilingual)
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
    
    // Also check for simple repetitive patterns (like the current issue)
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
        const correctedWord = match[1] || match[2]; // Take the corrected word
        const existing = this.recentCorrections.get(correctionKey);
        
        if (existing && existing.word === correctedWord) {
          // Same word being corrected again
          existing.count++;
          existing.lastCorrection = botResponse;
          console.log(`Repeated correction for "${correctedWord}", count: ${existing.count}`);
        } else {
          // New correction
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
    
    // Clean up old corrections after 5 minutes
    setTimeout(() => {
      this.recentCorrections.delete(correctionKey);
    }, 5 * 60 * 1000);
  }

  /**
   * Generate contextual follow-up question after successful practice
   */
  generateContextualFollowUp(correctedText: string, language: string): string {
    // Extract key vocabulary from the corrected text
    const words = correctedText.toLowerCase().split(/\s+/);
    
    // Check for common vocabulary keywords and generate relevant questions
    for (const word of words) {
      if (word.includes('guitar') || word.includes('guitarra') || word.includes('guitare') || word.includes('chitarra') || word.includes('gitarre')) {
        switch (language) {
          case 'es': return "¡Perfecto! ¿Tocas la guitarra?";
          case 'fr': return "Parfait! Tu joues de la guitare?";
          case 'it': return "Perfetto! Suoni la chitarra?";
          case 'de': return "Perfekt! Spielst du Gitarre?";
          case 'pt': return "Perfeito! Tocas guitarra?";
          default: return "Perfect! Do you play guitar?";
        }
      }
      
      if (word.includes('music') || word.includes('música') || word.includes('musique') || word.includes('musica') || word.includes('musik')) {
        switch (language) {
          case 'es': return "¡Excelente! ¿Qué tipo de música te gusta?";
          case 'fr': return "Excellent! Quel type de musique aimes-tu?";
          case 'it': return "Eccellente! Che tipo di musica ti piace?";
          case 'de': return "Ausgezeichnet! Was für Musik hörst du gern?";
          case 'pt': return "Excelente! Que tipo de música gostas?";
          default: return "Great! What type of music do you like?";
        }
      }
      
      if (word.includes('book') || word.includes('libro') || word.includes('livre') || word.includes('buch')) {
        switch (language) {
          case 'es': return "¡Muy bien! ¿Qué tipo de libros te gustan?";
          case 'fr': return "Très bien! Quel genre de livres aimes-tu?";
          case 'it': return "Molto bene! Che genere di libri ti piacciono?";
          case 'de': return "Sehr gut! Was für Bücher liest du gern?";
          case 'pt': return "Muito bem! Que género de livros gostas?";
          default: return "Excellent! What kind of books do you enjoy?";
        }
      }
      
      if (word.includes('food') || word.includes('comida') || word.includes('nourriture') || word.includes('cibo') || word.includes('essen')) {
        switch (language) {
          case 'es': return "¡Perfecto! ¿Te gusta cocinar?";
          case 'fr': return "Parfait! Tu aimes cuisiner?";
          case 'it': return "Perfetto! Ti piace cucinare?";
          case 'de': return "Perfekt! Kochst du gern?";
          case 'pt': return "Perfeito! Gostas de cozinhar?";
          default: return "Perfect! Do you like cooking?";
        }
      }
      
      if (word.includes('travel') || word.includes('viaje') || word.includes('voyage') || word.includes('viaggio') || word.includes('reise')) {
        switch (language) {
          case 'es': return "¡Excelente! ¿Te gusta viajar?";
          case 'fr': return "Excellent! Tu aimes voyager?";
          case 'it': return "Eccellente! Ti piace viaggiare?";
          case 'de': return "Ausgezeichnet! Reist du gern?";
          case 'pt': return "Excelente! Gostas de viajar?";
          default: return "Great! Do you like to travel?";
        }
      }
    }
    
    // Fallback to generic positive responses if no specific vocabulary match
    switch (language) {
      case 'es': return "¡Perfecto! ¡Sonó genial!";
      case 'fr': return "Parfait! C'était très bien!";
      case 'it': return "Perfetto! È suonato benissimo!";
      case 'de': return "Perfekt! Das klang toll!";
      case 'pt': return "Perfeito! Soou muito bem!";
      default: return "Perfect! That sounded great!";
    }
  }

  /**
   * Detect if a bot response contains a correction and register it for practice
   */
  detectAndRegisterCorrection(sessionId: string, userInput: string, botResponse: string): void {
    // Patterns that indicate the bot is providing a correction
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
        let correctedText = '';
        
        // Handle different correction formats
        if (match[1] && match[2]) {
          // Format: "we say X, not Y" - use the first capture group (correct form)
          correctedText = match[1].trim();
        } else if (match[1]) {
          // Format: "you could say X" - use the capture group
          correctedText = match[1].trim();
        }
        
        // Special handling for specific preposition corrections without quotes
        if (pattern.source.includes('through the nose')) {
          correctedText = "through the nose";
        } else if (pattern.source.includes('listen to')) {
          correctedText = "listen to";
        } else if (pattern.source.includes('different from')) {
          correctedText = "different from";
        }
        
        if (correctedText) {
          console.log(`🎯 CORRECTION DETECTED! User said: "${userInput}", Bot corrected to: "${correctedText}"`);
          
          // Register the correction for practice
          this.pendingCorrections.set(sessionId, {
            originalText: userInput,
            correctedText: correctedText,
            timestamp: new Date()
          });
          
          console.log(`📝 Registered correction for practice session ${sessionId}`);
          break;
        }
      }
    }
    
    // Additional check for contextual corrections without specific patterns
    // Look for phrases that suggest correction in any context
    const contextualCorrections = [
      /through the nose/i,
      /sniff/i,
      /snort/i
    ];
    
    // If user input contained "from the nose" and bot response mentions "through" or "sniff/snort"
    if (userInput.toLowerCase().includes('from the nose')) {
      for (const correctionPattern of contextualCorrections) {
        if (botResponse.match(correctionPattern)) {
          const correctedText = "through the nose";
          console.log(`🎯 CONTEXTUAL CORRECTION DETECTED! User said: "${userInput}", Suggesting: "${correctedText}"`);
          
          this.pendingCorrections.set(sessionId, {
            originalText: userInput,
            correctedText: correctedText,
            timestamp: new Date()
          });
          
          console.log(`📝 Registered contextual correction for practice session ${sessionId}`);
          break;
        }
      }
    }
  }

  /**
   * Clear repetition history for a session
   */
  clearRepetitionHistory(sessionId: string): void {
    this.recentUserInputs.delete(sessionId);
    this.usedResponsePatterns.delete(sessionId);
    this.pendingCorrections.delete(sessionId); // Also clear pending corrections
    console.log(`Repetition history cleared for session ${sessionId}`);
  }

  /**
   * Get a natural clarification message for poor transcriptions
   */
  private getNaturalClarificationMessage(language: string): string {
    switch (language) {
      case 'es':
        return "No te escuché bien. ¿Podrías repetir lo que dijiste?";
      case 'en':
        return "I didn't catch that clearly. Could you repeat what you said?";
      case 'fr':
        return "Je n'ai pas bien entendu. Pourriez-vous répéter ce que vous avez dit?";
      case 'it':
        return "Non ho sentito bene. Potresti ripetere quello che hai detto?";
      case 'de':
        return "Ich habe das nicht gut verstanden. Könnten Sie wiederholen, was Sie gesagt haben?";
      case 'pt':
        return "Não ouvi bem. Poderia repetir o que disse?";
      default:
        return "I didn't catch that clearly. Could you repeat what you said?";
    }
  }

  /**
   * Clear conversation history
   */
  async clearConversation(sessionId: string): Promise<void> {
    try {
      await storage.clearSession(sessionId);
      this.clearVADTimeout(sessionId);
      
      // Clear correction memory for this session
      const correctionKey = `${sessionId}_correction`;
      this.recentCorrections.delete(correctionKey);
      
      // Clear repetition history
      this.clearRepetitionHistory(sessionId);
      
      console.log(`Conversation cleared for session ${sessionId}`);
    } catch (error: any) {
      console.error("Error clearing conversation:", error);
      throw new Error(`Failed to clear conversation: ${error.message}`);
    }
  }
}

export const conversationService = new ConversationService();
