import React from "react";
import type { DecisionResult, DecisionInput } from "../types";
import LoaderAnalysis from "../components/LoaderAnalysis";

interface Props {
  result:  DecisionResult | null;
  loading: boolean;
  error:   string | null;
  onNew:   () => void;
  input?:  DecisionInput;
}

const T = {
  primary:     "#0035c5",
  primaryMid:  "#0047ff",
  primaryFixed:"#dde1ff",
  surface:     "#f8f9fa",
  surfaceLow:  "#f3f4f5",
  surfaceCard: "#ffffff",
  surfaceHigh: "#e7e8e9",
  onSurface:   "#191c1d",
  onMuted:     "#434657",
  outline:     "#747688",
  error:       "#ba1a1a",
  errorBg:     "#ffdad6",
  fontHead:    "'Hanken Grotesk', system-ui, sans-serif",
  fontBody:    "'Inter', system-ui, sans-serif",
};

function riskPalette(index: number) {
  if (index >= 70) return { color: T.error,   bg: T.errorBg };
  if (index >= 40) return { color: "#92400e", bg: "#fef3c7" };
  return              { color: "#1a7a4a",  bg: "#d0f0e0" };
}

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "N/A";
  return n >= 0
    ? `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`
    : `-$${Math.abs(n).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}

function riskHuman(index: number) {
  if (index >= 70) return "Estás apostando más de lo que percibes";
  if (index >= 40) return "Riesgo manejable, pero real";
  return "Riesgo bajo, confía en tu análisis";
}

function irrHuman(index: number) {
  if (index >= 70) return "Difícil dar marcha atrás";
  if (index >= 40) return "Podrías revertirlo, pero con costo";
  return "Puedes corregir el rumbo fácilmente";
}

function getMetricExplanation(label: string, value: string): { title: string; concept: string; context: string } | null {
  const explanations: Record<string, { title: string; concept: string; contextFn: (v: string) => string }> = {
    "Indice de riesgo": {
      title: "Índice de riesgo",
      concept: "Combina dos cosas: qué tan probable es que falle (70% del peso) y qué tan grave sería el peor escenario (30% del peso). Va de 0 (sin riesgo) a 100 (riesgo extremo).",
      contextFn: (v) => {
        const n = parseInt(v);
        if (n >= 70) return `Obtuviste ${v}. Estás en zona de riesgo alto. La combinación de probabilidad de fallo y severidad del peor escenario es significativa. Asegúrate de poder absorber el peor caso antes de decidir.`;
        if (n >= 40) return `Obtuviste ${v}. Estás en zona moderada. El riesgo existe y es real, pero no es irrazonable tomar la decisión si el upside lo justifica. Pon atención al peor escenario.`;
        return `Obtuviste ${v}. Zona de riesgo bajo. La combinación de tu probabilidad estimada y la severidad del peor caso es manejable. Esto no significa que no pueda fallar, sino que el riesgo estructural es limitado.`;
      },
    },
    "Irreversibilidad": {
      title: "Irreversibilidad",
      concept: "Mide qué tan difícil sería dar marcha atrás si las cosas salen mal. 0 = puedes revertir sin costo. 100 = decisión de una sola vía, sin regreso.",
      contextFn: (v) => {
        const n = parseInt(v);
        if (n >= 70) return `Obtuviste ${v}. Esta decisión es difícil de revertir. Una vez que la tomes, el camino de regreso es costoso o imposible. Merece más deliberación.`;
        if (n >= 40) return `Obtuviste ${v}. Podrías dar marcha atrás, pero con costo. No estás atrapado, pero si algo sale mal, las opciones no serán gratuitas.`;
        return `Obtuviste ${v}. Esta decisión es bastante reversible. Si no funciona, puedes corregir el rumbo sin daño mayor.`;
      },
    },
    "Valor esperado": {
      title: "Valor esperado",
      concept: "El resultado promedio si pudieras tomar esta decisión infinitas veces. Se calcula como: (probabilidad de éxito x ganancia) + (probabilidad de fallo x pérdida).",
      contextFn: (v) => {
        const isPositive = !v.startsWith("-");
        if (isPositive) return `Obtuviste ${v}. El valor esperado es positivo: matemáticamente la decisión tiene sentido. Pero este número asume que puedes tomarla muchas veces. Tú la tomas una sola vez. El promedio no te protege del peor caso.`;
        return `Obtuviste ${v}. El valor esperado es negativo. Lo que podrías perder supera lo que podrías ganar. Necesitas una razón muy sólida más allá de los números.`;
      },
    },
    "Valor esperado neto": {
      title: "Valor esperado neto",
      concept: "Es el valor esperado después de restarle el costo de oportunidad: lo que dejas de ganar con otras opciones al elegir esta.",
      contextFn: (v) => {
        const isPositive = !v.startsWith("-");
        if (isPositive) return `Obtuviste ${v}. Incluso contando lo que sacrificas al elegir esta opción, el resultado esperado sigue siendo positivo.`;
        return `Obtuviste ${v}. Una vez que descontamos lo que dejas ir, el resultado esperado se vuelve negativo. Lo que sacrificas podría valer más que lo que esperas ganar.`;
      },
    },
    "Escenario base": {
      title: "Escenario base",
      concept: "Resume la situación general según tu probabilidad estimada. Favorable = más del 60%. Neutro = entre 40% y 60%. Adverso = menos del 40%.",
      contextFn: (v) => {
        if (v === "Favorable") return `Tu escenario es Favorable. Le das más del 60% de probabilidad de éxito. Posición sólida, pero no olvides calibrar esa estimación: es tuya, no de los datos.`;
        if (v === "Neutro") return `Tu escenario es Neutro. Probabilidad entre 40% y 60%. Territorio de incertidumbre real. Los factores cualitativos y tu capacidad de absorber el fallo pesan más aquí.`;
        return `Tu escenario es Adverso. Menos del 40% de probabilidad de éxito. Para que tenga sentido, el upside tiene que ser excepcional o el costo de no intentarlo muy alto.`;
      },
    },
    "Sensibilidad": {
      title: "Umbral de sensibilidad",
      concept: "Cuántos puntos porcentuales puede estar equivocada tu estimación de probabilidad antes de que el resultado cambie de positivo a negativo o viceversa.",
      contextFn: (v) => {
        const n = parseInt(v.replace("+-", "").replace("%", "").replace(" prob.", "").trim());
        if (n >= 25) return `Obtuviste ${v}. Margen amplio. Aunque tu estimación esté bastante equivocada, la decisión seguiría teniendo sentido matemáticamente.`;
        if (n >= 10) return `Obtuviste ${v}. Margen moderado. Si tu probabilidad real difiere en más de esos puntos, el resultado cambia. ¿Qué tan calibrada está tu estimación?`;
        return `Obtuviste ${v}. Margen pequeño. La decisión es muy sensible a tu estimación de probabilidad. Un error pequeño cambia completamente el resultado.`;
      },
    },
    "Peor escenario": {
      title: "Valor del peor escenario",
      concept: "Lo que sale de tu bolsillo si las cosas salen exactamente como describiste en el peor caso. No es el más probable, pero es el que debes poder absorber.",
      contextFn: (v) => {
        return `En tu peor escenario saldrán ${v} de tu bolsillo. La pregunta clave no es si esto es probable, sino si puedes sobrevivir esto si pasa. Si la respuesta es no, la decisión merece mucho más cuidado sin importar el valor esperado.`;
      },
    },
  };

  const exp = explanations[label];
  if (!exp) return null;
  return { title: exp.title, concept: exp.concept, context: exp.contextFn(value) };
}

const BIAS_EXPLANATIONS: Record<string, { title: string; body: string }> = {
  "Optimismo excesivo": {
    title: "Optimismo excesivo",
    body: "Tendemos a sobrestimar la probabilidad de que las cosas salgan bien y subestimar los obstáculos. No es malo ser optimista, pero la calibración importa: de cada 10 veces que has tomado decisiones similares, ¿cuántas han salido como esperabas?",
  },
  "Exceso de confianza": {
    title: "Exceso de confianza",
    body: "Sobreestimamos nuestra capacidad de predecir, controlar o ejecutar. La mayoría de la gente cree estar por encima del promedio en sus áreas de decisión. No todos pueden tener razón.",
  },
  "Efecto anclaje": {
    title: "Efecto de anclaje",
    body: "El primer número o referencia que encontramos se convierte en el punto de partida de nuestro razonamiento, aunque sea arbitrario.",
  },
  "Sesgo de confirmacion": {
    title: "Sesgo de confirmación",
    body: "Buscamos, recordamos e interpretamos la información de manera que confirme lo que ya creemos. El antídoto es buscar activamente evidencia en contra de tu decisión preferida.",
  },
  "Analisis binario": {
    title: "Análisis binario",
    body: "Ver la decisión como solo dos opciones cuando hay un espectro. Podría hacerse a medias, probarse en pequeño, postergarse, o estructurarse diferente. El pensamiento binario cierra opciones que podrían ser mejores.",
  },
  "Aversion a la perdida": {
    title: "Aversión a la pérdida",
    body: "Las pérdidas duelen aproximadamente el doble que lo que placen las ganancias equivalentes. Evitamos perder 100 más de lo que buscamos ganar 100, aunque matemáticamente sean lo mismo.",
  },
  "Falacia del costo hundido": {
    title: "Falacia del costo hundido",
    body: "Seguimos invirtiendo en algo porque ya invertimos mucho, aunque la evidencia diga que no funcionará. Lo que ya gastaste no debería influir en decisiones futuras.",
  },
};

function Modal({ title, concept, context, onClose }: {
  title: string; concept: string; context?: string; onClose: () => void;
}) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1.5rem",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.surfaceCard, borderRadius: 16,
        padding: "2rem", maxWidth: 480, width: "100%",
        border: "1px solid rgba(0,0,0,0.08)",
        fontFamily: T.fontBody, maxHeight: "80vh", overflowY: "auto" as const,
      }}>
        <div style={{
          fontSize: "0.625rem", fontWeight: 700, color: T.outline,
          letterSpacing: "0.15em", textTransform: "uppercase" as const, marginBottom: "0.5rem",
          fontFamily: "'Geist', system-ui, sans-serif",
        }}>Qué significa esto</div>
        <h3 style={{
          fontFamily: T.fontHead,
          fontSize: "1.375rem", color: T.primary,
          marginBottom: "1rem", fontWeight: 700,
        }}>{title}</h3>
        <p style={{ fontSize: "0.9375rem", lineHeight: 1.75, color: T.onSurface, margin: "0 0 1rem" }}>{concept}</p>
        {context && (
          <>
            <div style={{
              fontSize: "0.625rem", fontWeight: 700, color: T.outline,
              letterSpacing: "0.15em", textTransform: "uppercase" as const,
              marginBottom: "0.5rem", marginTop: "1.25rem",
              borderTop: `1px solid ${T.surfaceHigh}`, paddingTop: "1rem",
              fontFamily: "'Geist', system-ui, sans-serif",
            }}>En tu caso</div>
            <p style={{
              fontSize: "0.9375rem", lineHeight: 1.75, color: T.onSurface, margin: 0,
              background: T.surfaceLow, borderRadius: 8, padding: "0.875rem 1rem",
            }}>{context}</p>
          </>
        )}
        <button onClick={onClose} style={{
          marginTop: "1.5rem", width: "100%",
          background: T.primary, color: "#ffffff",
          border: "none", borderRadius: 8, padding: "0.875rem",
          fontSize: "0.9375rem", fontWeight: 600,
          fontFamily: T.fontBody, cursor: "pointer",
        }}>Entendido</button>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color, bg }: {
  label: string; value: string; sub?: string; color: string; bg: string;
}) {
  const [hovered, setHovered] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const exp = getMetricExplanation(label, value);

  return (
    <>
      {modalOpen && exp && <Modal title={exp.title} concept={exp.concept} context={exp.context} onClose={() => setModalOpen(false)} />}
      <div
        onClick={() => exp && setModalOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: bg, borderRadius: 12, padding: "1rem 1.125rem",
          cursor: exp ? "pointer" : "default",
          transform: hovered && exp ? "translateY(-2px)" : "none",
          border: "1px solid rgba(0,0,0,0.06)",
          transition: "all 200ms ease",
        }}
      >
        <div style={{
          fontSize: "0.625rem", fontWeight: 700, color,
          letterSpacing: "0.12em", textTransform: "uppercase" as const,
          marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem",
          fontFamily: "'Geist', system-ui, sans-serif",
        }}>
          {label}
          {exp && <span style={{
            fontSize: "0.6rem", opacity: hovered ? 1 : 0.5, transition: "opacity 200ms",
            background: color, color: bg, borderRadius: "50%",
            width: "1rem", height: "1rem",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, flexShrink: 0,
          }}>?</span>}
        </div>
        <div style={{
          fontSize: "1.5rem", fontWeight: 700, color, fontFamily: T.fontHead, lineHeight: 1,
          transition: "transform 200ms", transform: hovered ? "scale(1.04)" : "scale(1)",
          display: "inline-block",
        }}>{value}</div>
        {sub && <div style={{ fontSize: "0.75rem", color, opacity: 0.7, marginTop: "0.25rem" }}>{sub}</div>}
      </div>
    </>
  );
}

function MiniBlock({ label, value }: { label: string; value: string }) {
  const [hovered, setHovered] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const exp = getMetricExplanation(label, value);

  return (
    <>
      {modalOpen && exp && <Modal title={exp.title} concept={exp.concept} context={exp.context} onClose={() => setModalOpen(false)} />}
      <div
        onClick={() => exp && setModalOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: T.surfaceLow, borderRadius: 8, padding: "0.875rem 1rem", flex: 1, minWidth: 110,
          cursor: exp ? "pointer" : "default",
          transform: hovered && exp ? "translateY(-2px)" : "none",
          border: "1px solid rgba(0,0,0,0.06)",
          transition: "all 200ms ease",
        }}
      >
        <div style={{
          fontSize: "0.5625rem", fontWeight: 700, color: T.outline,
          letterSpacing: "0.1em", textTransform: "uppercase" as const,
          marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.3rem",
          fontFamily: "'Geist', system-ui, sans-serif",
        }}>
          {label}
          {exp && <span style={{
            fontSize: "0.55rem", opacity: hovered ? 1 : 0.4, transition: "opacity 200ms",
            background: T.outline, color: T.surfaceLow, borderRadius: "50%",
            width: "0.875rem", height: "0.875rem",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, flexShrink: 0,
          }}>?</span>}
        </div>
        <div style={{
          fontSize: "0.9375rem", fontWeight: 600, color: T.onSurface,
          transition: "transform 200ms", transform: hovered ? "scale(1.02)" : "scale(1)",
          display: "inline-block",
        }}>{value}</div>
      </div>
    </>
  );
}

function BiasTag({ children }: { children: string }) {
  const [hovered, setHovered] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const exp = BIAS_EXPLANATIONS[children] ?? {
    title: children,
    body: "Este sesgo cognitivo afecta la forma en que procesas la información al tomar esta decisión. Los sesgos no son errores de inteligencia — son atajos mentales que el cerebro usa para decidir rápido. Identificarlos es el primer paso para compensarlos.",
  };

  return (
    <>
      {modalOpen && <Modal title={exp.title} concept={exp.body} onClose={() => setModalOpen(false)} />}
      <span
        onClick={() => setModalOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "#92400e" : "#fef3c7",
          color: hovered ? "#ffffff" : "#92400e",
          fontSize: "0.75rem", fontWeight: 600,
          padding: "0.25rem 0.75rem", borderRadius: 9999,
          display: "inline-block", margin: "0 0.375rem 0.375rem 0",
          cursor: "pointer", transition: "all 180ms ease",
          transform: hovered ? "translateY(-1px)" : "none",
          fontFamily: "'Geist', system-ui, sans-serif",
        }}
      >
        {children} ?
      </span>
    </>
  );
}

function Zone({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      marginBottom: "1rem", border: "1px solid rgba(0,0,0,0.07)",
    }}>
      <div style={{
        background: T.primary, padding: "0.875rem 1.25rem",
      }}>
        <span style={{
          fontSize: "0.625rem", fontWeight: 700, color: "#ffffff",
          letterSpacing: "0.12em", textTransform: "uppercase" as const,
          fontFamily: "'Geist', system-ui, sans-serif",
        }}>{label}</span>
      </div>
      <div style={{ background: T.surfaceCard, padding: "1.5rem 1.25rem" }}>{children}</div>
    </div>
  );
}

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
      <button onClick={() => setOpen(o => !o)} style={{
        background: T.surfaceLow, border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10,
        padding: "0.875rem 1.25rem", width: "100%",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        cursor: "pointer", fontFamily: T.fontBody,
      }}>
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: T.onMuted }}>Lo que respondiste</span>
        <span style={{ color: T.outline, fontSize: "0.8rem", transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>v</span>
      </button>
      {open && (
        <div style={{
          background: T.surfaceCard, borderRadius: "0 0 10px 10px",
          border: "1px solid rgba(0,0,0,0.07)", borderTop: "none",
          padding: "1rem 1.25rem", display: "flex", flexDirection: "column" as const, gap: "0.875rem",
        }}>
          {items.map(({ label, value }) => (
            <div key={label}>
              <div style={{
                fontSize: "0.5625rem", fontWeight: 700, color: T.outline,
                letterSpacing: "0.12em", textTransform: "uppercase" as const,
                marginBottom: "0.25rem", fontFamily: "'Geist', system-ui, sans-serif",
              }}>{label}</div>
              <div style={{ fontSize: "0.9375rem", color: T.onSurface, lineHeight: 1.5 }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Results({ result, loading, error, onNew, input }: Props) {
  if (loading) return (
    <div style={{ maxWidth: 640, margin: "5rem auto", padding: "0 1.5rem" }}>
      <LoaderAnalysis />
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 640, margin: "5rem auto", padding: "0 1.5rem", textAlign: "center" as const }}>
      <div style={{ background: T.errorBg, borderRadius: 12, padding: "2rem", marginBottom: "1.5rem", border: "1px solid rgba(186,26,26,0.15)" }}>
        <p style={{ color: T.error, fontFamily: T.fontBody, marginBottom: 0, lineHeight: 1.6 }}>{error}</p>
      </div>
      <button onClick={onNew} style={{
        padding: "0.875rem 2rem", borderRadius: 8,
        background: T.primary, color: "#ffffff",
        border: "none", cursor: "pointer",
        fontSize: "1rem", fontWeight: 600, fontFamily: T.fontBody,
      }}>Intentar de nuevo</button>
    </div>
  );

  if (!result) return null;

  const { metrics, analysis } = result;
  const risk = riskPalette(metrics.riskIndex);
  const irr  = riskPalette(metrics.irreversibilityIndex);
  const hasMonetary = metrics.expectedValue !== undefined && metrics.expectedValue !== null && metrics.expectedValue !== 0;

  const scenarioLabel = ({
    favorable: "Favorable",
    neutro:    "Neutro",
    adverso:   "Adverso",
  } as Record<string, string>)[metrics.baseScenario] ?? metrics.baseScenario;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "5.5rem 1.5rem 7rem", fontFamily: T.fontBody }}>

      <button onClick={onNew} style={{
        background: "none", border: "none", cursor: "pointer",
        color: T.outline, fontSize: "0.8125rem", marginBottom: "1.5rem",
        display: "flex", alignItems: "center", gap: "0.4rem",
        fontFamily: T.fontBody, padding: 0,
      }}>&larr; Nueva decisión</button>

      {/* Imagen prisma */}
      <div style={{ marginBottom: "2rem", borderRadius: "1rem", overflow: "hidden" }}>
        <img
          src="/img-prisma.png"
          alt=""
          style={{
            width: "100%",
            aspectRatio: "16 / 7",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
      </div>

      <h2 style={{
        fontFamily: T.fontHead,
        fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
        fontWeight: 700, color: T.onSurface, marginBottom: "0.5rem",
      }}>Resultados del análisis</h2>
      <p style={{ color: T.onMuted, fontSize: "1rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
        No te decimos qué hacer. Te mostramos cómo estás pensando.
      </p>

      {input && <InputSummary input={input} />}

      <Zone label="Cómo estás pensando">
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{
            fontSize: "0.625rem", fontWeight: 700, color: T.outline,
            letterSpacing: "0.12em", textTransform: "uppercase" as const,
            marginBottom: "0.625rem", fontFamily: "'Geist', system-ui, sans-serif",
          }}>Análisis de riesgo</div>
          <p style={{ fontSize: "0.9375rem", lineHeight: 1.75, color: T.onSurface, margin: 0 }}>{analysis.riskAssessment}</p>
        </div>
        {analysis.structuralCommentary && (
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{
              fontSize: "0.625rem", fontWeight: 700, color: T.outline,
              letterSpacing: "0.12em", textTransform: "uppercase" as const,
              marginBottom: "0.625rem", fontFamily: "'Geist', system-ui, sans-serif",
            }}>Tu forma de razonar</div>
            <p style={{ fontSize: "0.9375rem", lineHeight: 1.75, color: T.onSurface, margin: 0 }}>{analysis.structuralCommentary}</p>
          </div>
        )}
        {analysis.blindSpots.length > 0 && (
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{
              fontSize: "0.625rem", fontWeight: 700, color: T.outline,
              letterSpacing: "0.12em", textTransform: "uppercase" as const,
              marginBottom: "0.625rem", fontFamily: "'Geist', system-ui, sans-serif",
            }}>Puntos ciegos</div>
            {analysis.blindSpots.map((b, i) => (
              <div key={i} style={{
                fontSize: "0.9rem", color: T.onSurface, marginBottom: "0.5rem",
                paddingLeft: "0.875rem", borderLeft: `3px solid ${T.primary}`,
                lineHeight: 1.6,
              }}>{b}</div>
            ))}
          </div>
        )}
        {analysis.biasFlags.length > 0 && (
          <div>
            <div style={{
              fontSize: "0.625rem", fontWeight: 700, color: T.outline,
              letterSpacing: "0.12em", textTransform: "uppercase" as const,
              marginBottom: "0.625rem", fontFamily: "'Geist', system-ui, sans-serif",
            }}>Sesgos detectados</div>
            <p style={{ fontSize: "0.6875rem", color: T.outline, fontStyle: "italic", margin: "0 0 0.625rem" }}>
              Toca cada sesgo para entender qué significa
            </p>
            <div>{analysis.biasFlags.map((b, i) => <BiasTag key={i}>{b}</BiasTag>)}</div>
          </div>
        )}
      </Zone>

      <Zone label="Qué aprendiste hoy">
        {analysis.lessonsLearned.map((lesson, i) => (
          <div key={i} style={{ display: "flex", gap: "1rem", marginBottom: "1.125rem", alignItems: "flex-start" }}>
            <div style={{
              minWidth: "1.75rem", height: "1.75rem", borderRadius: "50%",
              background: T.primaryFixed, color: T.primary,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
              fontFamily: "'Geist', system-ui, sans-serif",
            }}>{i + 1}</div>
            <p style={{ fontSize: "0.9375rem", lineHeight: 1.7, color: T.onSurface, margin: 0 }}>{lesson}</p>
          </div>
        ))}
      </Zone>

      <Zone label="Los números detrás">
        <p style={{ fontSize: "0.75rem", color: T.outline, fontStyle: "italic", marginBottom: "1rem", marginTop: 0 }}>
          Toca cualquier número para entender qué significa y qué dice de tu caso específico
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          <MetricCard label="Indice de riesgo" value={`${metrics.riskIndex}/100`} sub={riskHuman(metrics.riskIndex)} color={risk.color} bg={risk.bg} />
          <MetricCard label="Irreversibilidad" value={`${metrics.irreversibilityIndex}/100`} sub={irrHuman(metrics.irreversibilityIndex)} color={irr.color} bg={irr.bg} />
          {hasMonetary && <MetricCard label="Valor esperado" value={fmt(metrics.expectedValue)} color="#1a7a4a" bg="#d0f0e0" />}
          {hasMonetary && metrics.expectedValueNet !== undefined && metrics.expectedValueNet !== null && (
            <MetricCard label="Valor esperado neto" value={fmt(metrics.expectedValueNet)} color="#1a7a4a" bg="#d0f0e0" />
          )}
        </div>
        {hasMonetary && (
          <p style={{
            fontSize: "0.8125rem", color: T.onMuted, lineHeight: 1.65,
            margin: "0 0 1rem", fontStyle: "italic",
            borderLeft: `3px solid ${T.primary}`, paddingLeft: "0.875rem",
          }}>
            En promedio vale la pena — pero ese promedio asume que podrías tomar esta decisión muchas veces. Tú solo la tomas una vez.
          </p>
        )}
        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" as const, marginBottom: "1rem" }}>
          <MiniBlock label="Escenario base" value={scenarioLabel} />
          {hasMonetary && metrics.sensitivityThreshold !== undefined && metrics.sensitivityThreshold !== null && (
            <MiniBlock label="Sensibilidad" value={`+-${metrics.sensitivityThreshold}% prob.`} />
          )}
          {hasMonetary && metrics.pessimisticValue !== undefined && metrics.pessimisticValue !== null && (
            <MiniBlock label="Peor escenario" value={fmt(metrics.pessimisticValue)} />
          )}
        </div>
        {metrics.warnings.length > 0 && (
          <div style={{ background: "#fef3c7", borderRadius: 10, padding: "1rem 1.125rem", border: "1px solid #fcd34d" }}>
            <div style={{
              fontSize: "0.625rem", fontWeight: 700, color: "#92400e",
              letterSpacing: "0.1em", textTransform: "uppercase" as const,
              marginBottom: "0.625rem", fontFamily: "'Geist', system-ui, sans-serif",
            }}>Advertencias</div>
            {metrics.warnings.map((w, i) => (
              <div key={i} style={{
                fontSize: "0.875rem", color: "#78350f", marginBottom: "0.4rem",
                paddingLeft: "0.875rem", borderLeft: "3px solid #fcd34d", lineHeight: 1.55,
              }}>{w}</div>
            ))}
          </div>
        )}
      </Zone>

      <button onClick={onNew} style={{
        width: "100%", marginTop: "0.5rem",
        background: T.primary, color: "#ffffff",
        border: "none", padding: "1.1rem", borderRadius: 8,
        fontSize: "1rem", fontWeight: 600, fontFamily: T.fontBody,
        cursor: "pointer", transition: "all 200ms",
        boxShadow: "0 4px 20px rgba(0,53,197,0.25)",
      }}>Nueva decisión</button>

    </div>
  );
}