// Tipos para Polyglot Point: Write
export type CorrectionResponse = {
  corrected: string;
  explanations: string[];
  tips: string[];
  language?: string;
  detectedLanguage?: string;
  remainingMessages?: number;
  aviso?: string;
};

export const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'pt', label: 'Português', flag: '🇵🇹' },
] as const;

export type LanguageCode = 'es' | 'en' | 'fr' | 'it' | 'de' | 'pt';
