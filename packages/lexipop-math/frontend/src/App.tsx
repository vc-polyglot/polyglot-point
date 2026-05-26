import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import MathExercise from './components/MathExercise';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import './App.css';

type Language = 'es' | 'en' | 'fr' | 'de' | 'pt' | 'it';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  isPro?: boolean;
}

const BASE_URL = Capacitor.isNativePlatform()
  ? 'https://www.lexipopmath.com'
  : '';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<Language>('es');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    () => !localStorage.getItem('ob-done')
  );

  const handleLogout = async () => {
    await fetch(`${BASE_URL}/api/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  const handleReset = async () => {
    if (!confirm('¿Reiniciar tu contador de ejercicios desde cero?')) return;
    await fetch(`${BASE_URL}/api/math/exercise/reset`, { method: 'POST', credentials: 'include' });
    localStorage.removeItem('lexipop-v4');
    window.location.reload();
  };

  if (!user) {
    return <Login onLoginSuccess={setUser} lang={lang} />;
  }

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '8px 16px' }}>
        {user.isPro && (
          <button
            onClick={handleReset}
            style={{
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            🔄 RESET
          </button>
        )}
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
          }}
        >
          Salir
        </button>
      </div>
      <MathExercise />
      {showOnboarding && (
        <Onboarding onComplete={() => {
          localStorage.setItem('ob-done', '1');
          setShowOnboarding(false);
        }} />
      )}
    </div>
  );
}

export default App;
