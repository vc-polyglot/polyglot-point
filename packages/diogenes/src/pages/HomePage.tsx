import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FILOSOFOS } from '../data/filosofos';
import './HomePage.css';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = FILOSOFOS.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (p: typeof FILOSOFOS[0]) => {
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
              <span className="home__item-name">{p.nombre}</span>
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