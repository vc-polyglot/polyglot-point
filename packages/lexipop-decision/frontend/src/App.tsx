import { useState } from "react";
import type { DecisionInput, DecisionResult } from "./types";
import { evaluateDecision } from "./services/api";
import Home         from "./pages/Home";
import DecisionForm from "./pages/DecisionForm";
import Results      from "./pages/Results";

// ── Tokens ────────────────────────────────────────────────────────────────────
const T = {
  primary:     "#000666",
  surfaceLow:  "#f5f3ef",
  surfaceCard: "#ffffff",
  onSurface:   "#1b1c1a",
  onMuted:     "#454652",
  outline:     "#767683",
  fontHead:    "'Newsreader', Georgia, serif",
  fontBody:    "'Inter', system-ui, sans-serif",
};

// ── Idiomas ───────────────────────────────────────────────────────────────────
const LANGS = ["ES", "EN", "FR", "IT", "PT", "DE"] as const;
type Lang = typeof LANGS[number];

// ── Páginas estáticas ──────────────────────────────────────────────────────────
function Pedagogy({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "6rem 24px 64px" }} className="fade-up">
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: T.outline, fontSize: 13, marginBottom: 32, fontFamily: T.fontBody }}>
        ← Inicio
      </button>
      <h1 style={{ fontFamily: T.fontHead, fontStyle: "italic", fontSize: 36, fontWeight: 400, marginBottom: 40, color: T.primary }}>
        Cómo funciona decidir
      </h1>
      {[
        {
          title: "Probabilidad subjetiva",
          body: "Cuando estimas que algo tiene 70% de chance de funcionar, ese número viene de tu cabeza, no de datos. La clave es calibrar esa estimación: ¿cuántas veces en 10 situaciones similares has acertado?",
        },
        {
          title: "Valor esperado",
          body: "EV = P(éxito) × Valor(éxito) + P(fallo) × Valor(fallo). Si hay 60% de ganar $10,000 y 40% de perder $2,000: EV = 0.6×10,000 + 0.4×(−2,000) = $5,200. Una decisión con EV positivo no siempre es buena — depende de tu capacidad de absorber la pérdida.",
        },
        {
          title: "Costo de oportunidad",
          body: "Toda decisión tiene un costo invisible: la mejor alternativa que sacrificas. Elegir A no solo cuesta lo que pierdes si falla — también cuesta lo que hubieras ganado con B.",
        },
        {
          title: "Reversibilidad",
          body: "Jeff Bezos divide las decisiones en puertas de una vía (irreversibles) y puertas de dos vías (reversibles). Para puertas de una vía: máxima deliberación. Para puertas de dos vías: decide rápido y corrige sobre la marcha.",
        },
        {
          title: "Por qué el peor escenario importa",
          body: "La mayoría sobreestimamos el promedio y subestimamos la cola. El peor escenario no es el más probable — pero es el que destruye. Pregúntate: ¿puedo sobrevivir el peor caso?",
        },
        {
          title: "Cómo evitar decisiones impulsivas",
          body: "El cerebro bajo estrés optimiza para velocidad, no para calidad. Forzarte a escribir los inputs del análisis (probabilidad, alternativas, reversibilidad) introduce fricción cognitiva que reduce los sesgos de disponibilidad y anclaje.",
        },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: 36, paddingBottom: 36, borderBottom: "1px solid rgba(118,118,131,0.15)" }}>
          <h3 style={{ fontFamily: T.fontHead, fontStyle: "italic", fontSize: 20, fontWeight: 400, marginBottom: 12, color: T.primary }}>{title}</h3>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: T.onMuted, fontFamily: T.fontBody }}>{body}</p>
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
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "6rem 24px 64px" }} className="fade-up">
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: T.outline, fontSize: 13, marginBottom: 32, fontFamily: T.fontBody }}>
        ← Inicio
      </button>
      <h1 style={{ fontFamily: T.fontHead, fontStyle: "italic", fontSize: 36, fontWeight: 400, marginBottom: 40, color: T.primary }}>Recursos</h1>

      <h2 style={{ fontFamily: T.fontHead, fontStyle: "italic", fontSize: 22, fontWeight: 400, marginBottom: 20, color: T.primary }}>Libros</h2>
      <div style={{ display: "grid", gap: 12, marginBottom: 48 }}>
        {books.map(({ title, author, desc }) => (
          <div key={title} style={{ background: T.surfaceCard, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2, color: T.onSurface, fontFamily: T.fontBody }}>{title}</div>
            <div style={{ fontSize: 12, color: T.primary, marginBottom: 8, fontFamily: T.fontBody }}>{author}</div>
            <div style={{ fontSize: 13, color: T.onMuted, lineHeight: 1.6, fontFamily: T.fontBody }}>{desc}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: T.fontHead, fontStyle: "italic", fontSize: 22, fontWeight: 400, marginBottom: 16, color: T.primary }}>Conceptos clave</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {concepts.map(c => (
          <span key={c} style={{ background: T.surfaceLow, fontSize: 13, padding: "6px 14px", borderRadius: 20, color: T.onMuted, fontFamily: T.fontBody }}>{c}</span>
        ))}
      </div>
    </div>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────────────
type Screen = "home" | "form" | "results" | "learn" | "resources";

function Nav({
  screen, setScreen, lang, setLang,
}: {
  screen: Screen;
  setScreen: (s: Screen) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  const [langOpen, setLangOpen] = useState(false);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(251,249,245,0.94)", backdropFilter: "blur(14px)",
      padding: "0 32px",
      height: "4rem",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      boxShadow: "0 1px 0 rgba(118,118,131,0.12)",
    }}>
      {/* Logo / Home */}
      <button onClick={() => setScreen("home")} style={{
        background: "none", border: "none", cursor: "pointer",
        fontFamily: T.fontHead, fontStyle: "italic", fontSize: 17, color: T.onSurface,
        display: "flex", alignItems: "center", gap: 8, padding: 0,
      }}>
        <span style={{
          background: T.primary, color: "white",
          width: 28, height: 28, borderRadius: 8,
          display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13,
        }}>⬡</span>
        LexiPop Decision
      </button>

      {/* Derecha: páginas + idioma */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {([["Cómo funciona", "learn"], ["Recursos", "resources"]] as [string, Screen][]).map(([label, s]) => (
          <button key={s} onClick={() => setScreen(s)} style={{
            background: screen === s ? "rgba(0,6,102,0.08)" : "transparent",
            border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            color: screen === s ? T.primary : T.onMuted,
            fontFamily: T.fontBody,
            transition: "all 0.15s",
          }}>
            {label}
          </button>
        ))}

        {/* Divisor */}
        <div style={{ width: 1, height: 18, background: "rgba(118,118,131,0.2)", margin: "0 6px" }} />

        {/* Selector de idioma */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            style={{
              background: langOpen ? "rgba(0,6,102,0.08)" : "transparent",
              border: "none", cursor: "pointer",
              padding: "6px 10px", borderRadius: 8,
              fontSize: 12, fontWeight: 600, letterSpacing: "0.06em",
              color: T.primary, fontFamily: T.fontBody,
              display: "flex", alignItems: "center", gap: 4,
              transition: "all 0.15s",
            }}
          >
            {lang}
            <span style={{
              fontSize: 9, color: T.outline,
              transform: langOpen ? "rotate(180deg)" : "none",
              transition: "transform 200ms",
            }}>▾</span>
          </button>

          {langOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: T.surfaceCard,
              borderRadius: 10,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              overflow: "hidden", minWidth: 80,
              zIndex: 200,
            }}>
              {LANGS.map(l => (
                <button
                  key={l}
                  onClick={() => { setLang(l); setLangOpen(false); }}
                  style={{
                    width: "100%", padding: "8px 14px",
                    background: l === lang ? "rgba(0,6,102,0.06)" : "transparent",
                    border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: l === lang ? 600 : 400,
                    color: l === lang ? T.primary : T.onMuted,
                    fontFamily: T.fontBody,
                    textAlign: "left",
                    transition: "background 100ms",
                  }}
                >
                  {l === "ES" && "🇲🇽 Español"}
                  {l === "EN" && "🇺🇸 English"}
                  {l === "FR" && "🇫🇷 Français"}
                  {l === "IT" && "🇮🇹 Italiano"}
                  {l === "PT" && "🇧🇷 Português"}
                  {l === "DE" && "🇩🇪 Deutsch"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,  setScreen]  = useState<Screen>("home");
  const [result,  setResult]  = useState<DecisionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [lang,    setLang]    = useState<Lang>("ES");

  async function handleSubmit(input: DecisionInput) {
    setLoading(true);
    setError(null);
    setScreen("results");
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
    setError(null);
    setScreen("home");
  }

  return (
    <>
      {screen !== "home" && (
        <Nav screen={screen} setScreen={setScreen} lang={lang} setLang={setLang} />
      )}
      <main>
        {screen === "home"      && <Home onStart={() => setScreen("form")} onLearn={() => setScreen("learn")} />}
        {screen === "form"      && <DecisionForm onSubmit={handleSubmit} onBack={() => setScreen("home")} loading={loading} />}
        {screen === "results"   && <Results result={result} loading={loading} error={error} onNew={handleNew} />}
        {screen === "learn"     && <Pedagogy onBack={() => setScreen("home")} />}
        {screen === "resources" && <Resources onBack={() => setScreen("home")} />}
      </main>
    </>
  );
}
