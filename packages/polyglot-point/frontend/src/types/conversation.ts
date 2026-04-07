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
  { value: 'es', label: 'EspaÃƒÆ’Ã‚Â±ol', flag: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚ÂªÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚Â¸' },
  { value: 'en', label: 'English', flag: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚Â¬ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚Â§' },
  { value: 'fr', label: 'FranÃƒÆ’Ã‚Â§ais', flag: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚Â«ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚Â·' },
  { value: 'it', label: 'Italiano', flag: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚Â®ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚Â¹' },
  { value: 'de', label: 'Deutsch', flag: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚Â©ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚Âª' },
  { value: 'pt', label: 'PortuguÃƒÆ’Ã‚Âªs', flag: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚ÂµÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚Â¹' },
] as const;

export type LanguageCode = 'es' | 'en' | 'fr' | 'it' | 'de' | 'pt';
