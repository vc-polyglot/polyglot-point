import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversationMessage } from '@/types/conversation';

interface ConversationAreaProps {
  messages: ConversationMessage[];
  isAIProcessing?: boolean;
  language?: string;
  isMuted?: boolean;
}

interface WelcomeMessageProps {
  language?: string;
}

function WelcomeMessage({ language = 'en' }: WelcomeMessageProps) {
  const welcomeMessages: Record<string, string> = {
    es: "¡Hola! Soy Clara, tu compañera de práctica de idiomas. Elige tu idioma y empieza a hablar naturalmente. Te ayudaré a practicar y mejorar.",
    en: "Hi! I'm Clara, your language practice companion. Choose your language and start speaking naturally. I'll help you practice and improve.",
    fr: "Salut! Je suis Clara, votre compagne de pratique linguistique. Choisissez votre langue et commencez à parler naturellement. Je vous aiderai à pratiquer et à vous améliorer.",
    it: "Ciao! Sono Clara, la tua compagna di pratica linguistica. Scegli la tua lingua e inizia a parlare naturalmente. Ti aiuterò a praticare e migliorare.",
    de: "Hallo! Ich bin Clara, deine Sprachpraxis-Begleiterin. Wähle deine Sprache und fange an, natürlich zu sprechen. Ich helfe dir beim Üben und Verbessern.",
    pt: "Olá! Eu sou Clara, sua companheira de prática de idiomas. Escolha seu idioma e comece a falar naturalmente. Vou ajudá-lo a praticar e melhorar."
  };

  return (
    <div className="flex items-start space-x-3 mb-6">
      <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm font-semibold">C</span>
      </div>
      <div className="bg-slate-800/50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-md">
        <p className="text-white text-sm">
          {welcomeMessages[language] || welcomeMessages.en}
        </p>
        <span className="text-xs text-slate-400 mt-1 block">just now</span>
      </div>
    </div>
  );
}

export function ConversationArea({ messages, isAIProcessing = false, language = 'en', isMuted = false }: ConversationAreaProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [lastBotMessage, setLastBotMessage] = useState<ConversationMessage | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Automatic audio playback for new bot responses
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    
    // Only auto-play for new AI messages with audio that aren't muted
    if (lastMessage && 
        lastMessage.type === 'ai' && 
        lastMessage.audioUrl && 
        !isMuted &&
        lastMessage !== lastBotMessage) {
      
      console.log('🔊 AUTO-PLAYING bot response audio:', lastMessage.audioUrl);
      setLastBotMessage(lastMessage);
      
      // Small delay to ensure audio file is ready
      setTimeout(() => {
        playAudio(lastMessage.audioUrl!, true); // true flag for auto-play
      }, 100);
    }
  }, [messages, isMuted, lastBotMessage]);

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} min ago`;
    } else {
      return timestamp.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const playAudio = async (audioUrl: string, isAutoPlay: boolean = false) => {
    try {
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }

      // If manually clicking on the same audio that's playing, just stop it
      if (!isAutoPlay && playingAudio === audioUrl) {
        setPlayingAudio(null);
        currentAudioRef.current = null;
        return;
      }

      // Construct the full API URL for the audio file
      const fullAudioUrl = audioUrl.startsWith('http') ? audioUrl : `/api/audio/${audioUrl}`;
      console.log('Attempting to load audio from:', fullAudioUrl);
      console.log('Original audioUrl:', audioUrl);
      console.log('Auto-play mode:', isAutoPlay);
      
      const audio = new Audio(fullAudioUrl);
      currentAudioRef.current = audio;
      setPlayingAudio(audioUrl);

      audio.onended = () => {
        setPlayingAudio(null);
        currentAudioRef.current = null;
      };

      audio.onerror = (e) => {
        console.error('Error playing audio:', audioUrl);
        console.error('Audio error details:', e);
        console.error('Audio element state:', {
          readyState: audio.readyState,
          networkState: audio.networkState,
          error: audio.error
        });
        setPlayingAudio(null);
        currentAudioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingAudio(null);
      currentAudioRef.current = null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-indigo-100">
      <div
        ref={scrollAreaRef}
        className="p-6 space-y-6"
      >
        {/* Welcome Message */}
        {messages.length === 0 && (
          <WelcomeMessage language={language} />
        )}

        {/* Messages */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-start space-x-3",
              message.type === 'user' ? "justify-end" : "justify-start"
            )}
          >
            {message.type === 'ai' && (
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-semibold">C</span>
              </div>
            )}

            <div
              className={cn(
                "rounded-2xl px-4 py-3 max-w-sm",
                message.type === 'user'
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-slate-800/50 text-white rounded-tl-sm"
              )}
            >
              <p className="text-sm">{message.content}</p>
              
              {/* Corrections */}
              {message.corrections && message.corrections.length > 0 && (
                <div className="mt-2 p-2 bg-orange-900/30 rounded text-xs">
                  <strong className="text-orange-300">Gentle correction:</strong>
                  <div className="text-orange-200 mt-1">
                    {message.corrections.map((correction, index) => (
                      <div key={index}>• {correction}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-2 p-2 bg-blue-900/30 rounded text-xs">
                  <strong className="text-blue-300">Suggestions:</strong>
                  <div className="text-blue-200 mt-1">
                    {message.suggestions.map((suggestion, index) => (
                      <div key={index}>• {suggestion}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pronunciation Feedback */}
              {message.pronunciationFeedback && (
                <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs">
                  <strong className="text-yellow-300">Pronunciation:</strong>
                  <div className="text-yellow-200 mt-1">
                    {message.pronunciationFeedback}
                  </div>
                </div>
              )}

              <span className={cn(
                "text-xs mt-1 block",
                message.type === 'user' ? "text-blue-200" : "text-slate-400"
              )}>
                {formatTime(message.timestamp)}
              </span>

              {/* Audio Playback Controls for AI messages */}
              {message.type === 'ai' && message.audioUrl && (
                <div className="flex items-center space-x-2 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-6 h-6 p-0 bg-indigo-100 hover:bg-indigo-200 rounded-full"
                    onClick={() => playAudio(message.audioUrl!, false)}
                  >
                    {playingAudio === message.audioUrl ? (
                      <Pause className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <Play className="w-3 h-3 text-indigo-600" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-6 h-6 p-0 bg-green-100 hover:bg-green-200 rounded-full"
                    onClick={() => playAudio(message.audioUrl!, false)}
                    title="Replay audio"
                  >
                    <RotateCcw className="w-3 h-3 text-green-600" />
                  </Button>
                  <div className="flex-1 h-1 bg-slate-200 rounded-full">
                    <div 
                      className={cn(
                        "h-1 bg-indigo-500 rounded-full transition-all",
                        playingAudio === message.audioUrl ? "w-full animate-pulse" : "w-0"
                      )} 
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {playingAudio === message.audioUrl ? "Playing..." : "Auto-played"}
                  </span>
                </div>
              )}
            </div>

            {message.type === 'user' && (
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-user text-slate-600 text-sm"></i>
              </div>
            )}
          </div>
        ))}

        {/* AI Processing Indicator */}
        {isAIProcessing && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="fas fa-robot text-white text-sm"></i>
            </div>
            <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
