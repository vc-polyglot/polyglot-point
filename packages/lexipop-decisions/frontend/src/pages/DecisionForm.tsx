import { useState, useEffect } from "react";
import type { DecisionInput, DecisionLevel } from "../types";
import { THEME } from "../theme/tokens";

interface Props {
  onSubmit: (input: DecisionInput) => void;
  onBack:   () => void;
  loading:  boolean;
}

type Step = "type" | "describe" | "details";

const LEVELS: { id: DecisionLevel; label: string; img: string }[] = [
  { id: "cotidiana",  label: "Cotidiana",  img: "/cotidianas.png"  },
  { id: "carrera",    label: "Carrera",    img: "/carrera.png"     },
  { id: "financiera", label: "Financiera", img: "/financieras.png" },
];

const TYPE_EXAMPLES: Record<DecisionLevel, string[]> = {
  cotidiana: [
    "Levantarme temprano o quedarme en la cama",
    "Hacer ejercicio o no",
    "Comer saludable o comida rápida",
    "Ahorrar dinero o gastarlo",
    "Estudiar o procrastinar",
    "Dormir temprano o desvelarme",
  ],
  carrera: [
    "Aceptar una oferta de trabajo",
    "Renunciar para emprender",
    "Cambiar de industria",
    "Hacer una maestría o seguir trabajando",
    "Pedir un ascenso o moverme a otra empresa",
  ],
  financiera: [
    "Invertir en acciones o pagar deudas",
    "Comprar casa o seguir rentando",
    "Invertir en un negocio propio",
    "Ahorrar para el retiro o gastar ahora",
    "Pedir un préstamo para invertir",
  ],
};

function LevelCard({ id, label, img, selected, onSelect }: {
  id: string; label: string; img: string; selected: boolean; onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `2px solid ${selected ? THEME.primary : hovered ? THEME.primaryDim : "transparent"}`,
        borderRadius: 20, background: selected ? THEME.surfaceCard : THEME.surfaceLow,
        padding: 0, cursor: "pointer", transition: "all 180ms",
        overflow: "hidden", display: "flex", flexDirection: "column" as const, alignItems: "center",
        boxShadow: selected || hovered ? "0 6px 20px rgba(0,6,102,0.14)" : "none",
        transform: hovered && !selected ? "translateY(-2px)" : "none",
      }}
    >
      <div style={{ width: "100%", aspectRatio: "3 / 4", overflow: "hidden", background: THEME.surfaceLow }}>
        <img src={img} alt={label} style={{
          width: "100%", height: "100%", objectFit: "cover", objectPosition: "top",
          display: "block", transition: "transform 200ms",
          transform: hovered ? "scale(1.04)" : "scale(1)",
        }} />
      </div>
      <div style={{
        padding: "0.75rem 0.5rem", width: "100%", textAlign: "center" as const,
        background: selected ? THEME.primary : "transparent", transition: "background 180ms",
      }}>
        <span style={{
          fontFamily: THEME.fontBody, fontSize: "0.875rem", fontWeight: 600,
          color: selected ? "#ffffff" : hovered ? THEME.primary : THEME.onMuted,
          transition: "color 180ms",
        }}>{label}</span>
      </div>
    </button>
  );
}

// ── Slider sin default ─────────────────────────────────────
function SliderField({ label, value, onChange, max = 100, suffix = "%" }: {
  label: string; value: number | undefined;
  onChange: (v: number) => void; max?: number; suffix?: string;
}) {
  const touched = value !== undefined;
  const display = touched ? value! : Math.round(max / 2);
  const pct     = (display / max) * 100;

  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.625rem" }}>
        <label style={{
          fontSize: "0.8125rem", fontWeight: 600, color: THEME.onMuted,
          lineHeight: 1.45, fontFamily: THEME.fontBody, flex: 1,
        }}>{label}</label>
        {touched ? (
          <span style={{
            fontWeight: 700, color: THEME.primary, fontFamily: THEME.fontHead,
            fontSize: "1.1rem", flexShrink: 0, marginLeft: "0.75rem",
          }}>{value}{suffix}</span>
        ) : (
          <span style={{
            fontSize: "0.75rem", color: THEME.outline,
            fontStyle: "italic", flexShrink: 0, marginLeft: "0.75rem",
          }}>sin respuesta</span>
        )}
      </div>

      <input
        type="range" min={0} max={max} value={display}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: "100%", height: "0.5rem", borderRadius: 9999,
          appearance: "none", WebkitAppearance: "none",
          cursor: "pointer", outline: "none",
          background: touched
            ? `linear-gradient(to right, ${THEME.primary} ${pct}%, ${THEME.surfaceHigh} 0%)`
            : THEME.surfaceHigh,
          opacity: touched ? 1 : 0.4,
          transition: "background 200ms, opacity 200ms",
        }}
      />
      {!touched && (
        <p style={{
          textAlign: "center", fontSize: "0.6875rem", color: THEME.outline,
          marginTop: "0.4rem", fontStyle: "italic",
        }}>
          Mueve para responder — si no lo tocas no se incluye en el análisis
        </p>
      )}
    </div>
  );
}

// ── Preguntas dinámicas ────────────────────────────────────
interface Questions {
  optionAQuestion:       string;
  optionBQuestion:       string;
  probabilityQuestion:   string;
  worstScenarioQuestion: string;
  reversibilityQuestion: string;
  opportunityQuestion:   string;
}

interface FormState {
  altA:               string;
  altB:               string;
  probability:        number | undefined;
  worstScenario:      string;
  reversibilityScore: number | undefined;
  opportunityDesc:    string;
}

function DynamicQuestions({ title, level, onSubmit, loading }: {
  title: string; level: DecisionLevel;
  onSubmit: (input: DecisionInput) => void; loading: boolean;
}) {
  const [questions, setQuestions] = useState<Questions | null>(null);
  const [loadingQ,  setLoadingQ]  = useState(true);
  const [error,     setError]     = useState(false);
  const [form, setForm] = useState<FormState>({
    altA: "", altB: "",
    probability:        undefined,
    worstScenario:      "",
    reversibilityScore: undefined,
    opportunityDesc:    "",
  });

  useEffect(() => {
    fetch("/api/decision/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, level }),
    })
      .then(r => r.json())
      .then(data => { setQuestions(data); setLoadingQ(false); })
      .catch(() => { setError(true); setLoadingQ(false); });
  }, [title, level]);

  if (loadingQ) return (
    <div style={{ textAlign: "center", padding: "3rem 0" }}>
      <div style={{
        width: "3rem", height: "3rem", borderRadius: "50%",
        background: THEME.surfaceLow, display: "flex",
        alignItems: "center", justifyContent: "center", margin: "0 auto 1rem",
      }}>
        <span className="material-symbols-outlined" style={{ color: THEME.outline }}>psychology</span>
      </div>
      <div style={{ fontFamily: THEME.fontHead, fontStyle: "italic", fontSize: "1.1rem", color: THEME.primary }}>
        Generando preguntas personalizadas…
      </div>
      <div style={{ fontSize: "0.875rem", color: THEME.outline, marginTop: "0.4rem" }}>
        Esto toma unos segundos
      </div>
    </div>
  );

  if (error || !questions) return (
    <div style={{ color: THEME.error, textAlign: "center", padding: "2rem" }}>
      Error cargando preguntas. Recarga la página.
    </div>
  );

 const canSubmit =
    form.altA.trim().length > 5 &&
    form.altB.trim().length > 5;
    
  const inputStyle = {
    width: "100%", padding: "0.75rem 1rem",
    background: THEME.surfaceLow, border: "none",
    borderBottom: `2px solid rgba(118,118,131,0.15)`,
    borderRadius: "0.5rem 0.5rem 0 0",
    fontSize: "1rem", fontFamily: THEME.fontBody, color: THEME.onSurface,
    outline: "none", resize: "vertical" as const,
  };

  const labelStyle = {
    display: "block", fontSize: "0.8125rem", fontWeight: 600 as const,
    color: THEME.onMuted, marginBottom: "0.625rem",
    lineHeight: 1.45, fontFamily: THEME.fontBody,
  };

  return (
    <>
      {/* Contexto — decisión siempre visible */}
      <div style={{
        background: THEME.primary, borderRadius: 12,
        padding: "0.875rem 1.25rem", marginBottom: "2rem",
      }}>
        <div style={{
          fontSize: "0.5625rem", fontWeight: 700, color: "rgba(255,255,255,0.6)",
          letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.3rem",
        }}>Tu decisión</div>
        <div style={{
          fontFamily: THEME.fontHead, fontStyle: "italic",
          fontSize: "1.05rem", color: "#ffffff", lineHeight: 1.3,
        }}>{title}</div>
      </div>

      <h2 style={{
        fontFamily: THEME.fontHead, fontStyle: "italic",
        fontSize: "clamp(1.5rem, 5vw, 1.875rem)",
        fontWeight: 600, color: THEME.primary, marginBottom: "0.5rem",
      }}>
        Cuéntame más
      </h2>
      <p style={{ color: THEME.onMuted, fontSize: "0.9375rem", marginBottom: "2rem", lineHeight: 1.6 }}>
        Responde lo que puedas. Los sliders grises no se incluyen en el análisis si no los tocas.
      </p>

      <div style={{ marginBottom: "1.75rem" }}>
        <label style={labelStyle}>{questions.optionAQuestion}</label>
        <input type="text" value={form.altA} style={inputStyle}
          onChange={e => setForm(f => ({ ...f, altA: e.target.value }))}
          placeholder="Describe los cambios concretos…" />
      </div>

      <div style={{ marginBottom: "1.75rem" }}>
        <label style={labelStyle}>{questions.optionBQuestion}</label>
        <input type="text" value={form.altB} style={inputStyle}
          onChange={e => setForm(f => ({ ...f, altB: e.target.value }))}
          placeholder="Describe los cambios concretos…" />
      </div>

      <SliderField
        label={questions.probabilityQuestion}
        value={form.probability}
        onChange={v => setForm(f => ({ ...f, probability: v }))}
        max={100} suffix="%"
      />

      <div style={{ marginBottom: "1.75rem" }}>
        <label style={labelStyle}>{questions.worstScenarioQuestion}</label>
        <textarea rows={2} value={form.worstScenario} style={inputStyle}
          onChange={e => setForm(f => ({ ...f, worstScenario: e.target.value }))}
          placeholder="Sé honesto, no dramatices…" />
      </div>

      <SliderField
        label={questions.reversibilityQuestion}
        value={form.reversibilityScore}
        onChange={v => setForm(f => ({ ...f, reversibilityScore: v }))}
        max={10} suffix="/10"
      />

      <div style={{ marginBottom: "1.75rem" }}>
        <label style={labelStyle}>{questions.opportunityQuestion}</label>
        <textarea rows={2} value={form.opportunityDesc} style={inputStyle}
          onChange={e => setForm(f => ({ ...f, opportunityDesc: e.target.value }))}
          placeholder="¿Qué dejas de hacer si eliges esto?" />
      </div>

      <button
        disabled={!canSubmit || loading}
        onClick={() => onSubmit({
          title, level,
          altA:               form.altA,
          altB:               form.altB,
          probability:        form.probability!,
          worstScenario:      form.worstScenario,
          reversibilityScore: form.reversibilityScore!,
          opportunityDesc:    form.opportunityDesc,
        } as DecisionInput)}
        style={{
          width: "100%",
          background: canSubmit && !loading
            ? `linear-gradient(160deg, ${THEME.primary} 0%, ${THEME.primaryMid} 100%)`
            : THEME.surfaceHigh,
          color: canSubmit && !loading ? "#ffffff" : THEME.outline,
          border: "none", padding: "1rem", borderRadius: THEME.radius.lg,
          fontSize: "1rem", fontWeight: 600, fontFamily: THEME.fontBody,
          cursor: canSubmit && !loading ? "pointer" : "not-allowed",
          boxShadow: canSubmit && !loading ? "0 8px 24px rgba(0,6,102,0.18)" : "none",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          transition: "all 200ms",
        }}
      >
        {loading ? "Analizando…" : (
          <>Evaluar decisión
            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>query_stats</span>
          </>
        )}
      </button>
    </>
  );
}

// ── Componente principal ───────────────────────────────────
export default function DecisionForm({ onSubmit, onBack, loading }: Props) {
  const [step,        setStep]        = useState<Step>("type");
  const [level,       setLevel]       = useState<DecisionLevel>("cotidiana");
  const [title,       setTitle]       = useState("");
  const [customTitle, setCustomTitle] = useState("");

  function goBack() {
    if (step === "type")     return onBack();
    if (step === "describe") return setStep("type");
    if (step === "details")  return setStep("describe");
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" || (e.altKey && e.key === "ArrowLeft")) {
        e.preventDefault();
        goBack();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step]);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "5.5rem 1.5rem 7rem", fontFamily: THEME.fontBody }}>

      <button onClick={goBack} style={{
        background: "none", border: "none", cursor: "pointer",
        color: THEME.outline, fontSize: "0.8125rem", marginBottom: "2rem",
        display: "flex", alignItems: "center", gap: "0.4rem",
        fontFamily: THEME.fontBody, padding: 0,
      }}>
        ← {step === "type" ? "Inicio" : "Atrás"}
      </button>

      {step === "type" && (
        <>
          <h2 style={{
            fontFamily: THEME.fontHead, fontStyle: "italic",
            fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
            fontWeight: 600, color: THEME.primary, marginBottom: "0.5rem",
          }}>¿Qué tipo de decisión es?</h2>
          <p style={{ color: THEME.onMuted, fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.6 }}>
            Elige una categoría para obtener ejemplos relevantes.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            {LEVELS.map(({ id, label, img }) => (
              <LevelCard key={id} id={id} label={label} img={img}
                selected={level === id}
                onSelect={() => { setLevel(id); setStep("describe"); }}
              />
            ))}
          </div>
        </>
      )}

      {step === "describe" && (
        <>
          <h2 style={{
            fontFamily: THEME.fontHead, fontStyle: "italic",
            fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
            fontWeight: 600, color: THEME.primary, marginBottom: "0.5rem",
          }}>¿Qué decisión tienes pendiente?</h2>
          <p style={{ color: THEME.onMuted, fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.6 }}>
            Elige un ejemplo o escribe tu propia situación.
          </p>

          <div style={{ marginBottom: "2rem" }}>
            <div style={{ fontSize: "0.625rem", fontWeight: 700, color: THEME.outline, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.875rem" }}>
              Ejemplos
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.5rem" }}>
              {TYPE_EXAMPLES[level].map(example => (
                <button key={example} onClick={() => { setTitle(example); setStep("details"); }} style={{
                  background: THEME.surfaceLow, border: "none",
                  borderRadius: THEME.radius.lg, padding: "0.875rem 1rem",
                  textAlign: "left" as const, cursor: "pointer",
                  fontSize: "0.9375rem", color: THEME.onSurface,
                  fontFamily: THEME.fontBody, transition: "all 150ms",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span>{example}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: THEME.outline, flexShrink: 0 }}>chevron_right</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: `1px solid rgba(198,197,212,0.25)`, paddingTop: "1.5rem" }}>
            <div style={{ fontSize: "0.625rem", fontWeight: 700, color: THEME.outline, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.875rem" }}>
              O escribe la tuya
            </div>
            <textarea rows={2} value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="Ej: Debería mudarme a otra ciudad por trabajo"
              style={{
                width: "100%", padding: "0.875rem",
                background: THEME.surfaceLow, border: "none",
                borderBottom: `2px solid rgba(118,118,131,0.15)`,
                borderRadius: "0.5rem 0.5rem 0 0",
                fontSize: "1rem", fontFamily: THEME.fontBody,
                resize: "vertical" as const, marginBottom: "1rem", outline: "none",
              }}
            />
            <button
              onClick={() => { if (customTitle.trim()) { setTitle(customTitle.trim()); setStep("details"); } }}
              disabled={!customTitle.trim()}
              style={{
                width: "100%",
                background: customTitle.trim()
                  ? `linear-gradient(160deg, ${THEME.primary} 0%, ${THEME.primaryMid} 100%)`
                  : THEME.surfaceHigh,
                color: customTitle.trim() ? "#ffffff" : THEME.outline,
                border: "none", padding: "0.875rem", borderRadius: THEME.radius.lg,
                fontSize: "1rem", fontWeight: 600, fontFamily: THEME.fontBody,
                cursor: customTitle.trim() ? "pointer" : "not-allowed",
                boxShadow: customTitle.trim() ? "0 8px 24px rgba(0,6,102,0.18)" : "none",
                transition: "all 200ms",
              }}
            >Usar esta decisión</button>
          </div>
        </>
      )}

      {step === "details" && (
        <DynamicQuestions
          title={title} level={level}
          onSubmit={onSubmit} loading={loading}
        />
      )}
    </div>
  );
}
