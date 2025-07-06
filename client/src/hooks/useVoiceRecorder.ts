// DISABLED - Voice input removed. User interaction is now text-only.
// Clara still responds with voice using TTS.

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
}

// Stub implementation - voice recording is disabled
export function useVoiceRecorder(): UseVoiceRecorderReturn {
  return {
    isRecording: false,
    isProcessing: false,
    audioLevel: 0,
    startRecording: async () => {},
    stopRecording: async () => null,
    error: null
  };
}
