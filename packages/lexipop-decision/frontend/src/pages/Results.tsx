import type { DecisionResult } from "../types";
import LoaderAnalysis from "../components/LoaderAnalysis";

interface Props {
  result:  DecisionResult | null;
  loading: boolean;
  error:   string | null;
  onNew:   () => void;
}

function MetricCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color, letterSpacing: "0.06em", marginBottom: 6, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'DM Serif Display',serif" }}>
        {value}
      </div>
    </div>
  );
}

function Section({ color, label, children }: { color: string; label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 16, overflow: "hidden", marginBottom: 16,
    }}>
      <div style={{ background: color, padding: "12px 20px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "white", letterSpacing: "0.04em" }}>{label}</span>
      </div>
      <div style={{ padding: "24px 20px" }}>{children}</div>
    </div>
  );
}

function Tag({ children, color = "var(--text-mid)", bg = "var(--bg-muted)" }: { children: string; color?: string; bg?: string }) {
  return (
    <span style={{ background: bg, color, fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20, display: "inline-block", margin: "0 6px 6px 0" }}>
      {children}
    </span>
  );
}

export default function Results({ result, loading, error, onNew }: Props) {
  if (loading) return <div style={{ maxWidth: 640, margin: "80px auto", padding: "0 24px" }}><LoaderAnalysis /></div>;

  if (error) return (
    <div style={{ maxWidth: 640, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
      <p style={{ color: "var(--red)", marginBottom: 20 }}>Error: {error}</p>
      <button onClick={onNew} style={{ padding: "12px 28px", borderRadius: 12, background: "var(--blue)", color: "white", border: "none", cursor: "pointer", fontSize: 15 }}>
        Intentar de nuevo
      </button>
    </div>
  );

  if (!result) return null;

  const { metrics, analysis } = result;

  const fmt = (n: number) =>
    n >= 0
      ? `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`
      : `-$${Math.abs(n).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

  const riskColor = metrics.riskIndex >= 70 ? "#B91C1C" : metrics.riskIndex >= 40 ? "#B45309" : "#0B7A3E";
  const riskBg    = metrics.riskIndex >= 70 ? "#FEF2F2" : metrics.riskIndex >= 40 ? "#FFFBEB" : "#EDFAF3";

  const irrColor  = metrics.irreversibilityIndex >= 70 ? "#B91C1C" : metrics.irreversibilityIndex >= 40 ? "#B45309" : "#0B7A3E";
  const irrBg     = metrics.irreversibilityIndex >= 70 ? "#FEF2F2" : metrics.irreversibilityIndex >= 40 ? "#FFFBEB" : "#EDFAF3";

  const scenarioLabel = { favorable: "✅ Favorable", neutro: "⚠️ Neutro", adverso: "❌ Adverso" }[metrics.baseScenario];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 24px 64px" }} className="fade-up">

      <button onClick={onNew} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "var(--text-mid)", fontSize: 13, marginBottom: 32, display: "flex", alignItems: "center", gap: 6,
      }}>← Nueva decisión
      </button>

      <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, fontWeight: 400, marginBottom: 6 }}>
        Resultados del análisis
      </h2>
      <p style={{ color: "var(--text-mid)", fontSize: 14, marginBottom: 36 }}>
        No te decimos qué hacer. Te mostramos cómo estás pensando.
      </p>

      {/* ── Zona 1: Resultado estructural ── */}
      <Section color="#2356F6" label="🟢  RESULTADO ESTRUCTURAL">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <MetricCard label="Índice de riesgo" value={`${metrics.riskIndex}/100`} color={riskColor} bg={riskBg} />
          <MetricCard label="Irreversibilidad" value={`${metrics.irreversibilityIndex}/100`} color={irrColor} bg={irrBg} />
          <MetricCard label="Valor esperado" value={fmt(metrics.expectedValue)} color="#0B7A3E" bg="#EDFAF3" />
          <MetricCard label="Valor esperado neto" value={fmt(metrics.expectedValueNet)} color="#2356F6" bg="#EEF2FF" />
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ background: "var(--bg-muted)", borderRadius: 10, padding: "12px 16px", flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 600, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Escenario base</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{scenarioLabel}</div>
          </div>
          <div style={{ background: "var(--bg-muted)", borderRadius: 10, padding: "12px 16px", flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 600, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Sensibilidad</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>±{metrics.sensitivityThreshold}% en prob.</div>
          </div>
          <div style={{ background: "var(--bg-muted)", borderRadius: 10, padding: "12px 16px", flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 600, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Peor escenario</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{fmt(metrics.pessimisticValue)}</div>
          </div>
        </div>

        {metrics.warnings.length > 0 && (
          <div style={{ marginTop: 16, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#B45309", marginBottom: 8 }}>⚠️ ADVERTENCIAS AUTOMÁTICAS</div>
            {metrics.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 13, color: "#78350F", marginBottom: 4, paddingLeft: 12, borderLeft: "2px solid #FCD34D" }}>
                {w}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Zona 2: Interpretación pedagógica ── */}
      <Section color="#16A34A" label="🟡  INTERPRETACIÓN PEDAGÓGICA">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-mid)", marginBottom: 10, letterSpacing: "0.04em" }}>ANÁLISIS DE RIESGO</div>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)" }}>{analysis.riskAssessment}</p>
        </div>

        {analysis.structuralCommentary && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-mid)", marginBottom: 10, letterSpacing: "0.04em" }}>CÓMO ESTÁS RAZONANDO</div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)" }}>{analysis.structuralCommentary}</p>
          </div>
        )}

        {analysis.blindSpots.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-mid)", marginBottom: 10, letterSpacing: "0.04em" }}>PUNTOS CIEGOS</div>
            {analysis.blindSpots.map((b, i) => (
              <div key={i} style={{ fontSize: 13, color: "var(--text)", marginBottom: 8, paddingLeft: 14, borderLeft: "3px solid #FCD34D" }}>
                {b}
              </div>
            ))}
          </div>
        )}

        {analysis.biasFlags.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-mid)", marginBottom: 8, letterSpacing: "0.04em" }}>SESGOS DETECTADOS</div>
            <div>{analysis.biasFlags.map((b, i) => <Tag key={i} color="#B45309" bg="#FFFBEB">{b}</Tag>)}</div>
          </div>
        )}
      </Section>

      {/* ── Zona 3: Qué aprendiste ── */}
      <Section color="#7C3AED" label="🔵  QUÉ APRENDISTE HOY">
        {analysis.lessonsLearned.map((lesson, i) => (
          <div key={i} style={{
            display: "flex", gap: 14, marginBottom: 16, alignItems: "flex-start",
          }}>
            <div style={{
              minWidth: 28, height: 28, borderRadius: "50%",
              background: "#EDE9FE", color: "#7C3AED",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
            }}>{i + 1}</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)", margin: 0 }}>{lesson}</p>
          </div>
        ))}
      </Section>

      <button onClick={onNew} style={{
        width: "100%", marginTop: 8,
        background: "var(--blue)", color: "white", border: "none",
        padding: "14px", borderRadius: 12, fontSize: 15, fontWeight: 600,
        cursor: "pointer", transition: "0.2s",
      }}>
        Nueva decisión →
      </button>
    </div>
  );
}