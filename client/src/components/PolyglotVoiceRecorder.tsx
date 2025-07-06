import { useState, useRef, useCallback } from 'react';
import { Mic } from 'lucide-react';

interface PolyglotVoiceRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  isProcessing?: boolean;
  disabled?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export function PolyglotVoiceRecorder({ 
  onAudioRecorded, 
  isProcessing = false, 
  disabled = false,
  onRecordingStart,
  onRecordingStop
}: PolyglotVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    if (disabled || isProcessing || isRecording) return;

    try {
      setError(null);
      chunksRef.current = [];

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
      onRecordingStart?.();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { 
          type: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
        });
        onAudioRecorded(audioBlob);
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setIsRecording(false);
        onRecordingStop?.();
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording. Please check microphone permissions.');
      setIsRecording(false);
      onRecordingStop?.();
    }
  }, [disabled, isProcessing, isRecording, onAudioRecorded, onRecordingStart, onRecordingStop]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="flex flex-col items-center">
      <button
        className="speak-button flex items-center justify-center"
        disabled={isProcessing || disabled}
        onClick={toggleRecording}
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
      >
        <Mic className="w-8 h-8" />
      </button>
      
      {error && (
        <p className="text-destructive text-sm mt-2 text-center max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}