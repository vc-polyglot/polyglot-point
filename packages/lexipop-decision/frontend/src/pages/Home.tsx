interface HomeProps {
  onStart: () => void;
  onLearn: () => void;
}

export default function Home({ onStart, onLearn }: HomeProps) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 24px 64px" }} className="fade-up">

      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "var(--blue-light)", color: "var(--blue)",
        fontSize: 12, fontWeight: 600, padding: "5px 12px",
        borderRadius: 20, marginBottom: 32, letterSpacing: "0.04em",
      }}>
        <span>⬡</span> MOTOR DE DECISIONES
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: "clamp(36px, 5vw, 56px)",
        lineHeight: 1.1, fontWeight: 400, marginBottom: 20,
        letterSpacing: "-0.02em",
      }}>
        Entrena tu capacidad<br />
        de tomar decisiones<br />
        <em style={{ fontStyle: "italic", color: "var(--blue)" }}>estructuradas.</em>
      </h1>

      <p style={{ fontSize: 17, color: "var(--text-mid)", marginBottom: 48, lineHeight: 1.7, maxWidth: 520 }}>
        No un chatbot. No consejos genéricos.<br />
        Un sistema que analiza la estructura de tu razonamiento y te enseña a pensar mejor.
      </p>

      {/* CTAs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={onStart} style={{
          background: "var(--blue)", color: "white", border: "none",
          padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 600,
          cursor: "pointer", letterSpacing: "-0.01em", transition: "all 0.2s",
        }}
          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
        >
          Nueva decisión →
        </button>
        <button onClick={onLearn} style={{
          background: "white", color: "var(--text)",
          border: "1.5px solid var(--border)",
          padding: "13px 28px", borderRadius: 12, fontSize: 15, fontWeight: 500,
          cursor: "pointer", transition: "all 0.2s",
        }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-muted)")}
          onMouseLeave={e => (e.currentTarget.style.background = "white")}
        >
          Cómo funciona
        </button>
      </div>

      {/* Features */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 16, marginTop: 72,
      }}>
        {[
          { icon: "⚙️", title: "Motor matemático", desc: "Valor esperado, riesgo ponderado, sensibilidad." },
          { icon: "🧠", title: "Análisis IA", desc: "Detecta sesgos y puntos ciegos en tu razonamiento." },
          { icon: "📖", title: "Pedagogía activa", desc: "Aprende sobre tu proceso, no sobre el resultado." },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 14, padding: "20px",
          }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}