import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface PronunciationIssue {
  detected: boolean;
  originalWord?: string;
  intendedWord?: string;
  suggestion?: string;
}

interface PronunciationAnalysisResult {
  hasIssue: boolean;
  feedback?: string;
  shouldCorrect: boolean;
}

export class PronunciationAnalyzer {
  private commonMispronunciations = {
    en: [
      { heard: "tree", intended: "three", tip: "Put your tongue between your teeth for 'th'" },
      { heard: "dis", intended: "this", tip: "Remember the 'th' sound at the beginning" },
      { heard: "tank", intended: "thank", tip: "Use the 'th' sound, not 't'" },
      { heard: "sing", intended: "think", tip: "Start with 'th', not just 's'" },
      { heard: "sheet", intended: "shit", tip: "Be careful with the vowel length" },
      { heard: "beach", intended: "bitch", tip: "The 'ea' makes a long 'e' sound" },
      { heard: "bear", intended: "beer", tip: "Notice the difference: 'bear' vs 'beer'" },
      { heard: "live", intended: "leave", tip: "Long 'e' sound at the end" },
      { heard: "ship", intended: "sheep", tip: "Long 'ee' sound in sheep" },
      { heard: "it", intended: "eat", tip: "Long 'e' sound: 'eat'" },
      { heard: "kitchen", intended: "chicken", tip: "Start with 'ch' not 'k'" },
      { heard: "focus", intended: "focus", tip: "Stress on the first syllable: FOcus" }
    ],
    es: [
      { heard: "pero", intended: "perro", tip: "Rueda la 'rr' con más fuerza" },
      { heard: "casa", intended: "caza", tip: "La 's' es sorda, la 'z' es sonora" },
      { heard: "beso", intended: "peso", tip: "La 'b' se pronuncia más suave" },
      { heard: "ola", intended: "hola", tip: "No olvides la 'h' aspirada" },
      { heard: "año", intended: "ano", tip: "La 'ñ' es importante en español" }
    ],
    fr: [
      { heard: "tu", intended: "tout", tip: "La 'u' francesa es más cerrada" },
      { heard: "bon", intended: "bonne", tip: "La 'n' final se pronuncia en femenino" },
      { heard: "rue", intended: "roue", tip: "Diferencia entre 'u' y 'ou'" },
      { heard: "vin", intended: "vain", tip: "Nasales diferentes: 'in' vs 'ain'" }
    ],
    it: [
      { heard: "casa", intended: "cassa", tip: "La doble 's' se pronuncia más fuerte" },
      { heard: "ano", intended: "anno", tip: "La doble 'n' es importante" },
      { heard: "polo", intended: "pollo", tip: "La doble 'l' se pronuncia diferente" }
    ],
    de: [
      { heard: "ich", intended: "ach", tip: "Diferentes sonidos de 'ch'" },
      { heard: "sie", intended: "sie", tip: "La 's' inicial es sonora" },
      { heard: "wine", intended: "wein", tip: "La 'w' alemana suena como 'v'" }
    ],
    pt: [
      { heard: "casa", intended: "caça", tip: "La 'ç' tiene sonido de 's'" },
      { heard: "ano", intended: "ânho", tip: "El sonido nasal es importante" },
      { heard: "nossa", intended: "nossa", tip: "La doble 's' es sorda" }
    ]
  };

  /**
   * Analyze potential pronunciation issues by comparing transcription with expected content
   */
  async analyzePronunciation(
    transcribedText: string,
    conversationContext: string[],
    language: string
  ): Promise<PronunciationAnalysisResult> {
    try {
      // Step 1: Check for common mispronunciations
      const commonIssue = this.checkCommonMispronunciations(transcribedText, language);
      if (commonIssue.detected) {
        return {
          hasIssue: true,
          shouldCorrect: true,
          feedback: this.generatePronunciationFeedback(commonIssue, language)
        };
      }

      // Step 2: Use GPT-4o to analyze contextual pronunciation issues
      const contextualIssue = await this.analyzeContextualPronunciation(
        transcribedText,
        conversationContext,
        language
      );

      return contextualIssue;
    } catch (error) {
      console.error('Error analyzing pronunciation:', error);
      return { hasIssue: false, shouldCorrect: false };
    }
  }

  /**
   * Check against known common mispronunciations
   */
  private checkCommonMispronunciations(text: string, language: string): PronunciationIssue {
    const commonErrors = this.commonMispronunciations[language] || [];
    const lowerText = text.toLowerCase();

    for (const error of commonErrors) {
      // Check if the heard word appears in the text
      if (lowerText.includes(error.heard.toLowerCase())) {
        // Simple heuristic: if context suggests they meant the intended word
        return {
          detected: true,
          originalWord: error.heard,
          intendedWord: error.intended,
          suggestion: error.tip
        };
      }
    }

    return { detected: false };
  }

  /**
   * Use GPT-4o to analyze pronunciation based on conversation context
   */
  private async analyzeContextualPronunciation(
    transcribedText: string,
    conversationContext: string[],
    language: string
  ): Promise<PronunciationAnalysisResult> {
    try {
      const languageNames = {
        en: "English",
        es: "Spanish", 
        fr: "French",
        it: "Italian",
        de: "German",
        pt: "Portuguese"
      };

      const prompt = `You are a pronunciation expert for ${languageNames[language] || "English"}. 

Analyze if there might be a pronunciation issue based on:
1. What the user said (transcribed): "${transcribedText}"
2. Conversation context: ${conversationContext.slice(-3).join(' ')}

Look for signs that the user may have mispronounced words, such as:
- Unusual word combinations that don't make sense in context
- Words that sound similar to what they probably meant to say
- Missing or incorrect sounds that are common pronunciation challenges

Only flag this as a pronunciation issue if you're confident there's a mispronunciation. Don't flag normal grammar mistakes.

Respond with JSON:
{
  "hasIssue": boolean,
  "shouldCorrect": boolean,
  "problematicWord": "word that was mispronounced",
  "likelyIntended": "what they probably meant to say",
  "feedback": "gentle correction in ${languageNames[language] || "English"}"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 300,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        hasIssue: result.hasIssue || false,
        shouldCorrect: result.shouldCorrect || false,
        feedback: result.feedback
      };
    } catch (error) {
      console.error('Error in contextual pronunciation analysis:', error);
      return { hasIssue: false, shouldCorrect: false };
    }
  }

  /**
   * Generate feedback message for pronunciation issues
   */
  private generatePronunciationFeedback(issue: PronunciationIssue, language: string): string {
    const templates = {
      en: `I heard "${issue.originalWord}", but I think you meant "${issue.intendedWord}". ${issue.suggestion} Would you like to try saying it again?`,
      es: `Escuché "${issue.originalWord}", pero creo que querías decir "${issue.intendedWord}". ${issue.suggestion} ¿Quieres intentar decirlo otra vez?`,
      fr: `J'ai entendu "${issue.originalWord}", mais je pense que vous vouliez dire "${issue.intendedWord}". ${issue.suggestion} Voulez-vous essayer de le dire à nouveau?`,
      it: `Ho sentito "${issue.originalWord}", ma penso che volevi dire "${issue.intendedWord}". ${issue.suggestion} Vuoi provare a dirlo di nuovo?`,
      de: `Ich hörte "${issue.originalWord}", aber ich denke, Sie meinten "${issue.intendedWord}". ${issue.suggestion} Möchten Sie es noch einmal versuchen?`,
      pt: `Ouvi "${issue.originalWord}", mas acho que você queria dizer "${issue.intendedWord}". ${issue.suggestion} Quer tentar dizer novamente?`
    };

    return templates[language] || templates.en;
  }
}

export const pronunciationAnalyzer = new PronunciationAnalyzer();