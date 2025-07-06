import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PolyglotVoiceRecorder } from '@/components/PolyglotVoiceRecorder';
import { ConversationArea } from '@/components/ConversationArea';
import { SettingsModal } from '@/components/SettingsModal';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';
import { Settings, Volume2, Trash2, Download, Clock, MessageCircle, Mic, Send, Type } from 'lucide-react';
import type { ConversationMessage, ConversationSettings, ConversationStats } from '@/types/conversation';
import { LANGUAGE_OPTIONS, QUICK_MESSAGES } from '@/types/conversation';

export default function Conversation() {
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [settings, setSettings] = useState<ConversationSettings>(() => {
    // Load saved language preference from localStorage
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
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

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

  const handleAudioRecorded = useCallback(async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const base64Audio = btoa(binaryString);
      
      setIsAIProcessing(true);
      
      // Send audio via WebSocket with CRITICAL language information
      sendMessage({
        type: 'audio',
        data: base64Audio,
        sessionId,
        language: settings.language // CRITICAL: Include selected language
      });

    } catch (error) {
      console.error('Error sending audio:', error);
      toast({
        title: "Error",
        description: "Failed to send audio message",
        variant: "destructive",
      });
      setIsAIProcessing(false);
    }
  }, [sendMessage, sessionId, toast]);

  const handleQuickMessage = useCallback((text: string) => {
    setIsAIProcessing(true);
    
    sendMessage({
      type: 'text',
      data: text,
      sessionId,
      language: settings.language // CRITICAL: Include selected language
    });
  }, [sendMessage, sessionId, settings.language]);

  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !isConnected || isAIProcessing) return;
    
    setIsAIProcessing(true);
    sendMessage({
      type: 'text',
      data: textInput.trim(),
      sessionId,
      language: settings.language
    });
    setTextInput('');
  }, [textInput, isConnected, isAIProcessing, sendMessage, sessionId, settings.language]);

  const handleLanguageChange = useCallback(async (newLanguage: string) => {
    const oldLanguage = settings.language;
    
    if (newLanguage === oldLanguage) return;

    console.log(`🚨 CRITICAL LANGUAGE CHANGE INITIATED: ${oldLanguage} → ${newLanguage}`);
    console.log(`🔍 Session ID: ${sessionId}`);
    
    // Show loading state
    toast({
      title: "Changing Language",
      description: "Synchronizing all modules...",
    });

    try {
      console.log(`📞 CALLING LANGUAGE MANAGER API...`);
      
      // Call centralized language manager API
      const response = await fetch('/api/language/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          newLanguage,
          oldLanguage
        })
      });

      if (!response.ok) {
        throw new Error(`Language change failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ LANGUAGE CHANGE SUCCESSFUL:`, result);

      // Update local settings
      const updatedSettings = { ...settings, language: newLanguage as any };
      setSettings(updatedSettings);
      
      // Save to localStorage
      localStorage.setItem('polyglot-preferred-language', newLanguage);
      
      // Send settings update via WebSocket
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
    // If language is being changed, handle it specially
    if (newSettings.language !== settings.language) {
      handleLanguageChange(newSettings.language);
      return;
    }
    
    // Handle other settings normally
    setSettings(newSettings);
    
    // Send settings update via WebSocket
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

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* System Status Circle - Always visible at top */}
      <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className={`status-circle ${
          isRecording ? 'listening' : 
          isAIProcessing ? 'speaking' : 
          'inactive'
        }`}></div>
      </div>

      {/* Header */}
      <header className="bg-card/80 backdrop-blur-md border-b border-gray-300 sticky top-0 z-40 mt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <MessageCircle className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Polyglot Point</h1>
                <p className="text-sm text-muted-foreground">Speak</p>
              </div>
            </div>
            
            {/* Language Selector and Settings */}
            <div className="flex items-center space-x-4">
              <Select
                value={settings.language}
                onValueChange={(value) => handleLanguageChange(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Status */}
        <div className="mb-6 flex items-center justify-center">
          <div className={`bg-card rounded-full px-4 py-2 shadow-sm border flex items-center space-x-2 ${
            isConnected ? 'border-green-200' : 'border-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className={`text-sm font-medium ${
              isConnected ? 'text-green-700' : 'text-red-700'
            }`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Conversation Area */}
        <div className="mb-6">
          <ConversationArea 
            messages={messages} 
            isAIProcessing={isAIProcessing} 
            language={settings.language}
            isMuted={isMuted}
          />
        </div>

        {/* Main Voice Interface */}
        <div className="flex flex-col items-center justify-center space-y-8 py-12">
          {/* Instruction Text */}
          <p className="text-center text-lg text-muted-foreground font-medium">
            Haz clic para empezar a grabar
          </p>
          
          {/* Custom Speak Button with Recorder Integration */}
          <div className="relative">
            <PolyglotVoiceRecorder
              onAudioRecorded={handleAudioRecorded}
              isProcessing={isAIProcessing}
              disabled={!isConnected}
              onRecordingStart={() => setIsRecording(true)}
              onRecordingStop={() => setIsRecording(false)}
            />
          </div>

          {/* Control Buttons Row */}
          <div className="flex items-center justify-center space-x-6 mt-8">
            <Button
              variant="ghost"
              size="sm"
              className="w-12 h-12 bg-muted hover:bg-muted/80 rounded-xl"
              onClick={() => setIsMuted(!isMuted)}
            >
              <Volume2 className={`w-5 h-5 ${isMuted ? 'text-red-500' : 'text-muted-foreground'}`} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-12 h-12 bg-muted hover:bg-muted/80 rounded-xl"
              onClick={handleClearConversation}
            >
              <Trash2 className="w-5 h-5 text-muted-foreground" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-12 h-12 bg-muted hover:bg-muted/80 rounded-xl"
              onClick={handleDownloadConversation}
              disabled={messages.length === 0}
            >
              <Download className="w-5 h-5 text-muted-foreground" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-12 h-12 bg-destructive/10 hover:bg-destructive/20 rounded-xl"
              onClick={() => window.location.reload()}
            >
              <span className="text-destructive text-xs font-bold">END</span>
            </Button>
          </div>

          {/* Text Input Alternative */}
          {showTextInput && (
            <div className="mt-6 p-4 bg-muted border border-gray-300 rounded-xl w-full max-w-md">
              <div className="flex items-center space-x-2 mb-3">
                <Type className="w-4 h-4 text-foreground" />
                <span className="text-sm font-medium">Text Input Alternative</span>
              </div>
              <form onSubmit={handleTextSubmit} className="flex space-x-3">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your message here..."
                  disabled={isAIProcessing || !isConnected}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!textInput.trim() || isAIProcessing || !isConnected}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}

          {/* Show Text Input Button */}
          {!showTextInput && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTextInput(true)}
              >
                <Type className="w-4 h-4 mr-2" />
                Use Text Input
              </Button>
            </div>
          )}
        </div>

        {/* Statistics Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-card rounded-xl p-4 border border-gray-300">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Session Time</p>
                <p className="text-lg font-semibold">
                  {formatSessionTime(stats.sessionDuration)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-gray-300">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Messages</p>
                <p className="text-lg font-semibold">{stats.messageCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-gray-300">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Voice Quality</p>
                <p className="text-lg font-semibold">{stats.voiceQuality}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
