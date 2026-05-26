// setup-tempera.js
// Ejecutar desde la raíz del monorepo: node setup-tempera.js

const fs = require('fs');
const path = require('path');
const BASE = process.cwd();

function write(filePath, content) {
  const full = path.join(BASE, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('✓', filePath);
}

// ─── capacitor.config.ts ────────────────────────────────────────────────────
write('packages/temperament-lab/capacitor.config.ts',
`import type { CapacitorConfig } from '@capacitor/cli';

// PLACEHOLDER — confirmar appId cuando haya nombre oficial
const config: CapacitorConfig = {
  appId: 'com.ohtlica.tempera',
  appName: 'Tempera',
  webDir: 'frontend/dist',
  server: { androidScheme: 'https' },
};

export default config;
`);

// ─── package.json (raíz del package) ────────────────────────────────────────
write('packages/temperament-lab/package.json',
`{
  "name": "temperament-lab",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "cd frontend && npx vite build && cd ..",
    "dev": "cd frontend && npx vite",
    "sync": "npx cap sync android",
    "build:release": "cd frontend && npx vite build && cd .. && npx cap sync android"
  },
  "dependencies": {
    "@capacitor/android": "^8.0.0",
    "@capacitor/core": "^8.0.0",
    "@revenuecat/purchases-capacitor": "^13.1.1"
  },
  "devDependencies": {
    "@capacitor/cli": "^8.0.0",
    "typescript": "^5.3.0"
  }
}
`);

// ─── frontend/package.json ───────────────────────────────────────────────────
write('packages/temperament-lab/frontend/package.json',
`{
  "name": "temperament-lab-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
`);

// ─── frontend/tsconfig.json ──────────────────────────────────────────────────
write('packages/temperament-lab/frontend/tsconfig.json',
`{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
`);

// ─── frontend/vite.config.ts ─────────────────────────────────────────────────
write('packages/temperament-lab/frontend/vite.config.ts',
`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' },
});
`);

// ─── frontend/index.html ─────────────────────────────────────────────────────
write('packages/temperament-lab/frontend/index.html',
`<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#F6F0E5" />
    <title>Tempera</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Space+Mono&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);

// ─── frontend/src/styles/index.css ───────────────────────────────────────────
write('packages/temperament-lab/frontend/src/styles/index.css',
`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; width: 100%; overflow: hidden; }
body {
  background: #F6F0E5;
  font-family: 'Cormorant Garamond', Georgia, serif;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
button { font-family: 'Cormorant Garamond', Georgia, serif; }
`);

// ─── frontend/src/main.tsx ───────────────────────────────────────────────────
write('packages/temperament-lab/frontend/src/main.tsx',
`import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`);

// ─── frontend/src/App.tsx ────────────────────────────────────────────────────
write('packages/temperament-lab/frontend/src/App.tsx',
`import { useEffect } from 'react';
import { initRevenueCat } from './services/revenuecat';
import { TunerScreen } from './components/TunerScreen';

export function App() {
  useEffect(() => {
    initRevenueCat().catch(console.error);
  }, []);
  return <TunerScreen />;
}
`);

// ─── frontend/src/services/revenuecat.ts ────────────────────────────────────
write('packages/temperament-lab/frontend/src/services/revenuecat.ts',
`import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

// PLACEHOLDER — reemplazar cuando se cree el proyecto Tempera en RevenueCat
const RC_API_KEY = 'goog_aOeVbBcRMlEwAeWfILHuAxFsOAE';
// PLACEHOLDER — crear entitlement "Tempera Premium" en RevenueCat dashboard
const ENTITLEMENT_ID = 'Tempera Premium';

export async function initRevenueCat(): Promise<void> {
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({ apiKey: RC_API_KEY });
  } catch (e) {
    console.error('[RevenueCat] init:', e);
  }
}

export async function isPremiumActive(): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

export async function getOfferings() {
  try {
    const { offerings } = await Purchases.getOfferings();
    return offerings;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: any): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}
`);

// ─── frontend/src/services/audio.ts ─────────────────────────────────────────
write('packages/temperament-lab/frontend/src/services/audio.ts',
`const YIN_THRESHOLD = 0.15;

export class PitchDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private buffer = new Float32Array(2048);
  private stream: MediaStream | null = null;
  private rafId: number | null = null;

  constructor(private onPitch: (hz: number | null, rms: number) => void) {}

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false,
    });
    this.audioContext = new AudioContext();
    await this.audioContext.resume();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
    this.loop();
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.source?.disconnect();
    this.stream?.getTracks().forEach(t => t.stop());
    this.audioContext?.close().catch(() => {});
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
  }

  private loop(): void {
    if (!this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.buffer);
    const rms = this.rms(this.buffer);
    if (rms < 0.008) {
      this.onPitch(null, rms);
    } else {
      const hz = this.yin(this.buffer, this.audioContext!.sampleRate);
      this.onPitch(hz, rms);
    }
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private rms(buf: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  private yin(buffer: Float32Array, sampleRate: number): number | null {
    const half = Math.floor(buffer.length / 2);
    const d = new Float32Array(half);
    for (let tau = 1; tau < half; tau++) {
      for (let j = 0; j < half; j++) {
        const diff = buffer[j] - buffer[j + tau];
        d[tau] += diff * diff;
      }
    }
    d[0] = 1;
    let sum = 0;
    for (let tau = 1; tau < half; tau++) {
      sum += d[tau];
      d[tau] *= tau / sum;
    }
    let tau = 2;
    while (tau < half) {
      if (d[tau] < YIN_THRESHOLD) {
        while (tau + 1 < half && d[tau + 1] < d[tau]) tau++;
        const x0 = tau > 0 ? tau - 1 : 0;
        const x2 = tau < half - 1 ? tau + 1 : tau;
        if (x0 === tau) return sampleRate / (d[tau] <= d[x2] ? tau : x2);
        if (x2 === tau) return sampleRate / (d[tau] <= d[x0] ? tau : x0);
        const t = tau + (d[x2] - d[x0]) / (2 * (2 * d[tau] - d[x2] - d[x0]));
        return sampleRate / t;
      }
      tau++;
    }
    return null;
  }
}
`);

// ─── frontend/src/hooks/usePremium.ts ───────────────────────────────────────
write('packages/temperament-lab/frontend/src/hooks/usePremium.ts',
`import { useEffect, useState, useCallback } from 'react';
import { isPremiumActive, restorePurchases } from '../services/revenuecat';

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    const status = await isPremiumActive();
    setIsPremium(status);
    setLoading(false);
  }, []);

  const restore = useCallback(async () => {
    setLoading(true);
    const status = await restorePurchases();
    setIsPremium(status);
    setLoading(false);
    return status;
  }, []);

  useEffect(() => { check(); }, [check]);

  return { isPremium, loading, setIsPremium, restore, refresh: check };
}
`);

// ─── frontend/src/hooks/usePitchDetection.ts ────────────────────────────────
write('packages/temperament-lab/frontend/src/hooks/usePitchDetection.ts',
`import { useState, useRef, useCallback } from 'react';
import { PitchDetector } from '../services/audio';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const REFERENCE_A = 440;

function hzToNote(hz: number): { note: string; cents: number } {
  const midiFloat = 12 * Math.log2(hz / REFERENCE_A) + 69;
  const midiRound = Math.round(midiFloat);
  const noteIdx = ((midiRound % 12) + 12) % 12;
  const cents = (midiFloat - midiRound) * 100;
  return { note: NOTE_NAMES[noteIdx], cents };
}

export function usePitchDetection() {
  const [hz, setHz] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [cents, setCents] = useState(0);
  const [rms, setRms] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const detector = useRef<PitchDetector | null>(null);
  const smoothHz = useRef<number | null>(null);

  const start = useCallback(async () => {
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
      const { note: n, cents: c } = hzToNote(smoothHz.current);
      setHz(smoothHz.current);
      setNote(n);
      setCents(c);
    });
    await detector.current.start();
    setIsListening(true);
  }, []);

  const stop = useCallback(() => {
    detector.current?.stop();
    detector.current = null;
    smoothHz.current = null;
    setHz(null); setNote(null); setCents(0); setRms(0);
    setIsListening(false);
  }, []);

  return { hz, note, cents, rms, isListening, start, stop };
}
`);

// ─── frontend/src/components/TunerScreen.tsx ────────────────────────────────
write('packages/temperament-lab/frontend/src/components/TunerScreen.tsx',
`import { useState } from 'react';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { usePremium } from '../hooks/usePremium';
import { PaywallModal } from './PaywallModal';

export function TunerScreen() {
  const { hz, note, cents, rms, isListening, start, stop } = usePitchDetection();
  const { isPremium, setIsPremium } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);

  const needleAngle = Math.max(-45, Math.min(45, cents * 0.9));
  const isInTune = hz !== null && Math.abs(cents) < 2;
  const centsLabel = hz ? (cents >= 0 ? '+' : '') + cents.toFixed(1) + 'c' : '· · ·';

  return (
    <div style={container}>
      <div style={header}>
        <span style={appTitle}>TEMPERA</span>
        {isPremium && <span style={premBadge}>Premium</span>}
      </div>

      <div style={gaugeWrap}>
        <svg viewBox="0 0 300 180" style={{ width: '100%', maxWidth: 340 }}>
          <path d="M 30 155 A 120 120 0 0 1 270 155" fill="none" stroke="#E2D8C8" strokeWidth="22" strokeLinecap="round"/>
          <path d="M 32 155 A 118 118 0 0 1 268 155" fill="none" stroke="#C89B3C" strokeWidth="14" strokeLinecap="round"/>
          <line x1="150" y1="34" x2="150" y2="50" stroke="#C89B3C" strokeWidth="2.5" strokeLinecap="round"/>
          {[-40,-30,-20,-10,10,20,30,40].map(c => {
            const a = (270 + c * 1.2) * Math.PI / 180;
            return (
              <line key={c}
                x1={150 + 115 * Math.cos(a)} y1={155 + 115 * Math.sin(a)}
                x2={150 + 102 * Math.cos(a)} y2={155 + 102 * Math.sin(a)}
                stroke="#9B8060" strokeWidth="1.5" strokeLinecap="round"
              />
            );
          })}
          <text x="150" y="122" textAnchor="middle"
            fontFamily="Cormorant Garamond, Georgia, serif"
            fontSize="54" fontStyle="italic"
            fill={isInTune ? '#5A8A2A' : '#3A2E22'}>
            {note ?? '—'}
          </text>
          <g style={{
            transformOrigin: '150px 155px',
            transform: 'rotate(' + needleAngle + 'deg)',
            transition: 'transform 0.08s ease-out'
          }}>
            <polygon points="150,38 149,147 151,147" fill="#9B7020"/>
            <polygon points="150,34 149.3,60 150.7,60" fill="#C89B3C"/>
          </g>
          <circle cx="150" cy="155" r="9" fill="#EDE3D2" stroke="#C89B3C" strokeWidth="1.5"/>
          <circle cx="150" cy="155" r="4" fill="#C89B3C"/>
        </svg>
      </div>

      <div style={centsWrap}>
        <span style={{ fontSize: 28, color: isInTune ? '#5A8A2A' : '#3A2E22' }}>
          {centsLabel}
        </span>
      </div>

      <div style={signalOuter}>
        <div style={{ height: '100%', background: '#8BAE58', borderRadius: 2, transition: 'width 0.1s', width: Math.min(100, rms * 400) + '%' }}/>
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

const container: React.CSSProperties = { minHeight: '100vh', background: '#F6F0E5', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' };
const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, width: '100%', justifyContent: 'center' };
const appTitle: React.CSSProperties = { fontSize: 20, letterSpacing: 6, color: '#3A2E22', textTransform: 'uppercase' };
const premBadge: React.CSSProperties = { fontSize: 9, letterSpacing: 2, color: '#9B6B1E', border: '1px solid #C89B3C', padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase' };
const gaugeWrap: React.CSSProperties = { width: '100%', display: 'flex', justifyContent: 'center' };
const centsWrap: React.CSSProperties = { textAlign: 'center', margin: '4px 0 12px', fontFamily: 'Cormorant Garamond, Georgia, serif' };
const signalOuter: React.CSSProperties = { width: 260, height: 4, background: '#E2D8C8', borderRadius: 2, marginBottom: 24, overflow: 'hidden' };
const ctrlRow: React.CSSProperties = { display: 'flex', gap: 10 };
const mainBtn: React.CSSProperties = { background: '#3A2E22', color: '#F6F0E5', border: 'none', borderRadius: 8, padding: '13px 30px', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' };
const premBtn: React.CSSProperties = { background: '#C89B3C', color: '#F6F0E5', border: 'none', borderRadius: 8, padding: '13px 22px', fontSize: 13, letterSpacing: 1, cursor: 'pointer' };
`);

// ─── frontend/src/components/PaywallModal.tsx ────────────────────────────────
write('packages/temperament-lab/frontend/src/components/PaywallModal.tsx',
`import { useState, useEffect } from 'react';
import { getOfferings, purchasePackage, restorePurchases } from '../services/revenuecat';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

const FEATURES = [
  'Biblioteca completa de temperamentos historicos',
  'Werckmeister · Kirnberger · Neidhardt · Young',
  'Mesotonias y temperamentos personalizados',
  'Modo Maestro: sensibilidad ultra precisa',
  'Modo pedagogico con analisis de batidos',
];

export function PaywallModal({ isOpen, onClose, onPurchaseSuccess }: Props) {
  const [offerings, setOfferings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) getOfferings().then(setOfferings);
  }, [isOpen]);

  if (!isOpen) return null;

  const packages = offerings?.current?.availablePackages ?? [];

  async function handlePurchase(pkg: any) {
    setLoading(true);
    setError(null);
    try {
      const ok = await purchasePackage(pkg);
      if (ok) onPurchaseSuccess();
    } catch (e: any) {
      const cancelled = e?.userCancelled === true || String(e?.message ?? '').toLowerCase().includes('cancel');
      if (!cancelled) setError('No se pudo completar la compra. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setLoading(true);
    const ok = await restorePurchases();
    setLoading(false);
    if (ok) onPurchaseSuccess();
    else setError('No se encontraron compras anteriores.');
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <h2 style={title}>Tempera Premium</h2>
          <p style={subtitle}>Historical Tuning Studio</p>
        </div>
        <div style={featuresBox}>
          {FEATURES.map((f, i) => (
            <div key={i} style={featRow}>
              <span style={featDot}>+</span>
              <span style={featText}>{f}</span>
            </div>
          ))}
        </div>
        <div style={pkgsBox}>
          {packages.length === 0
            ? <p style={loadTxt}>Cargando opciones...</p>
            : packages.map((pkg: any) => (
              <button key={pkg.identifier} style={pkgBtn} onClick={() => handlePurchase(pkg)} disabled={loading}>
                <span style={pkgName}>{pkg.product.title}</span>
                <span style={pkgPrice}>{pkg.product.priceString}</span>
                {pkg.packageType === 'ANNUAL' && <span style={badge}>Mejor valor</span>}
              </button>
            ))
          }
        </div>
        {error && <p style={errTxt}>{error}</p>}
        <button style={restoreBtn} onClick={handleRestore} disabled={loading}>Restaurar compras</button>
        <button style={closeBtn} onClick={onClose} disabled={loading}>Ahora no</button>
        {loading && <div style={loadOverlay}>...</div>}
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(30,22,14,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modal: React.CSSProperties = { background: '#F6F0E5', borderRadius: 12, padding: '28px 24px', width: 320, maxWidth: '92vw', position: 'relative', border: '1px solid #D8CCBA' };
const modalHeader: React.CSSProperties = { textAlign: 'center', marginBottom: 18 };
const title: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 22, letterSpacing: 4, color: '#3A2E22', fontWeight: 400, textTransform: 'uppercase', margin: '0 0 4px' };
const subtitle: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 9, letterSpacing: 2.5, color: '#9B6B1E', textTransform: 'uppercase', margin: 0 };
const featuresBox: React.CSSProperties = { background: '#EDE3D2', borderRadius: 8, padding: '12px 14px', marginBottom: 16, border: '1px solid #D8CCBA' };
const featRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 };
const featDot: React.CSSProperties = { color: '#C89B3C', fontSize: 12, flexShrink: 0 };
const featText: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 12.5, color: '#3A2E22', lineHeight: 1.4 };
const pkgsBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 };
const pkgBtn: React.CSSProperties = { background: '#C89B3C', border: 'none', borderRadius: 8, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', width: '100%' };
const pkgName: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 13, color: '#F6F0E5' };
const pkgPrice: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 15, color: '#FAF7F0', fontWeight: 700 };
const badge: React.CSSProperties = { position: 'absolute', top: -8, right: 10, background: '#5A8A2A', color: '#F6F0E5', fontSize: 8, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase' };
const restoreBtn: React.CSSProperties = { width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 11, color: '#9B8060', letterSpacing: 1, padding: '6px 0', marginBottom: 4, textTransform: 'uppercase' };
const closeBtn: React.CSSProperties = { width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 11, color: '#B0A08A', padding: '4px 0' };
const errTxt: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 11, color: '#9A5A4A', textAlign: 'center', margin: '8px 0 4px' };
const loadTxt: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 13, color: '#9B8060', textAlign: 'center', padding: '16px 0' };
const loadOverlay: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(246,240,229,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, fontSize: 36, color: '#C89B3C' };
`);

console.log('\nTodos los archivos escritos correctamente.');
console.log('Siguiente paso: node setup-tempera.js ya corrido.');
console.log('Ahora corre: cd packages/temperament-lab/frontend && npx vite build');
