import { useState, useEffect } from "react";
import type { DecisionInput, DecisionResult } from "./types";
import { evaluateDecision, getMe, logout } from "./services/api";
import Home         from "./pages/Home";
import DecisionForm from "./pages/DecisionForm";
import Results      from "./pages/Results";
import Login        from "./pages/Login";

const T = {
  primary:     "#0035c5",
  primaryMid:  "#0047ff",
  surface:     "#f8f9fa",
  surfaceCard: "#ffffff",
  surfaceLow:  "#f3f4f5",
  onSurface:   "#191c1d",
  onMuted:     "#434657",
  outline:     "#747688",
  font:        "'Inter', system-ui, sans-serif",
  fontHead:    "'Hanken Grotesk', system-ui, sans-serif",
};

function Pedagogy({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "6rem 1.5rem 4rem" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", cursor: "pointer",
        color: T.outline, fontSize: "0.9375rem", marginBottom: "2rem",
        fontFamily: T.font, display: "flex", alignItems: "center", gap: "0.4rem",
      }}>&larr; Inicio</button>
      <h1 style={{ fontFamily: T.fontHead, fontSize: "clamp(1.75rem, 5vw, 2.5rem)", fontWeight: 800, color: T.onSurface, marginBottom: "2.5rem", letterSpacing: "-0.02em" }}>
        Cómo funciona decidir
      </h1>
      <div style={{ marginBottom: "2rem", borderRadius: "1rem", overflow: "hidden" }}>
        <img src="/img-brujula.png" alt="" style={{ width: "100%", aspectRatio: "16 / 7", objectFit: "cover", display: "block" }} />
      </div>
      {[
        { title: "Probabilidad subjetiva", body: "Cuando estimas que algo tiene 70% de chance de funcionar, ese número viene de tu cabeza, no de datos. La clave es calibrar esa estimación." },
        { title: "Valor esperado", body: "EV = P(éxito) x Valor(éxito) + P(fallo) x Valor(fallo). Una decisión con EV positivo no siempre es buena." },
        { title: "Costo de oportunidad", body: "Elegir A no solo cuesta lo que pierdes si falla, también cuesta lo que hubieras ganado con B." },
        { title: "Reversibilidad", body: "Jeff Bezos divide las decisiones en puertas de una vía (irreversibles) y puertas de dos vías (reversibles)." },
        { title: "Por qué el peor escenario importa", body: "El peor escenario no es el más probable, pero es el que destruye. Pregúntate: ¿puedo sobrevivir el peor caso?" },
        { title: "Cómo evitar decisiones impulsivas", body: "El cerebro bajo estrés optimiza para velocidad, no para calidad. Escribir los inputs introduce fricción cognitiva que reduce sesgos." },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: `1px solid ${T.surfaceLow}` }}>
          <h3 style={{ fontFamily: T.fontHead, fontSize: "1.125rem", fontWeight: 700, color: T.onSurface, marginBottom: "0.75rem" }}>{title}</h3>
          <p style={{ fontSize: "1rem", lineHeight: 1.7, color: T.onMuted }}>{body}</p>
        </div>
      ))}
    </div>
  );
}

function Resources({ onBack }: { onBack: () => void }) {
  const books = [
    { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", desc: "El libro fundamental sobre cómo tomamos decisiones y por qué fallamos." },
    { title: "The Art of Thinking Clearly", author: "Rolf Dobelli", desc: "99 sesgos cognitivos explicados con claridad." },
    { title: "Superforecasting", author: "Philip Tetlock", desc: "Cómo mejorar la calibración de tus estimaciones de probabilidad." },
    { title: "Decisive", author: "Chip & Dan Heath", desc: "Framework práctico para tomar mejores decisiones." },
  ];
  const concepts = [
    "Sesgo de confirmación", "Efecto de anclaje", "Sesgo de disponibilidad",
    "Falacia del costo hundido", "Aversión a la pérdida", "Exceso de confianza",
    "Heurística de representatividad", "Sesgo de optimismo",
  ];
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "6rem 1.5rem 4rem" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", cursor: "pointer",
        color: T.outline, fontSize: "0.9375rem", marginBottom: "2rem",
        fontFamily: T.font, display: "flex", alignItems: "center", gap: "0.4rem",
      }}>&larr; Inicio</button>
      <h1 style={{ fontFamily: T.fontHead, fontSize: "clamp(1.75rem, 5vw, 2.5rem)", fontWeight: 800, color: T.onSurface, marginBottom: "2.5rem", letterSpacing: "-0.02em" }}>
        Recursos
      </h1>
      <h2 style={{ fontFamily: T.fontHead, fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.25rem", color: T.onSurface }}>Libros</h2>
      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "3rem" }}>
        {books.map(({ title, author, desc }) => (
          <div key={title} style={{ background: T.surfaceCard, borderRadius: "1rem", padding: "1.25rem 1.5rem", border: "1px solid rgba(0,0,0,0.07)" }}>
            <div style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem", color: T.onSurface }}>{title}</div>
            <div style={{ fontSize: "0.875rem", color: T.primary, marginBottom: "0.5rem", fontWeight: 600 }}>{author}</div>
            <div style={{ fontSize: "0.9375rem", color: T.onMuted, lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontFamily: T.fontHead, fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: T.onSurface }}>Conceptos clave</h2>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.5rem" }}>
        {concepts.map(c => (
          <span key={c} style={{
            background: T.surfaceLow, fontSize: "0.875rem", fontWeight: 500,
            padding: "0.4rem 1rem", borderRadius: "9999px", color: T.onMuted,
          }}>{c}</span>
        ))}
      </div>
    </div>
  );
}

type Screen = "home" | "form" | "results" | "learn" | "resources";

interface User { id: number; email: string; name: string; avatarUrl?: string; }

function Nav({ screen, setScreen, user, onLogout }: {
  screen: Screen; setScreen: (s: Screen) => void;
  user: User; onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(248,249,250,0.96)", backdropFilter: "blur(14px)",
      padding: "0 1.5rem", height: "4rem",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      boxShadow: "0 1px 0 rgba(0,0,0,0.07)",
    }}>
      <button onClick={() => setScreen("home")} style={{
        background: "none", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", padding: 0,
      }}>
        <img src="/logo.png" alt="Ohtlica" style={{ height: "2rem", width: "auto" }} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        {([["Cómo funciona", "learn"], ["Recursos", "resources"]] as [string, Screen][]).map(([label, s]) => (
          <button key={s} onClick={() => setScreen(s)} style={{
            background: screen === s ? T.surfaceLow : "transparent",
            border: "none", cursor: "pointer", padding: "0.4rem 0.875rem", borderRadius: "9999px",
            fontSize: "0.9375rem", fontWeight: 500,
            color: screen === s ? T.primary : T.onMuted,
            fontFamily: T.font, transition: "all 0.15s",
          }}>{label}</button>
        ))}

        <div style={{ position: "relative", marginLeft: "0.5rem" }}>
          <button onClick={() => setMenuOpen(o => !o)} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem",
          }}>
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="" style={{ width: "2rem", height: "2rem", borderRadius: "50%", objectFit: "cover" }} />
              : <div style={{
                  width: "2rem", height: "2rem", borderRadius: "50%",
                  background: T.primary, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.875rem", fontWeight: 700, fontFamily: T.fontHead,
                }}>{user.name[0].toUpperCase()}</div>
            }
          </button>
          {menuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              background: T.surfaceCard, borderRadius: "0.875rem",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
              minWidth: "10rem", zIndex: 200, overflow: "hidden",
            }}>
              <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: T.onSurface }}>{user.name}</div>
                <div style={{ fontSize: "0.75rem", color: T.outline }}>{user.email}</div>
              </div>
              <button onClick={() => { setMenuOpen(false); onLogout(); }} style={{
                width: "100%", padding: "0.75rem 1rem",
                background: "transparent", border: "none", cursor: "pointer",
                fontSize: "0.875rem", color: "#ba1a1a", fontFamily: T.font,
                textAlign: "left" as const, fontWeight: 500,
              }}>Cerrar sesión</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const [screen,      setScreen]      = useState<Screen>("home");
  const [result,      setResult]      = useState<DecisionResult | null>(null);
  const [lastInput,   setLastInput]   = useState<DecisionInput | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [user,        setUser]        = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    getMe().then(u => { setUser(u); setAuthLoading(false); });
  }, []);

  useEffect(() => {
    window.history.replaceState({ screen: "home" }, "", "");
    function handlePopState(e: PopStateEvent) {
      const s = e.state?.screen as Screen | undefined;
      setScreen(s ?? "home");
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigateTo(s: Screen) {
    window.history.pushState({ screen: s }, "", "");
    setScreen(s);
  }

  async function handleSubmit(input: DecisionInput) {
    setLastInput(input);
    setLoading(true);
    setError(null);
    navigateTo("results");
    try {
      const data = await evaluateDecision(input);
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  function handleNew() {
    setResult(null);
    setLastInput(null);
    setError(null);
    navigateTo("home");
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setScreen("home");
  }

  if (authLoading) return (
    <div style={{
      minHeight: "100dvh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "#f8f9fa",
    }}>
      <img src="/logo.png" alt="Ohtlica" style={{ height: "2.5rem", opacity: 0.5 }} />
    </div>
  );

  if (!user) return <Login onLogin={setUser} />;

  return (
    <>
      {screen !== "home" && (
        <Nav screen={screen} setScreen={navigateTo} user={user} onLogout={handleLogout} />
      )}
      <main>
        {screen === "home"      && <Home onStart={() => navigateTo("form")} onLearn={() => navigateTo("learn")} />}
        {screen === "form"      && <DecisionForm onSubmit={handleSubmit} onBack={() => navigateTo("home")} loading={loading} />}
        {screen === "results"   && <Results result={result} loading={loading} error={error} onNew={handleNew} input={lastInput ?? undefined} />}
        {screen === "learn"     && <Pedagogy onBack={() => navigateTo("home")} />}
        {screen === "resources" && <Resources onBack={() => navigateTo("home")} />}
      </main>
    </>
  );
}