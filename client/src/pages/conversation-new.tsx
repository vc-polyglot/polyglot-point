import { useState, useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Home, Play, Pause } from 'lucide-react';
import type { ConversationMessage, ConversationSettings } from '@/types/conversation';

const languageNames = {
  es: "Español",
  en: "English", 
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  de: "Deutsch"
};

export default function ConversationNew() {
  const [, setLocation] = useLocation();
  const [match] = useRoute('/conversation');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [audioCache, setAudioCache] = useState<Map<string, string>>(new Map());
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const { isConnected, sendMessage, lastMessage, connectionError } = useWebSocket(sessionId);

  // Get initial message and language from URL params
  useEffect(() => {
    if (match) {
      const params = new URLSearchParams(window.location.search);
      const initialMessage = params.get('message');
      const language = params.get('language');
      
      if (language) {
        setSelectedLanguage(language);
      }
      
      if (initialMessage && isConnected) {
        // Send initial message when connected
        setTimeout(() => {
          handleSendMessage(initialMessage);
        }, 500);
      }
    }
  }, [match, isConnected]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'message':
          if (lastMessage.data) {
            const newMessage: ConversationMessage = {
              ...lastMessage.data,
              timestamp: new Date(lastMessage.data.timestamp)
            };
            setMessages(prev => [...prev, newMessage]);
            setIsAIProcessing(false);
          }
          break;
        case 'error':
          toast({
            title: "Error",
            description: lastMessage.data?.message || "An error occurred",
            variant: "destructive",
          });
          setIsAIProcessing(false);
          break;
      }
    }
  }, [lastMessage, toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || !isConnected) return;

    const userMessage: ConversationMessage = {
      id: `user_${Date.now()}`,
      content: messageText,
      sender: 'user',
      timestamp: new Date(),
      isError: false
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsAIProcessing(true);

    const settings: ConversationSettings = {
      language: selectedLanguage as any,
      speechSpeed: 1.0,
      voiceVolume: 80,
      enableCorrections: true,
      enableSuggestions: true,
    };

    sendMessage({
      type: 'text_conversation',
      data: {
        text: messageText,
        settings
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePlayAudio = async (messageId: string, text: string) => {
    if (playingMessageId === messageId) {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingMessageId(null);
      return;
    }

    // Check cache first
    if (audioCache.has(messageId)) {
      const audioUrl = audioCache.get(messageId)!;
      playAudio(audioUrl, messageId);
      return;
    }

    try {
      // Generate TTS audio
      const response = await fetch('/api/tts', {
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

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Cache the audio
      setAudioCache(prev => new Map(prev).set(messageId, audioUrl));
      
      playAudio(audioUrl, messageId);
    } catch (error) {
      toast({
        title: "Audio Error",
        description: "Could not generate audio for this message",
        variant: "destructive",
      });
    }
  };

  const playAudio = (audioUrl: string, messageId: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setPlayingMessageId(messageId);
      
      audioRef.current.onended = () => {
        setPlayingMessageId(null);
      };
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
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: '#1479FC' }}>
            Polyglot
          </div>
          <div className="text-2xl font-bold" style={{ color: '#1CC6AE' }}>
            Point
          </div>
        </div>

        {/* Language Selector */}
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

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className={`max-w-[70%] ${
              message.sender === 'user' 
                ? 'bg-blue-500 text-white rounded-l-xl rounded-tr-xl' 
                : 'bg-white border border-gray-200 rounded-r-xl rounded-tl-xl'
            } p-4 shadow-sm`}>
              {message.sender === 'assistant' && (
                <div className="flex items-center mb-2">
                  <div className="text-xs font-medium" style={{ color: '#1479FC' }}>
                    Clara
                  </div>
                  <div className="ml-2 text-[10px]" style={{ color: '#1CC6AE' }}>
                    ●
                  </div>
                </div>
              )}
              
              <div className={`${
                message.sender === 'user' ? 'text-white' : 'text-gray-800'
              }`}>
                {message.content}
              </div>
              
              {message.sender === 'assistant' && (
                <div className="mt-3 flex justify-start">
                  <Button
                    onClick={() => handlePlayAudio(message.id, message.content)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700 h-8 px-3"
                  >
                    {playingMessageId === message.id ? (
                      <Pause className="h-3 w-3 mr-1" />
                    ) : (
                      <Play className="h-3 w-3 mr-1" />
                    )}
                    Play
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isAIProcessing && (
          <div className="flex justify-start">
            <div className="max-w-[70%] bg-white border border-gray-200 rounded-r-xl rounded-tl-xl p-4 shadow-sm">
              <div className="flex items-center mb-2">
                <div className="text-xs font-medium" style={{ color: '#1479FC' }}>
                  Clara
                </div>
                <div className="ml-2 text-[10px]" style={{ color: '#1CC6AE' }}>
                  ●
                </div>
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex space-x-2 max-w-4xl mx-auto">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 h-12 px-4 border-gray-200 rounded-xl bg-white focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
            disabled={!isConnected || isAIProcessing}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || !isConnected || isAIProcessing}
            className="h-12 px-6 rounded-xl text-white font-medium hover:opacity-90"
            style={{ backgroundColor: '#1CC6AE' }}
          >
            Send
          </Button>
        </div>
        
        {!isConnected && (
          <div className="text-center text-red-500 mt-2 text-sm">
            Connecting...
          </div>
        )}
      </div>

      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} />
    </div>
  );
}
