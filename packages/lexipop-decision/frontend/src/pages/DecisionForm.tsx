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

// ── LevelCard con hover ───────────────────────────────────
function LevelCard({ id, label, img, selected, onSelect }: {
  id: string; label: string; img: string; selected: boolean; onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const active = selected || hovered;
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `2px solid ${selected ? THEME.primary : hovered ? THEME.primaryDim : "transparent"}`,
        borderRadius: 20,
        background: selected ? THEME.surfaceCard : THEME.surfaceLow,
        padding: 0, cursor: "pointer", transition: "all 180ms",
        overflow: "hidden", display: "flex",
        flexDirection: "column" as const, alignItems: "center",
        boxShadow: active ? "0 6px 20px rgba(0,6,102,0.14)" : "none",
        transform: hovered && !selected ? "translateY(-2px)" : "none",
      }}
    >
      <div style={{ width: "100%", aspectRatio: "3 / 4", overflow: "hidden", background: THEME.surfaceLow }}>
        <img
          src={img} alt={label}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            objectPosition: "top",
            display: "block",
            transition: "transform 200ms",
            transform: hovered ? "scale(1.04)" : "scale(1)",
          }}
        />
      </div>
      <div style={{
        padding: "0.75rem 0.5rem", width: "100%", textAlign: "center" as const,
        background: selected ? THEME.primary : "transparent",
        transition: "background 180ms",
      }}>
        <span style={{
          fontFamily: THEME.fontBody, fontSize: "0.875rem", fontWeight: 600,
          color: selected ? "#ffffff" : hovered ? THEME.primary : THEME.onMuted,
          transition: "color 180ms",
        }}>
          {label}
        </span>
      </div>
    </button>
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

function DynamicQuestions({ title, level, form, setForm, onSubmit, loading }: {
  title:    string;
  level:    DecisionLevel;
  form:     Partial<DecisionInput>;
  setForm:  (f: Partial<DecisionInput>) => void;
  onSubmit: (input: DecisionInput) => void;
  loading:  boolean;
}) {
  const [questions, setQuestions]           = useState<Questions | null>(null);
  const [loadingQuestions, setLoadingQ]     = useState(true);
  const [error, setError]                   = useState(false);

  useEffect(() => {
    fetch("/api/decision/generate-questions", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ title, level }),
    })
      .then(r => r.json())
      .then(data => { setQuestions(data); setLoadingQ(false); })
      .catch(() => { setError(true); setLoadingQ(false); });
  }, [title, level]);

  if (loadingQuestions) return (
    <div style={{ textAlign: "center", padding: "3rem 0" }}>
      <div style={{
        width: "3rem", height: "3rem", borderRadius: "50%",
        background: THEME.surfaceLow,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 1rem",
        animation: "pulse 1.5s ease-in-out infinite",
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

  const canSubmit = (form.altA?.trim().length ?? 0) > 5 && (form.altB?.trim().length ?? 0) > 5;

  const inputStyle = {
    width: "100%", padding: "0.75rem 1rem",
    background: THEME.surfaceLow, border: "none",
    borderBottom: `2px solid rgba(118,118,131,0.15)`,
    borderRadius: "0.5rem 0.5rem 0 0",
    fontSize: "1rem", fontFamily: THEME.fontBody, color: THEME.onSurface,
    outline: "none", resize: "vertical" as const,
  };

  const labelStyle = {
    display: "block", fontSize: "0.75rem", fontWeight: 600 as const,
    color: THEME.onMuted, marginBottom: "0.5rem", lineHeight: 1.4,
  };

  const fieldWrap = { marginBottom: "1.5rem" };

  return (
    <>
      <h2 style={{
        fontFamily: THEME.fontHead, fontStyle: "italic",
        fontSize: "clamp(1.6rem, 5vw, 2rem)",
        fontWeight: 600, color: THEME.primary, marginBottom: "0.5rem",
      }}>
        Analizando tu decisión
      </h2>
      <p style={{ color: THEME.onMuted, fontSize: "0.9375rem", marginBottom: "2rem", lineHeight: 1.6 }}>
        Responde estas preguntas para un análisis personalizado.
      </p>

      <div style={fieldWrap}>
        <label style={labelStyle}>{questions.optionAQuestion}</label>
        <input type="text" value={form.altA ?? ""} style={inputStyle}
          onChange={e => setForm({ ...form, altA: e.target.value })}
          placeholder="Describe los cambios concretos…" />
      </div>

      <div style={fieldWrap}>
        <label style={labelStyle}>{questions.optionBQuestion}</label>
        <input type="text" value={form.altB ?? ""} style={inputStyle}
          onChange={e => setForm({ ...form, altB: e.target.value })}
          placeholder="Describe los cambios concretos…" />
      </div>

      <div style={fieldWrap}>
        <label style={labelStyle}>{questions.probabilityQuestion}</label>
        <input type="range" min={0} max={100} value={form.probability ?? 60}
          onChange={e => setForm({ ...form, probability: Number(e.target.value) })}
          style={{
            width: "100%", height: "0.5rem", borderRadius: 9999,
            appearance: "none", WebkitAppearance: "none", cursor: "pointer", outline: "none",
            background: `linear-gradient(to right, ${THEME.primary} ${form.probability ?? 60}%, ${THEME.surfaceHigh} 0%)`,
          }}
        />
        <div style={{ textAlign: "center", marginTop: "0.4rem", fontWeight: 700, color: THEME.primary, fontFamily: THEME.fontHead }}>
          {form.probability ?? 60}%
        </div>
      </div>

      <div style={fieldWrap}>
        <label style={labelStyle}>{questions.worstScenarioQuestion}</label>
        <textarea rows={2} value={form.worstScenario ?? ""} style={inputStyle}
          onChange={e => setForm({ ...form, worstScenario: e.target.value })}
          placeholder="Sé honesto, no dramatices…" />
      </div>

      <div style={fieldWrap}>
        <label style={labelStyle}>{questions.reversibilityQuestion}</label>
        <input type="range" min={0} max={10} value={form.reversibilityScore ?? 5}
          onChange={e => setForm({ ...form, reversibilityScore: Number(e.target.value) })}
          style={{
            width: "100%", height: "0.5rem", borderRadius: 9999,
            appearance: "none", WebkitAppearance: "none", cursor: "pointer", outline: "none",
            background: `linear-gradient(to right, ${THEME.primary} ${((form.reversibilityScore ?? 5) / 10) * 100}%, ${THEME.surfaceHigh} 0%)`,
          }}
        />
        <div style={{ textAlign: "center", marginTop: "0.4rem", fontWeight: 700, color: THEME.primary, fontFamily: THEME.fontHead }}>
          {form.reversibilityScore ?? 5}/10
        </div>
      </div>

      <div style={fieldWrap}>
        <label style={labelStyle}>{questions.opportunityQuestion}</label>
        <textarea rows={2} value={form.opportunityDesc ?? ""} style={inputStyle}
          onChange={e => setForm({ ...form, opportunityDesc: e.target.value })}
          placeholder="¿Qué dejas de hacer si eliges esto?" />
      </div>

      <button
        disabled={!canSubmit || loading}
        onClick={() => onSubmit({ ...form, title, level } as DecisionInput)}
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
          <>
            Evaluar decisión
            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>query_stats</span>
          </>
        )}
      </button>
    </>
  );
}

// ── Componente principal ───────────────────────────────────
export default function DecisionForm({ onSubmit, onBack, loading }: Props) {
  const [step,        setStep]       = useState<Step>("type");
  const [level,       setLevel]      = useState<DecisionLevel>("cotidiana");
  const [title,       setTitle]      = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [form,        setForm]       = useState<Partial<DecisionInput>>({
    altA: "", altB: "",
    probability: 60, valueSuccess: 10000, valueFailure: -2000,
    worstScenario: "", worstSeverity: 5,
    reversibilityScore: 5, revertCost: 0,
    impact6m: "", impact3y: "",
    opportunityCost: 0, opportunityDesc: "",
  });

  function goBack() {
    if (step === "type")     return onBack();
    if (step === "describe") return setStep("type");
    if (step === "details")  return setStep("describe");
  }

  // Tecla Escape o Alt+ArrowLeft → atrás dentro de la app
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

  const backLabel = step === "type" ? "Inicio" : "Atrás";

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "5.5rem 1.5rem 7rem", fontFamily: THEME.fontBody }}>

      {/* Back */}
      <button onClick={goBack} style={{
        background: "none", border: "none", cursor: "pointer",
        color: THEME.outline, fontSize: "0.8125rem", marginBottom: "2rem",
        display: "flex", alignItems: "center", gap: "0.4rem",
        fontFamily: THEME.fontBody, padding: 0,
      }}>
        ← {backLabel}
      </button>

      {/* ── PASO 1: Tipo ── */}
      {step === "type" && (
        <>
          <h2 style={{
            fontFamily: THEME.fontHead, fontStyle: "italic",
            fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
            fontWeight: 600, color: THEME.primary, marginBottom: "0.5rem",
          }}>
            ¿Qué tipo de decisión es?
          </h2>
          <p style={{ color: THEME.onMuted, fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.6 }}>
            Elige una categoría para obtener ejemplos relevantes.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            {LEVELS.map(({ id, label, img }) => {
              const selected = level === id;
              return (
                <LevelCard
                  key={id}
                  id={id}
                  label={label}
                  img={img}
                  selected={selected}
                  onSelect={() => { setLevel(id); setStep("describe"); }}
                />
              );
            })}
          </div>
        </>
      )}

      {/* ── PASO 2: Elegir o escribir ── */}
      {step === "describe" && (
        <>
          <h2 style={{
            fontFamily: THEME.fontHead, fontStyle: "italic",
            fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
            fontWeight: 600, color: THEME.primary, marginBottom: "0.5rem",
          }}>
            ¿Qué decisión tienes pendiente?
          </h2>
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
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: THEME.outline, flexShrink: 0 }}>
                    chevron_right
                  </span>
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
                border: "none", padding: "0.875rem",
                borderRadius: THEME.radius.lg,
                fontSize: "1rem", fontWeight: 600, fontFamily: THEME.fontBody,
                cursor: customTitle.trim() ? "pointer" : "not-allowed",
                boxShadow: customTitle.trim() ? "0 8px 24px rgba(0,6,102,0.18)" : "none",
                transition: "all 200ms",
              }}
            >
              Usar esta decisión
            </button>
          </div>
        </>
      )}

      {/* ── PASO 3: Preguntas IA ── */}
      {step === "details" && (
        <DynamicQuestions
          title={title} level={level}
          form={form} setForm={setForm}
          onSubmit={onSubmit} loading={loading}
        />
      )}

    </div>
  );
}