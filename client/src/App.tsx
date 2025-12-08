import React, { useEffect, useState, useCallback, FormEvent } from "react";
import { fetchCorrection, fetchUsage, type CorrectionResponse } from "./api";
import { translations } from "./i18n";

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

const isValidEmail = (email: string): boolean =>
  /\S+@\S+\.\S+/.test(email);

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

  const t = translations[language as keyof typeof translations] || translations.es;

  // Cargar userId desde localStorage al inicio
  useEffect(() => {
    const stored = localStorage.getItem("pp_userId");
    if (stored) {
      setUserId(stored);
      setLoginView(false);
    }
  }, []);

  // Cargar uso desde backend cuando ya hay userId
  useEffect(() => {
    if (!userId) return;
    fetchUsage(userId)
      .then((u) => {
        if (typeof u.remainingMessages === "number") {
          setRemaining(u.remainingMessages);
        }
      })
      .catch(() => {
        // si falla, no rompemos la app
      });
  }, [userId]);

  const handleLogin = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setAviso(null);

      if (loginEmail && !isValidEmail(loginEmail)) {
        setAviso(t.invalidEmail || "Correo inválido.");
        return;
      }

      const base = (loginEmail || loginName || "anon").trim();
      const newId = `pp_${base}_${Date.now()}`;
      localStorage.setItem("pp_userId", newId);
      setUserId(newId);
      setLoginView(false);
    },
    [loginEmail, loginName, t]
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
    if (!userId) {
      setAviso(t.needLogin || "Necesitas iniciar sesión para usar la app.");
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.length > MAX_CHARS) {
      setAviso(t.tooLong || "Tu mensaje es demasiado largo.");
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
      if (res.aviso) {
        setAviso(res.aviso);
      }
      if (res.remainingMessages === 0) {
        setModalOpen(true);
      }
    } catch {
      setAviso(t.processError || "Hubo un problema al procesar tu mensaje.");
    } finally {
      setLoading(false);
    }
  }, [userId, text, language, remaining, t]);

  const handlePremium = useCallback(async () => {
    if (!userId) {
      setAviso(t.needLogin || "Necesitas iniciar sesión para continuar.");
      return;
    }
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
        setAviso(t.stripeError || "Error al iniciar el pago.");
      }
    } catch {
      setAviso(t.stripeError || "Error al conectar con el sistema de pagos.");
    }
  }, [userId, t]);

  // Solo cambia el render para usar `t.xxx`

  if (loginView || !userId) {
    return (
      <div className="app app-login">
        <header>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </header>
        <main className="login-card">
          <h2>{t.loginTitle}</h2>
          <p>{t.loginDesc}</p>
          {/* form igual pero con t.nameLabel, t.emailLabel, t.enterButton */}
          <form onSubmit={handleLogin} className="login-form">
            <label>
              {t.nameLabel}
              <input
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
              />
            </label>
            <label>
              {t.emailLabel}
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </label>
            <button type="submit">{t.enterButton}</button>
          </form>
          {aviso && <div className="aviso">{aviso}</div>}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="header-right">
          <div className="selector-idiomas">
            {IDIOMAS.map((i) => (
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
            <span>
              {t.messagesToday}: {remaining}/{MAX_MENSAJES_DIARIOS}
            </span>
            <div className="barra-externa">
              <div
                className="barra-interna"
                style={{
                  width: (remaining / MAX_MENSAJES_DIARIOS) * 100 + "%",
                }}
              />
            </div>
            {remaining <= 3 && (
              <button onClick={handlePremium}>{t.activatePremium}</button>
            )}
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            {t.logout}
          </button>
        </div>
      </header>

      <main className="chat-layout">
        {/* chat igual */}
        <InputArea
          text={text}
          setText={setText}
          loading={loading}
          onSend={handleSend}
          placeholder={t.placeholder}
          sendText={t.send}
          sendingText={t.sending}
        />

        {aviso && <div className="aviso">{aviso}</div>}
      </main>

      <PremiumModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onPremiumClick={handlePremium}
        title={t.limitReached}
        message={t.limitMessage}
        benefit={t.premiumBenefit}
        buttonText={t.premiumUnlimited}
      />
    </div>
  );
};

export default App;
