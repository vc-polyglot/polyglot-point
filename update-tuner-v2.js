// update-tuner-v2.js
const fs = require('fs');
const path = require('path');
const BASE = process.cwd();

function write(filePath, content) {
  const full = path.join(BASE, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('OK:', filePath);
}

write('packages/temperament-lab/frontend/src/hooks/usePitchDetection.ts',
`import { useState, useRef, useCallback } from 'react';
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
      setError('Permiso de microfono denegado');
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
`);

write('packages/temperament-lab/frontend/src/components/TunerScreen.tsx',
`import { useState } from 'react';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { usePremium } from '../hooks/usePremium';
import { PaywallModal } from './PaywallModal';

type Sensitivity = 'Principiante' | 'Estandar' | 'Maestro';
type Reference = 440 | 415;

const SMOOTHING: Record<Sensitivity, number> = {
  Principiante: 0.06,
  Estandar: 0.15,
  Maestro: 0.28,
};

export function TunerScreen() {
  const [sensitivity, setSensitivity] = useState<Sensitivity>('Estandar');
  const [reference, setReference] = useState<Reference>(440);
  const [tempIdx, setTempIdx] = useState(0);
  const { hz, note, cents, rms, isListening, error, start, stop } = usePitchDetection(reference);
  const { isPremium, setIsPremium } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);

  const TEMPERAMENTS = ['Vallotti', 'Igual', isPremium ? 'Werckmeister III' : 'Werckmeister III (Premium)'];

  const needleAngle = Math.max(-45, Math.min(45, cents * 0.9));
  const isInTune = hz !== null && Math.abs(cents) < 2;
  const centsLabel = hz ? (cents >= 0 ? '+' : '') + cents.toFixed(1) + 'c' : '· · ·';

  function handleTempPress() {
    const next = (tempIdx + 1) % TEMPERAMENTS.length;
    if (next === 2 && !isPremium) { setShowPaywall(true); return; }
    setTempIdx(next);
  }

  return (
    <div style={container}>

      <div style={header}>
        <span style={appTitle}>TEMPERA</span>
        {isPremium && <span style={premBadge}>Premium</span>}
      </div>

      <div style={gaugeWrap}>
        <svg viewBox="0 0 300 165" style={{ width: '100%', maxWidth: 340 }}>
          <path d="M 24 140 A 126 126 0 0 1 276 140" fill="none" stroke="#1e1a14" strokeWidth="28" strokeLinecap="round"/>
          <path d="M 26 140 A 124 124 0 0 1 274 140" fill="none" stroke="#231f18" strokeWidth="22" strokeLinecap="round"/>
          <path d="M 143 22 A 118 118 0 0 1 157 22" fill="none" stroke="#2a3a1a" strokeWidth="10" strokeLinecap="round" opacity="0.6"/>
          <line x1="150" y1="12" x2="150" y2="28" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round"/>
          {[-50,-40,-30,-20,-10,10,20,30,40,50].map(c => {
            const a = (270 + c * 1.2) * Math.PI / 180;
            return <line key={c}
              x1={150 + 118 * Math.cos(a)} y1={140 + 118 * Math.sin(a)}
              x2={150 + 104 * Math.cos(a)} y2={140 + 104 * Math.sin(a)}
              stroke="#8A7860" strokeWidth="1.5" strokeLinecap="round"/>;
          })}
          {[-45,-35,-25,-15,-5,5,15,25,35,45].map(c => {
            const a = (270 + c * 1.2) * Math.PI / 180;
            return <line key={c}
              x1={150 + 118 * Math.cos(a)} y1={140 + 118 * Math.sin(a)}
              x2={150 + 110 * Math.cos(a)} y2={140 + 110 * Math.sin(a)}
              stroke="#5A4F3E" strokeWidth="1" strokeLinecap="round"/>;
          })}
          <text x="20" y="150" fontSize="9" fill="#C8B898" fontFamily="'Courier New',monospace" textAnchor="middle">-50</text>
          <text x="280" y="150" fontSize="9" fill="#C8B898" fontFamily="'Courier New',monospace" textAnchor="middle">+50</text>
          <text x="150" y="8" fontSize="8" fill="#D4AF37" fontFamily="'Courier New',monospace" textAnchor="middle">0</text>
          <text x="87" y="14" fontSize="7" fill="#A09080" fontFamily="'Courier New',monospace" textAnchor="middle">-20</text>
          <text x="213" y="14" fontSize="7" fill="#A09080" fontFamily="'Courier New',monospace" textAnchor="middle">+20</text>
          <text x="150" y="118" textAnchor="middle"
            fontFamily="Cormorant Garamond, Georgia, serif"
            fontSize="54" fontStyle="italic"
            fill={isInTune ? '#6FBF6F' : '#F0E8D8'}>
            {note ?? '\u2014'}
          </text>
          <g style={{
            transformOrigin: '150px 140px',
            transform: 'rotate(' + needleAngle + 'deg)',
            transition: 'transform 0.08s ease-out'
          }}>
            <polygon points="150,28 148.2,100 151.8,100" fill="#D4AF37"/>
            <polygon points="149,100 148,130 152,130 151,100" fill="#8B6914"/>
            <circle cx="150" cy="28" r="2" fill="#F0E8D8"/>
            <ellipse cx="150" cy="128" rx="5" ry="7" fill="#5A4010"/>
          </g>
          <circle cx="150" cy="140" r="14" fill="#1a1510" stroke="#3a2e1a" strokeWidth="1.5"/>
          <circle cx="150" cy="140" r="10" fill="#0e0c09" stroke="#5a4510" strokeWidth="1"/>
          <circle cx="150" cy="140" r="3" fill="#8b6914"/>
          <circle cx="150" cy="140" r="1.5" fill="#D4AF37"/>
          <circle cx="150" cy="140" r="17" fill="none"
            stroke="#6FBF6F" strokeWidth="1.5"
            opacity={isInTune ? 0.7 : 0}
            style={{ transition: 'opacity 0.3s' }}/>
        </svg>
      </div>

      <div style={centsWrap}>
        <span style={{ fontSize: 26, color: isInTune ? '#6FBF6F' : '#D4AF37', letterSpacing: 2, fontFamily: "'Courier New', monospace" }}>
          {centsLabel}
        </span>
      </div>

      {error && <div style={errorTxt}>{error}</div>}

      <div style={micRow}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: isListening ? '#4a8a4a' : '#2a2218', flexShrink: 0 }}/>
        <span style={micLabel}>{isListening ? 'Escuchando...' : 'Microfono inactivo'}</span>
      </div>
      <div style={signalOuter}>
        <div style={{ height: '100%', background: '#4a8a5a', borderRadius: 2, transition: 'width 0.15s', width: Math.min(100, rms * 400) + '%' }}/>
      </div>

      <div style={divider}/>

      <div style={sensRow}>
        {(['Principiante','Estandar','Maestro'] as Sensitivity[]).map(s => (
          <div key={s}
            style={{ ...sensBtn, borderColor: sensitivity === s ? '#D4AF37' : '#2a2218', color: sensitivity === s ? '#D4AF37' : '#A09080' }}
            onClick={() => setSensitivity(s)}>
            {s}
          </div>
        ))}
      </div>

      <div style={ctrlGrid}>
        <div style={ctrlBox} onClick={handleTempPress}>
          <div style={ctrlLabel}>Temperamento</div>
          <div style={ctrlValue}>{TEMPERAMENTS[tempIdx]} <span style={{ color: '#5a4a20' }}>›</span></div>
        </div>
        <div style={ctrlBox} onClick={() => setReference(r => r === 440 ? 415 : 440)}>
          <div style={ctrlLabel}>Referencia</div>
          <div style={ctrlValue}>A = {reference} Hz <span style={{ color: '#5a4a20' }}>›</span></div>
        </div>
      </div>

      <div style={ctrlRow}>
        <button style={mainBtn} onClick={isListening ? stop : start}>
          {isListening ? 'Detener' : 'Afinar'}
        </button>
        {!isPremium && (
          <button style={premBtn} onClick={() => setShowPaywall(true)}>
            Premium
          </button>
        )}
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseSuccess={() => { setIsPremium(true); setShowPaywall(false); }}
      />
    </div>
  );
}

const container: React.CSSProperties = { minHeight: '100vh', background: '#1A1510', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px' };
const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, width: '100%', justifyContent: 'center' };
const appTitle: React.CSSProperties = { fontSize: 13, letterSpacing: 5, color: '#D4AF37', textTransform: 'uppercase', fontFamily: 'Cormorant Garamond, Georgia, serif' };
const premBadge: React.CSSProperties = { fontSize: 9, letterSpacing: 2, color: '#D4AF37', border: '1px solid #4a3a1a', padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase' };
const gaugeWrap: React.CSSProperties = { width: '100%', display: 'flex', justifyContent: 'center' };
const centsWrap: React.CSSProperties = { textAlign: 'center', margin: '4px 0 6px' };
const errorTxt: React.CSSProperties = { color: '#c06050', fontSize: 11, letterSpacing: 1, textAlign: 'center', marginBottom: 4 };
const micRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, marginLeft: 16 };
const micLabel: React.CSSProperties = { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#A09080' };
const signalOuter: React.CSSProperties = { width: '90%', height: 4, background: '#261f18', borderRadius: 2, margin: '6px 0 0', overflow: 'hidden' };
const divider: React.CSSProperties = { height: 1, background: '#2a2218', margin: '10px 0 8px', width: '100%' };
const sensRow: React.CSSProperties = { display: 'flex', gap: 4, marginBottom: 8, width: '100%' };
const sensBtn: React.CSSProperties = { flex: 1, padding: '6px 0', background: '#0e0c09', border: '1px solid #2a2218', borderRadius: 4, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', cursor: 'pointer' };
const ctrlGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8, width: '100%' };
const ctrlBox: React.CSSProperties = { background: '#0e0c09', border: '1px solid #2a2218', borderRadius: 6, padding: '8px 10px', cursor: 'pointer' };
const ctrlLabel: React.CSSProperties = { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#8A7860', marginBottom: 4 };
const ctrlValue: React.CSSProperties = { fontSize: 12, color: '#D4AF37', fontFamily: "'Courier New', monospace", letterSpacing: 1 };
const ctrlRow: React.CSSProperties = { display: 'flex', gap: 10, width: '100%' };
const mainBtn: React.CSSProperties = { flex: 1, background: '#231f18', color: '#F0E8D8', border: '1px solid #3a3228', borderRadius: 8, padding: '13px', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' };
const premBtn: React.CSSProperties = { background: '#2a2010', color: '#D4AF37', border: '1px solid #5a4a20', borderRadius: 8, padding: '13px 18px', fontSize: 13, letterSpacing: 1, cursor: 'pointer' };
`);

console.log('\nListo. Corre: cd packages/temperament-lab/frontend && npx vite build');
