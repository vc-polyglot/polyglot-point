import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FILOSOFOS_MAP } from '../data/filosofos';
import './PhilosopherPage.css';

const API = import.meta.env.VITE_API_URL;

export default function PhilosopherPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selection, setSelection] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const philosopher = FILOSOFOS_MAP[Number(id)];

  const handleTextSelect = async () => {
    const selected = window.getSelection()?.toString().trim();
    if (!selected || selected.length < 10) return;

    if (!user?.isPremium && user?.dailyQueries !== undefined && user.dailyQueries >= 3) {
      window.dispatchEvent(new CustomEvent('show-wallpay', {
        detail: { philosopher: { name: philosopher?.nombre } }
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
        body: JSON.stringify({ text: selected, philosopher: philosopher?.nombre })
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
      <p style={{ color: 'var(--text-muted)', padding: '2rem' }}>Filósofo no encontrado.</p>
    </div>
  );

  return (
    <div className="philosopher">
      <header className="philosopher__header">
        <button className="philosopher__back" onClick={() => navigate('/')}>
          ← Inicio
        </button>
        <div>
          <h1>{philosopher.nombre}</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Libro {philosopher.libro}
          </p>
        </div>
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
        {philosopher.texto.split('\n\n').map((p, i) => (
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