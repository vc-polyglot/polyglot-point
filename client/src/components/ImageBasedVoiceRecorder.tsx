import { useState, useRef, useCallback } from 'react';
import { Mic } from 'lucide-react';

interface ImageBasedVoiceRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  isProcessing: boolean;
  disabled: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  isAIResponding?: boolean;
}

export function ImageBasedVoiceRecorder({
  onAudioRecorded,
  isProcessing,
  disabled,
  onRecordingStart,
  onRecordingStop,
  isAIResponding = false
}: ImageBasedVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    if (disabled || isProcessing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        onAudioRecorded(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        onRecordingStop?.();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      onRecordingStart?.();

    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  }, [disabled, isProcessing, onAudioRecorded, onRecordingStart, onRecordingStop]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const handleButtonClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Dynamic button styling based on state
  const getButtonStyle = () => {
    if (isAIResponding) {
      // Clara is speaking - blue state
      return 'bg-[#4A90E2] shadow-2xl shadow-blue-500/50';
    } else if (isRecording) {
      // User is recording - intense red state
      return 'bg-[#C44166] shadow-2xl shadow-red-600/50';
    } else {
      // Normal inactive state - base red
      return 'bg-[#E94E77] shadow-2xl shadow-red-500/50';
    }
  };

  return (
    <button
      className={`recording-button w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 ${getButtonStyle()} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      data-state={isAIResponding ? 'ai-responding' : isRecording ? 'recording' : 'idle'}
      onClick={handleButtonClick}
      disabled={disabled || isProcessing || isAIResponding}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
      <Mic 
        className="w-8 h-8 text-white" 
      />
    </button>
  );
}
