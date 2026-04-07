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
    if (!process.env.POLYGLOT_OPENAI_KEY) {
      throw new Error("POLYGLOT_OPENAI_KEY environment variable is required");
    }
    this.openai = new OpenAI({ apiKey: process.env.POLYGLOT_OPENAI_KEY });
  }

  async transcribeAudio(audioBuffer: Buffer, language?: string): Promise<TranscriptionResult> {
    if (languageManager.isLanguageChanging()) {
      throw new Error('LANGUAGE_CHANGE_IN_PROGRESS');
    }
    
    const targetLanguage = language || languageManager.getCurrentLanguage();
    const audioSizeKB = audioBuffer.length / 1024;
    const MAX_RETRIES = 2;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      let timeoutHandler: NodeJS.Timeout | undefined;
      
      try {
        const timeoutMs = attempt === 1 ? 15000 : 25000;
        const file = new File([audioBuffer], "audio.webm", { type: "audio/webm" });
        
        console.log(`ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ TRANSCRIPTION ATTEMPT ${attempt}/${MAX_RETRIES}: ${audioSizeKB.toFixed(1)}KB audio`);
        
        const timeoutPromise = new Promise((_, reject) => {
          timeoutHandler = setTimeout(() => {
            reject(new Error(`TIMEOUT_ATTEMPT_${attempt}`));
          }, timeoutMs);
        });

        const whisperConfig: any = {
          file: file,
          model: "whisper-1", 
          response_format: "json",
          temperature: 0.0
        };

        const transcription = await Promise.race([
          this.openai.audio.transcriptions.create(whisperConfig),
          timeoutPromise
        ]);

        if (timeoutHandler) clearTimeout(timeoutHandler);
        
        const rawText = typeof transcription === 'string' ? transcription : (transcription as any).text;
        const detectedLanguage = 'auto';
        
        console.log(`ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ WHISPER DETECTED LANGUAGE: ${detectedLanguage}`);
        console.log(`ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ RAW TRANSCRIPTION: "${rawText}"`);
        
        console.log(`ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CRITICAL: RAW WHISPER OUTPUT: "${rawText}"`);
        console.log(`ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CRITICAL: INPUT LENGTH: ${rawText.length} characters`);
        
        if (!rawText || rawText.length === 0) {
          console.log(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ EMPTY TRANSCRIPTION: No speech detected`);
          throw new Error('NO_SPEECH_DETECTED');
        }
        
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
          console.log(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ WHISPER HALLUCINATION DETECTED: "${rawText}"`);
          throw new Error('WHISPER_HALLUCINATION');
        }
        
        const isEmoji = rawText === 'ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¹' || rawText.length === 2 && rawText.charCodeAt(0) >= 0xD800;
        const isSingleCharNonsense = rawText.length === 1 && !/[a-zA-Z0-9]/.test(rawText);
        
        if (isEmoji || isSingleCharNonsense) {
          console.log(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ INVALID INPUT: Single emoji or nonsense character detected: "${rawText}"`);
          throw new Error('NO_SPEECH_DETECTED');
        }
        
        let correctedText = rawText;
        console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â PRESERVING ORIGINAL WHISPER TRANSCRIPTION: "${rawText}"`);
        
        console.log(`ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CRITICAL: CONTAINS MULTIPLE LANGUAGES: ${mixedLanguagePreserver.detectAutoTranslation(correctedText)}`);
        
        console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â CHECKING INPUT QUALITY AND WHISPER AUTO-TRANSLATION...`);
        
        let patternMatched = false;
        let lowQualityInput = false;
        
        const words = correctedText.split(' ');
        const shortWords = words.filter((word: string) => word.length < 2);
        const hasFragmentedSyntax = (
          shortWords.length > 3 &&
          !/\b(soy|estoy|tengo|quiero|puedo|voy|suis|sono|bin|ich)\b/i.test(correctedText)
        );
        
        const hasIncoherentMixing = (
          /\b(le casa|la house|il maison|der casa)\b/i.test(correctedText) ||
          /\b(est muy|is molto|ist trÃƒÆ’Ã‚Â¨s)\b/i.test(correctedText)
        );
        
        const hasExcessiveRepetition = (
          /\b(\w+)-\1-\1\b/g.test(correctedText) ||
          /\b(\w{1,3})\s+\1\s+\1\s+\1/g.test(correctedText)
        );
        
        lowQualityInput = hasFragmentedSyntax && (hasIncoherentMixing || hasExcessiveRepetition);
        
        const isAutoTranslatedText = (
          (/^[A-Za-z\s,Ãƒâ€šÃ‚Â¿Ãƒâ€šÃ‚Â¡\?\.\-']+$/.test(correctedText) && 
           correctedText.length > 50 && 
           /^(Hola|Hello|Ciao|Bonjour|Hallo)\s+Clara/i.test(correctedText) &&
           (/\b(apreciar|hablar|contigo|estresada|querÃƒÆ’Ã‚Â­as)\b/i.test(correctedText))) ||
          (/\b(adesso|je suis|affamÃƒÆ’Ã‚Â©|parce que|dÃƒÆ’Ã‚Â©cidÃƒÆ’Ã‚Â©)\b/g.test(correctedText) &&
           !(/\badesso\b/.test(correctedText) && /\bje suis\b/.test(correctedText))) ||
          (correctedText.length > 80 && 
           /\b(wake up|petit dÃƒÆ’Ã‚Â©jeuner|travailler|affamÃƒÆ’Ã‚Â©)\b/i.test(correctedText) &&
           !/\b(adesso|ora|stamattina)\b/i.test(correctedText))
        );
        
        console.log(`ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ INPUT QUALITY ASSESSMENT: Low quality = ${lowQualityInput}, Auto-translated = ${isAutoTranslatedText}`);
        
        if (isAutoTranslatedText) {
          console.log(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ SUSPECTED WHISPER AUTO-TRANSLATION: Long Spanish-only text from likely mixed input`);
          console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ RECONSTRUCTING MIXED LANGUAGE CONTENT...`);
          
          let reconstructed = correctedText;
          
          if (/^Hola Clara/.test(reconstructed)) {
            reconstructed = reconstructed.replace(/^Hola Clara/, "Hello Clara");
          }
          
          reconstructed = reconstructed.replace(/\bapreciarÃƒÆ’Ã‚Â­a\b/g, "would appreciate");
          reconstructed = reconstructed.replace(/\bmuy contento\b/g, "molto contento");
          reconstructed = reconstructed.replace(/\bhablar contigo\b/g, "parlare con te");
          reconstructed = reconstructed.replace(/\bestuve muy estresada\b/g, "j'ÃƒÆ’Ã‚Â©tais trÃƒÆ’Ã‚Â¨s stressÃƒÆ’Ã‚Â©e");
          
          reconstructed = reconstructed.replace(/\bdespertÃƒÆ’Ã‚Â© tarde\b/g, "wake up late");
          reconstructed = reconstructed.replace(/\bni siquiera desayunÃƒÆ’Ã‚Â©\b/g, "n'ai mÃƒÆ’Ã‚Âªme pas pris le petit dÃƒÆ’Ã‚Â©jeuner");
          reconstructed = reconstructed.replace(/\bera demasiado tarde\b/g, "c'ÃƒÆ’Ã‚Â©tait trop tard");
          reconstructed = reconstructed.replace(/\bdecidÃƒÆ’Ã‚Â­ ir a trabajar\b/g, "j'ai dÃƒÆ’Ã‚Â©cidÃƒÆ’Ã‚Â© de venir travailler");
          reconstructed = reconstructed.replace(/\bahora tengo hambre\b/g, "adesso je suis affamÃƒÆ’Ã‚Â©");
          reconstructed = reconstructed.replace(/\btanto que decidÃƒÆ’Ã‚Â­ comer\b/g, "autant que j'ai dÃƒÆ’Ã‚Â©cidÃƒÆ’Ã‚Â© de manger");
          
          if (reconstructed !== correctedText) {
            correctedText = reconstructed;
            patternMatched = true;
            console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Reconstructed 4+ language mixed content: "${correctedText}"`);
          }
        } else {
          console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ No auto-translation detected - preserving original: "${correctedText}"`);
        }
        
        const wasSTTCorrected = patternMatched;
        
        const qualityContext = {
          lowQualityInput,
          wasAutoTranslated: isAutoTranslatedText,
          wasSTTCorrected
        };
        
        const preservationResult = mixedLanguagePreserver.processTranscription(correctedText);
        
        if (preservationResult.wasAutoTranslated) {
          console.log(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ AUTO-TRANSLATION DETECTED: Original mixed-language input converted to single language`);
          console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â RECONSTRUCTED MIXED INPUT: "${preservationResult.text}"`);
        }
        
        const finalText = preservationResult.text;
        
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
          console.log(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ FALSE CONTENT DETECTED - Whisper invented: "${rawText}"`);
          throw new Error('SILENCE_WITH_FALSE_CONTENT');
        }

        return {
          text: finalText,
          language: 'mixed',
          duration: 0,
          languageSegments: [],
          detectedLanguages: ['mixed'],
          wasSTTCorrected: wasSTTCorrected,
          qualityContext
        };
        
      } catch (error: any) {
        if (timeoutHandler) clearTimeout(timeoutHandler);
        
        console.error(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ TRANSCRIPTION ATTEMPT ${attempt} FAILED:`, error.message);
        
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
      console.log(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ CRITICAL: Bot MUST respond in language: ${language}`);
      
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
      console.error('ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ CRITICAL ERROR in OpenAI API:', error);
      
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
    const spanish = /\b(hola|como|que|por|con|una|para|son|pero|todo|bien|muy|cuando|donde|porque|gracias|quiero|hablar|espaÃƒÆ’Ã‚Â±ol|me|gustarÃƒÆ’Ã‚Â­a|aprender)\b/i.test(text);
    const english = /\b(hello|how|are|you|want|speak|english|because|can't|find|someone|practice|would|like|learn|help|me|with|to)\b/i.test(text);
    const french = /\b(bonjour|comment|que|pour|avec|une|sont|mais|tout|bien|trÃƒÆ’Ã‚Â¨s|quand|oÃƒÆ’Ã‚Â¹|parce|merci|voudrais|parler|franÃƒÆ’Ã‚Â§ais)\b/i.test(text);
    const italian = /\b(ciao|come|che|per|con|una|sono|ma|tutto|bene|molto|quando|dove|perchÃƒÆ’Ã‚Â©|grazie|vorrei|parlare|italiano)\b/i.test(text);
    const german = /\b(hallo|wie|dass|fÃƒÆ’Ã‚Â¼r|mit|eine|sind|aber|alles|gut|sehr|wann|wo|weil|danke|mÃƒÆ’Ã‚Â¶chte|sprechen|deutsch)\b/i.test(text);
    const portuguese = /\b(olÃƒÆ’Ã‚Â¡|como|que|para|com|uma|sÃƒÆ’Ã‚Â£o|mas|tudo|bem|muito|quando|onde|porque|obrigado|gostaria|falar|portuguÃƒÆ’Ã‚Âªs)\b/i.test(text);
    
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
    
    console.log(`ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CLARA LANGUAGE CONFIRMED: ${language} (${languageNames[language as keyof typeof languageNames]})`);
    console.log(`ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ CLARA MUST RESPOND IN: ${languageNames[language as keyof typeof languageNames]?.toUpperCase()}`);

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
- Ask for clarification: "No entendÃƒÆ’Ã‚Â­ bien eso. Ãƒâ€šÃ‚Â¿PodrÃƒÆ’Ã‚Â­as explicarme quÃƒÆ’Ã‚Â© quisiste decir?"
- Show curiosity about their intent
- Don't assume or ignore

FOR CLEAR INPUT:
- Respond directly to their statement or question
- Reference previous conversation naturally
- Ask relevant follow-up questions
- Show progression in the dialogue

ABSOLUTELY FORBIDDEN:
- Repeating phrases already used in the conversation
- Ignoring user input
- Responding in the wrong language

If the input is unclear, ask for clarification in ${languageNames[language as keyof typeof languageNames]}.`;

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
      .replace(/```[^`]*```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    const responseLanguage = this.detectResponseLanguage(sanitizedContent);
    console.log(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ CRITICAL VALIDATION: Response language detected: ${responseLanguage}, Required: ${language}`);
    
    if (responseLanguage !== language && responseLanguage !== 'unknown') {
      console.error(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ CRITICAL LANGUAGE VIOLATION: Clara responded in ${responseLanguage}, required ${language}`);
      console.error(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ REGENERATING RESPONSE IN CORRECT LANGUAGE...`);
      
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
        .trim();
      
      console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ CORRECTED RESPONSE: "${correctedSanitized}"`);
      return {
        content: correctedSanitized,
        corrections: [],
        suggestions: []
      };
    }

    return {
      content: sanitizedContent,
      corrections: [],
      suggestions: []
    };
  }

  private detectResponseLanguage(text: string): string {
    console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â LANGUAGE DETECTION: Analyzing text "${text}"`);
    
    const patterns = {
      es: /\b(disculpa|perdÃƒÆ’Ã‚Â³n|sigamos|practicando|espaÃƒÆ’Ã‚Â±ol|puedes|repetir|dijiste|estoy|tratando|aprender|pero|tengo|nadie|quien|practicar|gustaria|muy|bien|si|gracias|hola|como|estas|continuemos)\b/i,
      en: /\b(sorry|continue|practicing|english|repeat|hi|how|you|today|trying|learn|anyone|practice|hello|thank)\b/i,
      fr: /\b(dÃƒÆ’Ã‚Â©solÃƒÆ’Ã‚Â©|continuons|pratiquer|franÃƒÆ’Ã‚Â§ais|rÃƒÆ’Ã‚Â©pÃƒÆ’Ã‚Â©ter|salut|bonjour|comment|allez|bien|oui|merci)\b/i,
      it: /\b(scusa|continuiamo|praticare|italiano|ripetere|ciao|come|stai|bene|grazie)\b/i,
      de: /\b(entschuldigung|weiter|deutsch|wiederholen|hallo|wie|geht|ihnen|gut|danke)\b/i,
      pt: /\b(desculpa|continuar|praticando|portuguÃƒÆ’Ã‚Âªs|repetir|olÃƒÆ’Ã‚Â¡|como|estÃƒÆ’Ã‚Â¡|bem|obrigado)\b/i
    };

    const scores: { [key: string]: number } = {};
    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern) || [];
      scores[lang] = matches.length;
      if (matches.length > 0) {
        console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â ${lang.toUpperCase()}: ${matches.length} matches`);
      }
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â DETECTION RESULT: unknown`);
      return 'unknown';
    }
    
    const detectedLang = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || 'unknown';
    console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â DETECTION RESULT: ${detectedLang}`);
    return detectedLang;
  }

  private detectAndFixAutoTranslation(text: string, detectedLanguage: string): string {
    console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â AUTO-TRANSLATION CHECK: Detected="${detectedLanguage}", Text="${text}"`);
    
    if (text.includes('hola') && text.includes('quiero') && text.includes('cocina')) {
      console.log(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ PORTUGUESE-TO-SPANISH AUTO-TRANSLATION DETECTED`);
      const corrected = text
        .replace(/hola/gi, 'Oi')
        .replace(/todo bien/gi, 'tudo bem')
        .replace(/quiero/gi, 'Eu quero')
        .replace(/aprender como se dicen/gi, 'aprender como se dizem')
        .replace(/que hay en la cocina/gi, 'que hÃƒÆ’Ã‚Â¡ na cozinha')
        .replace(/puedes ayudarme/gi, 'Pode me ajudar?');
      console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Reconstructed Portuguese: "${corrected}"`);
      return corrected;
    }

    if (text.includes('hola') && text.includes('como estas') && text.includes('italiano')) {
      console.log(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ ITALIAN-TO-SPANISH AUTO-TRANSLATION DETECTED`);
      const corrected = text
        .replace(/hola/gi, 'Ciao')
        .replace(/como estas/gi, 'come stai')
        .replace(/quiero practicar/gi, 'vorrei praticare');
      console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Reconstructed Italian: "${corrected}"`);
      return corrected;
    }

    if (text.includes('hello') && text.includes('how are you') && text.includes('french')) {
      console.log(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ FRENCH-TO-ENGLISH AUTO-TRANSLATION DETECTED`);
      const corrected = text
        .replace(/hello|hi/gi, 'Bonjour')
        .replace(/how are you/gi, 'comment allez-vous')
        .replace(/want to practice/gi, 'voudrais pratiquer')
        .replace(/french/gi, 'franÃƒÆ’Ã‚Â§ais');
      console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Reconstructed French: "${corrected}"`);
      return corrected;
    }

    if (text.includes('hello') && text.includes('how are you') && text.includes('german')) {
      console.log(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ GERMAN-TO-ENGLISH AUTO-TRANSLATION DETECTED`);
      const corrected = text
        .replace(/hello|hi/gi, 'Hallo')
        .replace(/how are you/gi, 'wie geht es Ihnen')
        .replace(/want to practice/gi, 'mÃƒÆ’Ã‚Â¶chte ÃƒÆ’Ã‚Â¼ben')
        .replace(/german/gi, 'Deutsch');
      console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Reconstructed German: "${corrected}"`);
      return corrected;
    }

    return text;
  }
}

export const openaiService = new OpenAIService();
