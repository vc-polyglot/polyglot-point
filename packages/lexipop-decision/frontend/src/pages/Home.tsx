import type React from "react";
const logo = "/logo.png";

interface HomeProps {
  onStart: () => void;
  onLearn: () => void;
  decisions?: Array<{
    id: number;
    title: string;
    type: string;
    createdAt: string;
  }>;
}

const T = {
  primary:    "#000666",
  primaryMid: "#1a237e",
  surface:    "#fbf9f5",
  surfaceLow: "#f5f3ef",
  surfaceCard:"#ffffff",
  surfaceHigh:"#eae8e4",
  teal:       "#beebe7",
  water:      "#d2e6ef",
  onSurface:  "#1b1c1a",
  onMuted:    "#454652",
  outline:    "#767683",
  fontHead:   "'Newsreader', Georgia, serif",
  fontBody:   "'Inter', system-ui, sans-serif",
};

const typeLabel: Record<string, string> = {
  cotidiana: "Personal", carrera: "Carrera", financiera: "Finanzas",
};

const typeColor: Record<string, { bg: string; color: string }> = {
  cotidiana:  { bg: "#beebe7", color: "#00201e" },
  carrera:    { bg: "#e0e0ff", color: "#000666" },
  financiera: { bg: "#d2e6ef", color: "#0b1e24" },
};

function timeAgo(dateStr: string): string {
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3_600_000);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default function Home({ onStart, onLearn, decisions = [] }: HomeProps) {
  const recent = decisions.slice(0, 3);

  return (
    <div style={{ minHeight: "100dvh", background: T.surface, fontFamily: T.fontBody, color: T.onSurface }}>

      {/* HEADER */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(251,249,245,0.92)", backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.875rem 1.5rem",
      }}>
        <img src={logo} alt="LexiPop Decisions" style={{ height: "4.25rem", width: "auto", display: "block" }} />
        <button onClick={onLearn} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "0.8125rem", fontWeight: 500, color: T.outline,
          fontFamily: T.fontBody, padding: "0.5rem 0",
        }}>
          Cómo funciona
        </button>
      </header>

      {/* MAIN */}
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "5.5rem 1.5rem 6rem" }}>

        <section style={{ marginBottom: "2.5rem" }}>
          <p style={{
            fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase" as const,
            letterSpacing: "0.18em", color: T.outline, marginBottom: "0.75rem",
          }}>
            Toma mejores decisiones
          </p>
          <h1 style={{
            fontFamily: T.fontHead, fontStyle: "italic",
            fontSize: "clamp(2.5rem, 9vw, 3.25rem)",
            fontWeight: 700, color: T.primary,
            lineHeight: 1.08, marginBottom: "1rem",
          }}>
            ¿Qué decisión tienes pendiente?
          </h1>
          <p style={{ fontSize: "1rem", color: T.onMuted, lineHeight: 1.65, marginBottom: "1.75rem" }}>
            Describe tu situación. La app calcula el valor esperado, detecta sesgos y te da un análisis en segundos.
          </p>

          <button
            onClick={onStart}
            style={{
              width: "100%",
              background: `linear-gradient(160deg, ${T.primary} 0%, ${T.primaryMid} 100%)`,
              color: "#ffffff", border: "none", borderRadius: 14,
              padding: "1.1rem 1.5rem",
              fontSize: "1.0625rem", fontWeight: 600, fontFamily: T.fontBody,
              cursor: "pointer",
              boxShadow: "0 8px 28px rgba(0,6,102,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.25rem" }}>add_circle</span>
            Analizar una decisión
          </button>

          <button onClick={onLearn} style={{
            width: "100%", marginTop: "0.75rem",
            background: T.surfaceLow, border: "none", borderRadius: 14,
            padding: "0.9rem 1.5rem",
            fontSize: "0.9375rem", fontWeight: 500, color: T.onMuted,
            fontFamily: T.fontBody, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>menu_book</span>
            Cómo funciona decidir
          </button>
        </section>

        <div style={{ height: 1, background: "rgba(198,197,212,0.2)", marginBottom: "2rem" }} />

        {recent.length > 0 ? (
          <section>
            <p style={{
              fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase" as const,
              letterSpacing: "0.15em", color: T.outline, marginBottom: "1rem",
            }}>
              Decisiones recientes
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {recent.map(d => (
                <div key={d.id} style={{
                  background: T.surfaceCard, borderRadius: 12,
                  padding: "1rem 1.25rem",
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  boxShadow: "0 1px 8px rgba(27,28,26,0.05)",
                }}>
                  <span style={{
                    padding: "0.2rem 0.6rem", borderRadius: 9999,
                    fontSize: "0.6rem", fontWeight: 700,
                    textTransform: "uppercase" as const, letterSpacing: "0.1em",
                    background: typeColor[d.type]?.bg ?? T.surfaceLow,
                    color: typeColor[d.type]?.color ?? T.onMuted,
                    flexShrink: 0,
                  }}>
                    {typeLabel[d.type] ?? d.type}
                  </span>
                  <span style={{
                    fontFamily: T.fontHead, fontSize: "0.9375rem", fontWeight: 600,
                    color: T.onSurface, flex: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {d.title}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: T.outline, flexShrink: 0 }}>
                    {timeAgo(d.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section style={{ textAlign: "center" as const, padding: "0.5rem 0" }}>
            <div style={{
              width: "3.5rem", height: "3.5rem", borderRadius: "50%",
              background: T.surfaceLow,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1rem",
            }}>
              <span className="material-symbols-outlined" style={{ color: T.outline, fontSize: "1.5rem" }}>lightbulb</span>
            </div>
            <p style={{ fontSize: "0.9375rem", color: T.onMuted, lineHeight: 1.6 }}>
              Tu historial aparecerá aquí.<br />Empieza con la decisión que tienes en mente ahora.
            </p>
          </section>
        )}

      </main>

      {/* BOTTOM NAV */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(251,249,245,0.92)", backdropFilter: "blur(24px)",
        borderRadius: "1.5rem 1.5rem 0 0",
        boxShadow: "0 -4px 24px rgba(27,28,26,0.05)",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "0.75rem 1rem 1.5rem",
      }}>
        <button style={{
          display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.15rem",
          background: T.primary, color: "#ffffff",
          border: "none", borderRadius: "0.875rem",
          padding: "0.5rem 1.25rem", cursor: "pointer",
          fontFamily: T.fontBody,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.3rem" }}>home</span>
          <span style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Inicio</span>
        </button>
        <button onClick={onStart} style={{
          display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.15rem",
          background: "none", color: T.outline, border: "none",
          cursor: "pointer", fontFamily: T.fontBody, padding: "0.5rem 1.25rem",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.3rem" }}>add_circle</span>
          <span style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Nueva</span>
        </button>
        <button onClick={onLearn} style={{
          display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.15rem",
          background: "none", color: T.outline, border: "none",
          cursor: "pointer", fontFamily: T.fontBody, padding: "0.5rem 1.25rem",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.3rem" }}>menu_book</span>
          <span style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Aprender</span>
        </button>
      </nav>

    </div>
  );
}