import { useState, useEffect } from "react";
import type { DecisionInput, DecisionResult } from "./types";
import { evaluateDecision } from "./services/api";
import Home         from "./pages/Home";
import DecisionForm from "./pages/DecisionForm";
import Results      from "./pages/Results";

const T = {
  primary:     "#1a7a4a",
  primaryMid:  "#145f39",
  surface:     "#f2f0ed",
  surfaceCard: "#ffffff",
  surfaceLow:  "#eae8e4",
  onSurface:   "#1a1a1a",
  onMuted:     "#4a4a4a",
  outline:     "#8a8a8a",
  font:        "'Inter', system-ui, sans-serif",
};

const LANGS = ["ES", "EN", "FR", "IT", "PT", "DE"] as const;
type Lang = typeof LANGS[number];

function Pedagogy({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "6rem 1.5rem 4rem" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", cursor: "pointer",
        color: T.outline, fontSize: "0.9375rem", marginBottom: "2rem",
        fontFamily: T.font, display: "flex", alignItems: "center", gap: "0.4rem",
      }}>&larr; Inicio</button>
      <h1 style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)", fontWeight: 800, color: T.onSurface, marginBottom: "2.5rem", letterSpacing: "-0.02em" }}>
        Como funciona decidir
      </h1>
      {[
        { title: "Probabilidad subjetiva", body: "Cuando estimas que algo tiene 70% de chance de funcionar, ese numero viene de tu cabeza, no de datos. La clave es calibrar esa estimacion: cuantas veces en 10 situaciones similares has acertado?" },
        { title: "Valor esperado", body: "EV = P(exito) x Valor(exito) + P(fallo) x Valor(fallo). Una decision con EV positivo no siempre es buena Ã¢â‚¬â€ depende de tu capacidad de absorber la perdida." },
        { title: "Costo de oportunidad", body: "Elegir A no solo cuesta lo que pierdes si falla Ã¢â‚¬â€ tambien cuesta lo que hubieras ganado con B." },
        { title: "Reversibilidad", body: "Jeff Bezos divide las decisiones en puertas de una via (irreversibles) y puertas de dos vias (reversibles). Para puertas de una via: maxima deliberacion." },
        { title: "Por que el peor escenario importa", body: "El peor escenario no es el mas probable Ã¢â‚¬â€ pero es el que destruye. Preguntate: puedo sobrevivir el peor caso?" },
        { title: "Como evitar decisiones impulsivas", body: "El cerebro bajo estres optimiza para velocidad, no para calidad. Escribir los inputs del analisis introduce friccion cognitiva que reduce sesgos." },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: `1px solid ${T.surfaceLow}` }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: T.onSurface, marginBottom: "0.75rem" }}>{title}</h3>
          <p style={{ fontSize: "1rem", lineHeight: 1.7, color: T.onMuted }}>{body}</p>
        </div>
      ))}
    </div>
  );
}

function Resources({ onBack }: { onBack: () => void }) {
  const books = [
    { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", desc: "El libro fundamental sobre como tomamos decisiones y por que fallamos." },
    { title: "The Art of Thinking Clearly", author: "Rolf Dobelli", desc: "99 sesgos cognitivos explicados con claridad." },
    { title: "Superforecasting", author: "Philip Tetlock", desc: "Como mejorar la calibracion de tus estimaciones de probabilidad." },
    { title: "Decisive", author: "Chip & Dan Heath", desc: "Framework practico para tomar mejores decisiones." },
  ];
  const concepts = [
    "Sesgo de confirmacion", "Efecto de anclaje", "Sesgo de disponibilidad",
    "Falacia del costo hundido", "Aversion a la perdida", "Exceso de confianza",
    "Heuristica de representatividad", "Sesgo de optimismo",
  ];
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "6rem 1.5rem 4rem" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", cursor: "pointer",
        color: T.outline, fontSize: "0.9375rem", marginBottom: "2rem",
        fontFamily: T.font, display: "flex", alignItems: "center", gap: "0.4rem",
      }}>&larr; Inicio</button>
      <h1 style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)", fontWeight: 800, color: T.onSurface, marginBottom: "2.5rem", letterSpacing: "-0.02em" }}>
        Recursos
      </h1>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.25rem", color: T.onSurface }}>Libros</h2>
      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "3rem" }}>
        {books.map(({ title, author, desc }) => (
          <div key={title} style={{ background: T.surfaceCard, borderRadius: "1rem", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem", color: T.onSurface }}>{title}</div>
            <div style={{ fontSize: "0.875rem", color: T.primary, marginBottom: "0.5rem", fontWeight: 600 }}>{author}</div>
            <div style={{ fontSize: "0.9375rem", color: T.onMuted, lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: T.onSurface }}>Conceptos clave</h2>
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

function Nav({ screen, setScreen, lang, setLang }: {
  screen: Screen; setScreen: (s: Screen) => void;
  lang: Lang; setLang: (l: Lang) => void;
}) {
  const [langOpen, setLangOpen] = useState(false);
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(242,240,237,0.96)", backdropFilter: "blur(14px)",
      padding: "0 2rem", height: "4rem",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      boxShadow: "0 1px 0 rgba(0,0,0,0.07)",
    }}>
      <button onClick={() => setScreen("home")} style={{
        background: "none", border: "none", cursor: "pointer",
        fontSize: "1rem", fontWeight: 700, color: T.onSurface,
        display: "flex", alignItems: "center", gap: "0.5rem", padding: 0, fontFamily: T.font,
      }}>
        <span style={{
          background: T.primary, color: "white",
          width: "1.875rem", height: "1.875rem", borderRadius: "0.625rem",
          display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem",
        }}>Ã¢Â¬Â¡</span>
        LexiPop Decision
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        {([["Como funciona", "learn"], ["Recursos", "resources"]] as [string, Screen][]).map(([label, s]) => (
          <button key={s} onClick={() => setScreen(s)} style={{
            background: screen === s ? "#e0f0e8" : "transparent",
            border: "none", cursor: "pointer", padding: "0.4rem 0.875rem", borderRadius: "9999px",
            fontSize: "0.9375rem", fontWeight: 500,
            color: screen === s ? T.primary : T.onMuted,
            fontFamily: T.font, transition: "all 0.15s",
          }}>{label}</button>
        ))}

        <div style={{ width: 1, height: "1.125rem", background: "rgba(0,0,0,0.12)", margin: "0 0.375rem" }} />

        <div style={{ position: "relative" }}>
          <button onClick={() => setLangOpen(!langOpen)} style={{
            background: langOpen ? "#e0f0e8" : "transparent",
            border: "none", cursor: "pointer", padding: "0.4rem 0.625rem", borderRadius: "9999px",
            fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.06em",
            color: T.primary, fontFamily: T.font,
            display: "flex", alignItems: "center", gap: "0.25rem",
          }}>
            {lang}
            <span style={{ fontSize: "0.5625rem", color: T.outline, transform: langOpen ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>v</span>
          </button>
          {langOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: T.surfaceCard, borderRadius: "0.875rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              overflow: "hidden", minWidth: "5rem", zIndex: 200,
            }}>
              {LANGS.map(l => (
                <button key={l} onClick={() => { setLang(l); setLangOpen(false); }} style={{
                  width: "100%", padding: "0.5rem 1rem",
                  background: l === lang ? "#e0f0e8" : "transparent",
                  border: "none", cursor: "pointer",
                  fontSize: "0.875rem", fontWeight: l === lang ? 700 : 400,
                  color: l === lang ? T.primary : T.onMuted,
                  fontFamily: T.font, textAlign: "left",
                }}>
                  {l === "ES" && "Ã°Å¸â€¡Â²Ã°Å¸â€¡Â½ Espanol"}
                  {l === "EN" && "Ã°Å¸â€¡ÂºÃ°Å¸â€¡Â¸ English"}
                  {l === "FR" && "Ã°Å¸â€¡Â«Ã°Å¸â€¡Â· Francais"}
                  {l === "IT" && "Ã°Å¸â€¡Â®Ã°Å¸â€¡Â¹ Italiano"}
                  {l === "PT" && "Ã°Å¸â€¡Â§Ã°Å¸â€¡Â· Portugues"}
                  {l === "DE" && "Ã°Å¸â€¡Â©Ã°Å¸â€¡Âª Deutsch"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const [screen,    setScreen]    = useState<Screen>("home");
  const [result,    setResult]    = useState<DecisionResult | null>(null);
  const [lastInput, setLastInput] = useState<DecisionInput | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [lang,      setLang]      = useState<Lang>("ES");

  // Sincronizar pantalla con historial del navegador
  function navigateTo(s: Screen) {
    window.history.pushState({ screen: s }, "", "");
    setScreen(s);
  }

  useEffect(() => {
    // Estado inicial para que haya algo que interceptar en home
    window.history.replaceState({ screen: "home" }, "", "");

    function handlePopState(e: PopStateEvent) {
      const s = e.state?.screen as Screen | undefined;
      if (s) {
        setScreen(s);
      } else {
        setScreen("home");
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  return (
    <>
      {screen !== "home" && (
        <Nav screen={screen} setScreen={navigateTo} lang={lang} setLang={setLang} />
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