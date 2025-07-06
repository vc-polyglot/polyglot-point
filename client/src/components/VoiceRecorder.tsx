import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSimpleVoiceRecorder } from '@/hooks/useSimpleVoiceRecorder';
import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

export function VoiceRecorder({ onAudioRecorded, isProcessing = false, disabled = false }: VoiceRecorderProps) {
  const {
    isRecording,
    isProcessing: recorderProcessing,
    audioLevel,
    startRecording,
    stopRecording,
    error
  } = useSimpleVoiceRecorder();

  const [isHolding, setIsHolding] = useState(false);

  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (disabled || isProcessing) return;
    e.preventDefault();
    
    console.log('Mouse down - starting recording');
    setIsHolding(true);
    await startRecording();
  }, [disabled, isProcessing, startRecording]);

  const handleMouseUp = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    console.log('Mouse up - stopping recording, isHolding:', isHolding, 'isRecording:', isRecording);
    
    if (!isHolding && !isRecording) return;
    
    setIsHolding(false);
    const audioBlob = await stopRecording();
    
    if (audioBlob && audioBlob.size > 0) {
      console.log('Audio blob recorded, size:', audioBlob.size);
      onAudioRecorded(audioBlob);
    } else {
      console.log('No audio data recorded');
    }
  }, [isHolding, isRecording, stopRecording, onAudioRecorded]);

  // Handle touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    console.log('Touch start - starting recording');
    setIsHolding(true);
    startRecording();
  }, [startRecording]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    console.log('Touch end - stopping recording');
    handleMouseUp();
  }, [handleMouseUp]);

  // Cleanup on unmount or when disabled
  useEffect(() => {
    if (disabled && isRecording) {
      stopRecording();
      setIsHolding(false);
    }
  }, [disabled, isRecording, stopRecording]);

  // Handle mouse leave and touch cancel to prevent stuck button
  const handleMouseLeave = useCallback(() => {
    // Only stop if we're actively holding and recording
    if (isHolding && isRecording) {
      console.log('Mouse leave - stopping recording');
      handleMouseUp();
    }
  }, [isHolding, isRecording, handleMouseUp]);

  const handleTouchCancel = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    console.log('Touch cancel - stopping recording');
    if (isHolding || isRecording) {
      handleMouseUp();
    }
  }, [isHolding, isRecording, handleMouseUp]);

  // Remove global event listeners as they're causing premature stops

  const showProcessing = isProcessing || recorderProcessing;
  const showRecording = isRecording && !showProcessing;

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Recording Status */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Voice Conversation</h3>
        <p className="text-sm text-slate-600">
          {showProcessing
            ? "Processing your message..."
            : showRecording
            ? "Recording... Release to send"
            : "Tap and hold to speak, release to send"
          }
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-red-600 text-sm text-center max-w-xs">
          {error}
        </div>
      )}

      {/* Main Voice Button */}
      <div className="relative">
        <Button
          size="lg"
          className={cn(
            "w-20 h-20 rounded-full transition-all duration-200 transform",
            "bg-gradient-to-r from-indigo-500 to-purple-600",
            "hover:from-indigo-600 hover:to-purple-700",
            "active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            showRecording && "scale-110",
            showProcessing && "cursor-wait"
          )}
          disabled={disabled}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          {showProcessing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </Button>

        {/* Recording Animation Ring */}
        {showRecording && (
          <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-pulse" />
        )}

        {/* Processing Spinner Ring */}
        {showProcessing && (
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        )}
      </div>

      {/* Audio Level and Listening Animation */}
      {showRecording && (
        <div className="flex flex-col items-center space-y-3">
          {/* Listening Animation - Sound Waves */}
          <div className="flex items-center space-x-1">
            <div className="w-1 bg-indigo-500 rounded-full animate-pulse" style={{ height: `${Math.max(8, audioLevel * 0.5)}px` }}></div>
            <div className="w-1 bg-indigo-600 rounded-full animate-pulse" style={{ height: `${Math.max(12, audioLevel * 0.8)}px`, animationDelay: '0.1s' }}></div>
            <div className="w-1 bg-indigo-700 rounded-full animate-pulse" style={{ height: `${Math.max(16, audioLevel * 1.2)}px`, animationDelay: '0.2s' }}></div>
            <div className="w-1 bg-indigo-600 rounded-full animate-pulse" style={{ height: `${Math.max(12, audioLevel * 0.8)}px`, animationDelay: '0.3s' }}></div>
            <div className="w-1 bg-indigo-500 rounded-full animate-pulse" style={{ height: `${Math.max(8, audioLevel * 0.5)}px`, animationDelay: '0.4s' }}></div>
          </div>

          {/* Audio Level Bar */}
          <div className="w-32 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-red-500 rounded-full transition-all duration-100"
              style={{ width: `${Math.min(100, audioLevel)}%` }}
            />
          </div>

          {/* Emergency Stop Button */}
          <Button
            size="sm"
            variant="outline"
            className="mt-2 bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
            onClick={() => {
              console.log('Emergency stop button clicked');
              handleMouseUp();
            }}
          >
            Stop Recording
          </Button>
        </div>
      )}
    </div>
  );
}
