import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './PhilosopherPage.css';

const API = import.meta.env.VITE_API_URL;

const PHILOSOPHERS: Record<number, { name: string; text: string }> = {
  9: {
    name: 'Diógenes el Cínico',
    text: `Diógenes era hijo de Icesias, cambista. Jenófanes dice que fue desterrado por haber adulterado la moneda. El propio Diógenes en su Pordalus confiesa que adulteró la moneda, y Eubúlides en su obra Sobre Diógenes dice lo mismo.

Llegado a Atenas se encontró con Antístenes. Como éste rechazara a todos sus discípulos, Diógenes le conquistó con su perseverancia. Una vez que Antístenes le amenazó con el bastón, Diógenes ofreció la cabeza diciendo: "Golpea, que no encontrarás madera tan dura que me aparte de ti mientras digas algo que valga la pena escuchar."

Vivía en un tonel, según cuenta Teofrasto en el Menedemo. Le preguntaron en qué lugar de Grecia veía hombres de bien, y respondió: "Hombres, en ningún sitio; niños de bien, en Lacedemonia." Cuando Alejandro se presentó ante él y le dijo "Pídeme lo que quieras", respondió: "Apártate un poco que no me tapas el sol."`
  }
};

export default function PhilosopherPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selection, setSelection] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const philosopher = PHILOSOPHERS[Number(id)];

  const handleTextSelect = async () => {
    const selected = window.getSelection()?.toString().trim();
    if (!selected || selected.length < 10) return;

    if (!user?.isPremium && user?.dailyQueries !== undefined && user.dailyQueries >= 3) {
      window.dispatchEvent(new CustomEvent('show-wallpay', {
        detail: { philosopher: { name: philosopher?.name } }
      }));
      return;
    }

    setSelection(selected);
    setPanel(true);
    setLoading(true);
    setExplanation('');

    try {
      const res = await fetch(`${API}/api/explain`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selected, philosopher: philosopher?.name })
      });
      const data = await res.json();
      setExplanation(data.explanation);
    } catch {
      setExplanation('Error al obtener explicación. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!philosopher) return (
    <div className="philosopher">
      <p>Filósofo no encontrado.</p>
    </div>
  );

  return (
    <div className="philosopher">
      <header className="philosopher__header">
        <button className="philosopher__back" onClick={() => navigate('/')}>
          ← Inicio
        </button>
        <h1>{philosopher.name}</h1>
      </header>

      <div className="philosopher__herma" aria-hidden="true">
        <svg viewBox="0 0 120 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="60" cy="52" rx="32" ry="42" fill="#2a2520" />
          <ellipse cx="60" cy="38" rx="22" ry="28" fill="#3a342e" />
          <rect x="38" y="90" width="44" height="70" rx="2" fill="#2a2520" />
          <rect x="42" y="86" width="36" height="8" rx="1" fill="#3a342e" />
        </svg>
      </div>

      <p className="philosopher__hint">Selecciona cualquier fragmento para obtener una explicación</p>

      <div
        ref={textRef}
        className="philosopher__text"
        onMouseUp={handleTextSelect}
        onTouchEnd={handleTextSelect}
      >
        {philosopher.text.split('\n\n').map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {panel && (
        <div className="philosopher__panel">
          <button className="philosopher__panel-close" onClick={() => setPanel(false)}>✕</button>
          <p className="philosopher__panel-selection">"{selection}"</p>
          {loading ? (
            <p className="philosopher__panel-loading">Consultando a los filósofos...</p>
          ) : (
            <p className="philosopher__panel-explanation">{explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}