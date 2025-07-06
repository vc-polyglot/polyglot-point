export interface LanguageSegment {
  text: string;
  language: string;
  startTime?: number;
  endTime?: number;
}

export interface ConversationMessage {
  id: string;
  type?: 'user' | 'ai'; // Keep for backward compatibility
  sender: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: Date;
  isError?: boolean;
  corrections?: string[];
  suggestions?: string[];
  pronunciationFeedback?: string | null;
  languageSegments?: LanguageSegment[]; // For multilingual input visualization
  detectedLanguages?: string[]; // Languages detected in the input
}

export interface ConversationSettings {
  language: 'es' | 'en' | 'fr' | 'it' | 'de' | 'pt';
  speechSpeed: number;
  voiceVolume: number;
  enableCorrections: boolean;
  enableSuggestions: boolean;
}

export interface ConversationStats {
  messageCount: number;
  sessionDuration: number;
  voiceQuality: string;
}

export interface WebSocketMessage {
  type: 'audio' | 'text' | 'text_conversation' | 'control' | 'message' | 'error' | 'connection' | 'stats';
  data?: any;
  error?: string;
  details?: string;
  sessionId?: string;
  language?: 'es' | 'en' | 'fr' | 'it' | 'de' | 'pt'; // CRITICAL: Language selection
}

export interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel: number;
}

export const LANGUAGE_OPTIONS = [
  { value: 'es', label: '🇪🇸 Español', flag: '🇪🇸' },
  { value: 'en', label: '🇺🇸 English', flag: '🇺🇸' },
  { value: 'fr', label: '🇫🇷 Français', flag: '🇫🇷' },
  { value: 'it', label: '🇮🇹 Italiano', flag: '🇮🇹' },
  { value: 'de', label: '🇩🇪 Deutsch', flag: '🇩🇪' },
  { value: 'pt', label: '🇧🇷 Português', flag: '🇧🇷' },
] as const;

export const QUICK_MESSAGES = [
  { key: 'slower', text: 'Can you speak slower?', label: 'Speak slower' },
  { key: 'repeat', text: 'Can you repeat that?', label: 'Repeat' },
  { key: 'correct', text: 'Can you correct my pronunciation?', label: 'Correct me' },
] as const;
