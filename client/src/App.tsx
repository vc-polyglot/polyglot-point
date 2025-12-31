import React, { useEffect, useState, useCallback, useRef } from "react";
import { fetchCorrection, fetchUsage, type CorrectionResponse } from "./api";
import { translations, type Language } from "./i18n";
import { useAuth } from "./auth/AuthContext";

const IDIOMAS: { codigo: Language; nombre: string; flag: string }[] = [
  { codigo: "es", nombre: "Español", flag: "🇪🇸" },
  { codigo: "en", nombre: "English", flag: "🇬🇧" },
  { codigo: "fr", nombre: "Français", flag: "🇫🇷" },
  { codigo: "it", nombre: "Italiano", flag: "🇮🇹" },
  { codigo: "de", nombre: "Deutsch", flag: "🇩🇪" },
  { codigo: "pt", nombre: "Português", flag: "🇵🇹" },
];

type Message = {
  id: string;
  userText: string;
  response: CorrectionResponse | null;
};

const MAX_MENSAJES_DIARIOS = 20;
const MAX_CHARS = 280;
const PHRASE_INTERVAL = 120000;

const makeMsgId = () => {
  // Evita colisión si dos clicks caen en el mismo ms
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const App: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();

  const [language, setLanguage] = useState<Language>("es");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [remaining, setRemaining] = useState(MAX_MENSAJES_DIARIOS);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phraseFade, setPhraseFade] = useState(true);

  const [lastFailedMsg, setLastFailedMsg] = useState<string | null>(null);

  const t = translations[language];

  const phraseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- USAGE ----------
  useEffect(() => {
    if (!user?.id) return;

    fetchUsage(user.id)
      .then((u) => {
        const nextRemaining = u.remainingMessages ?? MAX_MENSAJES_DIARIOS;
        setRemaining(nextRemaining);
        if (nextRemaining <= 0) setShowPaywall(true);
      })
      .catch(() => {
        // En prod quizá prefieras silencio, en dev ayuda.
        console.warn("No se pudo cargar usage");
        setRemaining(MAX_MENSAJES_DIARIOS);
      });
  }, [user?.id]);

  // Si por cualquier ruta remaining baja a 0, forzamos paywall
  useEffect(() => {
    if (user && remaining <= 0) setShowPaywall(true);
  }, [user, remaining]);

  // ---------- FRASES (interval + timeout, con cleanup real) ----------
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseFade(false);

      if (phraseTimeoutRef.current) clearTimeout(phraseTimeoutRef.current);
      phraseTimeoutRef.current = setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % t.phrases.length);
        setPhraseFade(true);
      }, 400);
    }, PHRASE_INTERVAL);

    return () => {
      clearInterval(interval);
      if (phraseTimeoutRef.current) clearTimeout(phraseTimeoutRef.current);
    };
  }, [t.phrases.length]);

  useEffect(() => {
    setPhraseIndex(0);
    setPhraseFade(true);
  }, [language]);

  // ---------- AUTH ----------
  const handleLogin = useCallback(() => {
    window.location.href = "/auth/google";
  }, []);

  const hardResetUi = useCallback(() => {
    setMessages([]);
    setText("");
    setRemaining(0);
    setLoading(false);
    setError(false);
    setShowPaywall(false);
    setPhraseIndex(0);
    setPhraseFade(true);
    setLastFailedMsg(null);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    hardResetUi();
  }, [logout, hardResetUi]);

  // ---------- SEND ----------
  const sendMessage = useCallback(
    async (msg: string) => {
      if (!user?.id) return;

      const clean = msg.trim();
      if (!clean) return;

      // El UI ya bloquea cuando remaining <= 0, pero por si acaso:
      if (remaining <= 0) {
        setShowPaywall(true);
        return;
      }

      if (clean.length > MAX_CHARS) return;

      const msgId = makeMsgId();

      setLoading(true);
      setError(false);
      setLastFailedMsg(null);
      setText("");

      setMessages((prev) => [...prev, { id: msgId, userText: clean, response: null }]);

      try {
        const res = await fetchCorrection(clean, language, user.id);

        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, response: res } : m)));

        if (typeof res.remainingMessages === "number") {
          setRemaining(res.remainingMessages);
          if (res.remainingMessages <= 0) setShowPaywall(true);
        }
      } catch {
        setError(true);
        setLastFailedMsg(clean);
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      } finally {
        setLoading(false);
      }
    },
    [user?.id, language, remaining]
  );

  const handleSend = useCallback(() => {
    sendMessage(text);
  }, [text, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleRetry = useCallback(() => {
    if (!lastFailedMsg) {
      setError(false);
      return;
    }
    sendMessage(lastFailedMsg);
  }, [lastFailedMsg, sendMessage]);

  // ---------- STRIPE ----------
  const handleSubscribe = useCallback(
    async (plan: "monthly" | "annual") => {
      if (!user?.id) return;

      try {
        const r = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ plan }),
        });

        if (!r.ok) throw new Error("Checkout session failed");

        const data = (await r.json()) as { url?: string };
        if (data.url) window.location.href = data.url;
      } catch {
        // Si quieres, aquí puedes setear error visible en el paywall
      }
    },
    [user?.id]
  );

  // ---------- UI HELPERS ----------
  const progress = Math.max(0, Math.min(100, (remaining / MAX_MENSAJES_DIARIOS) * 100));
  const inputDisabled = loading || remaining <= 0;
  const canSend = !!text.trim() && !loading && remaining > 0;

  // ---------- RENDER ----------
  if (authLoading) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>
            <span>Polyglot</span> Point
          </h1>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>
            <span>Polyglot</span> Point
          </h1>
          <p className="login-phrase">{t.phrases[0]}</p>

          <div className="login-buttons">
            <button className="btn-oauth btn-google" onClick={handleLogin}>
              <svg className="oauth-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t.loginWithGoogle}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-container">
        <header className="app-header">
          <div className="header-brand">
            <h1>
              <span>Polyglot</span> Point
            </h1>
            <p className={`header-phrase ${phraseFade ? "fade-in" : "fade-out"}`}>
              {t.phrases[phraseIndex]}
            </p>
          </div>

          <div className="header-right">
            <div className="header-stats">
              <span className="messages-count">
                {t.messagesLeft}: {remaining}/{MAX_MENSAJES_DIARIOS}
              </span>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              {t.logout}
            </button>
          </div>
        </header>

        <div className="language-selector">
          {IDIOMAS.map((lang) => (
            <button
              key={lang.codigo}
              className={`lang-btn ${language === lang.codigo ? "active" : ""}`}
              onClick={() => { setLanguage(lang.codigo); setLanguageJustChanged(true); }}
              disabled={loading}
            >
              <span className="lang-flag">{lang.flag}</span>
              <span>{lang.nombre}</span>
            </button>
          ))}
        </div>

        <div className="chat-layout">
          <div className="response-column">
            <div className="response-card">
              {error ? (
                <div className="error-state">
                  <div className="error-icon">🤖</div>
                  <h3>{t.error.title}</h3>
                  <p>{t.error.message}</p>
                  <button className="btn-retry" onClick={handleRetry}>
                    {lastFailedMsg ? t.error.retry : "Cerrar"}
                  </button>
                  <p className="error-contact">{t.error.contact}</p>
                </div>
              ) : messages.length === 0 && !loading ? (
                <div className="response-placeholder">
                  <p>{t.placeholder}</p>
                </div>
              ) : (
                <div className="response-content">
                  {messages.map((msg) => (
                    <div key={msg.id} className="message-pair">
                      <div className="user-text">{msg.userText}</div>

                      {msg.response ? (
                        <div className="clara-response">
                          <p className="clara-text">{msg.response.corrected}</p>
                        </div>
                      ) : (
                        <div className="clara-thinking">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="input-column">
            <div className="input-card">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={handleKeyDown}
                placeholder={t.inputPlaceholder}
                disabled={inputDisabled}
              />
              <div className="input-footer">
                <span className={`char-count ${text.length > 250 ? "warning" : ""}`}>
                  {text.length}/{MAX_CHARS}
                </span>
                <button className={`btn-send ${canSend ? "active" : ""}`} onClick={handleSend} disabled={!canSend}>
                  {loading ? t.sending : t.send}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <div className="footer-links">
          <a href="/privacy-policy.html" target="_blank" rel="noreferrer">
            {t.privacy}
          </a>
          <a href="/terms" target="_blank" rel="noreferrer">
            {t.terms}
          </a>
        </div>
      </footer>

      {showPaywall && (
        <div className="paywall-overlay">
          <div className="paywall-card">
            <h2>{t.paywall.title}</h2>
            <p>{t.paywall.subtitle}</p>

            <div className="plan-option featured" onClick={() => handleSubscribe("annual")}>
              <span className="plan-badge">{t.paywall.annualSave}</span>
              <div className="plan-header">
                <span className="plan-name">{t.paywall.annualLabel}</span>
                <span className="plan-price">{t.paywall.annualPrice}</span>
              </div>
              <p className="plan-desc">{t.paywall.annualDesc}</p>
              <p className="plan-note">{t.paywall.annualPerMonth}</p>
            </div>

            <div className="plan-option" onClick={() => handleSubscribe("monthly")}>
              <div className="plan-header">
                <span className="plan-name">{t.paywall.monthlyLabel}</span>
                <span className="plan-price">{t.paywall.monthlyPrice}</span>
              </div>
              <p className="plan-desc">{t.paywall.monthlyDesc}</p>
            </div>

            <button className="btn-subscribe" onClick={() => handleSubscribe("annual")}>
              {t.paywall.subscribe}
            </button>

            <div className="paywall-footer">
              <p className="reset-notice">{t.paywall.resetNotice}</p>

              {/* Si remaining=0, no dejes cerrarlo (si lo cierras, el usuario queda “atorado”) */}
              <button
                className="btn-later"
                onClick={() => {
                  if (remaining > 0) setShowPaywall(false);
                }}
              >
                {t.paywall.maybeLater}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;


