import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './HomePage.css';

const PHILOSOPHERS = [
  { id: 1, name: 'Tales de Mileto', book: 1, free: true, tagline: 'El primero en preguntar de qué está hecho todo' },
  { id: 2, name: 'Solón', book: 1, free: true, tagline: 'El que puso orden donde había caos' },
  { id: 3, name: 'Quilón', book: 1, free: true, tagline: 'Conócete a ti mismo' },
  { id: 4, name: 'Pitágoras', book: 1, free: true, tagline: 'Números, almas y vegetarianismo' },
  { id: 5, name: 'Heráclito', book: 1, free: true, tagline: 'Todo cambia, nada permanece' },
  { id: 6, name: 'Sócrates', book: 2, free: true, tagline: 'Solo sé que no sé nada' },
  { id: 7, name: 'Platón', book: 3, free: true, tagline: 'El mundo de las ideas' },
  { id: 8, name: 'Aristóteles', book: 5, free: true, tagline: 'El que clasificó el mundo entero' },
  { id: 9, name: 'Diógenes el Cínico', book: 6, free: true, tagline: 'El que vivía en un barril y le dijo no a Alejandro Magno' },
  { id: 10, name: 'Epicuro', book: 10, free: true, tagline: 'El placer como camino, no como vicio' },
  { id: 11, name: 'Zenón de Citio', book: 7, free: false, tagline: 'Fundador del estoicismo' },
  { id: 12, name: 'Aristipo', book: 2, free: false, tagline: 'El placer como único bien' },
  { id: 13, name: 'Antístenes', book: 6, free: false, tagline: 'Padre del cinismo' },
  { id: 14, name: 'Empédocles', book: 8, free: false, tagline: 'Los cuatro elementos y el amor' },
  { id: 15, name: 'Demócrito', book: 9, free: false, tagline: 'El átomo como base de todo' },
];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = PHILOSOPHERS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (p: typeof PHILOSOPHERS[0]) => {
    if (!p.free && !user?.isPremium) {
      window.dispatchEvent(new CustomEvent('show-wallpay', { detail: { philosopher: p } }));
      return;
    }
    navigate(`/filosofo/${p.id}`);
  };

  return (
    <div className="home">
      <header className="home__header">
        <h1>Diógenes</h1>
        <button className="home__settings" onClick={() => navigate('/ajustes')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

      <div className="home__search">
        <input
          type="text"
          placeholder="Buscar filósofo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <ul className="home__list">
        {filtered.map(p => (
          <li key={p.id} className="home__item" onClick={() => handleSelect(p)}>
            <div className="home__item-info">
              <span className="home__item-name">{p.name}</span>
              <span className="home__item-tagline">{p.tagline}</span>
            </div>
            {!p.free && !user?.isPremium && (
              <span className="home__item-lock">⚇</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}