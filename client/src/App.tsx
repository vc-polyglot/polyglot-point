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

type Message = { role: "user"; content: string } | { role: "bot"; content: CorrectionResponse };

const MAX_MENSAJES_DIARIOS = 20;
const MAX_CHARS = 280;

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

  // ... (todo tu código de login, uso, handleSend, handlePremium exactamente igual que antes)

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
              <input value={loginName} onChange={e => setLoginName(e.target.value)} />
            </label>
            <label>
              {t.emailLabel}
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
              />
            </label>
            <button type="submit">{t.enterButton}</button>
          </form>
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
            <span>
              {t.messagesToday}: {remaining}/{MAX_MENSAJES_DIARIOS}
            </span>
            <div className="barra-externa">
              <div
                className="barra-interna"
                style={{
                  width: (remaining / MAX_MENSAJES_DIARIOS) * 100 + "%"
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
