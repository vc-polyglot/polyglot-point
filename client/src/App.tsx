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
  const supported: Language[] = ["es", "en", "fr", "it", "de", "pt"];
  return supported.includes(browserLang as Language) ? (browserLang as Language) : "en";
};

const LEFT_TEXT: Record<Language, string> = {
  es: "Inicia una conversación cotidiana: escribe y practica respuestas naturales…",
  en: "Start an everyday conversation: write and practice natural replies…",
  fr: "Commence une conversation du quotidien : écris et pratique des réponses naturelles…",
  it: "Inizia una conversazione quotidiana: scrivi e fai pratica con risposte naturali…",
  de: "Starte ein Alltagsgespräch: schreibe und übe natürliche Antworten…",
  pt: "Inicia uma conversa do dia a dia: escreve e pratica respostas naturais…",
};

const App: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();

  const [practiceLanguage, setPracticeLanguage] = useState<Language>("es");
  const [uiLanguage] = useState<Language>(getBrowserLanguage());
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
      .catch(() => setRemaining(MAX_MENSAJES_DIARIOS));
  }, [user?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseFade(false);
      if (phraseTimeoutRef.current) clearTimeout(phraseTimeoutRef.current);
      phraseTimeoutRef.current = setTimeout(() => {
        setPhraseIndex((p) => (p + 1) % practiceT.phrases.length);
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
      responseScrollRef.current.scrollTop =
        responseScrollRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, error]);

  const handleLogin = useCallback(() => {
    window.location.href = "/auth/google";
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setMessages([]);
    setText("");
    setRemaining(0);
    setLoading(false);
    setError(false);
    setShowPaywall(false);
    setPhraseIndex(0);
    setPhraseFade(true);
    setLastFailedMsg(null);
  }, [logout]);

  const sendMessage = useCallback(
    async (msg: string) => {
      if (!user?.id) return;
      const clean = msg.trim();
      if (!clean || clean.length > MAX_CHARS) return;
      if (remaining <= 0) {
        setShowPaywall(true);
        return;
      }

      const msgId = makeMsgId();
      setLoading(true);
      setError(false);
      setLastFailedMsg(null);
      setText("");

      if (showOnboarding) {
        setShowOnboarding(false);
        localStorage.setItem("polyglot_onboarding_seen", "true");
      }

      setMessages((p) => [...p, { id: msgId, userText: clean, response: null }]);

      try {
        const res = await fetchChat(clean, practiceLanguage);
        setMessages((p) => p.map((m) => (m.id === msgId ? { ...m, response: res } : m)));
        if (typeof res.remainingMessages === "number") {
          setRemaining(res.remainingMessages);
          if (res.remainingMessages <= 0) setShowPaywall(true);
        }
      } catch {
        setError(true);
        setLastFailedMsg(clean);
        setMessages((p) => p.filter((m) => m.id !== msgId));
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

  if (authLoading) return <div className="login-screen"><p>Cargando…</p></div>;

  if (!user) {
    return (
      <div className="login-screen">
        <button onClick={handleLogin}>{uiT.loginWithGoogle}</button>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="chat-layout">
        <div className="response-card">
          <div className="response-content" ref={responseScrollRef}>
            {messages.length === 0 && !loading ? (
              showOnboarding ? (
                <p>{practiceT.onboarding}</p>
              ) : (
                <p>{LEFT_TEXT[practiceLanguage]}</p>
              )
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="message-pair">
                  <div className="user-text">{msg.userText}</div>
                  {msg.response ? (
                    <div className="clara-response">
                      <p className="clara-text">{msg.response.claraResponse}</p>
                    </div>
                  ) : (
                    <div className="clara-thinking"><span></span><span></span><span></span></div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="input-card">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER_BY_LANG[practiceLanguage]}
            disabled={loading || remaining <= 0}
          />
          <button onClick={handleSend} disabled={!text.trim() || loading}>
            {loading ? uiT.sending : uiT.send}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
