import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WallpayModal.css';

interface WallpayDetail {
  philosopher: { name: string };
}

const QUOTES: Record<string, string> = {
  'Diógenes el Cínico': 'El placer es un bien, pero solo si no nos esclaviza.',
  'Zenón de Citio': 'Tenemos dos orejas y una boca para escuchar el doble de lo que hablamos.',
  'Aristipo': 'No renuncies al placer, pero que el placer no te posea a ti.',
  'Antístenes': 'La virtud es suficiente para la felicidad.',
  'Empédocles': 'Todo tiene inteligencia y participa del pensamiento.',
  'Demócrito': 'La pobreza en democracia es preferible a la prosperidad bajo tiranos.',
  default: 'El conocimiento es el único bien que crece cuando se comparte.'
};

export default function WallpayModal() {
  const [visible, setVisible] = useState(false);
  const [philosopher, setPhilosopher] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<WallpayDetail>).detail;
      setPhilosopher(detail?.philosopher?.name || '');
      setVisible(true);
    };
    window.addEventListener('show-wallpay', handler);
    return () => window.removeEventListener('show-wallpay', handler);
  }, []);

  const quote = QUOTES[philosopher] || QUOTES['default'];

  if (!visible) return null;

  return (
    <div className="wallpay" onClick={() => setVisible(false)}>
      <div className="wallpay__box" onClick={e => e.stopPropagation()}>

        <div className="wallpay__herma" aria-hidden="true">
          <svg viewBox="0 0 120 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="60" cy="52" rx="32" ry="42" fill="#2a2520" />
            <ellipse cx="60" cy="38" rx="22" ry="28" fill="#3a342e" />
            <rect x="38" y="90" width="44" height="70" rx="2" fill="#2a2520" />
            <rect x="42" y="86" width="36" height="8" rx="1" fill="#3a342e" />
          </svg>
        </div>

        <p className="wallpay__quote">"{quote}"</p>
        {philosopher && (
          <p className="wallpay__author">— {philosopher}</p>
        )}

        <div className="wallpay__actions">
          <button className="wallpay__cta">
            Desbloquear acceso completo — $4.99/mes
          </button>
          <p className="wallpay__trial">7 días gratis · Cancela cuando quieras</p>
          <button className="wallpay__home" onClick={() => { setVisible(false); navigate('/'); }}>
            Inicio
          </button>
          <p className="wallpay__free">O espera hasta mañana para tus 3 consultas gratuitas</p>
        </div>
      </div>
    </div>
  );
}