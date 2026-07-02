import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './SettingsPage.css';

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="settings">
      <header className="settings__header">
        <button className="settings__back" onClick={() => navigate('/')}>
          ← Inicio
        </button>
        <h1>Ajustes</h1>
      </header>

      <div className="settings__section">
        <p className="settings__label">Cuenta</p>
        <div className="settings__card">
          {user?.avatar && (
            <img className="settings__avatar" src={user.avatar} alt={user.name} />
          )}
          <div>
            <p className="settings__name">{user?.name}</p>
            <p className="settings__email">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="settings__section">
        <p className="settings__label">Suscripción</p>
        <div className="settings__card">
          {user?.isPremium ? (
            <p className="settings__premium">✦ Premium activo</p>
          ) : (
            <div className="settings__free">
              <p>Plan gratuito · {user?.dailyQueries ?? 0}/3 consultas hoy</p>
              <button className="settings__upgrade">
                Actualizar a Premium — $4.99/mes
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="settings__section">
        <p className="settings__label">Idioma</p>
        <div className="settings__languages">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`settings__lang ${user?.language === lang.code ? 'settings__lang--active' : ''}`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings__section">
        <button className="settings__signout" onClick={handleSignOut}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}