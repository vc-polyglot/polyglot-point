import { useState } from "react";
import type { DecisionInput, DecisionResult } from "./types";
import { evaluateDecision } from "./services/api";
import Home         from "./pages/Home";
import DecisionForm from "./pages/DecisionForm";
import Results      from "./pages/Results";

// ── Páginas estáticas ──────────────────────────────────────────────────────────
function Pedagogy({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 24px 64px" }} className="fade-up">
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-mid)", fontSize: 13, marginBottom: 32 }}>
        ← Inicio
      </button>
      <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 36, fontWeight: 400, marginBottom: 40 }}>
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
        <div key={title} style={{ marginBottom: 36, paddingBottom: 36, borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, fontWeight: 400, marginBottom: 12 }}>{title}</h3>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-mid)" }}>{body}</p>
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
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 24px 64px" }} className="fade-up">
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-mid)", fontSize: 13, marginBottom: 32 }}>
        ← Inicio
      </button>
      <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 36, fontWeight: 400, marginBottom: 40 }}>Recursos</h1>

      <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, fontWeight: 400, marginBottom: 20 }}>Libros</h2>
      <div style={{ display: "grid", gap: 12, marginBottom: 48 }}>
        {books.map(({ title, author, desc }) => (
          <div key={title} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 12, color: "var(--blue)", marginBottom: 8 }}>{author}</div>
            <div style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, fontWeight: 400, marginBottom: 16 }}>Conceptos clave</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {concepts.map(c => (
          <span key={c} style={{ background: "var(--bg-muted)", fontSize: 13, padding: "6px 14px", borderRadius: 20, color: "var(--text-mid)" }}>{c}</span>
        ))}
      </div>
    </div>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────────────
type Screen = "home" | "form" | "results" | "learn" | "resources";

function Nav({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(248,247,244,0.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)", padding: "24px 32px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <button onClick={() => setScreen("home")} style={{
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "'DM Serif Display',serif", fontSize: 18, color: "var(--text)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{
          background: "var(--blue)", color: "white",
          width: 28, height: 28, borderRadius: 8,
          display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14,
        }}>⬡</span>
        LexiPop Decision
      </button>
      <div style={{ display: "flex", gap: 4 }}>
        {([["Cómo funciona", "learn"], ["Recursos", "resources"]] as [string, Screen][]).map(([label, s]) => (
          <button key={s} onClick={() => setScreen(s)} style={{
            background: screen === s ? "var(--blue-light)" : "transparent",
            border: "none", cursor: "pointer", padding: "8px 14px", borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            color: screen === s ? "var(--blue)" : "var(--text-mid)",
            transition: "all 0.15s",
          }}>
            {label}
          </button>
        ))}
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
      {screen !== "home" && <Nav screen={screen} setScreen={setScreen} />}
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
