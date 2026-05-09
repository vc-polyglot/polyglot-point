const T = {
  primary:     "#0035c5",
  primaryMid:  "#0047ff",
  surface:     "#f8f9fa",
  surfaceLow:  "#f3f4f5",
  surfaceCard: "#ffffff",
  surfaceMid:  "#edeeef",
  onSurface:   "#191c1d",
  onMuted:     "#434657",
  outline:     "#747688",
  font:        "'Inter', system-ui, sans-serif",
  fontHead:    "'Hanken Grotesk', system-ui, sans-serif",
};

interface HomeProps {
  onStart: () => void;
  onLearn: () => void;
}

export default function Home({ onStart, onLearn }: HomeProps) {
  return (
    <div style={{ minHeight: "100dvh", background: T.surface, fontFamily: T.font, color: T.onSurface }}>

      {/* HEADER */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(248,249,250,0.95)", backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.875rem 1.5rem",
        boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
      }}>
        <img src="/logo.png" alt="LexiPop Decisions" style={{ height: "2.25rem", width: "auto", display: "block" }} />
        <button onClick={onLearn} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "0.9375rem", fontWeight: 500, color: T.onMuted,
          fontFamily: T.font, padding: "0.5rem 0",
        }}>
          Cómo funciona
        </button>
      </header>

      {/* MAIN */}
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "5.5rem 1.5rem 6rem" }}>

        {/* Imagen hero */}
        <div style={{ marginBottom: "2rem", borderRadius: "1.25rem", overflow: "hidden" }}>
          <img
            src="/img-mesa.png"
            alt=""
            style={{
              width: "100%",
              aspectRatio: "4 / 3",
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
            }}
          />
        </div>

        {/* Hero */}
        <section style={{ marginBottom: "2.5rem" }}>
          <p style={{
            fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase" as const,
            letterSpacing: "0.1em", color: T.primary, marginBottom: "0.75rem",
            fontFamily: T.fontHead,
          }}>
            Navega tus conflictos
          </p>
          <h1 style={{
            fontSize: "clamp(2rem, 8vw, 3rem)", fontWeight: 800,
            color: T.onSurface, lineHeight: 1.1,
            letterSpacing: "-0.02em", marginBottom: "1rem",
            fontFamily: T.fontHead,
          }}>
            ¿Qué decisión tienes pendiente?
          </h1>
          <p style={{
            fontSize: "1.0625rem", color: T.onMuted,
            lineHeight: 1.65, marginBottom: "1.75rem",
          }}>
            No te decimos qué hacer. Te mostramos cómo estás pensando.
          </p>

          <button onClick={onStart} style={{
            width: "100%",
            background: T.primary,
            color: "#ffffff", border: "none", borderRadius: "9999px",
            padding: "1.0625rem 1.5rem",
            fontSize: "1.0625rem", fontWeight: 700, fontFamily: T.fontHead,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,53,197,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 180ms",
          }}>
            Analizar una decisión
          </button>
        </section>

      </main>

      {/* BOTTOM NAV */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(248,249,250,0.95)", backdropFilter: "blur(24px)",
        borderRadius: "1.5rem 1.5rem 0 0",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.06)",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "0.75rem 1rem 1.5rem",
      }}>
        <button style={{
          display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.15rem",
          background: T.primary, color: "#ffffff",
          border: "none", borderRadius: "9999px",
          padding: "0.5rem 1.5rem", cursor: "pointer",
          fontFamily: T.font,
          boxShadow: "0 4px 14px rgba(0,53,197,0.25)",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.3rem" }}>home</span>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
            Inicio
          </span>
        </button>

        <button onClick={onStart} style={{
          display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.15rem",
          background: "none", color: T.outline, border: "none",
          cursor: "pointer", fontFamily: T.font, padding: "0.5rem 1.25rem",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.3rem" }}>add_circle</span>
          <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
            Nueva
          </span>
        </button>

        <button onClick={onLearn} style={{
          display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.15rem",
          background: "none", color: T.outline, border: "none",
          cursor: "pointer", fontFamily: T.font, padding: "0.5rem 1.25rem",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.3rem" }}>menu_book</span>
          <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
            Aprender
          </span>
        </button>
      </nav>

    </div>
  );
}