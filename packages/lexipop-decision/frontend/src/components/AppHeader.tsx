// frontend/src/components/AppHeader.tsx
// Acepta logoSrc como prop — conéctalo cuando tengas el logotipo
// Si no hay logoSrc, muestra el nombre en Newsreader italic

interface AppHeaderProps {
  logoSrc?: string;
  activeRoute?: 'home' | 'new' | 'history';
  userName?: string;
  userAvatar?: string;
}

export function AppHeader({
  logoSrc,
  activeRoute = 'home',
  userName,
  userAvatar,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      {/* Brand */}
      <a href="/" className="app-header__brand">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt="LexiPop Decision"
            className="app-header__logo-img"
          />
        ) : (
          <>
            <span className="material-symbols-outlined app-header__brand-icon">
              bubble_chart
            </span>
            <span className="app-header__brand-name">LexiPop Decision</span>
          </>
        )}
      </a>

      {/* Nav desktop */}
      <nav className="app-header__nav">
        <a
          href="/"
          className={`app-header__nav-link ${activeRoute === 'home' ? 'app-header__nav-link--active' : ''}`}
        >
          Inicio
        </a>
        <a
          href="/nueva"
          className={`app-header__nav-link ${activeRoute === 'new' ? 'app-header__nav-link--active' : ''}`}
        >
          Nueva
        </a>
        <a
          href="/historial"
          className={`app-header__nav-link ${activeRoute === 'history' ? 'app-header__nav-link--active' : ''}`}
        >
          Historial
        </a>
      </nav>

      {/* Avatar */}
      <div className="app-header__avatar">
        {userAvatar ? (
          <img src={userAvatar} alt={userName ?? 'Usuario'} />
        ) : (
          <span
            className="material-symbols-outlined"
            style={{ color: 'var(--outline)', fontSize: '1.5rem' }}
          >
            account_circle
          </span>
        )}
      </div>
    </header>
  );
}
