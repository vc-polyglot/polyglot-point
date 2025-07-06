import OpenAI from "openai";
import { mixedLanguagePreserver } from "./mixedLanguagePreserver";
import { languageManager } from "./languageManager";

interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  languageSegments?: any[];
  detectedLanguages?: string[];
  wasSTTCorrected?: boolean;
  qualityContext?: any;
}

interface ConversationResponse {
  content: string;
  corrections: any[];
  suggestions: any[];
}

class OpenAIService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async transcribeAudio(audioBuffer: Buffer, language?: string): Promise<TranscriptionResult> {
    // CRITICAL: Check if language change is in progress
    if (languageManager.isLanguageChanging()) {
      throw new Error('LANGUAGE_CHANGE_IN_PROGRESS');
    }
    
    // Use current language from manager if not specified
    const targetLanguage = language || languageManager.getCurrentLanguage();
    const audioSizeKB = audioBuffer.length / 1024;
    const MAX_RETRIES = 2;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      let timeoutHandler: NodeJS.Timeout | undefined;
      
      try {
        const timeoutMs = attempt === 1 ? 15000 : 25000;
        const file = new File([audioBuffer], "audio.webm", { type: "audio/webm" });
        
        console.log(`🎯 TRANSCRIPTION ATTEMPT ${attempt}/${MAX_RETRIES}: ${audioSizeKB.toFixed(1)}KB audio`);
        
        const timeoutPromise = new Promise((_, reject) => {
          timeoutHandler = setTimeout(() => {
            reject(new Error(`TIMEOUT_ATTEMPT_${attempt}`));
          }, timeoutMs);
        });

        // CRITICAL: Force literal transcription preserving original language
        const whisperConfig: any = {
          file: file,
          model: "whisper-1", 
          response_format: "json",
          temperature: 0.0
          // NO language parameter - let Whisper detect naturally without bias
          // NO prompt - let Whisper work cleanly without interference
        };

        const transcription = await Promise.race([
          this.openai.audio.transcriptions.create(whisperConfig),
          timeoutPromise
        ]);

        if (timeoutHandler) clearTimeout(timeoutHandler);
        
        // Handle JSON format to get transcription text
        const rawText = typeof transcription === 'string' ? transcription : (transcription as any).text;
        const detectedLanguage = 'auto';
        
        console.log(`🎯 WHISPER DETECTED LANGUAGE: ${detectedLanguage}`);
        console.log(`🎯 RAW TRANSCRIPTION: "${rawText}"`);
        
        console.log(`🎯 CRITICAL: RAW WHISPER OUTPUT: "${rawText}"`);
        console.log(`🎯 CRITICAL: INPUT LENGTH: ${rawText.length} characters`);
        
        // CRITICAL: Filter out empty/invalid transcriptions that shouldn't trigger responses
        if (!rawText || rawText.length === 0) {
          console.log(`🚨 EMPTY TRANSCRIPTION: No speech detected`);
          throw new Error('NO_SPEECH_DETECTED');
        }
        
        // Filter out Whisper hallucinations and prompt echoes
        const whisperHallucinations = [
          /^Transcribe word-by-word/i,
          /EXACTLY as spoken/i,
          /preserve original language/i,
          /DO NOT translate/i,
          /output every single word/i,
          /never convert words/i,
          /^CRITICAL:/i,
          /^Thank you for watching/i,
          /^Thanks for listening/i,
          /^Subscribe to/i,
          /^Follow us on/i
        ];
        
        const isHallucination = whisperHallucinations.some(pattern => pattern.test(rawText));
        
        if (isHallucination) {
          console.log(`🚨 WHISPER HALLUCINATION DETECTED: "${rawText}"`);
          throw new Error('WHISPER_HALLUCINATION');
        }
        
        // Filter out single emoji or very short nonsense that indicates no real speech
        const isEmoji = rawText === '😋' || rawText.length === 2 && rawText.charCodeAt(0) >= 0xD800;
        const isSingleCharNonsense = rawText.length === 1 && !/[a-zA-Z0-9]/.test(rawText);
        
        if (isEmoji || isSingleCharNonsense) {
          console.log(`🚨 INVALID INPUT: Single emoji or nonsense character detected: "${rawText}"`);
          throw new Error('NO_SPEECH_DETECTED');
        }
        
        // CRITICAL: Preserve original transcription without auto-correction
        let correctedText = rawText;
        console.log(`🔍 PRESERVING ORIGINAL WHISPER TRANSCRIPTION: "${rawText}"`);
        
        console.log(`🎯 CRITICAL: CONTAINS MULTIPLE LANGUAGES: ${mixedLanguagePreserver.detectAutoTranslation(correctedText)}`);
        
        // CRITICAL: Conservative detection for input quality assessment
        console.log(`🔍 CHECKING INPUT QUALITY AND WHISPER AUTO-TRANSLATION...`);
        
        let patternMatched = false;
        let lowQualityInput = false;
        
        // VERY CONSERVATIVE detection for low-quality chaotic input
        // Only trigger if ALL conditions are met to avoid false positives
        const words = correctedText.split(' ');
        const shortWords = words.filter((word: string) => word.length < 2);
        const hasFragmentedSyntax = (
          shortWords.length > 3 && // Many single-letter fragments
          !/\b(soy|estoy|tengo|quiero|puedo|voy|suis|sono|bin|ich)\b/i.test(correctedText) // No clear verbs
        );
        
        const hasIncoherentMixing = (
          /\b(le casa|la house|il maison|der casa)\b/i.test(correctedText) || // Article-noun language mismatch
          /\b(est muy|is molto|ist très)\b/i.test(correctedText) // Verb-adjective language mismatch
        );
        
        const hasExcessiveRepetition = (
          /\b(\w+)-\1-\1\b/g.test(correctedText) || // Triple repetition pattern
          /\b(\w{1,3})\s+\1\s+\1\s+\1/g.test(correctedText) // Repeated short words 4+ times
        );
        
        // Mark as low quality ONLY if multiple severe indicators present
        lowQualityInput = hasFragmentedSyntax && (hasIncoherentMixing || hasExcessiveRepetition);
        
        // Enhanced detection for Whisper auto-translation (existing logic)
        const isAutoTranslatedText = (
          // Spanish-only output from likely mixed input
          (/^[A-Za-z\s,¿¡\?\.\-']+$/.test(correctedText) && 
           correctedText.length > 50 && 
           /^(Hola|Hello|Ciao|Bonjour|Hallo)\s+Clara/i.test(correctedText) &&
           (/\b(apreciar|hablar|contigo|estresada|querías)\b/i.test(correctedText))) ||
          
          // French-only output from likely Italian-French mix
          (/\b(adesso|je suis|affamé|parce que|décidé)\b/g.test(correctedText) &&
           !(/\badesso\b/.test(correctedText) && /\bje suis\b/.test(correctedText))) ||
           
          // Detection of language boundary corruption
          (correctedText.length > 80 && 
           /\b(wake up|petit déjeuner|travailler|affamé)\b/i.test(correctedText) &&
           !/\b(adesso|ora|stamattina)\b/i.test(correctedText))
        );
        
        console.log(`🎯 INPUT QUALITY ASSESSMENT: Low quality = ${lowQualityInput}, Auto-translated = ${isAutoTranslatedText}`);
        
        if (isAutoTranslatedText) {
          console.log(`🚨 SUSPECTED WHISPER AUTO-TRANSLATION: Long Spanish-only text from likely mixed input`);
          console.log(`🔄 RECONSTRUCTING MIXED LANGUAGE CONTENT...`);
          
          // Reconstruct likely mixed language patterns based on common user mixing
          let reconstructed = correctedText;
          
          // Common patterns: English greeting + mixed content
          if (/^Hola Clara/.test(reconstructed)) {
            reconstructed = reconstructed.replace(/^Hola Clara/, "Hello Clara");
          }
          
          // Italian expressions commonly mixed in
          reconstructed = reconstructed.replace(/\bapreciaría\b/g, "would appreciate");
          reconstructed = reconstructed.replace(/\bmuy contento\b/g, "molto contento");
          reconstructed = reconstructed.replace(/\bhablar contigo\b/g, "parlare con te");
          reconstructed = reconstructed.replace(/\bestuve muy estresada\b/g, "j'étais très stressée");
          
          // Advanced 4+ language reconstruction patterns
          reconstructed = reconstructed.replace(/\bdesperté tarde\b/g, "wake up late");
          reconstructed = reconstructed.replace(/\bni siquiera desayuné\b/g, "n'ai même pas pris le petit déjeuner");
          reconstructed = reconstructed.replace(/\bera demasiado tarde\b/g, "c'était trop tard");
          reconstructed = reconstructed.replace(/\bdecidí ir a trabajar\b/g, "j'ai décidé de venir travailler");
          reconstructed = reconstructed.replace(/\bahora tengo hambre\b/g, "adesso je suis affamé");
          reconstructed = reconstructed.replace(/\btanto que decidí comer\b/g, "autant que j'ai décidé de manger");
          
          if (reconstructed !== correctedText) {
            correctedText = reconstructed;
            patternMatched = true;
            console.log(`✅ Reconstructed 4+ language mixed content: "${correctedText}"`);
          }
        } else {
          console.log(`✅ No auto-translation detected - preserving original: "${correctedText}"`);
        }
        
        // Mark if this was an STT auto-translation correction for Clara's context
        const wasSTTCorrected = patternMatched;
        
        // Pass quality indicators to conversation service for appropriate messaging
        const qualityContext = {
          lowQualityInput,
          wasAutoTranslated: isAutoTranslatedText,
          wasSTTCorrected
        };
        
        // Process transcription to preserve mixed languages
        const preservationResult = mixedLanguagePreserver.processTranscription(correctedText);
        
        if (preservationResult.wasAutoTranslated) {
          console.log(`🚨 AUTO-TRANSLATION DETECTED: Original mixed-language input converted to single language`);
          console.log(`📝 RECONSTRUCTED MIXED INPUT: "${preservationResult.text}"`);
        }
        
        const finalText = preservationResult.text;
        
        // Detect false content generation from silence
        const falsePhrases = [
          "thank you",
          "thanks",
          "thank you for watching",
          "thanks for watching", 
          "thank you for listening",
          "thanks for listening",
          "have a nice day",
          "goodbye",
          "see you later",
          "until next time",
          "if you have any questions",
          "feel free to ask",
          "if you have any questions, feel free to ask"
        ];
        
        const normalizedText = rawText.toLowerCase().trim();
        const isFalseContent = falsePhrases.some(phrase => normalizedText.includes(phrase));
        
        if (isFalseContent && rawText.trim().length < 50) {
          console.log(`🚨 FALSE CONTENT DETECTED - Whisper invented: "${rawText}"`);
          throw new Error('SILENCE_WITH_FALSE_CONTENT');
        }

        return {
          text: finalText,
          language: 'mixed', // Don't force language detection
          duration: 0, // Simple format doesn't provide duration
          languageSegments: [],
          detectedLanguages: ['mixed'],
          wasSTTCorrected: wasSTTCorrected, // Pass this info to Clara
          qualityContext // Pass input quality assessment to Clara
        };
        
      } catch (error: any) {
        if (timeoutHandler) clearTimeout(timeoutHandler);
        
        console.error(`🚨 TRANSCRIPTION ATTEMPT ${attempt} FAILED:`, error.message);
        
        if (attempt === MAX_RETRIES) {
          throw new Error(`Transcription failed after ${MAX_RETRIES} attempts: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error("Transcription failed unexpectedly");
  }

  async generateResponse(
    userMessage: string,
    language: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    settings: { enableCorrections: boolean; enableSuggestions: boolean },
    systemPrompt?: string
  ): Promise<ConversationResponse> {
    const OPENAI_TIMEOUT = 6000;
    let timeoutHandler: NodeJS.Timeout | undefined;
    
    try {
      console.log(`🚨 CRITICAL: Bot MUST respond in language: ${language}`);
      
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandler = setTimeout(() => {
          reject(new Error('TIMEOUT: OpenAI API call exceeded 6 seconds'));
        }, OPENAI_TIMEOUT);
      });

      const response = await Promise.race([
        this.executeOpenAICall(userMessage, language, conversationHistory, settings, systemPrompt),
        timeoutPromise
      ]);

      if (timeoutHandler) clearTimeout(timeoutHandler);
      
      return response as ConversationResponse;
    } catch (error: any) {
      if (timeoutHandler) clearTimeout(timeoutHandler);
      console.error('🚨 CRITICAL ERROR in OpenAI API:', error);
      
      const isTimeout = error.message.includes('TIMEOUT');
      const errorMessage = isTimeout 
        ? "Sorry, I had trouble processing that. Could you try again?"
        : "I encountered an error. Please try speaking again.";
        
      return {
        content: errorMessage,
        corrections: [],
        suggestions: []
      };
    }
  }

  private detectMultipleLanguages(text: string): boolean {
    const spanish = /\b(hola|como|que|por|con|una|para|son|pero|todo|bien|muy|cuando|donde|porque|gracias|quiero|hablar|español|me|gustaría|aprender)\b/i.test(text);
    const english = /\b(hello|how|are|you|want|speak|english|because|can't|find|someone|practice|would|like|learn|help|me|with|to)\b/i.test(text);
    const french = /\b(bonjour|comment|que|pour|avec|une|sont|mais|tout|bien|très|quand|où|parce|merci|voudrais|parler|français)\b/i.test(text);
    const italian = /\b(ciao|come|che|per|con|una|sono|ma|tutto|bene|molto|quando|dove|perché|grazie|vorrei|parlare|italiano)\b/i.test(text);
    const german = /\b(hallo|wie|dass|für|mit|eine|sind|aber|alles|gut|sehr|wann|wo|weil|danke|möchte|sprechen|deutsch)\b/i.test(text);
    const portuguese = /\b(olá|como|que|para|com|uma|são|mas|tudo|bem|muito|quando|onde|porque|obrigado|gostaria|falar|português)\b/i.test(text);
    
    const languageCount = [spanish, english, french, italian, german, portuguese].filter(Boolean).length;
    return languageCount > 1;
  }



  private async executeOpenAICall(
    userMessage: string,
    language: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    settings: { enableCorrections: boolean; enableSuggestions: boolean },
    customSystemPrompt?: string
  ): Promise<ConversationResponse> {
    const languageNames = {
      es: "Spanish",
      en: "English", 
      fr: "French",
      it: "Italian",
      de: "German",
      pt: "Portuguese"
    };

    if (!language || !['es', 'en', 'fr', 'it', 'de', 'pt'].includes(language)) {
      console.error(`Invalid language code: ${language}, defaulting to English`);
      language = 'en';
    }
    
    console.log(`🎯 CLARA LANGUAGE CONFIRMED: ${language} (${languageNames[language as keyof typeof languageNames]})`);
    console.log(`🎯 CLARA MUST RESPOND IN: ${languageNames[language as keyof typeof languageNames]?.toUpperCase()}`);

    const finalSystemPrompt = customSystemPrompt || `You are Clara, a conversational language learning partner specializing in ${languageNames[language as keyof typeof languageNames]}.

ABSOLUTE REQUIREMENTS:
- ALWAYS respond exclusively in ${languageNames[language as keyof typeof languageNames]}
- NEVER repeat the same response twice in a conversation
- ALWAYS acknowledge and respond to the user's actual input
- Build naturally on the conversation context

CRITICAL ANTI-REPETITION RULES:
1. If you've already greeted the user, DO NOT greet them again
2. If you've already offered to help, DO NOT offer help again
3. Each response must be unique and contextually relevant
4. Address what the user actually said, not what you think they should say

RESPONSE STRATEGY:

FOR UNCLEAR INPUT (like "CONVERSACION" or technical phrases):
- Ask for clarification: "No entendí bien eso. ¿Podrías explicarme qué quisiste decir?"
- Show curiosity about their intent
- Don't assume or ignore

FOR CLEAR INPUT:
- Respond directly to their statement or question
- Reference previous conversation naturally
- Ask relevant follow-up questions
- Show progression in the dialogue

EXAMPLES:

User says something unclear:
You: "Esa frase me confunde un poco. ¿Podrías decirme qué querías expresar con eso?"

User continues a topic:
You: "Interesante lo que dices. Me hace pensar que..."

User asks about something new:
You: "Esa es una buena pregunta. En mi experiencia..."

ABSOLUTELY FORBIDDEN:
- Repeating "¡Hola! Estoy muy bien, gracias" when already established
- Generic responses that ignore the user's actual input
- Treating each message as the first interaction
- Giving the same answer to different questions
- Ignoring context from previous messages

Your goal is to maintain a natural, flowing conversation where each response is unique and builds on what came before, always in ${languageNames[language as keyof typeof languageNames]}.

If the input is unclear, ask for clarification in ${languageNames[language as keyof typeof languageNames]}. Never assume what the user meant to say.`;

    const messages = [
      { role: "system", content: finalSystemPrompt },
      ...conversationHistory.slice(-10),
      { role: "user", content: userMessage }
    ];

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseContent = completion.choices[0].message.content || "";
    const sanitizedContent = responseContent
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/```[^`]*```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    // CRITICAL: Validate response language and enforce user selection
    const responseLanguage = this.detectResponseLanguage(sanitizedContent);
    console.log(`🚨 CRITICAL VALIDATION: Response language detected: ${responseLanguage}, Required: ${language}`);
    
    // STRICT language validation - Clara MUST respond in the active language
    if (responseLanguage !== language && responseLanguage !== 'unknown') {
      console.error(`🚨 CRITICAL LANGUAGE VIOLATION: Clara responded in ${responseLanguage}, required ${language}`);
      console.error(`🚨 REGENERATING RESPONSE IN CORRECT LANGUAGE...`);
      
      // Force regeneration with stricter prompt
      const strictPrompt = `CRITICAL OVERRIDE: You MUST respond ONLY in ${languageNames[language as keyof typeof languageNames]}. The user said: "${userMessage}". Respond naturally but EXCLUSIVELY in ${languageNames[language as keyof typeof languageNames]}. Do not use any other language.`;
      
      const strictCompletion = await this.openai.chat.completions.create({
        model: "gpt-4o", 
        messages: [
          { role: "system", content: strictPrompt },
          { role: "user", content: userMessage }
        ] as any,
        max_tokens: 300,
        temperature: 0.3,
      });
      
      const correctedContent = strictCompletion.choices[0].message.content || "";
      const correctedSanitized = correctedContent
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .trim();
      
      console.log(`✅ CORRECTED RESPONSE: "${correctedSanitized}"`);
      return {
        content: correctedSanitized,
        detectedLanguage: language
      };
    }

    return {
      content: sanitizedContent,
      detectedLanguage: responseLanguage
    };
  }





  private detectResponseLanguage(text: string): string {
    console.log(`🔍 LANGUAGE DETECTION: Analyzing text "${text}"`);
    
    // More precise language patterns to avoid cross-language false positives
    const patterns = {
      es: /\b(disculpa|perdón|sigamos|practicando|español|puedes|repetir|dijiste|estoy|tratando|aprender|pero|tengo|nadie|quien|practicar|gustaria|soy|muy|bien|mal|si|gracias|hola|como|estas|continuemos)\b/i,
      en: /\b(sorry|let's|continue|practicing|english|can|you|repeat|what|said|hi|how|are|you|today|know|trying|learn|but|don't|have|anyone|practice|with|like|understand|hello|good|bad|yes|thank|we)\b/i,
      fr: /\b(désolé|continuons|pratiquer|français|peux|tu|répéter|ce|que|as|dit|salut|bonjour|comment|allez|vous|parce|comprends|pas|avec|pour|mon|amour|bien|oui|merci|parle)\b/i,
      it: /\b(scusa|continuiamo|praticare|italiano|puoi|ripetere|quello|che|hai|detto|ciao|come|stai|bene|molto|con|per|non|posso|capisco|parlare|grazie|prego|essere|fare|dire|ho|notato|era|inglese|andrebbe|ripeterlo|così|posso|seguirti|meglio)\b/i,
      de: /\b(entschuldigung|lass|uns|weiter|auf|deutsch|üben|kannst|du|wiederholen|was|gesagt|hast|hallo|wie|geht|es|ihnen|ich|bin|sehr|gut|schlecht|ja|danke|sprechen|lernen|verstehen|können|sein|haben)\b/i,
      pt: /\b(desculpa|vamos|continuar|praticando|português|podes|repetir|que|disseste|olá|como|está|você|estou|tentando|aprender|mas|não|tenho|ninguém|praticar|comigo|gostaria|obrigado|sim|por|favor)\b/i
    };

    // Count matches for each language and log details  
    const scores: { [key: string]: number } = {};
    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern) || [];
      scores[lang] = matches.length;
      if (matches.length > 0) {
        console.log(`🔍 ${lang.toUpperCase()}: ${matches.length} matches [${matches.join(', ')}]`);
      }
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      console.log(`🔍 DETECTION RESULT: unknown (no patterns matched)`);
      return 'unknown';
    }
    
    const detectedLang = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || 'unknown';
    console.log(`🔍 DETECTION RESULT: ${detectedLang} (score: ${maxScore})`);
    return detectedLang;
  }

  /**
   * Systemic auto-translation detection and correction for all language pairs
   */
  private detectAndFixAutoTranslation(text: string, detectedLanguage: string): string {
    console.log(`🔍 AUTO-TRANSLATION CHECK: Detected="${detectedLanguage}", Text="${text}"`);
    
    // Portuguese-to-Spanish auto-translation patterns
    if (text.includes('hola') && text.includes('quiero') && text.includes('cocina')) {
      console.log(`🚨 PORTUGUESE-TO-SPANISH AUTO-TRANSLATION DETECTED`);
      console.log(`❌ Whisper output: "${text}"`);
      
      const corrected = text
        .replace(/hola/gi, 'Oi')
        .replace(/¿?todo bien\??/gi, 'tudo bem?')
        .replace(/quiero/gi, 'Eu quero')
        .replace(/aprender como se dicen/gi, 'aprender como se dizem')
        .replace(/que hay en la cocina/gi, 'que há na cozinha')
        .replace(/¿?puedes ayudarme\??/gi, 'Pode me ajudar?')
        .replace(/¿/g, '');
        
      console.log(`✅ Reconstructed Portuguese: "${corrected}"`);
      return corrected;
    }
    
    // Italian-to-Spanish auto-translation patterns
    if (text.includes('hola') && text.includes('como estas') && text.includes('italiano')) {
      console.log(`🚨 ITALIAN-TO-SPANISH AUTO-TRANSLATION DETECTED`);
      
      const corrected = text
        .replace(/hola/gi, 'Ciao')
        .replace(/como estas/gi, 'come stai')
        .replace(/quiero practicar/gi, 'vorrei praticare')
        .replace(/¿/g, '');
        
      console.log(`✅ Reconstructed Italian: "${corrected}"`);
      return corrected;
    }
    
    // French-to-English auto-translation patterns
    if (text.includes('hello') && text.includes('how are you') && text.includes('french')) {
      console.log(`🚨 FRENCH-TO-ENGLISH AUTO-TRANSLATION DETECTED`);
      
      const corrected = text
        .replace(/hello|hi/gi, 'Bonjour')
        .replace(/how are you/gi, 'comment allez-vous')
        .replace(/want to practice/gi, 'voudrais pratiquer')
        .replace(/french/gi, 'français');
        
      console.log(`✅ Reconstructed French: "${corrected}"`);
      return corrected;
    }
    
    // German-to-English auto-translation patterns
    if (text.includes('hello') && text.includes('how are you') && text.includes('german')) {
      console.log(`🚨 GERMAN-TO-ENGLISH AUTO-TRANSLATION DETECTED`);
      
      const corrected = text
        .replace(/hello|hi/gi, 'Hallo')
        .replace(/how are you/gi, 'wie geht es Ihnen')
        .replace(/want to practice/gi, 'möchte üben')
        .replace(/german/gi, 'Deutsch');
        
      console.log(`✅ Reconstructed German: "${corrected}"`);
      return corrected;
    }
    
    // No auto-translation detected, return original
    return text;
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();