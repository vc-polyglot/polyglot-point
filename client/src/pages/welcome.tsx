import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';

const placeholders = {
  es: "Escribe algo para comenzar",
  en: "Type something to get started", 
  fr: "Écris quelque chose pour commencer",
  it: "Scrivi qualcosa per iniziare",
  pt: "Escreva algo para começar",
  de: "Schreibe etwas, um zu beginnen"
};

const languageNames = {
  es: "Español",
  en: "English",
  fr: "Français", 
  it: "Italiano",
  pt: "Português",
  de: "Deutsch"
};

const privacyNoticeTexts = {
  es: "Aviso de Privacidad",
  en: "Privacy Notice",
  fr: "Avis de Confidentialité",
  it: "Informativa sulla Privacy",
  pt: "Aviso de Privacidade",
  de: "Datenschutzhinweis"
};

// Detect aspirational language based on country
const getAspirationallLanguage = () => {
  // For now, default to English - can be enhanced with geolocation
  return 'en';
};

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState(getAspirationallLanguage());
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      // Navigate to conversation with the input text and selected language
      const params = new URLSearchParams({
        message: inputText.trim(),
        language: selectedLanguage
      });
      setLocation(`/conversation?${params.toString()}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcffff] to-[#fbffff] flex flex-col">
      {/* Language Selector - Top Right */}
      <div className="absolute top-6 right-6">
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-auto border-none bg-transparent text-gray-700 hover:text-gray-900 shadow-none">
            <SelectValue />
            <ChevronDown className="h-4 w-4 ml-2" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(languageNames).map(([code, name]) => (
              <SelectItem key={code} value={code}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 max-w-2xl mx-auto w-full">
        {/* Logo */}
        <div className="text-center mb-32">
          <div className="text-6xl font-bold mb-2" style={{ color: '#1479FC' }}>
            Polyglot
          </div>
          <div className="text-6xl font-bold" style={{ color: '#1CC6AE' }}>
            Point
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholders[selectedLanguage as keyof typeof placeholders]}
            className="w-full h-14 text-lg px-4 border-gray-200 rounded-xl bg-white focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
          />
          
          <Button
            type="submit"
            className="w-full h-12 text-lg font-medium rounded-xl text-white hover:opacity-90"
            style={{ backgroundColor: '#1CC6AE' }}
            disabled={!inputText.trim()}
          >
            Send
          </Button>
        </form>
      </div>

      {/* Privacy Notice - Bottom Right */}
      <div className="absolute bottom-6 right-6">
        <a 
          href="/privacy-policy"
          className="text-blue-600 hover:text-blue-800 text-sm font-light transition-colors underline-offset-4 hover:underline"
        >
          {privacyNoticeTexts[selectedLanguage as keyof typeof privacyNoticeTexts]}
        </a>
      </div>
    </div>
  );
}
