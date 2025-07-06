import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TextInput } from '@/components/TextInput';
import { ConversationArea } from '@/components/ConversationArea';
import { SettingsModal } from '@/components/SettingsModal';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';
import { Settings, Clock, MessageCircle, Mic } from 'lucide-react';
import type { ConversationMessage, ConversationSettings, ConversationStats } from '@/types/conversation';
import { LANGUAGE_OPTIONS } from '@/types/conversation';

export default function Conversation() {
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [settings, setSettings] = useState<ConversationSettings>(() => {
    const savedLanguage = localStorage.getItem('polyglot-preferred-language');
    return {
      language: (savedLanguage as 'es' | 'en' | 'fr' | 'it' | 'de' | 'pt') || 'en',
      speechSpeed: 1.0,
      voiceVolume: 80,
      enableCorrections: true,
      enableSuggestions: true,
    };
  });
  const [stats, setStats] = useState<ConversationStats>({
    messageCount: 0,
    sessionDuration: 0,
    voiceQuality: 'Good',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const { toast } = useToast();
  const { isConnected, sendMessage, lastMessage, connectionError } = useWebSocket(sessionId);

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
            
            // If this is an AI message with audio, play it and track state
            if (newMessage.type === 'ai' && newMessage.audioUrl) {
              setIsAudioPlaying(true);
              
              // Create audio element to track playback duration
              const audio = new Audio(`/api/audio/${newMessage.audioUrl}`);
              
              audio.onloadedmetadata = () => {
                // Set a timeout to clear the audio playing state when audio ends
                setTimeout(() => {
                  setIsAudioPlaying(false);
                }, audio.duration * 1000);
              };
              
              audio.onerror = () => {
                // Clear state if audio fails to load
                setIsAudioPlaying(false);
              };
              
              // Load the audio to get metadata
              audio.load();
            }
          }
          setIsAIProcessing(false);
          break;
        case 'stats':
          if (lastMessage.data) {
            setStats(lastMessage.data);
          }
          break;
        case 'error':
          console.error('WebSocket error:', lastMessage.data);
          toast({
            title: "Error",
            description: lastMessage.data || "An unexpected error occurred",
            variant: "destructive",
          });
          setIsAIProcessing(false);
          break;
      }
    }
  }, [lastMessage, toast]);

  // Handle connection errors
  useEffect(() => {
    if (connectionError) {
      toast({
        title: "Connection Error",
        description: connectionError,
        variant: "destructive",
      });
    }
  }, [connectionError, toast]);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        sendMessage({
          type: 'control',
          data: JSON.stringify({ action: 'get_stats' })
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected, sendMessage]);

  const handleTextSubmitted = useCallback(async (text: string) => {
    try {
      if (!text.trim()) return;
      
      setIsAIProcessing(true);
      
      sendMessage({
        type: 'text',
        data: text.trim(),
        sessionId,
        language: settings.language
      });

    } catch (error) {
      console.error('Error sending text:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      setIsAIProcessing(false);
    }
  }, [sendMessage, sessionId, toast, settings.language]);

  const handleLanguageChange = useCallback(async (newLanguage: string) => {
    const oldLanguage = settings.language;
    
    if (newLanguage === oldLanguage) return;

    try {
      const response = await fetch('/api/language/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          language: newLanguage,
          oldLanguage
        })
      });

      if (!response.ok) {
        throw new Error(`Language change failed: ${response.status}`);
      }

      const result = await response.json();

      const updatedSettings = { ...settings, language: newLanguage as any };
      setSettings(updatedSettings);
      
      localStorage.setItem('polyglot-preferred-language', newLanguage);
      
      sendMessage({
        type: 'control',
        data: JSON.stringify({
          action: 'update_settings',
          settings: updatedSettings
        })
      });

      toast({
        title: "Language Changed",
        description: `Successfully changed to ${LANGUAGE_OPTIONS.find(l => l.value === newLanguage)?.label}`,
      });

    } catch (error) {
      console.error('Language change failed:', error);
      toast({
        title: "Language Change Failed",
        description: "Could not change language. Please try again.",
        variant: "destructive",
      });
    }
  }, [settings, sessionId, sendMessage, toast]);

  const handleSaveSettings = useCallback((newSettings: ConversationSettings) => {
    if (newSettings.language !== settings.language) {
      handleLanguageChange(newSettings.language);
      return;
    }
    
    setSettings(newSettings);
    
    sendMessage({
      type: 'control',
      data: JSON.stringify({
        action: 'update_settings',
        settings: newSettings
      })
    });

    toast({
      title: "Settings Updated",
      description: "Your conversation settings have been saved.",
    });
  }, [settings, handleLanguageChange, sendMessage, toast]);

  const handleClearConversation = useCallback(() => {
    setMessages([]);
    setIsAIProcessing(false);
    
    sendMessage({
      type: 'control',
      data: JSON.stringify({ action: 'clear_conversation' })
    });

    toast({
      title: "Conversation Cleared",
      description: "Your conversation history has been cleared.",
    });
  }, [sendMessage, toast]);

  const handleDownloadConversation = useCallback(() => {
    const conversationText = messages
      .map(msg => `[${msg.type.toUpperCase()}] ${msg.content}`)
      .join('\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${sessionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "Your conversation has been downloaded.",
    });
  }, [messages, sessionId, toast]);

  const handleEndSession = useCallback(() => {
    handleClearConversation();
    
    toast({
      title: "Session Ended",
      description: "Your conversation session has been ended.",
    });
    
    setTimeout(() => window.location.reload(), 1000);
  }, [handleClearConversation, toast]);

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen bg-[#121212] text-white flex flex-col overflow-hidden">
      {/* Header with Language Selector and Settings */}
      <header className="absolute top-4 right-4 z-50 flex items-center space-x-4">
        {/* Language Selector */}
        <Select value={settings.language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {LANGUAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-white hover:bg-slate-700">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Settings Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSettingsOpen(true)}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Top Section - Fixed */}
      <div className="flex-shrink-0">
        {/* Static Blue Circle - much smaller */}
        <div className="flex justify-center pt-16">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/50"></div>
        </div>

        {/* Main Title */}
        <div className="text-center pt-8">
          <h1 className="text-4xl font-light text-white mb-6">Polyglot Point</h1>
          
          {/* Connection Status */}
          <div className="flex items-center justify-center mb-6">
            <div className={`flex items-center space-x-2 ${
              isConnected ? 'text-green-400' : 'text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section - Scrollable Messages */}
      <div className="flex-1 flex flex-col min-h-0 max-w-4xl mx-auto w-full px-4">
        <div className="flex-1 overflow-y-auto max-w-lg mx-auto">
          <ConversationArea 
            messages={messages} 
            isAIProcessing={isAIProcessing} 
            language={settings.language}
            isMuted={false}
          />
        </div>
      </div>

      {/* Bottom Section - Fixed Controls */}
      <div className="flex-shrink-0 pb-8">
        {/* Main Interface - centered like in image */}
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Text input for chat */}
          <div className="relative w-full max-w-lg">
            <TextInput
              onTextSubmitted={handleTextSubmitted}
              isProcessing={isAIProcessing}
              disabled={!isConnected}
              placeholder="Type your message here..."
            />
          </div>

          {/* Dynamic instruction text */}
          <p className="text-center text-lg text-slate-400">
            {isAudioPlaying 
              ? 'Clara está hablando...' 
              : isAIProcessing 
                ? 'Clara está pensando...'
                : 'Type your message and press Enter to chat with Clara'
            }
          </p>

          {/* Action buttons - Clear and End */}
          <div className="flex items-center space-x-6">
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-3 border-slate-600 text-slate-400 hover:bg-slate-800"
              onClick={handleClearConversation}
              disabled={isAIProcessing || !isConnected}
            >
              Clear Chat
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-3 border-slate-600 text-slate-400 hover:bg-slate-800"
              onClick={handleEndSession}
            >
              End Session
            </Button>
          </div>

          {/* Statistics at bottom like in image */}
          <div className="grid grid-cols-2 gap-8 max-w-md mx-auto pt-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Session time</p>
                <p className="text-lg font-semibold text-white">
                  {formatSessionTime(stats.sessionDuration)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                <Mic className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Voice quality</p>
                <p className="text-lg font-semibold text-white">{stats.voiceQuality}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onClearConversation={handleClearConversation}
        onDownloadConversation={handleDownloadConversation}
        messageCount={messages.length}
      />
    </div>
  );
}