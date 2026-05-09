const T = {
  primary:     "#1a7a4a",
  primaryMid:  "#145f39",
  surface:     "#f2f0ed",
  surfaceLow:  "#eae8e4",
  surfaceCard: "#ffffff",
  surfaceMid:  "#e0deda",
  onSurface:   "#1a1a1a",
  onMuted:     "#4a4a4a",
  outline:     "#8a8a8a",
  font:        "'Inter', system-ui, sans-serif",
};

const DOMAIN_ACCENT: Record<string, { bg: string; color: string }> = {
  cotidiana:  { bg: "#fef8e1", color: "#7a5a00" },
  relaciones: { bg: "#fde8e5", color: "#8a2010" },
  carrera:    { bg: "#e0f0e8", color: "#0a4a28" },
  finanzas:   { bg: "#e8edf8", color: "#1a2a6a" },
  identidad:  { bg: "#f0e8f8", color: "#4a1a7a" },
};

const DOMAIN_LABEL: Record<string, string> = {
  cotidiana:  "Vida cotidiana",
  relaciones: "Relaciones",
  carrera:    "Carrera y propósito",
  finanzas:   "Finanzas",
  identidad:  "Identidad y crecimiento",
};

function timeAgo(dateStr: string): string {
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3_600_000);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

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
        background: "rgba(242,240,237,0.95)", backdropFilter: "blur(20px)",
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

        {/* Hero */}
        <section style={{ marginBottom: "2.5rem" }}>
          <p style={{
            fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase" as const,
            letterSpacing: "0.1em", color: T.primary, marginBottom: "0.75rem",
          }}>
            Navega tus conflictos
          </p>
          <h1 style={{
            fontSize: "clamp(2rem, 8vw, 3rem)", fontWeight: 800,
            color: T.onSurface, lineHeight: 1.1,
            letterSpacing: "-0.02em", marginBottom: "1rem",
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
            background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryMid} 100%)`,
            color: "#ffffff", border: "none", borderRadius: "9999px",
            padding: "1.0625rem 1.5rem",
            fontSize: "1.0625rem", fontWeight: 700, fontFamily: T.font,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(26,122,74,0.30)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
            transition: "all 180ms",
          }}>
            Analizar una decisión
          </button>
        </section>


      </main>

      {/* BOTTOM NAV */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(242,240,237,0.95)", backdropFilter: "blur(24px)",
        borderRadius: "1.5rem 1.5rem 0 0",
        boxShadow: "0 -2px 16px rgba(0,0,0,0.07)",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "0.75rem 1rem 1.5rem",
      }}>
        <button style={{
          display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.15rem",
          background: T.primary, color: "#ffffff",
          border: "none", borderRadius: "9999px",
          padding: "0.5rem 1.5rem", cursor: "pointer",
          fontFamily: T.font,
          boxShadow: "0 4px 14px rgba(26,122,74,0.30)",
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