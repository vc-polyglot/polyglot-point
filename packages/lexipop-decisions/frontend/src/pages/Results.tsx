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
  primary:    "#000666",
  primaryMid: "#2d1b4e",
  surface:    "#fdf8ef",
  surfaceLow: "#f7f0e0",
  surfaceCard:"#fffdf7",
  surfaceHigh:"#e8dfc8",
  teal:       "#e85d4a",
  onSurface:  "#1a1410",
  onMuted:    "#4a3f35",
  outline:    "#7a6e60",
  error:      "#c0392b",
  errorBg:    "#fdecea",
  fontHead:   "'Newsreader', Georgia, serif",
  fontBody:   "'Inter', system-ui, sans-serif",
};

// ── Explicaciones de metricas ──────────────────────────────
function getMetricExplanation(label: string, value: string): { title: string; concept: string; context: string } | null {
  const explanations: Record<string, { title: string; concept: string; contextFn: (v: string) => string }> = {
    "Indice de riesgo": {
      title: "Indice de riesgo",
      concept: "Combina dos cosas: que tan probable es que falle (70% del peso) y que tan grave seria el peor escenario (30% del peso). Va de 0 (sin riesgo) a 100 (riesgo extremo).",
      contextFn: (v) => {
        const n = parseInt(v);
        if (n >= 70) return `Obtuviste ${v}. Estas en zona de riesgo alto. Esto significa que la combinacion de probabilidad de fallo y severidad del peor escenario es significativa. Antes de decidir, asegurate de poder absorber el peor caso.`;
        if (n >= 40) return `Obtuviste ${v}. Estas en zona moderada. El riesgo existe y es real, pero no es irrazonable tomar la decision si el upside lo justifica. Pon atencion al peor escenario.`;
        return `Obtuviste ${v}. Zona de riesgo bajo. La combinacion de tu probabilidad estimada y la severidad del peor caso es manejable. Esto no significa que no pueda fallar, sino que el riesgo estructural es limitado.`;
      },
    },
    "Irreversibilidad": {
      title: "Irreversibilidad",
      concept: "Mide que tan dificil seria dar marcha atras si las cosas salen mal. 0 = puedes revertir sin costo. 100 = decision de una sola via, sin regreso. Jeff Bezos llamaba a esto puertas de una via.",
      contextFn: (v) => {
        const n = parseInt(v);
        if (n >= 70) return `Obtuviste ${v}. Esta decision es dificil de revertir. Una vez que la tomes, el camino de regreso es costoso o imposible. Eso no significa que no debas tomarla, pero si que merece mas deliberacion.`;
        if (n >= 40) return `Obtuviste ${v}. Podrias dar marcha atras, pero con costo. No es una decision completamente libre, pero tampoco estas atrapado. Si algo sale mal, habra opciones aunque no sean gratuitas.`;
        return `Obtuviste ${v}. Esta decision es bastante reversible. Si no funciona como esperabas, puedes corregir el rumbo sin dano mayor. Eso reduce la presion de acertar a la primera.`;
      },
    },
    "Valor esperado": {
      title: "Valor esperado",
      concept: "El resultado promedio si pudieras tomar esta decision infinitas veces. Se calcula como: (probabilidad de exito x ganancia) + (probabilidad de fallo x perdida).",
      contextFn: (v) => {
        const isPositive = !v.startsWith("-");
        if (isPositive) return `Obtuviste ${v}. El valor esperado es positivo, lo que significa que matematicamente la decision tiene sentido. Pero recuerda: este numero asume que puedes tomar esta decision muchas veces. Tu la tomas una sola vez. El promedio no te protege del peor caso.`;
        return `Obtuviste ${v}. El valor esperado es negativo. Matematicamente, lo que podrias perder supera lo que podrias ganar ponderado por probabilidades. Eso no significa que no debas hacerlo, pero si que necesitas una razon muy solida mas alla de los numeros.`;
      },
    },
    "Valor esperado neto": {
      title: "Valor esperado neto",
      concept: "Es el valor esperado despues de restarle el costo de oportunidad: lo que dejas de ganar con otras opciones al elegir esta.",
      contextFn: (v) => {
        const isPositive = !v.startsWith("-");
        if (isPositive) return `Obtuviste ${v}. Incluso contando lo que sacrificas al elegir esta opcion, el resultado esperado sigue siendo positivo. La decision resiste el escrutinio del costo de oportunidad.`;
        return `Obtuviste ${v}. Una vez que descontamos lo que dejas ir al elegir esta opcion, el resultado esperado se vuelve negativo. Lo que sacrificas podria valer mas que lo que esperas ganar.`;
      },
    },
    "Escenario base": {
      title: "Escenario base",
      concept: "Resume la situacion general segun tu probabilidad estimada. Favorable = mas del 60% de chances. Neutro = entre 40% y 60%. Adverso = menos del 40%.",
      contextFn: (v) => {
        if (v === "Favorable") return `Tu escenario es Favorable. Le das mas del 60% de probabilidad de exito. Eso es una posicion solida, pero no olvides calibrar esa estimacion: es tuya, no de los datos.`;
        if (v === "Neutro") return `Tu escenario es Neutro. La probabilidad de exito que estimas esta entre 40% y 60%. Es territorio de incertidumbre real. Los factores cualitativos y tu capacidad de absorber el fallo pesan mas aqui.`;
        return `Tu escenario es Adverso. Le das menos del 40% de probabilidad de exito. Para que esta decision tenga sentido, el upside tiene que ser excepcional o el costo de no intentarlo tiene que ser muy alto.`;
      },
    },
    "Sensibilidad": {
      title: "Umbral de sensibilidad",
      concept: "Cuantos puntos porcentuales puede estar equivocada tu estimacion de probabilidad antes de que el resultado cambie de signo (de positivo a negativo o viceversa).",
      contextFn: (v) => {
        const n = parseInt(v.replace("+-", "").replace("%", "").replace(" prob.", "").trim());
        if (n >= 25) return `Obtuviste ${v}. Tienes un margen amplio de error. Aunque tu estimacion de probabilidad este bastante equivocada, la decision seguiria teniendo sentido matematicamente. Eso da mas confianza.`;
        if (n >= 10) return `Obtuviste ${v}. El margen es moderado. Si tu probabilidad real difiere en mas de esos puntos de lo que estimaste, el resultado cambia. Vale la pena preguntarte: que tan calibrada esta tu estimacion?`;
        return `Obtuviste ${v}. El margen es pequeno. La decision es muy sensible a que tan precisa sea tu estimacion de probabilidad. Un pequeño error en esa estimacion cambia completamente el resultado.`;
      },
    },
    "Peor escenario": {
      title: "Valor del peor escenario",
      concept: "El valor monetario si las cosas salen exactamente como describiste en el peor caso. No es el mas probable, pero es el que debes poder absorber.",
      contextFn: (v) => {
        return `En tu peor escenario perderas ${v}. La pregunta clave no es si esto es probable, sino si puedes sobrevivir esto si pasa. Si la respuesta es no, la decision merece mucho mas cuidado sin importar el valor esperado. El peor caso no avisa.`;
      },
    },
  };

  const exp = explanations[label];
  if (!exp) return null;
  return {
    title: exp.title,
    concept: exp.concept,
    context: exp.contextFn(value),
  };
}

// ── Explicaciones de sesgos ────────────────────────────────
const BIAS_EXPLANATIONS: Record<string, { title: string; body: string }> = {
  "Optimismo excesivo": {
    title: "Optimismo excesivo",
    body: "Tendemos a sobrestimar la probabilidad de que las cosas salgan bien y subestimar los obstaculos. En decisiones importantes, esto lleva a planes sin plan B. No es malo ser optimista, pero la calibracion importa: de cada 10 veces que has tomado decisiones similares, cuantas han salido como esperabas?",
  },
  "Exceso de confianza": {
    title: "Exceso de confianza",
    body: "Sobreestimamos nuestra capacidad de predecir, controlar o ejecutar. Se manifiesta como creer que nuestra estimacion de probabilidad es mas precisa de lo que realmente es. La mayoria de la gente cree estar por encima del promedio en sus areas de decision. No todos pueden tener razon.",
  },
  "Efecto anclaje": {
    title: "Efecto de anclaje",
    body: "El primer numero o referencia que encontramos se convierte en el punto de partida de nuestro razonamiento, aunque sea arbitrario. Si alguien te dijo que un negocio similar vale X, ese X ancla todo tu analisis aunque no sea comparable.",
  },
  "Anclaje al costo de la renta": {
    title: "Anclaje al costo de la renta",
    body: "En decisiones de propiedad, el costo mensual de rentar se convierte en el ancla contra el que se compara todo. Esto puede distorsionar el calculo real que deberia incluir costo de capital, mantenimiento, iliquidez y costo de oportunidad del enganche.",
  },
  "Sesgo de confirmacion": {
    title: "Sesgo de confirmacion",
    body: "Buscamos, recordamos e interpretamos la informacion de manera que confirme lo que ya creemos. Si ya quieres hacer algo, encontraras razones para hacerlo. El antidoto es buscar activamente evidencia en contra de tu decision preferida.",
  },
  "Sesgo de confirmacion al enfocarse en lo positivo del emprendimiento": {
    title: "Sesgo de confirmacion",
    body: "Cuando queremos emprender, nuestra mente filtra los casos de exito y minimiza los fracasos. El ecosistema emprendedor tambien refuerza esto: se celebran los exits, no los cierres. El 90% de startups falla, pero casi nadie conoce esas historias tan bien como las exitosas.",
  },
  "Analisis binario": {
    title: "Analisis binario",
    body: "Ver la decision como solo dos opciones (hacerlo o no hacerlo) cuando en realidad hay un espectro. Podria hacerse a medias, probarse primero en pequeño, postergarse, o estructurarse de manera diferente. El pensamiento binario cierra opciones que podrian ser mejores.",
  },
  "Focalización en resultados negativos": {
    title: "Focalizacion en resultados negativos",
    body: "Darle mas peso mental a los posibles fracasos que a los posibles exitos, aunque la probabilidad de exito sea mayor. Es una forma de aversion al riesgo que puede paralizar decisiones que matematicamente tienen sentido.",
  },
  "Aversion a la perdida": {
    title: "Aversion a la perdida",
    body: "Las perdidas duelen aproximadamente el doble que lo que placen las ganancias equivalentes. Esto distorsiona nuestras decisiones: evitamos perder 100 mas de lo que buscamos ganar 100, aunque matematicamente sean lo mismo.",
  },
  "Falacia del costo hundido": {
    title: "Falacia del costo hundido",
    body: "Seguimos invirtiendo en algo porque ya invertimos mucho, aunque la evidencia diga que no funcionara. El dinero, tiempo o esfuerzo ya gastado no deberia influir en decisiones futuras: lo que importa es el valor esperado de aqui en adelante.",
  },
  "Efecto anclaje sobre el valor potencial": {
    title: "Efecto de anclaje sobre el valor potencial",
    body: "El valor potencial que imaginamos para el negocio o inversion se convierte en el ancla de todo el analisis. Si el numero que tienes en mente es muy grande, todos los sacrificios y riesgos parecen pequenos en comparacion, aunque ese numero sea especulativo.",
  },
};

// ── Modal generico ─────────────────────────────────────────
function Modal({ title, concept, context, onClose }: {
  title: string; concept: string; context?: string; onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.surfaceCard, borderRadius: 20,
          padding: "2rem", maxWidth: 480, width: "100%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          fontFamily: T.fontBody, maxHeight: "80vh", overflowY: "auto" as const,
        }}
      >
        <div style={{
          fontSize: "0.625rem", fontWeight: 700, color: T.outline,
          letterSpacing: "0.15em", textTransform: "uppercase" as const, marginBottom: "0.5rem",
        }}>Que significa esto</div>
        <h3 style={{
          fontFamily: T.fontHead, fontStyle: "italic",
          fontSize: "1.375rem", color: T.primary,
          marginBottom: "1rem", fontWeight: 600,
        }}>{title}</h3>
        <p style={{ fontSize: "0.9375rem", lineHeight: 1.75, color: T.onSurface, margin: "0 0 1rem" }}>
          {concept}
        </p>
        {context && (
          <>
            <div style={{
              fontSize: "0.625rem", fontWeight: 700, color: T.outline,
              letterSpacing: "0.15em", textTransform: "uppercase" as const,
              marginBottom: "0.5rem", marginTop: "1.25rem",
              borderTop: `1px solid ${T.surfaceHigh}`, paddingTop: "1rem",
            }}>En tu caso</div>
            <p style={{
              fontSize: "0.9375rem", lineHeight: 1.75,
              color: T.onSurface, margin: 0,
              background: T.surfaceLow, borderRadius: 10,
              padding: "0.875rem 1rem",
            }}>{context}</p>
          </>
        )}
        <button
          onClick={onClose}
          style={{
            marginTop: "1.5rem", width: "100%",
            background: T.primary, color: "#fffdf7",
            border: "none", borderRadius: 12, padding: "0.875rem",
            fontSize: "0.9375rem", fontWeight: 600,
            fontFamily: T.fontBody, cursor: "pointer",
          }}
        >Entendido</button>
      </div>
    </div>
  );
}

// ── MetricCard ─────────────────────────────────────────────
function MetricCard({ label, value, sub, color, bg }: {
  label: string; value: string; sub?: string; color: string; bg: string;
}) {
  const [hovered, setHovered] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const exp = getMetricExplanation(label, value);

  return (
    <>
      {modalOpen && exp && (
        <Modal
          title={exp.title}
          concept={exp.concept}
          context={exp.context}
          onClose={() => setModalOpen(false)}
        />
      )}
      <div
        onClick={() => exp && setModalOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: bg, borderRadius: 14, padding: "1rem 1.125rem",
          cursor: exp ? "pointer" : "default",
          transform: hovered && exp ? "translateY(-3px) scale(1.02)" : "none",
          boxShadow: hovered && exp ? `0 8px 24px ${color}33` : "none",
          transition: "all 200ms ease",
        }}
      >
        <div style={{
          fontSize: "0.625rem", fontWeight: 700, color,
          letterSpacing: "0.12em", textTransform: "uppercase" as const,
          marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem",
        }}>
          {label}
          {exp && (
            <span style={{
              fontSize: "0.6rem", opacity: hovered ? 1 : 0.5,
              transition: "opacity 200ms",
              background: color, color: bg,
              borderRadius: "50%", width: "1rem", height: "1rem",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, flexShrink: 0,
            }}>?</span>
          )}
        </div>
        <div style={{
          fontSize: "1.5rem", fontWeight: 700, color,
          fontFamily: T.fontHead, lineHeight: 1,
          transition: "transform 200ms",
          transform: hovered ? "scale(1.05)" : "scale(1)",
          display: "inline-block",
        }}>{value}</div>
        {sub && <div style={{ fontSize: "0.75rem", color, opacity: 0.7, marginTop: "0.25rem" }}>{sub}</div>}
      </div>
    </>
  );
}

// ── MiniBlock ──────────────────────────────────────────────
function MiniBlock({ label, value }: { label: string; value: string }) {
  const [hovered, setHovered] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const exp = getMetricExplanation(label, value);

  return (
    <>
      {modalOpen && exp && (
        <Modal
          title={exp.title}
          concept={exp.concept}
          context={exp.context}
          onClose={() => setModalOpen(false)}
        />
      )}
      <div
        onClick={() => exp && setModalOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: T.surfaceLow, borderRadius: 10,
          padding: "0.875rem 1rem", flex: 1, minWidth: 110,
          cursor: exp ? "pointer" : "default",
          transform: hovered && exp ? "translateY(-2px)" : "none",
          boxShadow: hovered && exp ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
          transition: "all 200ms ease",
        }}
      >
        <div style={{
          fontSize: "0.5625rem", fontWeight: 700, color: T.outline,
          letterSpacing: "0.1em", textTransform: "uppercase" as const,
          marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.3rem",
        }}>
          {label}
          {exp && (
            <span style={{
              fontSize: "0.55rem", opacity: hovered ? 1 : 0.4,
              transition: "opacity 200ms",
              background: T.outline, color: T.surfaceLow,
              borderRadius: "50%", width: "0.875rem", height: "0.875rem",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, flexShrink: 0,
            }}>?</span>
          )}
        </div>
        <div style={{
          fontSize: "0.9375rem", fontWeight: 600, color: T.onSurface,
          transition: "transform 200ms",
          transform: hovered ? "scale(1.04)" : "scale(1)",
          display: "inline-block",
        }}>{value}</div>
      </div>
    </>
  );
}

// ── BiasTag ────────────────────────────────────────────────
function BiasTag({ children }: { children: string }) {
  const [hovered, setHovered] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const exp = BIAS_EXPLANATIONS[children];

  return (
    <>
      {modalOpen && exp && (
        <Modal
          title={exp.title}
          concept={exp.body}
          onClose={() => setModalOpen(false)}
        />
      )}
      <span
        onClick={() => exp && setModalOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "#92400e" : "#fef3c7",
          color: hovered ? "#fffdf7" : "#92400e",
          fontSize: "0.75rem", fontWeight: 600,
          padding: "0.25rem 0.75rem", borderRadius: 9999,
          display: "inline-block", margin: "0 0.375rem 0.375rem 0",
          cursor: exp ? "pointer" : "default",
          transition: "all 180ms ease",
          transform: hovered ? "translateY(-2px) scale(1.04)" : "none",
          boxShadow: hovered ? "0 4px 10px rgba(146,64,14,0.25)" : "none",
        }}
      >
        {children}{exp ? " ?" : ""}
      </span>
    </>
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

// ── InputSummary ───────────────────────────────────────────
function InputSummary({ input }: { input: DecisionInput }) {
  const [open, setOpen] = React.useState(false);
  const items = [
    { label: "Si lo haces",           value: input.altA },
    { label: "Si no lo haces",        value: input.altB },
    { label: "Probabilidad estimada", value: input.probability !== undefined ? `${input.probability}%` : undefined },
    { label: "Peor escenario",        value: input.worstScenario || undefined },
    { label: "Reversibilidad",        value: input.reversibilityScore !== undefined ? `${input.reversibilityScore}/10` : undefined },
    { label: "Que sacrificas",        value: input.opportunityDesc || undefined },
  ].filter(i => i.value);

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: T.surfaceLow, border: "none", borderRadius: 12,
        padding: "0.875rem 1.25rem", width: "100%",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        cursor: "pointer", fontFamily: T.fontBody,
      }}>
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: T.onMuted }}>Lo que respondiste</span>
        <span style={{ color: T.outline, fontSize: "0.8rem", transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>v</span>
      </button>
      {open && (
        <div style={{
          background: T.surfaceCard, borderRadius: "0 0 12px 12px",
          padding: "1rem 1.25rem", display: "flex", flexDirection: "column" as const, gap: "0.875rem",
        }}>
          {items.map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: "0.5625rem", fontWeight: 700, color: T.outline, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.25rem" }}>{label}</div>
              <div style={{ fontSize: "0.9375rem", color: T.onSurface, lineHeight: 1.5 }}>{value}</div>
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
        color: T.outline, fontSize: "0.8125rem", marginBottom: "2rem",
        display: "flex", alignItems: "center", gap: "0.4rem",
        fontFamily: T.fontBody, padding: 0,
      }}>&larr; Nueva decision</button>

      <h2 style={{
        fontFamily: T.fontHead, fontStyle: "italic",
        fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
        fontWeight: 600, color: T.primary, marginBottom: "0.5rem",
      }}>Resultados del analisis</h2>
      <p style={{ color: T.onMuted, fontSize: "1rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
        No te decimos que hacer. Te mostramos como estas pensando.
      </p>

      {input && <InputSummary input={input} />}

      <Zone accent="#1a7a4a" label="Como estas pensando" icon="*">
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "0.625rem", fontWeight: 700, color: T.outline, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.625rem" }}>Analisis de riesgo</div>
          <p style={{ fontSize: "0.9375rem", lineHeight: 1.75, color: T.onSurface, margin: 0 }}>{analysis.riskAssessment}</p>
        </div>
        {analysis.structuralCommentary && (
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.625rem", fontWeight: 700, color: T.outline, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.625rem" }}>Tu forma de razonar</div>
            <p style={{ fontSize: "0.9375rem", lineHeight: 1.75, color: T.onSurface, margin: 0 }}>{analysis.structuralCommentary}</p>
          </div>
        )}
        {analysis.blindSpots.length > 0 && (
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.625rem", fontWeight: 700, color: T.outline, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.625rem" }}>Puntos ciegos</div>
            {analysis.blindSpots.map((b, i) => (
              <div key={i} style={{ fontSize: "0.9rem", color: T.onSurface, marginBottom: "0.5rem", paddingLeft: "0.875rem", borderLeft: `3px solid ${T.teal}`, lineHeight: 1.6 }}>{b}</div>
            ))}
          </div>
        )}
        {analysis.biasFlags.length > 0 && (
          <div>
            <div style={{ fontSize: "0.625rem", fontWeight: 700, color: T.outline, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.625rem" }}>Sesgos detectados</div>
            <p style={{ fontSize: "0.6875rem", color: T.outline, fontStyle: "italic", margin: "0 0 0.625rem" }}>Haz clic en cada sesgo para entender que significa</p>
            <div>{analysis.biasFlags.map((b, i) => <BiasTag key={i}>{b}</BiasTag>)}</div>
          </div>
        )}
      </Zone>

      <Zone accent="#1a7a4a" label="Que aprendiste hoy" icon="+">
        {analysis.lessonsLearned.map((lesson, i) => (
          <div key={i} style={{ display: "flex", gap: "1rem", marginBottom: "1.125rem", alignItems: "flex-start" }}>
            <div style={{
              minWidth: "1.75rem", height: "1.75rem", borderRadius: "50%",
              background: "#d0f0e0", color: T.primaryMid,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
            }}>{i + 1}</div>
            <p style={{ fontSize: "0.9375rem", lineHeight: 1.7, color: T.onSurface, margin: 0 }}>{lesson}</p>
          </div>
        ))}
      </Zone>

      <Zone accent={T.primary} label="Los numeros detras" icon="#">
        <p style={{ fontSize: "0.75rem", color: T.outline, fontStyle: "italic", marginBottom: "1rem", marginTop: 0 }}>
          Haz clic en cualquier numero para entender que significa y que dice sobre tu caso especifico
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          <MetricCard label="Indice de riesgo" value={`${metrics.riskIndex}/100`} sub={riskHuman(metrics.riskIndex)} color={risk.color} bg={risk.bg} />
          <MetricCard label="Irreversibilidad" value={`${metrics.irreversibilityIndex}/100`} sub={irrHuman(metrics.irreversibilityIndex)} color={irr.color} bg={irr.bg} />
          {hasMonetary && <MetricCard label="Valor esperado" value={fmt(metrics.expectedValue)} color="#1a7a4a" bg="#d0f0e0" />}
          {hasMonetary && metrics.expectedValueNet !== undefined && metrics.expectedValueNet !== null && (
            <MetricCard label="Valor esperado neto" value={fmt(metrics.expectedValueNet)} color={T.primaryMid} bg="#d0f0e0" />
          )}
        </div>

        {hasMonetary && (
          <p style={{ fontSize: "0.8125rem", color: T.onMuted, lineHeight: 1.65, margin: "0 0 1rem", fontStyle: "italic", borderLeft: `3px solid ${T.primary}`, paddingLeft: "0.875rem" }}>
            En promedio vale la pena -- pero ese promedio asume que podrias tomar esta decision muchas veces. Tu solo la tomas una vez.
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
          <div style={{ background: "#fef3c7", borderRadius: 12, padding: "1rem 1.125rem" }}>
            <div style={{ fontSize: "0.625rem", fontWeight: 700, color: "#92400e", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.625rem" }}>Advertencias</div>
            {metrics.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: "0.875rem", color: "#78350f", marginBottom: "0.4rem", paddingLeft: "0.875rem", borderLeft: "3px solid #fcd34d", lineHeight: 1.55 }}>{w}</div>
            ))}
          </div>
        )}
      </Zone>

      <button onClick={onNew} style={{
        width: "100%", marginTop: "0.5rem",
        background: `linear-gradient(160deg, ${T.primary} 0%, ${T.primaryMid} 100%)`,
        color: "#fffdf7", border: "none", padding: "1.1rem", borderRadius: 12,
        fontSize: "1rem", fontWeight: 600, fontFamily: T.fontBody,
        cursor: "pointer", transition: "all 200ms",
        boxShadow: "0 8px 24px rgba(0,6,102,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
      }}>Nueva decision</button>
    </div>
  );
}

function riskPalette(index: number) {
  if (index >= 70) return { color: T.error,   bg: T.errorBg };
  if (index >= 40) return { color: "#92400e", bg: "#fef3c7" };
  return              { color: "#1a7a4a", bg: "#d0f0e0" };
}