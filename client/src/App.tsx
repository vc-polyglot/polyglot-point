import React, { useEffect, useState, useCallback, memo, FormEvent } from "react";
import { fetchCorrection, fetchUsage, type CorrectionResponse } from "./api";

const IDIOMAS = [
  { codigo: "es", nombre: "Español" },
  { codigo: "en", nombre: "Inglés" },
  { codigo: "fr", nombre: "Francés" },
  { codigo: "it", nombre: "Italiano" },
  { codigo: "de", nombre: "Alemán" },
  { codigo: "pt", nombre: "Portugués" },
];

type Message = { role: "user"; content: string } | { role: "bot"; content: CorrectionResponse };

const MAX_MENSAJES_DIARIOS = 20;
const MAX_CHARS = 280;

// =============== HELPERS ===============
const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const LanguageSelector = memo(({ languages, selected, onChange }: any) => (
  <div className="selector-idiomas" role="radiogroup" aria-label="Selecciona idioma">
    {languages.map((i: any) => (
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
));

const MessageCounter = memo(({ remaining, max, onPremiumClick }: any) => {
  const p = (remaining / max) * 100;
  return (
    <div className="contador" aria-live="polite">
      <span>Mensajes gratis hoy: {remaining}/{max}</span>
      <div className="barra-externa">
        <div className="barra-interna" style={{ width: `${p}%` }} />
      </div>
      {remaining <= 3 && remaining > 0 && (
        <button className="btn-premium-mini" onClick={onPremiumClick}>
          Activar Premium
        </button>
      )}
    </div>
  );
});

const LoginForm = ({ loginName, loginEmail, setLoginName, setLoginEmail, onSubmit }: any) => (
  <form onSubmit={onSubmit} className="login-form">
    <label>
      Nombre (opcional)
      <input
        value={loginName}
        onChange={e => setLoginName(e.target.value)}
        placeholder="Tu nombre"
      />
    </label>
    <label>
      Correo (opcional)
      <input
        type="email"
        value={loginEmail}
        onChange={e => setLoginEmail(e.target.value)}
        placeholder="tucorreo@example.com"
      />
    </label>
    <button type="submit">Entrar</button>
  </form>
);

const ChatWindow = memo(({ messages, idiomaSeleccionado }: any) => (
  <section className="chat-window" role="log" aria-live="polite">
    {messages.length === 0 && (
      <div className="chat-placeholder">
        <p>Escribe en {idiomaSeleccionado} y Clara te corrige.</p>
      </div>
    )}
    {messages.map((m: any, i: number) =>
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
                {m.content.explanations.map((e: string, j: number) => (
                  <li key={j}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {m.content.tips?.length > 0 && (
            <div className="bloque-tips">
              <h4>Consejos</h4>
              <ul>
                {m.content.tips.map((t: string, j: number) => (
                  <li key={j}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    )}
  </section>
));

const InputArea = ({ text, setText, loading, onSend, idiomaSeleccionado }: any) => {
  const ratio = text.length / MAX_CHARS;
  const cls = ratio > 0.9 ? "casi-lleno" : ratio > 0.6 ? "medio" : "";
  return (
    <section className="input-area">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={MAX_CHARS}
        placeholder={`Escribe en ${idiomaSeleccionado}...`}
      />
      <div className="input-footer">
        <span className={`contador-chars ${cls}`}>{text.length}/{MAX_CHARS}</span>
        <button onClick={onSend} disabled={loading || !text.trim()}>
          {loading ? "Revisando..." : "Enviar"}
        </button>
      </div>
    </section>
  );
});

const PremiumModal = ({ open, onClose, onPremiumClick, maxMensajes }: any) =>
  open ? (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Límite alcanzado</h2>
        <p>Has usado tus {maxMensajes} mensajes gratis hoy.</p>
        <p>Activa Premium para tener <strong>mensajes ilimitados</strong>.</p>
        <div className="modal-actions">
          <button onClick={onPremiumClick}>
            Activar Premium · $9.99/mes · Ilimitado
          </button>
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  ) : null;

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

  useEffect(() => {
    const id = localStorage.getItem("pp_userId");
    if (id) {
      setUserId(id);
      setLoginView(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUsage(userId)
        .then(u => setRemaining(u.remainingMessages ?? MAX_MENSAJES_DIARIOS))
        .catch(() => {});
    }
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
    if (!userId || !text.trim() || text.length > MAX_CHARS) return;

    // Límite de mensajes: abre modal
    if (remaining <= 0) {
      setModalOpen(true);
      return;
    }

    const msg = text.trim();
    setText("");
    setLoading(true);
    setMessages(p => [...p, { role: "user", content: msg }]);

    try {
      const res = await fetchCorrection(msg, language, userId);
      setMessages(p => [...p, { role: "bot", content: res }]);
      if (res.remainingMessages !== undefined) {
        setRemaining(res.remainingMessages);
      }
      if (res.remainingMessages === 0) {
        setModalOpen(true);
      }
    } catch {
      setAviso("Error al procesar");
    } finally {
      setLoading(false);
    }
  }, [userId, text, language, remaining]);

  const handlePremium = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await fetch("/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ userId })
      });
      const { url } = await r.json();
      if (url) {
        window.location.href = url;
      } else {
        setAviso("Error Stripe");
      }
    } catch {
      setAviso("Error Stripe");
    }
  }, [userId]);

  const idiomaSel = IDIOMAS.find(i => i.codigo === language)?.nombre ?? "idioma";

  if (loginView || !userId)
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

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Polyglot Point: Write</h1>
          <p>Corrección amable · Explicaciones claras</p>
        </div>
        <div className="header-right">
          <LanguageSelector languages={IDIOMAS} selected={language} onChange={setLanguage} />
          <MessageCounter
            remaining={remaining}
            max={MAX_MENSAJES_DIARIOS}
            onPremiumClick={handlePremium}
          />
          <button className="btn-logout" onClick={handleLogout}>
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
