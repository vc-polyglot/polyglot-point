import { useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { PaywallModal } from "./components/PaywallModal";
import { useAuth } from "./auth/AuthContext";
import { fetchChat, fetchUsage } from "./api";
import { translations, Language } from "./i18n";
import "./styles/index.css";

const IDIOMAS: { codigo: Language; nombre: string; }[] = [
  { codigo: "es", nombre: "Español" },
  { codigo: "en", nombre: "English" },
  { codigo: "fr", nombre: "Français" },
  { codigo: "it", nombre: "Italiano" },
  { codigo: "de", nombre: "Deutsch" },
  { codigo: "pt", nombre: "Português" },
];

const PLACEHOLDER_BY_LANG: Record<Language, string> = {
  es: "Tu conversación empieza aquí",
  en: "Your conversation starts here",
  fr: "Ta conversation commence ici",
  it: "La tua conversazione inizia qui",
  de: "Dein Gespräch beginnt hier",
  pt: "A tua conversa começa aqui",
};

type Message = {
  id: string;
  userText: string;
  response: import("./types/chat").ChatResponse | null;
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

// FUNCIÓN QUE SÍ FUNCIONA - parsea markdown simple
const parseMarkdown = (text: string): React.ReactNode => {
  if (!text || typeof text !== 'string') return text;
  
  const result: React.ReactNode[] = [];
  let i = 0;
  let currentPlain = '';
  
  while (i < text.length) {
    // Encontrar **negrita**
    if (text.startsWith('**', i)) {
      // Guardar texto plano acumulado
      if (currentPlain) {
        result.push(currentPlain);
        currentPlain = '';
      }
      
      // Buscar cierre de negrita
      const endBold = text.indexOf('**', i + 2);
      if (endBold !== -1) {
        const boldText = text.substring(i + 2, endBold);
        result.push(<strong key={`b-${i}`}>{boldText}</strong>);
        i = endBold + 2;
        continue;
      }
    }
    
    // Encontrar *itálica* (solo si no es **)
    if (text.startsWith('*', i) && text[i + 1] !== '*') {
      // Guardar texto plano acumulado
      if (currentPlain) {
        result.push(currentPlain);
        currentPlain = '';
      }
      
      // Buscar cierre de itálica
      const endItalic = text.indexOf('*', i + 1);
      if (endItalic !== -1) {
        const italicText = text.substring(i + 1, endItalic);
        result.push(<em key={`i-${i}`}>{italicText}</em>);
        i = endItalic + 1;
        continue;
      }
    }
    
    // Carácter normal
    currentPlain += text[i];
    i++;
  }
  
  // Añadir cualquier texto plano restante
  if (currentPlain) {
    result.push(currentPlain);
  }
  
  // Si no procesamos nada, devolver el texto original
  if (result.length === 1 && typeof result[0] === 'string') {
    return text;
  }
  
  return <>{result}</>;
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
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("polyglot_onboarding_seen");
    }
    return true;
  });

  const uiT = translations[uiLanguage];
  const practiceT = translations[practiceLanguage];

  const phraseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const responseScrollRef = useRef<HTMLDivElement | null>(null);

  // 🎯 FUNCIÓN MEJORADA DE SCROLL SUAVE
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (responseScrollRef.current) {
      // Usar scrollTo en lugar de scrollIntoView para más control
      responseScrollRef.current.scrollTo({
        top: responseScrollRef.current.scrollHeight,
        behavior: behavior
      });
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchUsage(String(user.id))
        .then((u) => {
          const nextRemaining = u.remainingMessages ?? MAX_MENSAJES_DIARIOS;
          setRemaining(nextRemaining);
          if (nextRemaining <= 0) setShowPaywall(true);
        })
        .catch(() => {
          console.warn("No se pudo cargar usage");
          setRemaining(MAX_MENSAJES_DIARIOS);
        });
    }
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

  // 🎯 SCROLL AUTOMÁTICO MEJORADO - Se ejecuta cada vez que cambian los mensajes
  useEffect(() => {
    // Pequeño delay para asegurar que el DOM se haya actualizado
    const timeoutId = setTimeout(() => {
      scrollToBottom('smooth');
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  const handleLogin = useCallback(() => {
  window.location.href = "http://localhost:3000/api/auth/google";
  }, []);

  const hardResetUi = useCallback(() => {
    setMessages([]);
    setText("");
    setRemaining(MAX_MENSAJES_DIARIOS);
    setLoading(false);
    setError(false);
    setShowPaywall(false);
    setPhraseIndex(0);
    setPhraseFade(true);
    setLastFailedMsg(null);
    setLangDropdownOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    hardResetUi();
  }, [logout, hardResetUi]);

  const sendMessage = useCallback(
    async (msg: string) => {
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
      
      // Agregar mensaje del usuario
      setMessages((prev) => [...prev, { id: msgId, userText: clean, response: null }]);
      
      // 🎯 Scroll inmediato después de agregar el mensaje del usuario
      setTimeout(() => scrollToBottom('smooth'), 150);
      
      try {
        const res = await fetchChat(clean, practiceLanguage);
        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, response: res } : m)));
        
        // 🎯 Scroll suave después de recibir la respuesta
        setTimeout(() => scrollToBottom('smooth'), 200);
        
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
    [practiceLanguage, remaining, showOnboarding, scrollToBottom]
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

  const handleSelectLanguage = useCallback((lang: Language) => {
    setPracticeLanguage(lang);
    setLangDropdownOpen(false);
  }, []);

  const planType = user?.planType || "free";
  const maxMessages = planType === "pro" ? 4500 : planType === "premium" ? 50 : 20;
  const progress = Math.max(0, Math.min(100, (remaining / maxMessages) * 100));
  const inputDisabled = loading || remaining <= 0;
  const canSend = !!text.trim() && !loading && remaining > 0;

  const activeIdioma = IDIOMAS.find((i) => i.codigo === practiceLanguage) || IDIOMAS[0];
  const availableIdiomas = IDIOMAS.filter((i) => i.codigo !== practiceLanguage);

  if (authLoading) {
    return (
      <div className="login-artistic">
        <div className="login-artistic-bg"></div>
        <div className="login-artistic-content">
          <div className="login-glass-panel" style={{ margin: '0 auto' }}>
            <h1 className="login-glass-heading">Polyglot Point</h1>
            <p className="login-glass-text">Conviértete en un políglota</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-artistic">
        <div className="login-artistic-bg"></div>
        <div className="login-artistic-content">
          <div className="login-artistic-left">
            <h2 className="login-artistic-title">
              Polyglot <strong>Point</strong>
            </h2>
            <p className="login-artistic-subtitle">
              {uiT.phrases?.[0] || "Learn languages naturally through conversation"}
            </p>
          </div>
          <div className="login-artistic-right">
            <div className="login-glass-panel">
              <h1 className="login-glass-heading">Inicia sesión</h1>
              <p className="login-glass-text">Conviértete en un políglota</p>
              <button className="btn-oauth btn-google" onClick={handleLogin}>
                <svg className="oauth-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {uiT.loginWithGoogle || "Continue with Google"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-background" />

      <div className="app-container">
        <header className="app-header">
          <div className="header-brand">
            <div className="brand-row">
              <img className="brand-logo" src="/brand/polyglot-point-logo.png" alt="Polyglot Point" />
            </div>
            <p className={`header-phrase ${phraseFade ? "fade-in" : "fade-out"}`}>
              {practiceT.phrases?.[phraseIndex] || ""}
            </p>
          </div>

          <div className="header-right">
            <div className="language-dropdown" role="navigation" aria-label="Language selector">
              {langDropdownOpen && (
                <div className="dropdown-backdrop" onClick={() => setLangDropdownOpen(false)} aria-hidden="true" />
              )}
              <button
                className="lang-dropdown-trigger"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                disabled={loading}
                aria-expanded={langDropdownOpen}
                aria-haspopup="listbox"
                aria-label={`Practice language: ${activeIdioma.nombre}. Click to change.`}
              >
                <span className="lang-code">{activeIdioma.codigo.toUpperCase()}</span>
                <span className="lang-name">{activeIdioma.nombre}</span>
                <span className={`dropdown-arrow ${langDropdownOpen ? "open" : ""}`} aria-hidden="true">▼</span>
              </button>
              {langDropdownOpen && (
                <div className="lang-dropdown-menu" role="listbox" aria-label="Available languages">
                  {availableIdiomas.map((idioma) => (
                    <button
                      key={idioma.codigo}
                      className="lang-dropdown-item"
                      onClick={() => handleSelectLanguage(idioma.codigo)}
                      role="option"
                      aria-label={`Switch to ${idioma.nombre}`}
                    >
                      <span className="lang-code">{idioma.codigo.toUpperCase()}</span>
                      <span>{idioma.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="header-stats">
              <span className="messages-count">
                {planType === "pro" ? (
                  <>Mensajes del mes: {remaining}</>
                ) : (
                  <>{uiT.messagesLeft || "Messages left"}: {remaining}/{maxMessages}</>
                )}
              </span>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout}>{uiT.logout || "Logout"}</button>
          </div>
        </header>

        <div className="chat-layout">
          <div className="response-column">
            <div className="response-card">
              {error ? (
                <div className="error-state">
                  <div className="error-icon">⚠️</div>
                  <h3>{uiT.error?.title || "Error"}</h3>
                  <p>{uiT.error?.message || "Something went wrong"}</p>
                  <button className="btn-retry" onClick={handleRetry}>
                    {lastFailedMsg ? (uiT.error?.retry || "Retry") : "Cerrar"}
                  </button>
                  <p className="error-contact">{uiT.error?.contact || "Please try again later"}</p>
                </div>
              ) : messages.length === 0 && !loading ? (
                showOnboarding ? (
                  <div className="onboarding-message">
                    <div className="clara-response">
                      <p className="clara-text">{practiceT.onboarding || "Welcome! Start typing to practice your language skills."}</p>
                    </div>
                  </div>
                ) : (
                  <div className="response-placeholder">
                    <p>{PLACEHOLDER_BY_LANG[practiceLanguage]}</p>
                  </div>
                )
              ) : (
                <div className="response-content" ref={responseScrollRef}>
                  <div>
                    {messages.map((msg) => (
                      <div key={msg.id} className="message-pair">
                        <div className="user-text">{msg.userText}</div>
                        {msg.response ? (
                          <div className="clara-response">
                            <div className="clara-text">
                              <ReactMarkdown>{msg.response.claraResponse}</ReactMarkdown>
                            </div>
                            
                            {msg.response.explanations && msg.response.explanations.length > 0 && (
                              <div className="corrections-section">
                                <div className="corrections-header">Corrections:</div>
                                {msg.response.explanations.map((explanation, idx) => (
                                  <div key={idx} className="explanation">
                                    {parseMarkdown(explanation)}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {msg.response.tips && msg.response.tips.length > 0 && (
                              <div className="tips-section">
                                <div className="tips-header">Tips:</div>
                                {msg.response.tips.map((tip, idx) => (
                                  <div key={idx} className="tip">
                                    {parseMarkdown(tip)}
                                  </div>
                                ))}
                              </div>
                            )}
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
                  <div ref={messagesEndRef} style={{ height: 0 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="chat-input-floating">
        <div className="input-card">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value.slice(0, MAX_CHARS)); }}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER_BY_LANG[practiceLanguage]}
            disabled={inputDisabled}
            aria-label="Write your message to practice"
            aria-describedby="char-count"
          />
          <div className="input-footer">
            <span
              id="char-count"
              className={`char-count ${text.length > 250 ? "warning" : ''}`}
              aria-live="polite"
            >
              {text.length}/{MAX_CHARS}
            </span>
            <button
              className={`btn-send ${canSend ? "active" : ""}`} type="button" onClick={handleSend}
              disabled={!canSend}
              aria-label={loading ? "Sending message" : "Send message"}
            >
              {loading ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32">
                    <animate attributeName="stroke-dashoffset" values="32;0" dur="1s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="footer-links-fixed">
        <a href="/privacy-policy.html" target="_blank" rel="noreferrer">{uiT.privacy || "Privacy Policy"}</a>
        <a href="/terms" target="_blank" rel="noreferrer">{uiT.terms || "Terms of Service"}</a>
      </div>

      <PaywallModal 
        isOpen={showPaywall || remaining === 0}
        onClose={() => setShowPaywall(false)}
      />
    </div>
  );
};

export default App;