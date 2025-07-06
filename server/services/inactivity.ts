import { storage } from '../storage';
import { conversationService } from './conversation';
import { googleTTSService } from './googleTTS';

interface InactivitySession {
  sessionId: string;
  language: string;
  warningTimeout?: NodeJS.Timeout;
  closeTimeout?: NodeJS.Timeout;
  lastActivity: Date;
}

export class InactivityService {
  private sessions: Map<string, InactivitySession> = new Map();
  private readonly WARNING_DELAY = 90000; // 90 seconds
  private readonly CLOSE_DELAY = 30000; // 30 seconds after warning

  // Frases de verificación de presencia
  private readonly presenceCheck = {
    es: "¿Estás ahí?",
    en: "Are you there?", 
    fr: "Tu es là ?",
    it: "Ci sei?",
    de: "Bist du da?",
    pt: "Estás aí?"
  };

  // Frases de despedida cálidas aleatorias
  private readonly goodbyeMessages = {
    es: [
      "¡Parece que tomamos una pausa! Te espero cuando quieras seguir practicando 😉",
      "Me encantó platicar contigo. ¡Nos vemos pronto!",
      "Por ahora cierro la conversación, pero vuelve cuando gustes, ¿va?"
    ],
    en: [
      "Looks like we took a break. Catch you later!",
      "It was great chatting. Talk to you again soon!",
      "I'll close the chat for now — just hit start whenever you're ready."
    ],
    fr: [
      "On dirait qu'on fait une petite pause. Reviens quand tu veux continuer 🙂",
      "C'était sympa de parler avec toi. À très bientôt !",
      "Je me déconnecte un moment. On reprend quand tu veux !"
    ],
    it: [
      "Sembra che ci siamo presi una pausa. Torna quando vuoi!",
      "È stato bello parlare con te. A presto!",
      "Chiudo la conversazione per ora. Riprendiamo quando ti va."
    ],
    de: [
      "Wir machen wohl eine kurze Pause. Bis bald!",
      "Schön, mit dir zu sprechen. Wir sehen uns!",
      "Ich beende das Gespräch für jetzt — starte einfach neu, wenn du willst."
    ],
    pt: [
      "Parece que fizemos uma pausa. Até logo!",
      "Foi ótimo conversar contigo. Falamos em breve!",
      "Vou fechar a conversa por agora — volta quando quiseres."
    ]
  };

  /**
   * Registra actividad para una sesión
   */
  updateActivity(sessionId: string, language: string): void {
    const session = this.sessions.get(sessionId) || {
      sessionId,
      language,
      lastActivity: new Date()
    };

    session.lastActivity = new Date();
    session.language = language;

    // Limpiar timeouts existentes
    this.clearTimeouts(sessionId);

    // Establecer nuevo timeout de advertencia
    session.warningTimeout = setTimeout(() => {
      this.sendPresenceCheck(sessionId);
    }, this.WARNING_DELAY);

    this.sessions.set(sessionId, session);

    // Actualizar última actividad en la base de datos
    storage.updateLastActivity(sessionId).catch(console.error);
  }

  /**
   * Envía verificación de presencia
   */
  private async sendPresenceCheck(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const message = this.presenceCheck[session.language as keyof typeof this.presenceCheck] || this.presenceCheck.es;
    
    try {
      // Generar audio de verificación
      const audioBuffer = await googleTTSService.synthesizeSpeech(
        message,
        session.language,
        { speechSpeed: 1.0, voiceVolume: 80 }
      );

      const audioUrl = await storage.saveAudioFile(audioBuffer, sessionId);

      // Crear mensaje AI
      const aiMessage = {
        id: Date.now().toString(),
        type: 'ai' as const,
        content: message,
        audioUrl,
        timestamp: new Date(),
      };

      await storage.saveMessage(sessionId, aiMessage);

      // Configurar timeout de cierre
      session.closeTimeout = setTimeout(() => {
        this.closeSession(sessionId);
      }, this.CLOSE_DELAY);

      this.sessions.set(sessionId, session);

    } catch (error) {
      console.error('Error sending presence check:', error);
    }
  }

  /**
   * Cierra la sesión con mensaje de despedida
   */
  private async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const language = session.language as keyof typeof this.goodbyeMessages;
    const messages = this.goodbyeMessages[language] || this.goodbyeMessages.es;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    try {
      // Generar audio de despedida
      const audioBuffer = await googleTTSService.synthesizeSpeech(
        randomMessage,
        session.language,
        { speechSpeed: 1.0, voiceVolume: 80 }
      );

      const audioUrl = await storage.saveAudioFile(audioBuffer, sessionId);

      // Crear mensaje de despedida
      const goodbyeMessage = {
        id: Date.now().toString(),
        type: 'ai' as const,
        content: randomMessage,
        audioUrl,
        timestamp: new Date(),
      };

      await storage.saveMessage(sessionId, goodbyeMessage);

      // Limpiar sesión
      this.clearSession(sessionId);

      console.log(`Session ${sessionId} closed due to inactivity`);

    } catch (error) {
      console.error('Error closing session:', error);
    }
  }

  /**
   * Limpia timeouts de una sesión
   */
  private clearTimeouts(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.warningTimeout) {
      clearTimeout(session.warningTimeout);
      delete session.warningTimeout;
    }

    if (session.closeTimeout) {
      clearTimeout(session.closeTimeout);
      delete session.closeTimeout;
    }

    this.sessions.set(sessionId, session);
  }

  /**
   * Limpia completamente una sesión
   */
  clearSession(sessionId: string): void {
    this.clearTimeouts(sessionId);
    this.sessions.delete(sessionId);
  }

  /**
   * Verifica si una sesión está activa
   */
  isSessionActive(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Obtiene información de una sesión
   */
  getSessionInfo(sessionId: string): InactivitySession | undefined {
    return this.sessions.get(sessionId);
  }
}

export const inactivityService = new InactivityService();
