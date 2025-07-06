import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import * as fs from 'fs';
import * as path from 'path';
import { languageManager } from './languageManager';

export class GoogleTTSService {
  private client: TextToSpeechClient;

  constructor() {
    // Initialize with credentials from environment
    try {
      // Parse credentials from environment variable
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS || '{}');
      
      this.client = new TextToSpeechClient({
        credentials: credentials,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      });
    } catch (error) {
      console.error('Error parsing Google Cloud credentials:', error);
      // Fallback to default initialization
      this.client = new TextToSpeechClient();
    }
  }

  /**
   * Convert text to speech with appropriate voice for language
   */
  /**
   * Clean Markdown formatting from text for TTS
   */
  private cleanMarkdownForTTS(text: string): string {
    return text
      // Remove bold (**text** or __text__)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      // Remove italic (*text* or _text_)
      .replace(/(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g, '$1')
      .replace(/(?<!_)_(?!_)([^_]+?)_(?!_)/g, '$1')
      // Remove code blocks (```text```)
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code (`text`)
      .replace(/`([^`]+)`/g, '$1')
      // Remove links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove headers (# ## ###)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove strikethrough (~~text~~)
      .replace(/~~(.*?)~~/g, '$1')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  async synthesizeSpeech(
    text: string,
    language: string,
    sessionId: string
  ): Promise<{ buffer: Buffer; filename: string }> {
    try {
      // CRITICAL: Check if language change is in progress
      if (languageManager.isLanguageChanging()) {
        throw new Error('LANGUAGE_CHANGE_IN_PROGRESS');
      }
      
      // CRITICAL: Use requested language directly, ignore auto-detection
      // Auto-detection was causing false positives (English detected as Spanish)
      const targetLanguage = language || languageManager.getCurrentLanguage();
      
      console.log(`🎯 TTS TEXT ANALYSIS: "${text}"`);
      console.log(`🎯 REQUESTED LANGUAGE: ${language}`);
      console.log(`🎯 FINAL TTS LANGUAGE: ${targetLanguage} (forced from request, no auto-detection)`);
      
      // Clean text from Markdown formatting before TTS
      const cleanText = this.cleanMarkdownForTTS(text);
      
      // Check text length (Google TTS has 5000 character limit)
      if (cleanText.length > 4000) {
        // Split into logical chunks at sentence boundaries
        const chunks = this.splitTextIntoChunks(cleanText, 4000);
        return await this.synthesizeMultipleChunks(chunks, targetLanguage, sessionId);
      }
      
      const voiceConfig = this.getVoiceConfig(targetLanguage);
      
      // CRITICAL: Validate language-voice consistency
      console.log(`🚨 TTS LANGUAGE CHECK: Requested language = ${language}`);
      console.log(`🚨 TTS VOICE CONFIG: ${voiceConfig.languageCode} - ${voiceConfig.voiceName}`);
      
      const request = {
        input: { text: cleanText },
        voice: {
          languageCode: voiceConfig.languageCode,
          name: voiceConfig.voiceName,
          ssmlGender: voiceConfig.ssmlGender,
        },
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: 1.0,
          volumeGainDb: 0.0,
        },
      };

      console.log('Sending request to Google TTS:', JSON.stringify(request, null, 2));
      const [response] = await this.client.synthesizeSpeech(request);
      
      console.log('Google TTS response received, audioContent size:', response.audioContent?.length || 0);
      
      if (!response.audioContent) {
        throw new Error('No audio content received from Google TTS');
      }

      // Save audio file and return filename
      const audioBuffer = Buffer.from(response.audioContent);
      console.log('Audio buffer created, size:', audioBuffer.length);
      const filename = `${sessionId}_${Date.now()}.mp3`;
      const filepath = path.join(process.cwd(), 'audio', filename);
      
      // Ensure audio directory exists
      const audioDir = path.dirname(filepath);
      console.log('Audio directory:', audioDir);
      if (!fs.existsSync(audioDir)) {
        console.log('Creating audio directory...');
        fs.mkdirSync(audioDir, { recursive: true });
      }
      
      console.log('Writing audio file to:', filepath);
      console.log('Buffer size before write:', audioBuffer.length);
      fs.writeFileSync(filepath, audioBuffer);
      
      // Verify file was written correctly
      const writtenSize = fs.statSync(filepath).size;
      console.log('File written, size on disk:', writtenSize);
      
      if (writtenSize !== audioBuffer.length) {
        console.error('Size mismatch! Expected:', audioBuffer.length, 'Got:', writtenSize);
      }
      
      return { buffer: audioBuffer, filename };
    } catch (error) {
      console.error("Error synthesizing speech:", error);
      throw new Error(`No se pudo reproducir el audio. Intenta de nuevo.`);
    }
  }

  /**
   * Split text into logical chunks at sentence boundaries
   */
  private splitTextIntoChunks(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (currentChunk.length + trimmedSentence.length + 1 <= maxLength) {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        currentChunk = trimmedSentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }
    
    return chunks;
  }

  /**
   * Synthesize multiple text chunks and combine them
   */
  private async synthesizeMultipleChunks(
    chunks: string[],
    language: string,
    sessionId: string
  ): Promise<{ buffer: Buffer; filename: string }> {
    const audioBuffers: Buffer[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkResult = await this.synthesizeSingleChunk(chunks[i], language, `${sessionId}_chunk${i}`);
      audioBuffers.push(chunkResult.buffer);
    }
    
    // Combine all audio buffers
    const combinedBuffer = Buffer.concat(audioBuffers);
    const filename = `${sessionId}_${Date.now()}.mp3`;
    const filepath = path.join(process.cwd(), 'audio', filename);
    
    fs.writeFileSync(filepath, combinedBuffer);
    
    return { buffer: combinedBuffer, filename };
  }

  /**
   * Synthesize a single text chunk
   */
  private async synthesizeSingleChunk(
    text: string,
    language: string,
    sessionId: string
  ): Promise<{ buffer: Buffer; filename: string }> {
    const voiceConfig = this.getVoiceConfig(language);
    
    const request = {
      input: { text },
      voice: {
        languageCode: voiceConfig.languageCode,
        name: voiceConfig.voiceName,
        ssmlGender: voiceConfig.ssmlGender,
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: 1.0,
        volumeGainDb: 0.0,
      },
    };

    const [response] = await this.client.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error('No audio content received from Google TTS');
    }

    return { buffer: Buffer.from(response.audioContent), filename: `${sessionId}.mp3` };
  }

  /**
   * Get voice configuration for each supported language
   */
  private getVoiceConfig(language: string) {
    const voiceConfigs: Record<string, {
      languageCode: string;
      voiceName: string;
      ssmlGender: 'FEMALE';
    }> = {
      es: {
        languageCode: 'es-US',
        voiceName: 'es-US-Neural2-A',
        ssmlGender: 'FEMALE' as const,
      },
      en: {
        languageCode: 'en-US',
        voiceName: 'en-US-Neural2-F',
        ssmlGender: 'FEMALE' as const,
      },
      fr: {
        languageCode: 'fr-FR',
        voiceName: 'fr-FR-Neural2-A',
        ssmlGender: 'FEMALE' as const,
      },
      it: {
        languageCode: 'it-IT',
        voiceName: 'it-IT-Neural2-A',
        ssmlGender: 'FEMALE' as const,
      },
      de: {
        languageCode: 'de-DE',
        voiceName: 'de-DE-Neural2-A',
        ssmlGender: 'FEMALE' as const,
      },
      pt: {
        languageCode: 'pt-BR',
        voiceName: 'pt-BR-Neural2-A',
        ssmlGender: 'FEMALE' as const,
      },
    };

    return voiceConfigs[language] || voiceConfigs.en;
  }

  /**
   * Convert volume percentage to gain decibels
   */
  private volumeToGainDb(volume: number): number {
    // Convert 0-100 volume to -20db to +20db range
    const normalizedVolume = Math.max(0, Math.min(100, volume));
    return (normalizedVolume - 50) * 0.4; // -20db to +20db range
  }

  /**
   * Detect the language of the text to match appropriate TTS voice
   */
  private detectTextLanguage(text: string): string | null {
    // More specific patterns to avoid false positives
    const patterns = {
      en: /\b(hello|hi|thank|you|very|good|well|am|doing|glad|reaching|practice|english|here|chat|feel|free|ask|anything|tell|about|day|i'm|i am|today|would|like)\b/i,
      es: /\b(hola|gracias|muy|bien|estoy|como|estas|que|para|con|pero|español|me|alegra|aprendiendo|gustaría|hablar|quiero|practicar)\b/i,
      fr: /\b(bonjour|salut|merci|très|bien|suis|comment|allez|vous|français|que|pour|avec|mais|j'ai|apprends|voudrais|parler)\b/i,
      it: /\b(ciao|grazie|molto|bene|sono|come|stai|italiano|che|per|con|ma|ho|sto|imparando|vorrei|parlare)\b/i,
      de: /\b(hallo|guten|danke|sehr|gut|bin|wie|geht|deutsch|was|für|mit|aber|habe|lerne|möchte|sprechen)\b/i,
      pt: /\b(olá|oi|obrigado|muito|bem|estou|como|está|português|que|para|com|mas|tenho|sou|aprendendo|gostaria|falar)\b/i
    };

    const scores: { [key: string]: number } = {};
    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern) || [];
      scores[lang] = matches.length;
    }
    
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      return null;
    }
    
    // Require at least 2 matches for reliable detection
    if (maxScore < 2) {
      return null;
    }
    
    const detectedLang = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || null;
    console.log(`🔍 TTS LANGUAGE DETECTION: "${text}" → ${detectedLang} (score: ${maxScore})`);
    return detectedLang;
  }

  /**
   * Test TTS service availability
   */
  async testService(): Promise<boolean> {
    try {
      await this.synthesizeSpeech("Hello, world!", "en", "test_session");
      return true;
    } catch (error) {
      console.error("TTS service test failed:", error);
      return false;
    }
  }
}

export const googleTTSService = new GoogleTTSService();
