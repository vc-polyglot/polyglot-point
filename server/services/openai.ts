import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { UniversalErrorDetector } from './universalErrorDetector.js';

interface ConversationResponse {
  content: string;
}

interface ConversationSettings {
  enableCorrections: boolean;
  enableSuggestions: boolean;
  [key: string]: any;
}

class OpenAIService {
  private openai: OpenAI;
  private universalDetector: UniversalErrorDetector;

  constructor() {
    if (!process.env.POLYGLOT_OPENAI_KEY) {
      throw new Error('POLYGLOT_OPENAI_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.POLYGLOT_OPENAI_KEY,
    });
    
    this.universalDetector = new UniversalErrorDetector(process.env.POLYGLOT_OPENAI_KEY);
  }

  async transcribeAudio(audioBuffer: Buffer, sessionId: string, targetLanguage?: string): Promise<string> {
    console.log(`🎤 WHISPER TRANSCRIPTION: Starting for session ${sessionId}`);
    
    let timeoutHandler: NodeJS.Timeout | null = null;
    let tempFilePath: string | undefined;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const timeoutMs = 15000;
        
        const timeoutPromise = new Promise((_, reject) => {
          timeoutHandler = setTimeout(() => {
            reject(new Error(`TIMEOUT_ATTEMPT_${attempt}`));
          }, timeoutMs);
        });

        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        tempFilePath = path.join(tempDir, `audio_${sessionId}_${Date.now()}.webm`);
        fs.writeFileSync(tempFilePath, audioBuffer);
        
        const transcriptionPromise = this.openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: "whisper-1",
          language: targetLanguage || undefined,
          response_format: "text"
        });

        const result = await Promise.race([transcriptionPromise, timeoutPromise]) as OpenAI.Audio.Transcription;
        
        if (timeoutHandler) {
          clearTimeout(timeoutHandler);
          timeoutHandler = null;
        }

        try {
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (cleanupError) {
          console.log(`Could not clean up temp file: ${cleanupError}`);
        }

        const transcription = typeof result === 'string' ? result : result.text;
        console.log(`✅ WHISPER SUCCESS (attempt ${attempt}): "${transcription}"`);
        return transcription;
        
      } catch (error: any) {
        if (timeoutHandler) {
          clearTimeout(timeoutHandler);
          timeoutHandler = null;
        }
        
        try {
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (cleanupError) {
          console.log(`Could not clean up temp file: ${cleanupError}`);
        }
        
        console.error(`❌ WHISPER ATTEMPT ${attempt} FAILED: ${error.message}`);
        
        if (attempt === 3) {
          throw new Error(`Transcription failed after 3 attempts: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error('Transcription failed');
  }

  async generateResponse(
    userMessage: string,
    language: string,
    conversationHistory: any[],
    settings: ConversationSettings,
    customSystemPrompt?: string
  ): Promise<ConversationResponse> {
    console.log(`Generating AI response for: "${userMessage}"`);
    console.log(`🎯 CLARA LANGUAGE: ${language}`);

    const languageNames = {
      'en': 'English',
      'es': 'Spanish', 
      'fr': 'French',
      'it': 'Italian',
      'pt': 'Portuguese',
      'de': 'German'
    };
    
    const selectedLanguageName = languageNames[language as keyof typeof languageNames] || 'English';
    
    const finalSystemPrompt = customSystemPrompt || `You are Clara, a language tutor. The user has selected the ${selectedLanguageName} tab, so you MUST respond ONLY in ${selectedLanguageName}. 

CRITICAL RULES:
- NEVER suggest changing languages or practicing other languages when a specific language tab is selected
- ALWAYS respond in ${selectedLanguageName} regardless of what language the user writes in
- If user writes in a different language, gently correct them IN ${selectedLanguageName}
- Use natural correction format: show original → corrected version → brief explanation → encouragement
- NO emojis, decorative formatting, or markdown
- Be warm, natural, and encouraging like a real person

Example correction format:
"Hello, how you are?"
"Hello, how are you?"
You need "are" instead of "you are" in questions. Good job practicing! Want to try again?`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: finalSystemPrompt
      }
    ];

    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role as "user" | "assistant",
            content: msg.content
          });
        }
      });
    }

    messages.push({
      role: "user",
      content: userMessage
    });

    console.log(`🔥 SENDING TO OPENAI:`, JSON.stringify(messages, null, 2));

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 150,
      temperature: 0.7,
    });

    const responseContent = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    
    return {
      content: responseContent
    };
  }

  async detectBasicErrors(userInput: string, language: string): Promise<Array<{wrong: string, correct: string}>> {
    return [];
  }

  async detectTranslationErrors(userInput: string, language: string): Promise<Array<{wrong: string, correct: string}>> {
    return [];
  }
}

export const openaiService = new OpenAIService();
