import { useState, useEffect, useCallback } from 'react';
import './Onboarding.css';

interface OnboardingProps {
  onComplete: () => void;
}

interface Step {
  selector: string | null;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    selector: null,
    title: 'Bienvenido a LexiPop Math',
    body: 'Esto es todo lo que necesitas saber para empezar.',
  },
  {
    selector: '.challenge-card',
    title: 'El ejercicio',
    body: 'Aquí aparece la operación. Léela y calcula el resultado.',
  },
  {
    selector: '.keypad-grid',
    title: 'El teclado',
    body: 'Toca los números para escribir tu respuesta.',
  },
  {
    selector: '.answer-display',
    title: 'Tu respuesta',
    body: 'Lo que escribes aparece aquí en tiempo real.',
  },
  {
    selector: '.keypad-bottom',
    title: 'Confirmar',
    body: 'Cuando tengas el número listo, toca ↵ para enviarlo.',
  },
  {
    selector: '.help-btn',
    title: 'Ayuda de Lexi',
    body: '¿No sabes cómo? Lexi te explica el método paso a paso.',
  },
];

const PAD = 10;

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep]     = useState(0);
  const [rect, setRect]     = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    const sel = STEPS[step].selector;
    if (!sel) { setRect(null); return; }
    const el = document.querySelector(sel);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useEffect(() => {
    const t = setTimeout(updateRect, 80);
    window.addEventListener('resize', updateRect);
    return () => { clearTimeout(t); window.removeEventListener('resize', updateRect); };
  }, [updateRect]);

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  const spotStyle: React.CSSProperties | null = rect
    ? {
        top:    rect.top    - PAD,
        left:   rect.left   - PAD,
        width:  rect.width  + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const TW = Math.min(300, VW - 32);

  let tooltipPos: React.CSSProperties = {};
  if (rect) {
    const above   = rect.top > VH / 2;
    const idealLeft = rect.left + rect.width / 2 - TW / 2;
    tooltipPos = {
      ...(above
        ? { bottom: VH - rect.top + PAD + 12 }
        : { top: rect.bottom + PAD + 12 }),
      left: Math.max(16, Math.min(idealLeft, VW - TW - 16)),
    };
  } else {
    tooltipPos = { top: '50%' as unknown as number, left: '50%' as unknown as number, transform: 'translate(-50%, -50%)' };
  }

  return (
    <div className={`ob-overlay ${rect ? '' : 'ob-no-spot'}`}>
      {spotStyle && <div className="ob-spotlight" style={spotStyle} />}

      <div className="ob-tooltip" style={{ ...tooltipPos, width: TW, position: 'fixed' }}>
        <p className="ob-step-num">{step + 1} / {STEPS.length}</p>
        <h3 className="ob-tooltip-title">{current.title}</h3>
        <p className="ob-tooltip-body">{current.body}</p>
        <div className="ob-tooltip-actions">
          {step > 0 && (
            <button className="ob-btn-back" onClick={() => setStep(s => s - 1)}>←</button>
          )}
          <button className="ob-btn-next" onClick={() => isLast ? onComplete() : setStep(s => s + 1)}>
            {isLast ? '¡Empezar!' : 'Siguiente →'}
          </button>
        </div>
      </div>

      {!isLast && (
        <button className="ob-skip" onClick={onComplete}>Omitir</button>
      )}
    </div>
  );
}
