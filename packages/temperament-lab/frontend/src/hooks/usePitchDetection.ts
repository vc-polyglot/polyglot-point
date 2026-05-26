import { useState, useRef, useCallback } from 'react';
import { PitchDetector } from '../services/audio';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function hzToNote(hz: number, referenceA: number): { note: string; cents: number } {
  const midiFloat = 12 * Math.log2(hz / referenceA) + 69;
  const midiRound = Math.round(midiFloat);
  const noteIdx = ((midiRound % 12) + 12) % 12;
  const cents = (midiFloat - midiRound) * 100;
  return { note: NOTE_NAMES[noteIdx], cents };
}

export function usePitchDetection(referenceA: number = 440) {
  const [hz, setHz] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [cents, setCents] = useState(0);
  const [rms, setRms] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detector = useRef<PitchDetector | null>(null);
  const smoothHz = useRef<number | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      detector.current = new PitchDetector((rawHz, rawRms) => {
        setRms(rawRms);
        if (rawHz === null) {
          smoothHz.current = null;
          setHz(null); setNote(null); setCents(0);
          return;
        }
        smoothHz.current = smoothHz.current === null
          ? rawHz
          : 0.15 * rawHz + 0.85 * smoothHz.current;
        const { note: n, cents: c } = hzToNote(smoothHz.current, referenceA);
        setHz(smoothHz.current);
        setNote(n);
        setCents(c);
      });
      await detector.current.start();
      setIsListening(true);
    } catch (e: any) {
      const msg = String((e as any)?.message ?? '');
      if (msg.includes('getUserMedia')) {
        setError('Error de audio. Ve a Ajustes y activa el microfono para Tempera.');
      } else {
        setError('Error: ' + (msg || 'no se pudo iniciar el microfono'));
      }
      console.error(e);
    }
  }, [referenceA]);

  const stop = useCallback(() => {
    detector.current?.stop();
    detector.current = null;
    smoothHz.current = null;
    setHz(null); setNote(null); setCents(0); setRms(0);
    setIsListening(false);
  }, []);

  return { hz, note, cents, rms, isListening, error, start, stop };
}
