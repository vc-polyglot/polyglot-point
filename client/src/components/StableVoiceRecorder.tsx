import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StableVoiceRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

export function StableVoiceRecorder({ onAudioRecorded, isProcessing = false, disabled = false }: StableVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    if (disabled || isProcessing || isRecording) return;

    try {
      setError(null);
      chunksRef.current = [];
      setRecordingTime(0);

      console.log('Starting stable voice recording...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      });

      streamRef.current = stream;
      setIsRecording(true);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('Audio chunk collected:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 0.1);
      }, 100);

      console.log('Recording started successfully');
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('No se pudo acceder al micrófono. Verifica los permisos.');
      setIsRecording(false);
    }
  }, [disabled, isProcessing, isRecording]);

  const stopRecording = useCallback(async () => {
    if (!isRecording || !mediaRecorderRef.current || !streamRef.current) return;

    try {
      console.log('Stopping recording after', recordingTime.toFixed(1), 'seconds');

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const mediaRecorder = mediaRecorderRef.current;

      return new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => {
          console.log('Recording stopped, total chunks:', chunksRef.current.length);

          if (chunksRef.current.length > 0) {
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
            console.log('Final audio blob size:', audioBlob.size, 'bytes');
            
            if (audioBlob.size > 1000) { // Minimum 1KB
              onAudioRecorded(audioBlob);
            } else {
              setError('Grabación demasiado corta. Habla por al menos 2 segundos.');
            }
          } else {
            setError('No se detectó audio. Intenta de nuevo.');
          }

          // Cleanup
          setIsRecording(false);
          setRecordingTime(0);
          
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          
          mediaRecorderRef.current = null;
          resolve();
        };

        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      });
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError('Error al detener la grabación');
      setIsRecording(false);
    }
  }, [isRecording, recordingTime, onAudioRecorded]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="flex flex-col items-center space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Recording Button */}
      <Button
        size="lg"
        onClick={toggleRecording}
        disabled={disabled || isProcessing}
        className={cn(
          "w-20 h-20 rounded-full transition-all duration-200",
          isRecording 
            ? "bg-red-500 hover:bg-red-600 text-white scale-110 shadow-lg" 
            : "bg-indigo-500 hover:bg-indigo-600 text-white",
          (disabled || isProcessing) && "opacity-50 cursor-not-allowed"
        )}
      >
        {isProcessing ? (
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isRecording ? (
          <StopCircle className="w-8 h-8" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </Button>

      {/* Status and Instructions */}
      <div className="text-center">
        {isProcessing && (
          <p className="text-sm text-gray-600">Procesando audio...</p>
        )}
        
        {isRecording && !isProcessing && (
          <div className="text-center">
            <p className="text-sm text-red-600 font-medium">
              🔴 Grabando... {recordingTime.toFixed(1)}s
            </p>
            {recordingTime < 2.0 ? (
              <p className="text-xs text-orange-600">Habla por al menos 2 segundos</p>
            ) : (
              <p className="text-xs text-green-600">✓ Haz clic para detener y enviar</p>
            )}
          </div>
        )}
        
        {!isRecording && !isProcessing && (
          <div className="text-center">
            <p className="text-sm text-gray-600">Haz clic para empezar a grabar</p>
            <p className="text-xs text-orange-600 mt-1">
              Asegúrate de estar en un lugar silencioso
            </p>
          </div>
        )}
      </div>

      {/* Recording Visualization */}
      {isRecording && (
        <div className="flex items-center space-x-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-red-500 rounded-full animate-pulse"
              style={{
                height: `${Math.max(8, 12 + i * 2)}px`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
