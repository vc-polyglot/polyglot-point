// frontend/src/components/AppNav.tsx

interface AppNavProps {
  activeRoute?: 'home' | 'new' | 'history';
  onNavigate?: (route: 'home' | 'new' | 'history') => void;
}

export function AppNav({ activeRoute = 'home', onNavigate }: AppNavProps) {
  const items: { id: 'home' | 'new' | 'history'; icon: string; label: string }[] = [
    { id: 'home',    icon: 'home',       label: 'Inicio' },
    { id: 'new',     icon: 'add_circle', label: 'Nueva' },
    { id: 'history', icon: 'history',    label: 'Historial' },
  ];

  return (
    <nav className="app-nav">
      {items.map(({ id, icon, label }) => (
        <button
          key={id}
          className={`app-nav__item ${activeRoute === id ? 'app-nav__item--active' : ''}`}
          onClick={() => onNavigate?.(id)}
          aria-label={label}
        >
          <span className="material-symbols-outlined">{icon}</span>
          <span className="app-nav__label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
