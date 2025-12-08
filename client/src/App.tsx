import React, { useEffect, useState, useCallback, FormEvent } from "react";
import { fetchCorrection, fetchUsage, type CorrectionResponse } from "./api";

const IDIOMAS = [
  { codigo: "es", nombre: "Español" },
  { codigo: "en", nombre: "Inglés" },
  { codigo: "fr", nombre: "Francés" },
  { codigo: "it", nombre: "Italiano" },
  { codigo: "de", nombre: "Alemán" },
  { codigo: "pt", nombre: "Portugués" },
];

type Message =
  | { role: "user"; content: string }
  | { role: "bot"; content: CorrectionResponse };

const MAX_MENSAJES_DIARIOS = 20;
const MAX_CHARS = 280;

// =============== HELPERS ===============
const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// =============== COMPONENTES ===============

type LanguageSelectorProps = {
  languages: typeof IDIOMAS;
  selected: string;
  onChange: (code: string) => void;
};

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages,
  selected,
  onChange,
}) => {
  return (
    <div className="selector-idiomas" role="radiogroup" aria-label="Selecciona idioma">
      {languages.map((i) => (
        <button
          key={i.codigo}
          type="button"
          className={selected === i.codigo ? "idioma-btn active" : "idioma-btn"}
          onClick={() => onChange(i.codigo)}
          aria-label={`Seleccionar ${i.nombre}`}
        >
          {i.nombre}
        </button>
      ))}
    </div>
  );
};

type MessageCounterProps = {
  remaining: number;
  max: number;
  onPremiumClick: () => void;
};

const MessageCounter: React.FC<MessageCounterProps> = ({
  remaining,
  max,
  onPremiumClick,
}) => {
  const p = (remaining / max) * 100;

  return (
    <div className="contador" aria-live="polite">
      <span>
        Mensajes gratis hoy: {remaining}/{max}
      </span>
      <div className="barra-externa">
        <div className="barra-interna" style={{ width: `${p}%` }} />
      </div>
      {remaining <= 3 && remaining > 0 && (
        <button className="btn-premium-mini" type="button" onClick={onPremiumClick}>
          Activar Premium
        </button>
      )}
    </div>
  );
};

type LoginFormProps = {
  loginName: string;
  loginEmail: string;
  setLoginName: (v: string) => void;
  setLoginEmail: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
};

const LoginForm: React.FC<LoginFormProps> = ({
  loginName,
  loginEmail,
  setLoginName,
  setLoginEmail,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="login-form">
      <label>
        Nombre (opcional)
        <input
          value={loginName}
          onChange={(e) => setLoginName(e.target.value)}
          placeholder="Tu nombre"
        />
      </label>
      <label>
        Correo (opcional)
        <input
          type="email"
          value={loginEmail}
          onChange={(e) => setLoginEmail(e.target.value)}
          placeholder="tucorreo@example.com"
        />
      </label>
      <button type="submit">Entrar</button>
    </form>
  );
};

type ChatWindowProps = {
  messages: Message[];
  idiomaSeleccionado: string;
};

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  idiomaSeleccionado,
}) => {
  return (
    <section className="chat-window" role="log" aria-live="polite">
      {messages.length === 0 && (
        <div className="chat-placeholder">
          <p>Escribe en {idiomaSeleccionado} y Clara te corrige.</p>
        </div>
      )}

      {messages.map((m, i) =>
        m.role === "user" ? (
          <div key={i} className="mensaje mensaje-user">
            {m.content}
          </div>
        ) : (
          <div key={i} className="mensaje mensaje-bot">
            <p className="mensaje-correccion">{m.content.corrected}</p>

            {m.content.explanations?.length > 0 && (
              <div className="bloque-explicaciones">
                <h4>Explicaciones</h4>
                <ul>
                  {m.content.explanations.map((e, j) => (
                    <li key={j}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {m.content.tips?.length > 0 && (
              <div className="bloque-tips">
                <h4>Consejos</h4>
                <ul>
                  {m.content.tips.map((t, j) => (
                    <li key={j}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      )}
    </section>
  );
};

type InputAreaProps = {
  text: string;
  setText: (v: string) => void;
  loading: boolean;
  onSend: () => void;
  idiomaSeleccionado: string;
};

const InputArea: React.FC<InputAreaProps> = ({
  text,
  setText,
  loading,
  onSend,
  idiomaSeleccionado,
}) => {
  const ratio = text.length / MAX_CHARS;
  let cls = "";
  if (ratio > 0.9) cls = "casi-lleno";
  else if (ratio > 0.6) cls = "medio";

  return (
    <section className="input-area">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_CHARS}
        placeholder={`Escribe en ${idiomaSeleccionado}...`}
      />
      <div className="input-footer">
        <span className={`contador-chars ${cls}`}>
          {text.length}/{MAX_CHARS}
        </span>
        <button type="button" onClick={onSend} disabled={loading || !text.trim()}>
          {loading ? "Revisando..." : "Enviar"}
        </button>
      </div>
    </section>
  );
};

type PremiumModalProps = {
  open: boolean;
  onClose: () => void;
  onPremiumClick: () => void;
  maxMensajes: number;
};

const PremiumModal: React.FC<PremiumModalProps> = ({
  open,
  onClose,
  onPremiumClick,
  maxMensajes,
}) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Límite alcanzado</h2>
        <p>Has usado tus {maxMensajes} mensajes gratis hoy.</p>
        <p>
          Activa Premium para tener <strong>mensajes ilimitados</strong>.
        </p>
        <div className="modal-actions">
          <button type="button" onClick={onPremiumClick}>
            Activar Premium · $9.99/mes · Ilimitado
          </button>
          <button type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// =============== APP PRINCIPAL ===============

const App: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState("es");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [remaining, setRemaining] = useState(MAX_MENSAJES_DIARIOS);
  const [aviso, setAviso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loginView, setLoginView] = useState(true);
  const [loginName, setLoginName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");

  // cargar userId desde localStorage
  useEffect(() => {
    const id = localStorage.getItem("pp_userId");
    if (id) {
      setUserId(id);
      setLoginView(false);
    }
  }, []);

  // cargar uso inicial
  useEffect(() => {
    if (!userId) return;
    fetchUsage(userId)
      .then((u) => {
        if (typeof u.remainingMessages === "number") {
          setRemaining(u.remainingMessages);
        }
      })
      .catch(() => {
        // silencioso
      });
  }, [userId]);

  const handleLogin = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (loginEmail && !isValidEmail(loginEmail)) {
        setAviso("Correo inválido");
        return;
      }
      const base = (loginEmail || loginName || "anon").trim();
      const newId = `pp_${base}_${Date.now()}`;
      localStorage.setItem("pp_userId", newId);
      setUserId(newId);
      setLoginView(false);
      setAviso(null);
    },
    [loginEmail, loginName]
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem("pp_userId");
    setUserId(null);
    setLoginView(true);
    setMessages([]);
    setRemaining(MAX_MENSAJES_DIARIOS);
    setAviso(null);
  }, []);

  const handleSend = useCallback(async () => {
    if (!userId) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_CHARS) {
      setAviso("Tu mensaje es muy largo.");
      return;
    }

    if (remaining <= 0) {
      setModalOpen(true);
      return;
    }

    setText("");
    setLoading(true);
    setAviso(null);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const res = await fetchCorrection(trimmed, language, userId);
      setMessages((prev) => [...prev, { role: "bot", content: res }]);
      if (typeof res.remainingMessages === "number") {
        setRemaining(res.remainingMessages);
      }
      if (res.remainingMessages === 0) {
        setModalOpen(true);
      }
    } catch (err) {
      setAviso("Error al procesar el mensaje.");
    } finally {
      setLoading(false);
    }
  }, [userId, text, language, remaining]);

  const handlePremium = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await fetch("/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await r.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setAviso("Error Stripe");
      }
    } catch {
      setAviso("Error Stripe");
    }
  }, [userId]);

  const idiomaSel =
    IDIOMAS.find((i) => i.codigo === language)?.nombre ?? "idioma";

  if (loginView || !userId) {
    return (
      <div className="app app-login">
        <header>
          <h1>Polyglot Point: Write</h1>
          <p>Corrección amable · Explicaciones claras</p>
        </header>
        <main className="login-card">
          <h2>Inicia sesión</h2>
          <p>Solo para contar tus mensajes.</p>
          <LoginForm
            loginName={loginName}
            loginEmail={loginEmail}
            setLoginName={setLoginName}
            setLoginEmail={setLoginEmail}
            onSubmit={handleLogin}
          />
          {aviso && <div className="aviso">{aviso}</div>}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Polyglot Point: Write</h1>
          <p>Corrección amable · Explicaciones claras</p>
        </div>
        <div className="header-right">
          <LanguageSelector
            languages={IDIOMAS}
            selected={language}
            onChange={setLanguage}
          />
          <MessageCounter
            remaining={remaining}
            max={MAX_MENSAJES_DIARIOS}
            onPremiumClick={handlePremium}
          />
          <button className="btn-logout" type="button" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      <main className="chat-layout">
        <ChatWindow messages={messages} idiomaSeleccionado={idiomaSel} />
        <InputArea
          text={text}
          setText={setText}
          loading={loading}
          onSend={handleSend}
          idiomaSeleccionado={idiomaSel}
        />
        {aviso && <div className="aviso">{aviso}</div>}
      </main>

      <PremiumModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onPremiumClick={handlePremium}
        maxMensajes={MAX_MENSAJES_DIARIOS}
      />
    </div>
  );
};

export default App;
