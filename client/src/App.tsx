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

type Message = { role: "user"; content: string } | { role: "bot"; content: CorrectionResponse };

const MAX_MENSAJES_DIARIOS = 20;
const MAX_CHARS = 280;

const App: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState("es");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [remaining, setRemaining] = useState(MAX_MENSAJES_DIARIOS);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loginView, setLoginView] = useState(true);
  const [loginName, setLoginName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("pp_userId");
    if (id) { setUserId(id); setLoginView(false); }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUsage(userId).then(u => setRemaining(u.remainingMessages ?? MAX_MENSAJES_DIARIOS)).catch(() => {});
    }
  }, [userId]);

  const handleLogin = useCallback((e: FormEvent) => {
    e.preventDefault();
    const base = (loginEmail || loginName || "anon").trim();
    const newId = `pp_${base}_${Date.now()}`;
    localStorage.setItem("pp_userId", newId);
    setUserId(newId);
    setLoginView(false);
  }, [loginEmail, loginName]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("pp_userId");
    setUserId(null); setLoginView(true); setMessages([]); setRemaining(MAX_MENSAJES_DIARIOS);
  }, []);

  const handleSend = useCallback(async () => {
    if (!userId || !text.trim() || text.length > MAX_CHARS || remaining <= 0) return;
    const msg = text.trim();
    setText(""); setLoading(true);
    setMessages(p => [...p, { role: "user", content: msg }]);
    try {
      const res = await fetchCorrection(msg, language, userId);
      setMessages(p => [...p, { role: "bot", content: res }]);
      if (res.remainingMessages !== undefined) setRemaining(res.remainingMessages);
      if (res.remainingMessages === 0) setModalOpen(true);
    } catch { } finally { setLoading(false); }
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
      window.location.href = url;
    } catch { }
  }, [userId]);

  const progress = (remaining / MAX_MENSAJES_DIARIOS) * 100;

  if (loginView || !userId) {
    return (
      <div className="app app-login">
        <header><h1>Polyglot Point: Write</h1><p>Corrección amable · Explicaciones claras</p></header>
        <main className="login-card">
          <h2>Inicia sesión</h2>
          <p>Solo para contar tus mensajes.</p>
          <form onSubmit={handleLogin} className="login-form">
            <label>Nombre (opcional)<input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Tu nombre" /></label>
            <label>Correo (opcional)<input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="tucorreo@example.com" /></label>
            <button type="submit">Entrar</button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div><h1>Polyglot Point: Write</h1><p>Corrección amable · Explicaciones claras</p></div>
        <div className="header-right">
          <div className="selector-idiomas">
            {IDIOMAS.map(i => (
              <button
                key={i.codigo}
                className={language === i.codigo ? "idioma-btn active" : "idioma-btn"}
                onClick={() => setLanguage(i.codigo)}
              >
                {i.nombre}
              </button>
            ))}
          </div>
          <div className="contador">
            <span>Mensajes gratis hoy: {remaining}/{MAX_MENSAJES_DIARIOS}</span>
            <div className="barra-externa">
              <div className="barra-interna" style={{ width: progress + "%" }} />
            </div>
            {remaining <= 3 && remaining > 0 && (
              <button className="btn-premium-mini" onClick={handlePremium}>
                Activar Premium · $9.99/mes · Ilimitado
              </button>
            )}
          </div>
          <button className="btn-logout" onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main className="chat-layout">
        <section className="chat-window">
          {messages.length === 0 && (
            <div className="chat-placeholder">
              <p>Escribe lo que quieras practicar o corregir...</p>
            </div>
          )}
          {messages.map((m, i) => m.role === "user" ? (
            <div key={i} className="mensaje mensaje-user">{m.content}</div>
          ) : (
            <div key={i} className="mensaje mensaje-bot">
              <p className="mensaje-correccion">{(m.content as CorrectionResponse).corrected}</p>
              {(m.content as CorrectionResponse).explanations?.map((e, j) => <p key={j}>{e}</p>)}
              {(m.content as CorrectionResponse).tips?.map((t, j) => <p key={j}>{t}</p>)}
            </div>
          ))}
        </section>

        <section className="input-area">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={MAX_CHARS}
            placeholder="Escribe aquí..."
          />
          <div className="input-footer">
            <span className={text.length > 250 ? "casi-lleno" : ""}>
              {text.length}/{MAX_CHARS}
            </span>
            <button onClick={handleSend} disabled={loading || !text.trim() || remaining <= 0}>
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </section>
      </main>

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Límite alcanzado</h2>
            <p>Has usado tus {MAX_MENSAJES_DIARIOS} mensajes gratis hoy.</p>
            <p>Activa Premium para tener mensajes ilimitados.</p>
            <button onClick={handlePremium}>Activar Premium · $9.99/mes · Ilimitado</button>
            <button onClick={() => setModalOpen(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;