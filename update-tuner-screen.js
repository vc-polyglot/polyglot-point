// update-tuner-screen.js
// Ejecutar desde la raíz del monorepo: node update-tuner-screen.js

const fs = require('fs');
const path = require('path');
const BASE = process.cwd();

function write(filePath, content) {
  const full = path.join(BASE, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('OK:', filePath);
}

write('packages/temperament-lab/frontend/src/styles/index.css',
`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; width: 100%; overflow: hidden; }
body {
  background: #1A1510;
  font-family: 'Cormorant Garamond', Georgia, serif;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  color: #F0E8D8;
}
button { font-family: 'Cormorant Garamond', Georgia, serif; }
`);

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

      {/* Header */}
      <div style={header}>
        <span style={appTitle}>TEMPERA</span>
        {isPremium && <span style={premBadge}>Premium</span>}
      </div>

      {/* Gauge */}
      <div style={gaugeWrap}>
        <svg viewBox="0 0 300 165" style={{ width: '100%', maxWidth: 340 }}>

          {/* Arc background */}
          <path d="M 24 140 A 126 126 0 0 1 276 140" fill="none" stroke="#1e1a14" strokeWidth="28" strokeLinecap="round"/>
          <path d="M 26 140 A 124 124 0 0 1 274 140" fill="none" stroke="#231f18" strokeWidth="22" strokeLinecap="round"/>

          {/* In-tune zone */}
          <path d="M 143 22 A 118 118 0 0 1 157 22" fill="none" stroke="#2a3a1a" strokeWidth="10" strokeLinecap="round" opacity="0.6"/>

          {/* Center tick gold */}
          <line x1="150" y1="12" x2="150" y2="28" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round"/>

          {/* Major ticks */}
          {[-50,-40,-30,-20,-10,10,20,30,40,50].map(c => {
            const a = (270 + c * 1.2) * Math.PI / 180;
            const r1 = 118, r2 = 104;
            return <line key={c}
              x1={150 + r1 * Math.cos(a)} y1={140 + r1 * Math.sin(a)}
              x2={150 + r2 * Math.cos(a)} y2={140 + r2 * Math.sin(a)}
              stroke="#8A7860" strokeWidth="1.5" strokeLinecap="round"/>;
          })}

          {/* Minor ticks */}
          {[-45,-35,-25,-15,-5,5,15,25,35,45].map(c => {
            const a = (270 + c * 1.2) * Math.PI / 180;
            return <line key={c}
              x1={150 + 118 * Math.cos(a)} y1={140 + 118 * Math.sin(a)}
              x2={150 + 110 * Math.cos(a)} y2={140 + 110 * Math.sin(a)}
              stroke="#5A4F3E" strokeWidth="1" strokeLinecap="round"/>;
          })}

          {/* Scale labels */}
          <text x="20" y="150" fontSize="9" fill="#C8B898" fontFamily="'Courier New',monospace" textAnchor="middle">-50</text>
          <text x="280" y="150" fontSize="9" fill="#C8B898" fontFamily="'Courier New',monospace" textAnchor="middle">+50</text>
          <text x="150" y="8" fontSize="8" fill="#D4AF37" fontFamily="'Courier New',monospace" textAnchor="middle">0</text>
          <text x="87"  y="14" fontSize="7" fill="#A09080" fontFamily="'Courier New',monospace" textAnchor="middle">-20</text>
          <text x="213" y="14" fontSize="7" fill="#A09080" fontFamily="'Courier New',monospace" textAnchor="middle">+20</text>

          {/* Note name */}
          <text x="150" y="118" textAnchor="middle"
            fontFamily="Cormorant Garamond, Georgia, serif"
            fontSize="54" fontStyle="italic"
            fill={isInTune ? '#6FBF6F' : '#F0E8D8'}>
            {note ?? '\u2014'}
          </text>

          {/* Needle */}
          <g style={{
            transformOrigin: '150px 140px',
            transform: 'rotate(' + needleAngle + 'deg)',
            transition: 'transform 0.08s ease-out'
          }}>
            <polygon points="150,28 148.2,100 151.8,100" fill="url(#needleGrad)"/>
            <polygon points="149,100 148,130 152,130 151,100" fill="#8B6914"/>
            <circle cx="150" cy="28" r="2" fill="#D4AF37"/>
            <ellipse cx="150" cy="128" rx="5" ry="7" fill="#5A4010"/>
          </g>

          <defs>
            <radialGradient id="needleGrad" cx="50%" cy="100%" r="80%">
              <stop offset="0%" stopColor="#D4AF37"/>
              <stop offset="100%" stopColor="#8B6914"/>
            </radialGradient>
          </defs>

          {/* Pivot ornament */}
          <circle cx="150" cy="140" r="14" fill="#1a1510" stroke="#3a2e1a" strokeWidth="1.5"/>
          <circle cx="150" cy="140" r="10" fill="#0e0c09" stroke="#5a4510" strokeWidth="1"/>
          <circle cx="150" cy="140" r="3" fill="#8b6914"/>
          <circle cx="150" cy="140" r="1.5" fill="#D4AF37"/>

          {/* In-tune ring */}
          <circle id="intune-ring" cx="150" cy="140" r="17" fill="none"
            stroke="#6FBF6F" strokeWidth="1.5"
            opacity={isInTune ? 0.7 : 0}
            style={{ transition: 'opacity 0.3s' }}/>
        </svg>
      </div>

      {/* Cents */}
      <div style={centsWrap}>
        <span style={{ fontSize: 26, color: isInTune ? '#6FBF6F' : '#D4AF37', letterSpacing: 2, fontFamily: "'Courier New', monospace" }}>
          {centsLabel}
        </span>
      </div>

      {/* Signal */}
      <div style={micRow}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: isListening ? '#4a8a4a' : '#2a2218', flexShrink: 0 }}/>
        <span style={micLabel}>{isListening ? 'Escuchando...' : 'Microfono inactivo'}</span>
      </div>
      <div style={signalOuter}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg,#4a8a5a,#8ab45a)', borderRadius: 2, transition: 'width 0.15s', width: Math.min(100, rms * 400) + '%' }}/>
      </div>

      <div style={divider}/>

      {/* Sensitivity */}
      <div style={sensRow}>
        {['Principiante','Estandar','Maestro'].map(s => (
          <div key={s} style={sensBtn}>{s}</div>
        ))}
      </div>

      {/* Controls */}
      <div style={ctrlGrid}>
        <div style={ctrlBox}>
          <div style={ctrlLabel}>Temperamento</div>
          <div style={ctrlValue}>Vallotti</div>
        </div>
        <div style={ctrlBox}>
          <div style={ctrlLabel}>Referencia</div>
          <div style={ctrlValue}>A = 440 Hz</div>
        </div>
      </div>

      {/* Main button */}
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
const micRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, marginLeft: 16 };
const micLabel: React.CSSProperties = { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#A09080' };
const signalOuter: React.CSSProperties = { width: '90%', height: 4, background: '#261f18', borderRadius: 2, margin: '6px 0 0', overflow: 'hidden' };
const divider: React.CSSProperties = { height: 1, background: '#2a2218', margin: '10px 0 8px', width: '100%' };
const sensRow: React.CSSProperties = { display: 'flex', gap: 4, marginBottom: 8, width: '100%' };
const sensBtn: React.CSSProperties = { flex: 1, padding: '6px 0', background: '#0e0c09', border: '1px solid #2a2218', borderRadius: 4, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#A09080', textAlign: 'center' };
const ctrlGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8, width: '100%' };
const ctrlBox: React.CSSProperties = { background: '#0e0c09', border: '1px solid #2a2218', borderRadius: 6, padding: '8px 10px' };
const ctrlLabel: React.CSSProperties = { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#8A7860', marginBottom: 4 };
const ctrlValue: React.CSSProperties = { fontSize: 13, color: '#D4AF37', fontFamily: "'Courier New', monospace", letterSpacing: 1 };
const ctrlRow: React.CSSProperties = { display: 'flex', gap: 10, width: '100%' };
const mainBtn: React.CSSProperties = { flex: 1, background: '#231f18', color: '#F0E8D8', border: '1px solid #3a3228', borderRadius: 8, padding: '13px', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' };
const premBtn: React.CSSProperties = { background: '#2a2010', color: '#D4AF37', border: '1px solid #5a4a20', borderRadius: 8, padding: '13px 18px', fontSize: 13, letterSpacing: 1, cursor: 'pointer' };
`);

console.log('Listo. Ahora corre: cd packages/temperament-lab/frontend && npx vite build');
