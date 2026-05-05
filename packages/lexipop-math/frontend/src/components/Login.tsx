import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import './Login.css';

type Language = 'es' | 'en' | 'fr' | 'de' | 'pt' | 'it';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  isPro?: boolean;
}

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  lang: Language;
}

const T = {
  es: {
    title: 'Bienvenido a LexiPop Math',
    subtitle: 'Entrena tu mente con matemáticas mentales',
    loginBtn: 'Continuar con Google',
    loading: 'Cargando...'
  },
  en: {
    title: 'Welcome to LexiPop Math',
    subtitle: 'Train your mind with mental math',
    loginBtn: 'Continue with Google',
    loading: 'Loading...'
  },
  fr: {
    title: 'Bienvenue à LexiPop Math',
    subtitle: 'Entraînez votre esprit avec des mathématiques mentales',
    loginBtn: 'Continuer avec Google',
    loading: 'Chargement...'
  },
  de: {
    title: 'Willkommen bei LexiPop Math',
    subtitle: 'Trainiere deinen Geist mit Kopfrechnen',
    loginBtn: 'Mit Google fortfahren',
    loading: 'Laden...'
  },
  pt: {
    title: 'Bem-vindo ao LexiPop Math',
    subtitle: 'Treine sua mente com matemática mental',
    loginBtn: 'Continuar com Google',
    loading: 'Carregando...'
  },
  it: {
    title: 'Benvenuto a LexiPop Math',
    subtitle: 'Allena la tua mente con la matematica mentale',
    loginBtn: 'Continua con Google',
    loading: 'Caricamento...'
  }
};

const BASE_URL = 'https://www.lexipopmath.com';

const WEB_CLIENT_ID =
  '613395578802-ci6n809e4fbaieurdjqnsjurh4aoimn9.apps.googleusercontent.com';

export default function Login({ onLoginSuccess, lang }: LoginProps) {
  const [loading, setLoading] = useState(true);
  const t = T[lang];

  useEffect(() => {
    const init = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await SocialLogin.initialize({
            google: {
              webClientId: WEB_CLIENT_ID,
            },
          });
        } catch (err) {
          console.log('INIT ERROR:', err);
        }
      }
    };

    init();

    fetch(`${BASE_URL}/api/math/auth/me`, {
      credentials: 'include',
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.user) onLoginSuccess(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const result = await SocialLogin.login({
        provider: 'google',
        options: {},
      });

      const r = result?.result;

      console.log('TOKEN:', r?.idToken);
      console.log('EMAIL:', r?.profile?.email);
      console.log('NAME:', r?.profile?.name);

      if (!r?.idToken) {
        console.log('NO ID TOKEN');
        return;
      }

      const response = await fetch(`${BASE_URL}/auth/google/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ idToken: r.idToken }),
        }
      );

      const text = await response.text();

      let data: any = null;

      try {
        data = JSON.parse(text);
      } catch {
        console.log('INVALID JSON RESPONSE');
      }

      if (!response.ok) {
        console.log('BACKEND ERROR:', data || text);
        return;
      }

      if (data?.user) {
        onLoginSuccess(data.user);
      } else {
        console.log('NO USER IN RESPONSE');
      }
    } catch (error: any) {
      if (error?.message?.includes('cancel')) return;
      console.log('LOGIN ERROR:', error);
    }
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="loading-spinner" />
          <p>{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <img src="/lexipop-logo.png" alt="LexiPop Math" className="login-logo" />
        <h1 className="login-title">{t.title}</h1>
        <p className="login-subtitle">{t.subtitle}</p>

        <button className="google-login-btn" onClick={handleGoogleLogin}>
          <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t.loginBtn}
        </button>
      </div>
    </div>
  );
}