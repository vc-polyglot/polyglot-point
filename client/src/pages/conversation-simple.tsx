import { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Home, Play, Pause } from 'lucide-react';

const languageNames = {
  es: "Español",
  en: "English", 
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  de: "Deutsch"
};

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ConversationSimple() {
  const [location, setLocation] = useLocation();
  const [match] = useRoute('/conversation');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    // Try to get language from URL params first, then localStorage, then default to 'en'
    const params = new URLSearchParams(window.location.search);
    const urlLanguage = params.get('language');
    if (urlLanguage) return urlLanguage;
    
    const savedLanguage = localStorage.getItem('polyglot-language');
    return savedLanguage || 'en';
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [sessionId] = useState(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const { toast } = useToast();

  // Get initial message and language from URL params
  useState(() => {
    if (match) {
      const params = new URLSearchParams(window.location.search);
      const initialMessage = params.get('message');
      const language = params.get('language');
      
      if (language) {
        setSelectedLanguage(language);
      }
      
      if (initialMessage) {
        setTimeout(() => handleSendMessage(initialMessage), 100);
      }
    }
  });

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    try {
      console.log('Sending message with language:', selectedLanguage);
      // Send message to server
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          message: messageText,
          settings: {
            language: selectedLanguage,
            speechSpeed: 1.0,
            voiceVolume: 80,
            enableCorrections: true,
            enableSuggestions: true,
            subscriptionType: 'freemium',
            availableLanguages: [selectedLanguage],
            activeLanguage: selectedLanguage
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();
      
      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        content: result.aiMessage?.content || "Hello! I'm Clara, your language tutor. How can I help you today?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePlayAudio = async (messageId: string, text: string) => {
    if (playingMessageId === messageId) {
      setPlayingMessageId(null);
      return;
    }

    try {
      setPlayingMessageId(messageId);
      
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text, 
          language: selectedLanguage 
        }),
      });

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const result = await response.json();
      
      if (result.success && result.audio) {
        // Convert base64 to blob
        const audioData = atob(result.audio);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: result.mimeType || 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audio.play();
        
        audio.onended = () => {
          setPlayingMessageId(null);
          URL.revokeObjectURL(audioUrl);
        };
      } else {
        throw new Error('Invalid TTS response');
      }
    } catch (error) {
      console.error('TTS error:', error);
      setPlayingMessageId(null);
      toast({
        title: "Audio Error",
        description: "Could not generate audio for this message",
        variant: "destructive",
      });
    }
  };

  const handleGoHome = () => {
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcffff] to-[#fbffff] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        {/* Home Button */}
        <Button
          onClick={handleGoHome}
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:text-gray-900"
        >
          <Home className="h-4 w-4 mr-2" />
          Inicio
        </Button>

        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className="text-2xl font-bold leading-tight" style={{ color: '#1E88E5' }}>
            Polyglot
          </div>
          <div className="text-2xl font-bold leading-tight -mt-1" style={{ color: '#4CAF50' }}>
            Point
          </div>
        </div>

        {/* Language Selector */}
        <Select value={selectedLanguage} onValueChange={(value) => {
          console.log('Language changed to:', value);
          setSelectedLanguage(value);
          localStorage.setItem('polyglot-language', value);
        }}>
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

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <div key={message.id} className="space-y-2">
            <div
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`max-w-[85%] ${
                message.sender === 'user' 
                  ? 'bg-blue-500 text-white rounded-t-3xl rounded-bl-3xl rounded-br-lg px-5 py-4' 
                  : 'bg-gray-200 text-gray-800 rounded-t-3xl rounded-br-3xl rounded-bl-lg px-5 py-4'
              } shadow-sm`}>
                <div className="text-[15px] leading-relaxed">
                  {message.content}
                </div>
              </div>
            </div>
            
            {/* Timestamp and PLAY button for Clara messages */}
            <div className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            } items-center space-x-2`}>
              <div className="text-xs text-gray-500 px-2">
                {index === 0 ? '1 min ago' : 'now'}
              </div>
              
              {/* PLAY button for Clara messages only */}
              {message.sender === 'assistant' && (
                <Button
                  onClick={() => handlePlayAudio(message.id, message.content)}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-800"
                  disabled={playingMessageId !== null}
                >
                  {playingMessageId === message.id ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
            

          </div>
        ))}
        
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-gray-200 text-gray-800 rounded-t-3xl rounded-br-3xl rounded-bl-lg px-5 py-4 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="text-xs text-gray-500 px-2">typing...</div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 space-y-4">
        <div className="flex space-x-3 items-end">
          <div className="flex-1 relative">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full h-14 px-5 py-4 text-[15px] border-gray-200 rounded-3xl bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 resize-none"
              disabled={isProcessing}
            />
          </div>
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isProcessing}
            className="h-14 w-14 rounded-full text-white font-medium hover:opacity-90 flex items-center justify-center"
            style={{ backgroundColor: '#1479FC' }}
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M2 12L22 2L13 21L11 13L2 12Z" 
                fill="currentColor"
              />
            </svg>
          </Button>
        </div>
        
        {/* Footer Links */}
        <div className="flex justify-center space-x-8 pt-2">
          <Button
            onClick={handleGoHome}
            variant="ghost"
            className="text-blue-500 hover:text-blue-600 font-medium text-[15px] h-auto p-0"
          >
            Home
          </Button>
          <a 
            href="/privacy-policy"
            className="text-blue-500 hover:text-blue-600 font-medium text-[15px] cursor-pointer underline-offset-4 hover:underline"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}