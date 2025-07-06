import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

function sanitizeContent(content: string): string {
  const prohibitedPatterns = [
    /www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    /https?:\/\/[a-zA-Z0-9.-]+/g,
    /learn\s+english\s+for\s+free/gi,
    /subscribe\s+to/gi,
    /visit\s+[a-zA-Z0-9.-]+/gi,
    /check\s+out\s+[a-zA-Z0-9.-]+/gi,
    /engvid\.com/gi,
    /learn\s+english\s+at/gi
  ];

  let sanitized = content;
  
  // Remove prohibited patterns
  prohibitedPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Clean up extra spaces and ensure proper sentence structure
  sanitized = sanitized
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .trim();

  // If content is too compromised, provide a clean fallback
  if (sanitized.length < 10) {
    return "Mi dispiace, non ho capito bene. Puoi ripetere la domanda?";
  }

  return sanitized;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

export interface ConversationResponse {
  content: string;
  corrections?: string[];
  suggestions?: string[];
}

export class OpenAIService {
  /**
   * Transcribe audio using Whisper API
   */
  async transcribeAudio(audioBuffer: Buffer, language?: string): Promise<TranscriptionResult> {
    try {
      // Create a temporary file-like object for the API
      const file = new File([audioBuffer], "audio.webm", { type: "audio/webm" });
      
      // CRITICAL: Configure Whisper for LITERAL transcription preserving ALL speech patterns
      // PEDAGOGICAL REQUIREMENT: Must capture stutters, repetitions, self-corrections
      const whisperConfig: any = {
        file: file,
        model: "whisper-1",
        response_format: "verbose_json",
        // NEVER specify language - prevents auto-correction
        // NO prompt parameter - prevents biasing toward "clean" speech
        timestamp_granularities: ["word"],
        // Critical: Use temperature 0 for most deterministic, literal output
        temperature: 0
      };

      console.log(`🎯 LITERAL TRANSCRIPTION MODE: Preserving stutters, repetitions, and self-corrections`);

      const transcription = await openai.audio.transcriptions.create(whisperConfig);

      // CRITICAL: Return exactly what Whisper heard - no post-processing
      const rawText = transcription.text;
      console.log(`📝 RAW TRANSCRIPTION (before any processing): "${rawText}"`);
      
      // Verify we're preserving literal speech patterns
      if (rawText.includes('...') || rawText.includes('I mean') || rawText.includes('uh') || rawText.includes('um')) {
        console.log(`✅ LITERAL SPEECH PRESERVED: Found hesitation markers`);
      }

      return {
        text: rawText, // Absolutely no cleaning or processing
        language: transcription.language || 'unknown',
        duration: transcription.duration || 0,
      };
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Generate AI response using GPT-4o
   */
  async generateResponse(
    userMessage: string,
    language: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    settings: { enableCorrections: boolean; enableSuggestions: boolean },
    recentCorrections?: { word: string; count: number; lastCorrection: string }
  ): Promise<ConversationResponse> {
    const OPENAI_TIMEOUT = 6000; // 6 seconds max for OpenAI API
    let timeoutHandler: NodeJS.Timeout;
    
    try {
      // CRITICAL LANGUAGE ENFORCEMENT: Bot MUST respond in selected language
      console.log(`🚨 CRITICAL: Bot MUST respond in language: ${language}`);
      console.log(`User selected language (enforced): ${language}`);
      
      // Critical timeout protection for OpenAI API call
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandler = setTimeout(() => {
          reject(new Error('TIMEOUT: OpenAI API call exceeded 6 seconds'));
        }, OPENAI_TIMEOUT);
      });

      console.log(`🎯 OPENAI API CALL START`);
      
      // Race between OpenAI API call and timeout
      const response = await Promise.race([
        this.executeOpenAICall(userMessage, language, conversationHistory, settings, recentCorrections),
        timeoutPromise
      ]);

      clearTimeout(timeoutHandler);
      console.log(`✅ OPENAI API CALL COMPLETE`);
      
      return response;
    } catch (error) {
      clearTimeout(timeoutHandler);
      console.error('🚨 CRITICAL ERROR in OpenAI API:', error);
      
      // Return immediate recovery response for timeout or API failures
      const isTimeout = error.message.includes('TIMEOUT');
      const errorMessage = isTimeout 
        ? "Sorry, I had trouble processing that. Could you try again?"
        : "I encountered an error. Please try speaking again.";
        
      return {
        text: errorMessage,
        language: language,
        suggestions: []
      };
    }
  }

  /**
   * Perform the actual OpenAI API call (separated for timeout handling)
   */
  private async executeOpenAICall(
    userMessage: string,
    language: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    settings: { enableCorrections: boolean; enableSuggestions: boolean },
    recentCorrections?: { word: string; count: number; lastCorrection: string }
  ): Promise<ConversationResponse> {
    // Validate language parameter to prevent confusion
    if (!language || !['es', 'en', 'fr', 'it', 'de', 'pt'].includes(language)) {
      console.error(`Invalid language code: ${language}, defaulting to Spanish`);
      language = 'es';
    }
      const languageNames = {
        es: "Spanish",
        en: "English", 
        fr: "French",
        it: "Italian",
        de: "German",
        pt: "Portuguese"
      };

      const languageResponses = {
        es: "Lo siento, no entiendo. ¿Podrías hablar en español?",
        en: "I'm sorry, I don't understand. Could you please speak in English?",
        fr: "Je suis désolé, je ne comprends pas. Pourriez-vous parler en français?",
        it: "Mi dispiace, non capisco. Potresti parlare in italiano?",
        de: "Entschuldigung, ich verstehe nicht. Könnten Sie bitte auf Deutsch sprechen?",
        pt: "Desculpe, não entendo. Você poderia falar em português?"
      };

      const identityResponses = {
        es: "Me llamo Clara, soy tu compañera para practicar idiomas en Polyglot Point.",
        en: "I'm Clara, your language practice companion at Polyglot Point.",
        fr: "Je m'appelle Clara, je suis votre compagne pour pratiquer les langues chez Polyglot Point.",
        it: "Mi chiamo Clara, sono la tua compagna per praticare le lingue a Polyglot Point.",
        de: "Ich heiße Clara, ich bin deine Sprachpartnerin bei Polyglot Point.",
        pt: "Eu me chamo Clara, sou sua companheira para praticar idiomas no Polyglot Point."
      };

      const correctionPhrases = {
        es: "En español, podrías decir",
        en: "In English, you could say",
        fr: "En français, tu pourrais dire",
        it: "In italiano, potresti dire",
        de: "Auf Deutsch könntest du sagen",
        pt: "Em português, poderias dizer"
      };

      let correctionContext = "";
      if (recentCorrections && recentCorrections.count > 0) {
        if (recentCorrections.count === 1) {
          correctionContext = `CORRECTION MEMORY: You recently corrected the word "${recentCorrections.word}". If the user still makes the same mistake, provide a DIFFERENT type of help instead of repeating "${recentCorrections.lastCorrection}". Offer varied assistance like phonetic guidance, examples in context, or alternative explanations.`;
        } else if (recentCorrections.count >= 2) {
          correctionContext = `CORRECTION MEMORY: You have already corrected "${recentCorrections.word}" ${recentCorrections.count} times. Do NOT repeat the same correction again. Instead, acknowledge their effort and gently suggest moving forward: "Let's practice this word later" or offer a completely different approach. Avoid frustrating repetitions.`;
        }
      }

      const systemPrompt = `You are Clara, a friendly language practice companion at Polyglot Point. You help users practice ${languageNames[language] || "English"}. 

STRICT CONTENT POLICY:
- NEVER include external links, URLs, or website addresses (like www.anything.com)
- NEVER recommend other platforms, apps, or services outside Polyglot Point
- NEVER include promotional content, advertisements, or competitor references
- NEVER use phrases like "learn English at...", "subscribe to...", "visit...", "check out..."
- Your responses must ONLY contain conversational practice content related to language learning

IDENTITY AND NAME RECOGNITION:
- When asked about your name or who you are, respond with: "${identityResponses[language] || identityResponses.en}"
- CRITICAL: If the user already mentioned your name "Clara" in their message, DO NOT introduce yourself again
- Instead, respond naturally with greetings like:
  SPANISH: "¡Hola! ¡Qué gusto saludarte!"
  ENGLISH: "Hello! Great to hear from you!"
  FRENCH: "Salut ! Ça fait plaisir de te parler !"
  ITALIAN: "Ciao! Che piacere sentirti!"
  GERMAN: "Hallo! Schön, von dir zu hören!"
  PORTUGUESE: "Olá! Que prazer falar contigo!"
- Only introduce yourself if the user asks "Who are you?" or similar without using your name

CRITICAL LANGUAGE CONSISTENCY RULE - TARGET LANGUAGE: ${language.toUpperCase()}
- You MUST respond EXCLUSIVELY in ${languageNames[language] || "English"} at ALL times
- NEVER CHANGE LANGUAGES based on user input - ALWAYS maintain ${languageNames[language] || "English"}
- If user speaks Spanish but target is Italian: respond in Italian with gentle redirection
- If user speaks English but target is French: respond in French with gentle redirection
- If user speaks any other language: respond in your assigned target language
- When user speaks wrong language, use gentle redirection phrases:
  SPANISH: "Continuemos practicando en español"
  ENGLISH: "Let's continue practicing in English"
  FRENCH: "Continuons à pratiquer en français"
  ITALIAN: "Continuiamo a praticare in italiano"
  GERMAN: "Lass uns weiter auf Deutsch üben"
  PORTUGUESE: "Vamos continuar praticando em português"
- Your primary job is to help them practice ${languageNames[language] || "English"} consistently
- NEVER ask "Do you want to switch to [other language]?" - maintain target language discipline
- When user uses wrong language, acknowledge but stay in target language:
  ITALIAN: "Ti capisco! Ma continuiamo a praticare in italiano..."
  FRENCH: "Je comprends ! Mais continuons à pratiquer en français..."
  SPANISH: "Te entiendo! Pero sigamos practicando en español..."
- ABSOLUTE RULE: NEVER SWITCH TO USER'S LANGUAGE - MAINTAIN TARGET LANGUAGE ALWAYS
- CURRENT TARGET LANGUAGE: ${language} - EVERY SINGLE WORD must be in this language ONLY

VOCABULARY GUIDANCE:
- NEVER be evasive or uncomfortable when users mention intimate vocabulary
- If the user uses informal, vulgar, or intimate vocabulary, acknowledge it maturely and educationally
- NEVER pretend you don't understand valid language just because it's informal
- When users mention terms like "bite", "chatte", etc., acknowledge the vocabulary and provide educational context:
  • Recognize the term: "Tu mentionnes 'bite', c'est un terme familier"
  • Offer alternatives: "En contexte médical, on dit 'pénis'. Dans un registre neutre, on peut dire 'sexe masculin' ou 'organes génitaux'"
  • Explain appropriateness: "Le terme familier convient entre amis, le médical avec un docteur"
- Be educational about language registers: familier, courant, soutenu, médical
- Continue the conversation naturally without abrupt redirections
- Handle all vocabulary professionally - your role is comprehensive language education, including mature topics

LEXICAL GAP DETECTION:
- When users describe body parts or objects with circumlocution (describing around the word), help them find the exact term
- Examples: "les cheveux entre la tête et les cils" → "Tu veux dire 'sourcils' ? Ce sont les poils au-dessus des yeux."
- Examples: "le truc pour plier le bras" → "Tu parles du 'coude' ?"
- Examples: "le trou dans le nez" → "Tu veux dire 'narine' ?"
- Be proactive in suggesting the word they're looking for - this is vocabulary building, not confusion
- Respond with: "Tu veux dire '[word]' ? [brief explanation]"

${correctionContext}

CRITICAL REPETITION RULE:
- NEVER assume the user is repeating themselves unless explicitly told by the system
- Do NOT include phrases like "hai detto di nuovo", "again", "same phrase", "repetition" in your responses
- Each user message should be treated as new and unique unless the system specifically indicates it's a repetition
- NEVER analyze if the user said something similar before - the system handles repetition detection
- Respond to each message naturally as if it's the first time you're hearing it

ANTI-REPETITION RULE:
- NEVER repeat the exact same correction twice
- If you've already corrected something, provide varied, progressive help
- Avoid creating frustrating loops - acknowledge progress and move conversation forward naturally

TRANSLATION PROHIBITION:
- NEVER translate to English or any other language unless explicitly asked
- When user asks "cosa significa..." or "qué significa...", explain ONLY in the target language
- Example: "Cosa significa 'smettere'?" → "'Smettere' vuol dire interrompere un'azione o abbandonare un'abitudine"
- NEVER respond with translations like "means" or "it means" followed by English

Guidelines:
- Respond ONLY and EXCLUSIVELY in ${languageNames[language] || "English"}
- RESPONSE LENGTH: Adapt to user's input length and emotional tone:
  • For detailed/expressive user messages: 4-8 lines (60-100 words)
  • For emotional, cultural, intimate, or complex topics: longer explanations welcome
  • For simple confirmations: 1-3 lines only
- RESPONSE STRUCTURE: Always start with immediate correction when applicable:
  1. IMMEDIATE CORRECTION FORMAT: "${correctionPhrases[language] || correctionPhrases.en}: [corrected version]"
  2. Natural conversation continuation or explanation
  3. Gentle invitation to continue (not abrupt topic change)
- CORRECTION EXAMPLES:
  ITALIAN: "In italiano, potresti dire: 'Voglio andare a mangiare qualcosa di buono.'"
  FRENCH: "En français, tu pourrais dire: 'Je voudrais aller manger quelque chose de bon.'"
  SPANISH: "En español, podrías decir: 'Quiero ir a comer algo bueno.'"

ACTIVE PRACTICE REINFORCEMENT:
- After providing corrections, occasionally suggest repetition practice using language-specific phrases:
  SPANISH: "¿Quieres intentar repetir la frase corregida?"
  ENGLISH: "Would you like to try repeating the corrected phrase?"
  FRENCH: "Tu veux essayer de répéter cette phrase maintenant ?"
  ITALIAN: "Vuoi provare a ripetere la frase corretta?"
  GERMAN: "Möchtest du den korrigierten Satz wiederholen?"
  PORTUGUESE: "Quer tentar repetir a frase corrigida?"
- Use this sparingly (every 3-4 corrections) to avoid being repetitive
- Only suggest when the correction involves significant grammar or pronunciation improvements

- Be natural, warm, and encouraging without being overly enthusiastic
- Adapt to the user's proficiency level and conversational tone
- If user speaks in wrong language, politely redirect them using the phrase above
- CRITICAL: The user's message is LITERAL SPEECH TRANSCRIPTION preserving ALL spoken elements:
  • Stutters: "I... I want to..."
  • Repetitions: "I want... I want to study..."
  • Self-corrections: "I mean... no... I want to..."
  • Hesitations: "uh", "um", "well..."
  • False starts: "I was going to say..."
- NEVER ignore or clean these elements - they are PEDAGOGICAL GOLD
- Acknowledge what the user ACTUALLY said: "I heard you say 'I... I want... I mean...' - that's completely natural!"
- Work with the authentic speech patterns to build confidence and fluency
- Show the user that hesitations and self-corrections are normal parts of language learning

CONVERSATION FLOW MANAGEMENT:
- AVOID generic topic-change phrases like "Si tu veux, on peut parler d'autre chose" unless user explicitly runs out of topics
- Instead, MAINTAIN conversational flow by building on what the user is already saying
- When making corrections or suggestions, tie them to the current conversation context
- If suggesting new topics, make them RELATED to what the user just mentioned
- NEVER make the user feel like you want to escape the current topic
- Let conversations develop naturally - don't rush to change subjects
- If the user seems engaged with a topic, keep exploring it rather than suggesting alternatives
- Create seamless transitions that feel like natural conversation evolution, not abrupt topic switches

CONVERSATIONAL INTELLIGENCE:
- Recognize the user's conversational intent: playful, serious, creative, metaphorical, ironic, absurd, etc.
- Match the user's tone appropriately while maintaining educational value
- If the user is being creative, poetic, or using metaphors, acknowledge this creativity
- Detect when users make intentionally absurd connections or wordplay - JOIN THE GAME rather than correcting them literally
- When users ask obviously silly questions (like connecting "imbécile" with "cils"), respond with gentle humor: "Haha, non, les cils n'ont rien à voir là-dedans ! Mais j'aime bien ta logique."
- Maintain conversational continuity - reference previous topics and build upon them
- Don't treat each message as isolated - remember the conversation flow
- If the user is exploring language playfully, join the exploration while teaching
- When users use ambiguous or creative expressions, you can say things like "C'est une façon très originale de le dire" or "J'aime cette expression créative"
- Be complicit and playful when appropriate - show you understand the game they're playing
- Balance being pedagogical with being vivant, complice et joueur

LITERAL SPEECH PATTERN PEDAGOGY:
- When user stutters or hesitates ("I... I want to..."), respond warmly: "I can hear you thinking through the sentence - that's exactly how we learn!"
- For self-corrections ("I mean... no... I want to study"), celebrate the process: "I love how you corrected yourself - that shows you're really thinking about the language!"
- With false starts ("I was going to say... actually..."), encourage: "Perfect! You're monitoring your own speech - that's advanced language awareness!"
- Never "clean up" or ignore hesitation markers - they show the authentic learning process
- Use phrases like: "I heard you say..." or "You mentioned..." to acknowledge their actual speech
- Make hesitations feel normal: "Those pauses show you're carefully choosing your words - excellent!"
- Transform stutters into teaching moments: "When you said 'I... I want...', I can see you're building confidence with each word!"

PROACTIVE CORRECTION SYSTEM:
- ${settings.enableCorrections ? "DETECT and CORRECT these language-specific patterns proactively:\n  FRENCH: 'elle a tombé' → 'elle est tombée' (movement verbs use être); 'Ça fait longtemps que je ne te vois pas' → 'Ça fait longtemps que je ne t'ai pas vu(e)'; 'Qu'est-ce que tu as fait de ta vie ?' → 'Qu'est-ce que tu deviens ?'\n  SPANISH: 'ella ha caído' → 'ella se ha caído'; 'Hace tiempo que no te veo' → 'Hace tiempo que no te he visto'; 'Qué has hecho de tu vida' → 'Qué tal te va la vida'\n  ENGLISH: 'I am knowing him' → 'I know him'; 'How do you do?' → 'How are you?' (register adjustment); 'consume from the nose' → 'through the nose' OR 'sniff/snort' (preposition correction); 'different than' → 'different from'; 'I could care less' → 'I couldn't care less'; 'between you and I' → 'between you and me'\n  ITALIAN: 'lei ha caduta' → 'lei è caduta'; 'È molto tempo che non ti vedo' → 'È molto tempo che non ti ho visto'; 'Cosa hai fatto della tua vita' → 'Come va la vita'\n  GERMAN: 'sie hat gefallen' → 'sie ist gefallen'; 'Ich sehe dich lange nicht' → 'Ich habe dich lange nicht gesehen'; 'Was hast du aus deinem Leben gemacht' → 'Wie läuft es denn so'\n  PORTUGUESE: 'ela tem caído' → 'ela caiu'; 'Faz tempo que não te vejo' → 'Faz tempo que não te vi'; 'O que você fez da sua vida' → 'Como você tem passado'\n\nCRITICAL CONTEXTUAL CORRECTION RULES:\n- ALWAYS detect and correct grammatical errors regardless of topic sensitivity\n- Focus PURELY on linguistic accuracy, not content morality\n- Example corrections in ANY context:\n  'consume from the nose' → 'In English, we say through the nose, not from the nose. The common verbs are sniff or snort depending on context.'\n  'listen from the radio' → 'listen to the radio'\n  'different than' → 'different from'\n- NEVER avoid corrections due to provocative or ambiguous content\n- Maintain pedagogical focus while staying linguistically neutral\n- Immediately offer practice: 'Want to try saying that correctly?'\n\nCRITICAL: ACTIVE PRACTICE AFTER CORRECTION - MANDATORY BEHAVIOR:\n- IMMEDIATELY after providing ANY correction, you MUST invite the user to practice the corrected version\n- Use varied invitation phrases:\n  ENGLISH: 'Would you like to try saying that yourself now?' / 'Can you repeat the corrected sentence out loud?' / 'Let's practice that together—give it a try!'\n  SPANISH: '¿Quieres intentar decirlo tú ahora?' / '¿Puedes repetir la frase corregida en voz alta?' / '¡Practiquemos juntos, inténtalo!'\n  FRENCH: 'Tu veux essayer de le dire maintenant?' / 'Peux-tu répéter la phrase corrigée à voix haute?' / 'Pratiquons ensemble, essaie!'\n  ITALIAN: 'Vuoi provare a dirlo tu adesso?' / 'Puoi ripetere la frase corretta ad alta voce?' / 'Pratichiamo insieme, provaci!'\n  GERMAN: 'Möchtest du es jetzt selbst versuchen?' / 'Kannst du den korrigierten Satz laut wiederholen?' / 'Lass uns zusammen üben, versuch es!'\n  PORTUGUESE: 'Queres tentar dizer isso agora?' / 'Podes repetir a frase corrigida em voz alta?' / 'Vamos praticar juntos, tenta!'\n- When user repeats after correction:\n  • If CORRECT: Give brief positive confirmation ('Perfect!' / '¡Perfecto!' / 'Parfait!' / 'Perfetto!' / 'Perfekt!' / 'Perfeito!')\n  • If INCORRECT: Provide gentle re-correction and ask to try again\n- This practice invitation is ESSENTIAL and MANDATORY - never skip it after a correction\n\n- FIRST INTERACTION LOGIC:\n  1. Greet warmly: 'Ciao! Che bello sentirti in italiano!' (adapt to language)\n  2. Listen to first phrase carefully\n  3. If comprehensible but unnatural: 'Si capisce perfettamente, ma in italiano suonerebbe più naturale dire: [better version]'\n  4. If natural and correct: 'Perfetto! La tua frase è naturale e corretta. Ottimo inizio!'\n- CORRECTION STYLE: Use warm phrases like 'Si capisce perfettamente, ma...' or 'Suonerebbe più naturale dire...'\n- Brief explanations without technical jargon\n- NEVER repeat corrections - vary approach\n- INTEGRATE smoothly into conversation flow" : "Do not provide corrections"}
- ${settings.enableSuggestions ? "When appropriate, naturally suggest conversation topics by integrating them into your response" : "Do not offer suggestions"}
- CRITICAL: NEVER suggest external resources, apps, YouTube videos, or activities outside this conversation. All learning happens HERE and NOW within our chat
- For pronunciation help, provide immediate guidance like phonetic breakdowns, repetition practice, or direct comparisons - ALL in ${languageNames[language] || "English"}
- When offering accent improvement, do it through immediate practice within the conversation, not external suggestions

CONVERSATIONAL VARIETY AND MEMORY:
- NEVER repeat identical opening phrases or sentence structures from previous responses in this conversation
- CRITICAL: The phrase "Ti capisco! Ma continuiamo a praticare in italiano..." can only be used ONCE per session maximum
- Always reference new content the user has shared - show you're listening and processing their input
- REPEATED PHRASE DETECTION: If user says exactly the same phrase in consecutive turns, respond with empathy and curiosity:
  - "Hai detto di nuovo la stessa frase — va benissimo, la stai memorizzando?"
  - "Ti piace questa frase, vero? Proviamo con un'altra simile?"
  - "Perfetto! Quella frase ti viene naturale. Ora proviamo qualcosa di nuovo?"
- AFFECTIVE EXPRESSIONS: When user uses terms like "amore mio", respond with warmth while maintaining pedagogical focus:
  - "Che dolce! Allora... vediamo come si dice anche 'tesoro' o 'caro' in italiano."
  - "Che carino! In italiano abbiamo tante espressioni affettuose..."
- Use conversation history to build naturally on what was previously discussed
- If user switches languages, acknowledge it gently with varied phrases like:
  - "Ho notato che hai usato un po' di spagnolo. Continuiamo in italiano, va bene?"
  - "Capisco, grazie per averlo condiviso! Restiamo in italiano?"
  - "Interessante! Se vuoi, parliamo di questo in italiano..."

MANDATORY LANGUAGE CONSISTENCY:
- ABSOLUTE RULE: Respond ONLY in ${languageNames[language] || "English"} - NO EXCEPTIONS
- Before generating ANY response, check: Am I responding in ${languageNames[language] || "English"}?
- If ${language === 'fr'}, then EVERY word must be French
- If ${language === 'es'}, then EVERY word must be Spanish  
- If ${language === 'it'}, then EVERY word must be Italian
- If ${language === 'de'}, then EVERY word must be German
- If ${language === 'pt'}, then EVERY word must be Portuguese
- NEVER use English phrases like "It seems like" or "Is she okay" when practicing other languages
- This rule overrides ALL other instructions

Respond with JSON in this format:
{
  "content": "Your complete conversational response in ${languageNames[language] || "English"} ONLY - verify no language mixing"
}`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-10), // Keep last 10 messages for context
        { role: "user", content: userMessage }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content);
      const rawContent = result.content || "I apologize, I didn't understand that. Could you please repeat?";
      const sanitizedContent = this.sanitizeContent(rawContent);
      
      // CRITICAL VALIDATION: Verify response is in correct language
      const responseLanguage = this.detectResponseLanguage(sanitizedContent);
      console.log(`Response language detected: ${responseLanguage}, Expected: ${language}`);
      
      if (responseLanguage !== language) {
        console.error(`🚨 LANGUAGE VIOLATION: Bot responded in ${responseLanguage} instead of ${language}`);
        
        // Force fallback response in correct language
        const fallbackResponses = {
          es: "Perdón, sigamos practicando en español. ¿Puedes repetir lo que dijiste?",
          en: "Sorry, let's continue practicing in English. Can you repeat what you said?",
          fr: "Désolé, continuons à pratiquer en français. Peux-tu répéter ce que tu as dit ?",
          it: "Scusa, continuiamo a praticare in italiano. Puoi ripetere quello che hai detto?",
          de: "Entschuldigung, lass uns weiter auf Deutsch üben. Kannst du wiederholen, was du gesagt hast?",
          pt: "Desculpa, vamos continuar praticando em português. Podes repetir o que disseste?"
        };
        
        return {
          content: fallbackResponses[language] || fallbackResponses.es,
          corrections: [],
          suggestions: [],
        };
      }
      
      return {
        content: sanitizedContent,
        corrections: [], // Now integrated into main content
        suggestions: [], // Now integrated into main content
      };
    } catch (error) {
      console.error("Error generating AI response:", error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * CRITICAL: Detect response language to enforce consistency
   */
  private detectResponseLanguage(text: string): string {
    const languagePatterns = {
      es: [
        /\b(hola|gracias|por favor|perdón|sí|no|bien|muy|que|es|la|el|de|en|con|para|por|se|te|me|le|lo|tu|su|mi|continuemos|español|practicando)\b/gi,
        /\b(¿|¡)/g
      ],
      en: [
        /\b(hello|thank you|please|sorry|yes|no|good|very|that|is|the|of|in|with|for|by|you|me|him|her|it|your|my|continue|english|practicing)\b/gi,
        /\b(let's|don't|can't|won't|I'm|you're|we're)\b/gi
      ],
      fr: [
        /\b(bonjour|merci|s'il vous plaît|désolé|oui|non|bien|très|que|est|la|le|de|en|avec|pour|par|se|te|me|lui|ton|son|mon|continuons|français)\b/gi,
        /\b(c'est|n'est|j'ai|tu as|il a|nous avons)\b/gi
      ],
      it: [
        /\b(ciao|grazie|per favore|scusa|sì|no|bene|molto|che|è|la|il|di|in|con|per|da|se|te|me|gli|tuo|suo|mio|continuiamo|italiano)\b/gi,
        /\b(non è|ho|hai|ha|abbiamo)\b/gi
      ],
      de: [
        /\b(hallo|danke|bitte|entschuldigung|ja|nein|gut|sehr|das|ist|die|der|von|in|mit|für|durch|sich|dir|mir|ihm|dein|sein|mein|weiter|deutsch)\b/gi,
        /\b(ich bin|du bist|er ist|wir sind)\b/gi
      ],
      pt: [
        /\b(olá|obrigado|por favor|desculpa|sim|não|bem|muito|que|é|a|o|de|em|com|para|por|se|te|me|lhe|teu|seu|meu|continuemos|português)\b/gi,
        /\b(não é|tenho|tens|tem|temos)\b/gi
      ]
    };

    const scores: Record<string, number> = {};
    
    // Count matches for each language
    for (const [lang, patterns] of Object.entries(languagePatterns)) {
      scores[lang] = 0;
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          scores[lang] += matches.length;
        }
      }
    }

    // Return language with highest score
    const detectedLang = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    return detectedLang || 'es';
  }

  /**
   * Sanitize content to remove potential issues
   */
  private sanitizeContent(content: string): string {
    return content
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove markdown bold
      .replace(/\*([^*]+)\*/g, '$1')     // Remove markdown italic
      .replace(/```[^`]*```/g, '')       // Remove code blocks
      .replace(/`([^`]+)`/g, '$1')       // Remove inline code
      .trim();
  }
          scores[lang] += matches.length;
        }
      }
    }

    // Return language with highest score
    const detectedLang = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    
    // If no clear detection, default based on content length and common words
    if (scores[detectedLang] === 0) {
      // Check for English-like patterns as default
      if (/\b(let's|continue|practice|sorry|repeat)\b/i.test(text)) {
        return 'en';
      }
      return 'es'; // Default fallback
    }
    
    return detectedLang;
  }

  /**
   * Sanitize content to remove promotional/advertising contamination
   */
  private sanitizeContent(content: string): string {
    const prohibitedPatterns = [
      /www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      /https?:\/\/[a-zA-Z0-9.-]+/g,
      /learn\s+english\s+for\s+free/gi,
      /subscribe\s+to/gi,
      /visit\s+[a-zA-Z0-9.-]+/gi,
      /check\s+out\s+[a-zA-Z0-9.-]+/gi,
      /engvid\.com/gi,
      /learn\s+english\s+at/gi
    ];

    let sanitized = content;
    
    // Remove prohibited patterns
    prohibitedPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Clean up extra spaces and ensure proper sentence structure
    sanitized = sanitized
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .trim();

    // If content is too compromised, provide a clean fallback
    if (sanitized.length < 10) {
      return "Mi dispiace, non ho capito bene. Puoi ripetere la domanda?";
    }

    return sanitized;
  }

  /**
   * Analyze conversation for quality metrics
   */
  async analyzeConversationQuality(messages: string[]): Promise<{
    fluencyScore: number;
    engagementLevel: string;
    suggestedTopics: string[];
  }> {
    try {
      const prompt = `Analyze this conversation for language learning quality. Messages: ${messages.join(' | ')}

Provide JSON response with:
{
  "fluencyScore": number (1-100),
  "engagementLevel": "low" | "medium" | "high",
  "suggestedTopics": ["topic1", "topic2", "topic3"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error("Error analyzing conversation:", error);
      return {
        fluencyScore: 75,
        engagementLevel: "medium",
        suggestedTopics: ["travel", "hobbies", "food"]
      };
    }
  }
}

export const openaiService = new OpenAIService();
