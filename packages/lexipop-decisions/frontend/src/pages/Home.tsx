const logo = "/logo.png";

const T = {
  primary:     "#1a7a4a",
  primaryMid:  "#145f39",
  coral:       "#e85d4a",
  coralLight:  "#fde8e5",
  gold:        "#f5c842",
  goldLight:   "#fef8e1",
  surface:     "#f2f0ed",
  surfaceLow:  "#eae8e4",
  surfaceCard: "#ffffff",
  surfaceMid:  "#e0deda",
  surfaceHigh: "#d4d2ce",
  onSurface:   "#1a1a1a",
  onMuted:     "#4a4a4a",
  outline:     "#8a8a8a",
  font:        "'Inter', system-ui, sans-serif",
};

const typeLabel: Record<string, string> = {
  cotidiana: "Personal", carrera: "Carrera", financiera: "Finanzas",
};

const typeColor: Record<string, { bg: string; color: string }> = {
  cotidiana:  { bg: T.goldLight,  color: "#7a5a00" },
  carrera:    { bg: T.coralLight, color: "#8a2010" },
  financiera: { bg: "#e0f0e8",    color: "#0a4a28" },
};

function timeAgo(dateStr: string): string {
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3_600_000);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

interface HomeProps {
  onStart: () => void;
  onLearn: () => void;
  decisions?: Array<{ id: number; title: string; type: string; createdAt: string }>;
}

export default function Home({ onStart, onLearn, decisions = [] }: HomeProps) {
  const recent = decisions.slice(0, 3);

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
        <img src={logo} alt="LexiPop Decisions" style={{ height: "2.25rem", width: "auto", display: "block" }} />
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
            Toma mejores decisiones
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
            Describe tu situación. La app calcula el valor esperado, detecta sesgos y te da un análisis en segundos.
          </p>

          {/* CTA principal */}
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
            <span className="material-symbols-outlined" style={{ fontSize: "1.25rem" }}>add_circle</span>
            Analizar una decisión
          </button>
        </section>

        {/* Divisor */}
        <div style={{ height: 1, background: T.surfaceMid, marginBottom: "2rem" }} />

        {/* Cards de tipo — preview visual */}
        <section style={{ marginBottom: "2rem" }}>
          <p style={{
            fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase" as const,
            letterSpacing: "0.1em", color: T.outline, marginBottom: "1rem",
          }}>
            ¿Qué tipo de decisión?
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            {[
              { label: "Cotidiana", bg: T.goldLight, color: "#7a5a00", icon: "wb_sunny" },
              { label: "Carrera",   bg: T.coralLight, color: "#8a2010", icon: "work" },
              { label: "Finanzas",  bg: "#e0f0e8",    color: "#0a4a28", icon: "payments" },
            ].map(({ label, bg, color, icon }) => (
              <button key={label} onClick={onStart} style={{
                background: bg, border: "none", borderRadius: "1.25rem",
                padding: "1.125rem 0.75rem",
                display: "flex", flexDirection: "column" as const,
                alignItems: "center", gap: "0.5rem",
                cursor: "pointer", transition: "all 180ms",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: "1.5rem", color }}>
                  {icon}
                </span>
                <span style={{
                  fontSize: "0.875rem", fontWeight: 600, color,
                  fontFamily: T.font,
                }}>{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Divisor */}
        <div style={{ height: 1, background: T.surfaceMid, marginBottom: "2rem" }} />

        {/* Historial o estado vacío */}
        {recent.length > 0 ? (
          <section>
            <p style={{
              fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase" as const,
              letterSpacing: "0.1em", color: T.outline, marginBottom: "1rem",
            }}>
              Decisiones recientes
            </p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.625rem" }}>
              {recent.map(d => (
                <div key={d.id} style={{
                  background: T.surfaceCard, borderRadius: "1rem",
                  padding: "1rem 1.25rem",
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}>
                  <span style={{
                    padding: "0.25rem 0.75rem", borderRadius: "9999px",
                    fontSize: "0.75rem", fontWeight: 700,
                    textTransform: "uppercase" as const, letterSpacing: "0.08em",
                    background: typeColor[d.type]?.bg ?? T.surfaceLow,
                    color: typeColor[d.type]?.color ?? T.onMuted,
                    flexShrink: 0,
                  }}>
                    {typeLabel[d.type] ?? d.type}
                  </span>
                  <span style={{
                    fontSize: "0.9375rem", fontWeight: 600,
                    color: T.onSurface, flex: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {d.title}
                  </span>
                  <span style={{ fontSize: "0.8125rem", color: T.outline, flexShrink: 0 }}>
                    {timeAgo(d.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section style={{ textAlign: "center" as const, padding: "1rem 0" }}>
            <div style={{
              width: "3.5rem", height: "3.5rem", borderRadius: "50%",
              background: T.primaryFixed ?? "#d0f0e0",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1rem",
            }}>
              <span className="material-symbols-outlined" style={{ color: T.primary, fontSize: "1.5rem" }}>
                lightbulb
              </span>
            </div>
            <p style={{ fontSize: "1rem", color: T.onMuted, lineHeight: 1.6 }}>
              Tu historial aparecerá aquí.<br />
              Empieza con la decisión que tienes en mente ahora.
            </p>
          </section>
        )}

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
