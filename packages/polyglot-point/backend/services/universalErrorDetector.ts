import OpenAI from "openai";

export class UniversalErrorDetector {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Basic error detector for spelling, grammar, and syntax
   * Catches obvious mistakes before checking artificial constructions
   */
  async detectBasicErrors(userInput: string, language: string): Promise<Array<{wrong: string, correct: string}>> {
    try {
      console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â BASIC ERROR DETECTION: Analyzing "${userInput}" in ${language}`);
      
      // Skip error detection for common valid greetings and short phrases
      const validCommonPhrases = [
        'hi', 'hello', 'hey', 'good', 'morning', 'afternoon', 'evening', 'night',
        'hola', 'buenos', 'buenas', 'dias', 'tardes', 'noches',
        'bonjour', 'bonsoir', 'salut', 'ciao', 'buongiorno', 'buonasera',
        'hallo', 'guten', 'tag', 'abend', 'ola', 'bom', 'dia', 'tarde', 'noite',
        'yes', 'no', 'si', 'oui', 'non', 'ja', 'nein', 'sim', 'nao', 'nÃƒÆ’Ã‚Â£o',
        'thanks', 'thank', 'you', 'gracias', 'merci', 'grazie', 'danke', 'obrigado',
        'fine', 'bien', 'bene', 'gut', 'okay', 'ok'
      ];
      
      const trimmedInput = userInput.trim().toLowerCase();
      
      // Check if it's a simple valid phrase that doesn't need correction
      if (validCommonPhrases.some(phrase => {
        const words = trimmedInput.split(/\s+/);
        return words.length <= 3 && words.some(word => word === phrase);
      })) {
        console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ SKIPPING ERROR DETECTION: "${userInput}" is a valid common phrase`);
        return [];
      }
      
      const prompt = `Analyze this user input for basic errors in spelling, grammar, capitalization, and syntax. Look for:

1. Spelling mistakes (hawo ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ how, LIOKE ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ like)
2. Incorrect capitalization (aRE ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ are)
3. Grammar errors (IS DIFFICULT FOR MY ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ it's difficult for me)
4. Wrong word usage (YOU NOW ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ you know)
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
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
        console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ BASIC ERRORS FOUND: ${result.errors.length} errors`);
        console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ CORRECTED SENTENCE: ${result.correctedSentence || 'Not provided'}`);
        return result.errors.map((error: any) => ({
          wrong: error.wrong,
          correct: error.correct
        }));
      }

      console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ NO BASIC ERRORS DETECTED`);
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
  async detectArtificialConstructions(userInput: string, language: string): Promise<Array<{wrong: string, correct: string}>> {
    try {
      console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â UNIVERSAL ERROR DETECTION: Analyzing "${userInput}" in ${language}`);
      
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
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: "You are an expert linguistics teacher who helps students sound more natural and fluent. Detect artificial constructions that make speech sound robotic or translated." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || '{"hasErrors": false, "errors": []}');
      
      if (result.hasErrors && result.errors?.length > 0) {
        console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ UNIVERSAL DETECTOR FOUND ${result.errors.length} artificial constructions`);
        return result.errors;
      } else {
        console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ UNIVERSAL DETECTOR: Input sounds natural`);
        return [];
      }
      
    } catch (error) {
      console.log(`ÃƒÂ¢Ã‚ÂÃ…â€™ Universal error detection failed:`, error);
      return [];
    }
  }
}
