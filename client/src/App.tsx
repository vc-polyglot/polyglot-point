import React, { useEffect, useState, useCallback, useRef } from "react";
import { fetchChat, fetchUsage, type ChatResponse } from "./api";
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

const PLACEHOLDER_BY_LANG: Record<Language, string> = {
  es: "Inicia una conversación cotidiana: escribe y practica respuestas naturales…",
  en: "Start an everyday conversation: write and practice natural replies…",
  fr: "Commence une conversation du quotidien : écris et pratique des réponses naturelles…",
  it: "Inizia una conversazione quotidiana: scrivi e fai pratica con risposte naturali…",
  de: "Starte ein Alltagsgespräch: schreibe und übe natürliche Antworten…",
  pt: "Inicia uma conversa do dia a dia: escreve e pratica respostas naturais…",
};

type Message = {
  id: string;
  userText: string;
  response: ChatResponse | null;
};

const MAX_MENSAJES_DIARIOS = 20;
const MAX_CHARS = 280;
const PHRASE_INTERVAL = 120000;

const makeMsgId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const getBrowserLanguage = (): Language => {
  if (typeof window === "undefined") return "en";

  const browserLang = navigator.language?.slice(0, 2);
  const supportedUILanguages: Language[] = ["es", "en", "fr", "it", "de", "pt"];

  if (supportedUILanguages.includes(browserLang as Language)) {
    return browserLang as Language;
  }

  return "en";
};

const LEFT_TEXT: Record<Language, string> = {
  es: "Inicia una conversación cotidiana: escribe y practica respuestas naturales…",
  en: "Start an everyday conversation: write and practice natural replies…",
  fr: "Commence une conversation du quotidien : écris et pratique des réponses naturelles…",
  it: "Inizia una conversazione quotidiana: scrivi e fai pratica con risposte naturali…",
  de: "Starte ein Alltagsgespräch: schreibe und übe natürliche Antworten…",
  pt: "Inicia uma conversa do dia a dia: escreve e pratica respostas naturais…",
};

const RIGHT_PLACEHOLDER: Record<Language, string> = {
  es: "Escribe lo que quieras practicar o corregir…",
  en: "Write whatever you want to practice or correct…",
  fr: "Écris ce que tu veux pratiquer ou corriger…",
  it: "Scrivi quello che vuoi praticare o correggere…",
  de: "Schreibe, was du üben oder korrigieren möchtest…",
  pt: "Escreve o que quiseres praticar ou corrigir…",
};

const App: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();

  const [practiceLanguage, setPracticeLanguage] = useState<Language>("es");
  const [uiLanguage, setUiLanguage] = useState<Language>(getBrowserLanguage());
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [remaining, setRemaining] = useState(MAX_MENSAJES_DIARIOS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phraseFade, setPhraseFade] = useState(true);
  const [lastFailedMsg, setLastFailedMsg] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("polyglot_onboarding_seen");
  });

  const uiT = translations[uiLanguage];
  const practiceT = translations[practiceLanguage];

  const phraseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const responseScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    fetchUsage(user.id)
      .then((u) => {
        const nextRemaining = u.remainingMessages ?? MAX_MENSAJES_DIARIOS;
        setRemaining(nextRemaining);
        if (nextRemaining <= 0) setShowPaywall(true);
      })
      .catch(() => {
        console.warn("No se pudo cargar usage");
        setRemaining(MAX_MENSAJES_DIARIOS);
      });
  }, [user?.id]);

  useEffect(() => {
    if (user && remaining <= 0) setShowPaywall(true);
  }, [user, remaining]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseFade(false);

      if (phraseTimeoutRef.current) clearTimeout(phraseTimeoutRef.current);
      phraseTimeoutRef.current = setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % practiceT.phrases.length);
        setPhraseFade(true);
      }, 400);
    }, PHRASE_INTERVAL);

    return () => {
      clearInterval(interval);
      if (phraseTimeoutRef.current) clearTimeout(phraseTimeoutRef.current);
    };
  }, [practiceT.phrases.length]);

  useEffect(() => {
    setPhraseIndex(0);
    setPhraseFade(true);
  }, [practiceLanguage]);

  useEffect(() => {
    if (responseScrollRef.current) {
      responseScrollRef.current.scrollTop = responseScrollRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, error]);

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

  const sendMessage = useCallback(
    async (msg: string) => {
      if (!user?.id) return;

      const clean = msg.trim();
      if (!clean) return;

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

      if (showOnboarding) {
        setShowOnboarding(false);
        localStorage.setItem("polyglot_onboarding_seen", "true");
      }

      setMessages((prev) => [...prev, { id: msgId, userText: clean, response: null }]);

      try {
        const res = await fetchChat(clean, practiceLanguage);

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
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      }
    },
    [user?.id, practiceLanguage, remaining, showOnboarding]
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

  const handleSubscribe = useCallback(
    async (plan: "premium" | "pro") => {
      if (!user?.id) return;

      try {
        const r = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ plan }),
        });

        if (!r.ok) {
          const errorText = await r.text();
          throw new Error(`Checkout session failed: ${r.status} ${errorText}`);
        }

        const data = (await r.json()) as { url?: string };
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL returned");
        }
      } catch (error: any) {
        console.error("Checkout error:", error.message);
        setError(true);
      }
    },
    [user?.id]
  );

  const planType = user?.planType || "free";
  const maxMessages = planType === "pro" ? 4500 : planType === "premium" ? 50 : 20;
  const progress = Math.max(0, Math.min(100, (remaining / maxMessages) * 100));
  const inputDisabled = loading || remaining <= 0;
  const canSend = !!text.trim() && !loading && remaining > 0;

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
          <p className="login-phrase">{uiT.phrases[0]}</p>

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
              {uiT.loginWithGoogle}
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
            <div className="brand-row"><img className="brand-logo" src="/brand/polyglot-point-logo.png" alt="Polyglot Point" /></div>
            <p className={`header-phrase ${phraseFade ? "fade-in" : "fade-out"}`}>
              {practiceT.phrases[phraseIndex]}
            </p>
          </div>

          <div className="header-right">
            <div className="header-stats">
              <span className="messages-count">
                {planType === "pro" ? (
                  <>Mensajes del mes: {remaining}</>
                ) : (
                  <>
                    {uiT.messagesLeft}: {remaining}/{maxMessages}
                  </>
                )}
              </span>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              {uiT.logout}
            </button>
          </div>
        </header>

        <div className="language-selector">
          {IDIOMAS.map((idioma) => (
            <button
              key={idioma.codigo}
              className={`lang-btn ${practiceLanguage === idioma.codigo ? "active" : ""}`}
              onClick={() => setPracticeLanguage(idioma.codigo)}
              disabled={loading}
            >
              <span className="lang-flag">{idioma.flag}</span>
              <span>{idioma.nombre}</span>
            </button>
          ))}
        </div>

        <div className="chat-layout">
          <div className="response-column">
            <div className="response-card">
              {error ? (
                <div className="error-state">
                  <div className="error-icon">??</div>
                  <h3>{uiT.error.title}</h3>
                  <p>{uiT.error.message}</p>
                  <button className="btn-retry" onClick={handleRetry}>
                    {lastFailedMsg ? uiT.error.retry : "Cerrar"}
                  </button>
                  <p className="error-contact">{uiT.error.contact}</p>
                </div>
              ) : messages.length === 0 && !loading ? (
                showOnboarding ? (
                  <div className="onboarding-message">
                    <div className="clara-response">
                      <p className="clara-text">{practiceT.onboarding}</p>
                    </div>
                  </div>
                ) : (
                  <div className="response-placeholder">
                    <p>{LEFT_TEXT[practiceLanguage]}</p>
                  </div>
                )
              ) : (
                <div className="response-content" ref={responseScrollRef}>
                  {messages.map((msg) => (
                    <div key={msg.id} className="message-pair">
                      <div className="user-text">{msg.userText}</div>

                      {msg.response ? (
                        <div className="clara-response">
                          <p className="clara-text">{msg.response.claraResponse}</p>
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
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          <div className="input-column">
            <div className="input-card">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={handleKeyDown}
                placeholder={PLACEHOLDER_BY_LANG[practiceLanguage]}
                disabled={inputDisabled}
              />
              <div className="input-footer">
                <span className={`char-count ${text.length > 250 ? "warning" : ""}`}>
                  {text.length}/{MAX_CHARS}
                </span>
                <button className={`btn-send ${canSend ? "active" : ""}`} onClick={handleSend} disabled={!canSend}>
                  {loading ? uiT.sending : uiT.send}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <div className="footer-links">
          <a href="/privacy-policy.html" target="_blank" rel="noreferrer">
            {uiT.privacy}
          </a>
          <a href="/terms" target="_blank" rel="noreferrer">
            {uiT.terms}
          </a>
        </div>
      </footer>

      {showPaywall && (
        <div className="paywall-overlay">
          <div className="paywall-card">
            <h2>{uiT.paywall.title}</h2>
            <p>{uiT.paywall.subtitle}</p>

            <div className="plan-option" onClick={() => handleSubscribe("premium")}>
              <div className="plan-header">
                <span className="plan-name">{uiT.paywall.premiumLabel}</span>
                <span className="plan-price">{uiT.paywall.premiumPrice}</span>
              </div>
              <p className="plan-desc">{uiT.paywall.premiumDesc}</p>
            </div>

            <div className="plan-option featured" onClick={() => handleSubscribe("pro")}>
              <span className="plan-badge">{uiT.paywall.proBadge}</span>
              <div className="plan-header">
                <span className="plan-name">{uiT.paywall.proLabel}</span>
                <span className="plan-price">{uiT.paywall.proPrice}</span>
              </div>
              <p className="plan-desc">{uiT.paywall.proDesc}</p>
              <p className="plan-note">{uiT.paywall.proNote}</p>
            </div>

            <button className="btn-subscribe" onClick={() => handleSubscribe("pro")}>
              {uiT.paywall.subscribe}
            </button>

            <div className="paywall-footer">
              <button
                className="btn-later"
                onClick={() => {
                  if (remaining > 0) setShowPaywall(false);
                }}
              >
                {uiT.paywall.maybeLater}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

