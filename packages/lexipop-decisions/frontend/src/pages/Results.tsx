import type { DecisionResult, DecisionInput } from "../types";
import LoaderAnalysis from "../components/LoaderAnalysis";

interface Props {
  result:  DecisionResult | null;
  loading: boolean;
  error:   string | null;
  onNew:   () => void;
  input?:  DecisionInput;   // ← para mostrar resumen de lo que respondió
}

const T = {
  primary:    "#000666",
  primaryMid: "#2d1b4e",
  surface:    "#fdf8ef",
  surfaceLow: "#f7f0e0",
  surfaceCard:"#fffdf7",
  surfaceHigh:"#e8dfc8",
  teal:       "#e85d4a",
  water:      "#f5c842",
  onSurface:  "#1a1410",
  onMuted:    "#4a3f35",
  outline:    "#7a6e60",
  error:      "#c0392b",
  errorBg:    "#fdecea",
  fontHead:   "'Newsreader', Georgia, serif",
  fontBody:   "'Inter', system-ui, sans-serif",
};

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "N/A";
  return n >= 0
    ? `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`
    : `-$${Math.abs(n).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}

function riskPalette(index: number) {
  if (index >= 70) return { color: T.error,   bg: T.errorBg, label: "Alto" };
  if (index >= 40) return { color: "#92400e", bg: "#fef3c7", label: "Moderado" };
  return              { color: "#1a7a4a", bg: "#d0f0e0", label: "Bajo" };
}

// ── MetricCard ─────────────────────────────────────────────
function MetricCard({ label, value, sub, color, bg }: {
  label: string; value: string; sub?: string; color: string; bg: string;
}) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: "1rem 1.125rem" }}>
      <div style={{
        fontSize: "0.625rem", fontWeight: 700, color,
        letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.4rem",
      }}>{label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color, fontFamily: T.fontHead, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "0.75rem", color, opacity: 0.7, marginTop: "0.25rem" }}>{sub}</div>}
    </div>
  );
}

// ── Zone ───────────────────────────────────────────────────
function Zone({ accent, label, icon, children }: {
  accent: string; label: string; icon: string; children: React.ReactNode;
}) {
  return (
    <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: "1rem" }}>
      <div style={{
        background: accent, padding: "0.875rem 1.25rem",
        display: "flex", alignItems: "center", gap: "0.6rem",
      }}>
        <span style={{ fontSize: "1rem" }}>{icon}</span>
        <span style={{
          fontSize: "0.6875rem", fontWeight: 700, color: "#fffdf7",
          letterSpacing: "0.1em", textTransform: "uppercase" as const,
        }}>{label}</span>
      </div>
      <div style={{ background: T.surfaceCard, padding: "1.5rem 1.25rem" }}>
        {children}
      </div>
    </div>
  );
}

// ── MiniBlock ──────────────────────────────────────────────
function MiniBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: T.surfaceLow, borderRadius: 10, padding: "0.875rem 1rem", flex: 1, minWidth: 110 }}>
      <div style={{
        fontSize: "0.5625rem", fontWeight: 700, color: T.outline,
        letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.35rem",
      }}>{label}</div>
      <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: T.onSurface }}>{value}</div>
    </div>
  );
}

function BiasTag({ children }: { children: string }) {
  return (
    <span style={{
      background: "#fef3c7", color: "#92400e",
      fontSize: "0.75rem", fontWeight: 600,
      padding: "0.25rem 0.75rem", borderRadius: 9999,
      display: "inline-block", margin: "0 0.375rem 0.375rem 0",
    }}>{children}</span>
  );
}

// ── Resumen de inputs ──────────────────────────────────────
function InputSummary({ input }: { input: DecisionInput }) {
  const [open, setOpen] = React.useState(false);

  const items = [
    { label: "Si lo haces",           value: input.altA },
    { label: "Si no lo haces",        value: input.altB },
    { label: "Probabilidad estimada", value: input.probability !== undefined ? `${input.probability}%` : undefined },
    { label: "Peor escenario",        value: input.worstScenario || undefined },
    { label: "Reversibilidad",        value: input.reversibilityScore !== undefined ? `${input.reversibilityScore}/10` : undefined },
    { label: "Qué sacrificas",        value: input.opportunityDesc || undefined },
  ].filter(i => i.value);

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: T.surfaceLow, border: "none", borderRadius: 12,
          padding: "0.875rem 1.25rem", width: "100%",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer", fontFamily: T.fontBody,
        }}
      >
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: T.onMuted }}>
          Lo que respondiste
        </span>
        <span style={{
          color: T.outline, fontSize: "0.8rem",
          transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms",
        }}>▾</span>
      </button>

      {open && (
        <div style={{
          background: T.surfaceCard, borderRadius: "0 0 12px 12px",
          padding: "1rem 1.25rem",
          display: "flex", flexDirection: "column" as const, gap: "0.875rem",
        }}>
          {items.map(({ label, value }) => (
            <div key={label}>
              <div style={{
                fontSize: "0.5625rem", fontWeight: 700, color: T.outline,
                letterSpacing: "0.12em", textTransform: "uppercase" as const,
                marginBottom: "0.25rem",
              }}>{label}</div>
              <div style={{ fontSize: "0.9375rem", color: T.onSurface, lineHeight: 1.5 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────
export default function Results({ result, loading, error, onNew, input }: Props) {

  if (loading) return (
    <div style={{ maxWidth: 640, margin: "5rem auto", padding: "0 1.5rem" }}>
      <LoaderAnalysis />
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 640, margin: "5rem auto", padding: "0 1.5rem", textAlign: "center" as const }}>
      <div style={{ background: T.errorBg, borderRadius: 16, padding: "2rem", marginBottom: "1.5rem" }}>
        <p style={{ color: T.error, fontFamily: T.fontBody, marginBottom: 0, lineHeight: 1.6 }}>{error}</p>
      </div>
      <button onClick={onNew} style={{
        padding: "0.875rem 2rem", borderRadius: 12,
        background: `linear-gradient(160deg, ${T.primary} 0%, ${T.primaryMid} 100%)`,
        color: "#fffdf7", border: "none", cursor: "pointer",
        fontSize: "1rem", fontWeight: 600, fontFamily: T.fontBody,
      }}>
        Intentar de nuevo
      </button>
    </div>
  );

  if (!result) return null;

  const { metrics, analysis } = result;
  const risk = riskPalette(metrics.riskIndex);
  const irr  = riskPalette(metrics.irreversibilityIndex);
  const hasMonetary = metrics.expectedValue !== undefined;

  const scenarioLabel = {
    favorable: "Favorable",
    neutro:    "Neutro",
    adverso:   "Adverso",
  }[metrics.baseScenario] ?? metrics.baseScenario;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "5.5rem 1.5rem 7rem", fontFamily: T.fontBody }}>

      {/* Back */}
      <button onClick={onNew} style={{
        background: "none", border: "none", cursor: "pointer",
        color: T.outline, fontSize: "0.8125rem", marginBottom: "2rem",
        display: "flex", alignItems: "center", gap: "0.4rem",
        fontFamily: T.fontBody, padding: 0,
      }}>
        ← Nueva decisión
      </button>

      {/* Título */}
      <h2 style={{
        fontFamily: T.fontHead, fontStyle: "italic",
        fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
        fontWeight: 600, color: T.primary, marginBottom: "0.5rem",
      }}>
        Resultados del análisis
      </h2>
      <p style={{ color: T.onMuted, fontSize: "1rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
        No te decimos qué hacer. Te mostramos cómo estás pensando.
      </p>

      {/* Resumen de inputs */}
      {input && <InputSummary input={input} />}

      {/* ── ZONA 1: Resultado estructural ── */}
      <Zone accent={T.primary} label="Resultado estructural" icon="◈">

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          <MetricCard
            label="Índice de riesgo"
            value={`${metrics.riskIndex}/100`}
            sub={risk.label}
            color={risk.color} bg={risk.bg}
          />
          <MetricCard
            label="Irreversibilidad"
            value={`${metrics.irreversibilityIndex}/100`}
            sub={irr.label}
            color={irr.color} bg={irr.bg}
          />
          {hasMonetary && (
            <MetricCard
              label="Valor esperado"
              value={fmt(metrics.expectedValue!)}
              color="#1a7a4a" bg="#d0f0e0"
            />
          )}
          {hasMonetary && metrics.expectedValueNet !== undefined && (
            <MetricCard
              label="Valor esperado neto"
              value={fmt(metrics.expectedValueNet)}
              color={T.primaryMid} bg="#d0f0e0"
            />
          )}
        </div>

        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" as const, marginBottom: "1rem" }}>
          <MiniBlock label="Escenario base" value={scenarioLabel} />
          {hasMonetary && metrics.sensitivityThreshold !== undefined && (
            <MiniBlock label="Sensibilidad" value={`±${metrics.sensitivityThreshold}% prob.`} />
          )}
          {hasMonetary && metrics.pessimisticValue !== undefined && (
            <MiniBlock label="Peor escenario" value={fmt(metrics.pessimisticValue)} />
          )}
        </div>

        {metrics.warnings.length > 0 && (
          <div style={{ background: "#fef3c7", borderRadius: 12, padding: "1rem 1.125rem" }}>
            <div style={{
              fontSize: "0.625rem", fontWeight: 700, color: "#92400e",
              letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.625rem",
            }}>
              Advertencias automáticas
            </div>
            {metrics.warnings.map((w, i) => (
              <div key={i} style={{
                fontSize: "0.875rem", color: "#78350f",
                marginBottom: "0.4rem", paddingLeft: "0.875rem",
                borderLeft: "3px solid #fcd34d", lineHeight: 1.55,
              }}>{w}</div>
            ))}
          </div>
        )}
      </Zone>

      {/* ── ZONA 2: Interpretación pedagógica ── */}
      <Zone accent="#1a7a4a" label="Interpretación pedagógica" icon="◇">
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{
            fontSize: "0.625rem", fontWeight: 700, color: T.outline,
            letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.625rem",
          }}>Análisis de riesgo</div>
          <p style={{ fontSize: "0.9375rem", lineHeight: 1.75, color: T.onSurface, margin: 0 }}>
            {analysis.riskAssessment}
          </p>
        </div>

        {analysis.structuralCommentary && (
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{
              fontSize: "0.625rem", fontWeight: 700, color: T.outline,
              letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.625rem",
            }}>Cómo estás razonando</div>
            <p style={{ fontSize: "0.9375rem", lineHeight: 1.75, color: T.onSurface, margin: 0 }}>
              {analysis.structuralCommentary}
            </p>
          </div>
        )}

        {analysis.blindSpots.length > 0 && (
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{
              fontSize: "0.625rem", fontWeight: 700, color: T.outline,
              letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.625rem",
            }}>Puntos ciegos</div>
            {analysis.blindSpots.map((b, i) => (
              <div key={i} style={{
                fontSize: "0.9rem", color: T.onSurface, marginBottom: "0.5rem",
                paddingLeft: "0.875rem", borderLeft: `3px solid ${T.teal}`, lineHeight: 1.6,
              }}>{b}</div>
            ))}
          </div>
        )}

        {analysis.biasFlags.length > 0 && (
          <div>
            <div style={{
              fontSize: "0.625rem", fontWeight: 700, color: T.outline,
              letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.625rem",
            }}>Sesgos detectados</div>
            <div>{analysis.biasFlags.map((b, i) => <BiasTag key={i}>{b}</BiasTag>)}</div>
          </div>
        )}
      </Zone>

      {/* ── ZONA 3: Qué aprendiste ── */}
      <Zone accent="#1a7a4a" label="Qué aprendiste hoy" icon="◉">
        {analysis.lessonsLearned.map((lesson, i) => (
          <div key={i} style={{
            display: "flex", gap: "1rem", marginBottom: "1.125rem", alignItems: "flex-start",
          }}>
            <div style={{
              minWidth: "1.75rem", height: "1.75rem", borderRadius: "50%",
              background: "#d0f0e0", color: T.primaryMid,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
            }}>{i + 1}</div>
            <p style={{ fontSize: "0.9375rem", lineHeight: 1.7, color: T.onSurface, margin: 0 }}>
              {lesson}
            </p>
          </div>
        ))}
      </Zone>

      <button onClick={onNew} style={{
        width: "100%", marginTop: "0.5rem",
        background: `linear-gradient(160deg, ${T.primary} 0%, ${T.primaryMid} 100%)`,
        color: "#fffdf7", border: "none", padding: "1.1rem", borderRadius: 12,
        fontSize: "1rem", fontWeight: 600, fontFamily: T.fontBody,
        cursor: "pointer", transition: "all 200ms",
        boxShadow: "0 8px 24px rgba(0,6,102,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>add_circle</span>
        Nueva decisión
      </button>
    </div>
  );
}
