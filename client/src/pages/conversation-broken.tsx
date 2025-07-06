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
            console.log('New message received:', newMessage);
            console.log('Has audioUrl:', !!newMessage.audioUrl);
            setMessages(prev => [...prev, newMessage]);
            
            if (newMessage.type === 'ai') {
              setIsAIProcessing(false);
            }
          }
          break;

        case 'stats':
          if (lastMessage.data) {
            setStats(lastMessage.data);
          }
          break;

        case 'error':
          // Show text input option if audio processing is failing
          if (lastMessage.showTextFallback) {
            setShowTextInput(true);
          }
          toast({
            title: "Error",
            description: lastMessage.error || "An unexpected error occurred",
            variant: "destructive",
          });
          setIsAIProcessing(false);
          break;

        case 'connection':
          if (lastMessage.data?.status === 'connected') {
            // Send initial settings
            sendMessage({
              type: 'control',
              data: JSON.stringify({
                action: 'update_settings',
                settings
              })
            });
          }
          break;
      }
    }
  }, [lastMessage, sendMessage, settings, toast]);

  // Show connection error
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
          language: newLanguage,
          sessionId
        }),
      });

      console.log(`📡 API RESPONSE STATUS: ${response.status}`);
      const result = await response.json();
      console.log(`📋 API RESPONSE:`, result);

      if (result.success) {
        // Update local state only after successful sync
        const newSettings = { ...settings, language: newLanguage as any };
        setSettings(newSettings);
        
        // Save language preference to localStorage
        localStorage.setItem('polyglot-preferred-language', newLanguage);
        
        // Clear current conversation to prevent contamination
        setMessages([]);
        setIsAIProcessing(false);
        
        console.log(`✅ Language synchronized: ${result.modulesSynced.join(', ')}`);
        
        toast({
          title: "Language Changed",
          description: `Successfully switched to ${newLanguage.toUpperCase()}. All modules synchronized.`,
        });
      } else {
        console.error(`❌ Language change failed: ${result.errors?.join(', ')}`);
        toast({
          title: "Language Change Failed",
          description: result.errors?.join(', ') || "Failed to synchronize modules",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error(`💥 Language change error: ${error.message}`);
      toast({
        title: "Language Change Error",
        description: "Could not connect to language manager",
        variant: "destructive",
      });
    }
  }, [settings, sessionId, toast]);

  const handleSaveSettings = useCallback((newSettings: ConversationSettings) => {
    // Handle language change separately through centralized manager
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
      <header className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-40 mt-24">
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
                <SelectTrigger className="w-40 bg-white border-indigo-200 focus:ring-indigo-500">
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
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-lg"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="w-4 h-4 text-slate-600" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Status */}
        <div className="mb-6 flex items-center justify-center">
          <div className={`bg-white rounded-full px-4 py-2 shadow-sm border flex items-center space-x-2 ${
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
        </div>

          {/* Text Input Alternative */}
          {showTextInput && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-center space-x-2 mb-3">
                <Type className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Text Input Alternative</span>
              </div>
              <form onSubmit={handleTextSubmit} className="flex space-x-3">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 border-yellow-300 focus:border-yellow-500"
                  disabled={!isConnected || isAIProcessing}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  disabled={!textInput.trim() || !isConnected || isAIProcessing}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {QUICK_MESSAGES.map((quickMsg) => (
              <Button
                key={quickMsg.key}
                variant="ghost"
                size="sm"
                className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                onClick={() => handleQuickMessage(quickMsg.text)}
                disabled={!isConnected || isAIProcessing}
              >
                {quickMsg.label}
              </Button>
            ))}
          </div>

          {/* Show Text Input Button */}
          {!showTextInput && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                onClick={() => setShowTextInput(true)}
              >
                <Type className="w-4 h-4 mr-2" />
                Use Text Input
              </Button>
            </div>
          )}
        </div>

        {/* Statistics Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Session Time</p>
                <p className="text-lg font-semibold text-slate-800">
                  {formatSessionTime(stats.sessionDuration)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Messages</p>
                <p className="text-lg font-semibold text-slate-800">{stats.messageCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Voice Quality</p>
                <p className="text-lg font-semibold text-slate-800">{stats.voiceQuality}</p>
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
