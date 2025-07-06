import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSimpleVoiceRecorder } from '@/hooks/useSimpleVoiceRecorder';

interface SimpleVoiceRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

export function SimpleVoiceRecorder({ onAudioRecorded, isProcessing = false, disabled = false }: SimpleVoiceRecorderProps) {
  const {
    isRecording,
    isProcessing: recorderProcessing,
    audioLevel,
    startRecording,
    stopRecording,
    error
  } = useSimpleVoiceRecorder();

  const [isPressed, setIsPressed] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);

  const handleStart = useCallback(async () => {
    if (disabled || isProcessing || recorderProcessing) return;
    
    console.log('Starting recording...');
    setIsPressed(true);
    setRecordingTimer(0);
    await startRecording();
  }, [disabled, isProcessing, recorderProcessing, startRecording]);

  const handleStop = useCallback(async () => {
    if (!isRecording && !isPressed) return;
    
    console.log('Stopping recording...');
    setIsPressed(false);
    setRecordingTimer(0);
    const audioBlob = await stopRecording();
    
    if (audioBlob && audioBlob.size > 0) {
      console.log('Audio recorded successfully, size:', audioBlob.size);
      onAudioRecorded(audioBlob);
    } else {
      console.log('No audio data or recording too short');
    }
  }, [isRecording, isPressed, stopRecording, onAudioRecorded]);

  const showProcessing = isProcessing || recorderProcessing;
  const showRecording = isRecording && !showProcessing;
  const isActiveRecording = isPressed && isRecording;

  // Timer for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActiveRecording) {
      interval = setInterval(() => {
        setRecordingTimer(prev => prev + 0.1);
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActiveRecording]);

  return (
    <div className="flex flex-col items-center space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Main Recording Button */}
      <div className="relative">
        <Button
          size="lg"
          className={cn(
            "w-16 h-16 rounded-full transition-all duration-200",
            isActiveRecording 
              ? "bg-red-500 hover:bg-red-600 text-white scale-110 shadow-lg" 
              : "bg-indigo-500 hover:bg-indigo-600 text-white",
            showProcessing && "opacity-50 cursor-not-allowed",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled || showProcessing}
          onMouseDown={handleStart}
          onMouseUp={handleStop}
          onMouseLeave={handleStop}
          onTouchStart={handleStart}
          onTouchEnd={handleStop}
        >
          {showProcessing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isActiveRecording ? (
            <Square className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </Button>

        {/* Recording Ring Animation */}
        {isActiveRecording && (
          <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping" />
        )}
      </div>

      {/* Recording Status */}
      <div className="text-center">
        {showProcessing && (
          <p className="text-sm text-gray-600">Procesando audio...</p>
        )}
        {isActiveRecording && (
          <div className="text-center">
            <p className="text-sm text-red-600 font-medium">
              🔴 Grabando... {recordingTimer.toFixed(1)}s
            </p>
            {recordingTimer < 1.5 ? (
              <p className="text-xs text-orange-600">Mantén presionado hasta 2 segundos</p>
            ) : (
              <p className="text-xs text-green-600">✓ Ya puedes soltar para enviar</p>
            )}
          </div>
        )}
        {!showProcessing && !isActiveRecording && (
          <div className="text-center">
            <p className="text-sm text-gray-600">Mantén presionado por 1-2 segundos para hablar</p>
            <p className="text-xs text-orange-600 mt-1">
              Asegúrate de que no haya videos o audio reproduciéndose en segundo plano
            </p>
          </div>
        )}
      </div>

      {/* Audio Level Visualization */}
      {isActiveRecording && (
        <div className="flex flex-col items-center space-y-2">
          {/* Sound Waves Animation */}
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{
                  height: `${Math.max(8, audioLevel * (0.5 + i * 0.2))}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>

          {/* Audio Level Bar */}
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-full transition-all duration-100"
              style={{ width: `${Math.min(100, audioLevel)}%` }}
            />
          </div>

          {/* Emergency Stop Button */}
          <Button
            size="sm"
            variant="outline"
            className="bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
            onClick={handleStop}
          >
            <StopCircle className="w-4 h-4 mr-1" />
            Detener
          </Button>
        </div>
      )}
    </div>
  );
}