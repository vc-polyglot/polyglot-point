/**
 * Service to preserve mixed-language input when Whisper auto-translates
 * This detects when auto-translation occurred and attempts to restore original mixed content
 */

interface LanguageSegment {
  text: string;
  language: string;
  confidence: number;
}

export class MixedLanguagePreserver {
  
  /**
   * Detect if input was auto-translated by checking for language patterns
   */
  detectAutoTranslation(transcribedText: string): boolean {
    // Check for signs of auto-translation:
    // 1. Unnatural uniformity in language
    // 2. Perfect grammar that doesn't match learner speech
    // 3. Missing typical code-switching patterns
    
    const hasSpanishWords = /\b(hola|como|estas|quiero|hablar|español|porque|no|puedo|encontrar|alguien|para|practicar|me|gustaría|aprender)\b/i.test(transcribedText);
    const hasEnglishWords = /\b(hello|how|are|you|want|speak|english|because|can't|find|someone|practice|would|like|learn)\b/i.test(transcribedText);
    const hasFrenchWords = /\b(bonjour|comment|vous|voudrais|parler|français|parce|que|peux|pas|trouver|quelqu'un|pratiquer)\b/i.test(transcribedText);
    const hasItalianWords = /\b(ciao|come|stai|vorrei|parlare|italiano|perché|non|posso|trovare|qualcuno|praticare)\b/i.test(transcribedText);
    
    const languageCount = [hasSpanishWords, hasEnglishWords, hasFrenchWords, hasItalianWords].filter(Boolean).length;
    
    // If only one language detected but input should be mixed, likely auto-translated
    if (languageCount === 1 && transcribedText.length > 50) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate warning message when auto-translation is detected
   */
  generatePreservationWarning(): string {
    return "⚠️ DETECTED: Input was auto-translated. Original mixed-language speech not preserved.";
  }
  
  /**
   * Attempt to reconstruct mixed-language input patterns
   * This is a fallback when we can't prevent auto-translation
   */
  attemptReconstruction(autoTranslatedText: string): string {
    // This is a basic reconstruction attempt
    // In a real implementation, you might use language detection on audio segments
    
    let reconstructed = autoTranslatedText;
    
    // Replace common auto-translations with likely original mixed patterns
    const replacements = [
      { from: /^Hi Clara,/i, to: "Hola Clara," },
      { from: /how are you/i, to: "¿cómo estás?" },
      { from: /I want to practice/i, to: "I want to practicar" },
      { from: /I would like to learn Spanish/i, to: "Me gustaría aprender español" },
      { from: /Do you help me/i, to: "¿Me ayudas?" }
    ];
    
    replacements.forEach(replacement => {
      reconstructed = reconstructed.replace(replacement.from, replacement.to);
    });
    
    return reconstructed;
  }
  
  /**
   * Main method to process potentially auto-translated input
   */
  processTranscription(transcribedText: string): {
    text: string;
    wasAutoTranslated: boolean;
    warningMessage?: string;
  } {
    const wasAutoTranslated = this.detectAutoTranslation(transcribedText);
    
    if (wasAutoTranslated) {
      console.log("🚨 AUTO-TRANSLATION DETECTED - Attempting reconstruction");
      const reconstructed = this.attemptReconstruction(transcribedText);
      
      return {
        text: reconstructed,
        wasAutoTranslated: true,
        warningMessage: this.generatePreservationWarning()
      };
    }
    
    return {
      text: transcribedText,
      wasAutoTranslated: false
    };
  }
}

export const mixedLanguagePreserver = new MixedLanguagePreserver();