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
    "Comer saludable o comida rapida",
    "Ahorrar dinero o gastarlo",
    "Estudiar o procrastinar",
    "Dormir temprano o desvelarme",
  ],
  carrera: [
    "Aceptar una oferta de trabajo",
    "Renunciar para emprender",
    "Cambiar de industria",
    "Hacer una maestria o seguir trabajando",
    "Pedir un ascenso o moverme a otra empresa",
  ],
  financiera: [
    "Invertir en acciones o pagar deudas",
    "Comprar casa o seguir rentando",
    "Invertir en un negocio propio",
    "Ahorrar para el retiro o gastar ahora",
    "Pedir un prestamo para invertir",
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
          Mueve para responder — si no lo tocas no se incluye en el analisis
        </p>
      )}
    </div>
  );
}

const PERIODOS = [
  { id: "operacion", label: "Por operacion" },
  { id: "mes",       label: "Al mes" },
  { id: "anio",      label: "Al año" },
  { id: "total",     label: "Total / ciclo completo" },
];

function NumberField({ label, value, period, onChange, onPeriodChange, placeholder }: {
  label: string;
  value: number | undefined;
  period: string;
  onChange: (v: number | undefined) => void;
  onPeriodChange: (p: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <label style={{
        display: "block", fontSize: "0.8125rem", fontWeight: 600,
        color: THEME.onMuted, marginBottom: "0.5rem",
        lineHeight: 1.45, fontFamily: THEME.fontBody,
      }}>{label}</label>
      <input
        type="number"
        value={value ?? ""}
        placeholder={placeholder ?? "0"}
        onChange={e => {
          const v = e.target.value;
          onChange(v === "" ? undefined : Number(v));
        }}
        style={{
          width: "100%", padding: "0.75rem 1rem",
          background: THEME.surfaceLow, border: "none",
          borderBottom: `2px solid rgba(118,118,131,0.15)`,
          borderRadius: "0.5rem 0.5rem 0 0",
          fontSize: "1rem", fontFamily: THEME.fontBody, color: THEME.onSurface,
          outline: "none",
        }}
      />
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.5rem", marginTop: "0.625rem" }}>
        {PERIODOS.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPeriodChange(p.id)}
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: 9999,
              border: `2px solid ${period === p.id ? THEME.primary : "rgba(118,118,131,0.2)"}`,
              background: period === p.id ? THEME.primary : "transparent",
              color: period === p.id ? "#ffffff" : THEME.onMuted,
              fontSize: "0.8125rem", fontWeight: 600,
              fontFamily: THEME.fontBody, cursor: "pointer",
              transition: "all 150ms",
            }}
          >{p.label}</button>
        ))}
      </div>
    </div>
  );
}

interface Questions {
  optionAQuestion:       string;
  optionBQuestion:       string;
  probabilityQuestion:   string;
  worstScenarioQuestion: string;
  reversibilityQuestion: string;
  opportunityQuestion:   string;
}

interface FormState {
  altA:                  string;
  altB:                  string;
  probability:           number | undefined;
  worstScenario:         string;
  reversibilityScore:    number | undefined;
  opportunityDesc:       string;
  valueSuccess:          number | undefined;
  valueSuccessPeriod:    string;
  valueFailure:          number | undefined;
  valueFailurePeriod:    string;
  opportunityCost:       number | undefined;
  opportunityCostPeriod: string;
  revertCost:            number | undefined;
}

function DynamicQuestions({ title, level, onSubmit, loading }: {
  title: string; level: DecisionLevel;
  onSubmit: (input: DecisionInput) => void; loading: boolean;
}) {
  const [questions,      setQuestions]      = useState<Questions | null>(null);
  const [loadingQ,       setLoadingQ]       = useState(true);
  const [error,          setError]          = useState(false);
  const [wantsFinancial, setWantsFinancial] = useState(false);
  const [form, setForm] = useState<FormState>({
    altA: "", altB: "",
    probability:           undefined,
    worstScenario:         "",
    reversibilityScore:    undefined,
    opportunityDesc:       "",
    valueSuccess:          undefined,
    valueSuccessPeriod:    "total",
    valueFailure:          undefined,
    valueFailurePeriod:    "total",
    opportunityCost:       undefined,
    opportunityCostPeriod: "total",
    revertCost:            undefined,
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
        Generando preguntas personalizadas...
      </div>
      <div style={{ fontSize: "0.875rem", color: THEME.outline, marginTop: "0.4rem" }}>
        Esto toma unos segundos
      </div>
    </div>
  );

  if (error || !questions) return (
    <div style={{ color: THEME.error, textAlign: "center", padding: "2rem" }}>
      Error cargando preguntas. Recarga la pagina.
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

  const PERIOD_MULTIPLIER: Record<string, number> = {
    operacion: 1,
    mes:       12,
    anio:      1,
    total:     1,
  };

  function annualize(value: number | undefined, period: string): number {
    if (!value) return 0;
    return value * (PERIOD_MULTIPLIER[period] ?? 1);
  }

  return (
    <>
      <div style={{
        background: THEME.primary, borderRadius: 12,
        padding: "0.875rem 1.25rem", marginBottom: "2rem",
      }}>
        <div style={{
          fontSize: "0.5625rem", fontWeight: 700, color: "rgba(255,255,255,0.6)",
          letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.3rem",
        }}>Tu decision</div>
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
        Cuentame mas
      </h2>
      <p style={{ color: THEME.onMuted, fontSize: "0.9375rem", marginBottom: "2rem", lineHeight: 1.6 }}>
        Responde lo que puedas. Los sliders grises no se incluyen en el analisis si no los tocas.
      </p>

      <div style={{ marginBottom: "1.75rem" }}>
        <label style={labelStyle}>{questions.optionAQuestion}</label>
        <input type="text" value={form.altA} style={inputStyle}
          onChange={e => setForm(f => ({ ...f, altA: e.target.value }))}
          placeholder="Describe los cambios concretos..." />
      </div>

      <div style={{ marginBottom: "1.75rem" }}>
        <label style={labelStyle}>{questions.optionBQuestion}</label>
        <input type="text" value={form.altB} style={inputStyle}
          onChange={e => setForm(f => ({ ...f, altB: e.target.value }))}
          placeholder="Describe los cambios concretos..." />
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
          placeholder="Se honesto, no dramatices..." />
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
          placeholder="Que dejas de hacer si eliges esto?" />
      </div>

      <div style={{
        borderTop: `1px solid rgba(118,118,131,0.15)`,
        paddingTop: "1.5rem", marginBottom: "1.75rem",
      }}>
        <label style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          cursor: "pointer", userSelect: "none" as const,
        }}>
          <div
            onClick={() => setWantsFinancial(w => !w)}
            style={{
              width: "1.25rem", height: "1.25rem", borderRadius: "0.375rem", flexShrink: 0,
              border: `2px solid ${wantsFinancial ? THEME.primary : THEME.outline}`,
              background: wantsFinancial ? THEME.primary : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 150ms", cursor: "pointer",
            }}
          >
            {wantsFinancial && (
              <span style={{ color: "#fff", fontSize: "0.75rem", fontWeight: 700, lineHeight: 1 }}>&#10003;</span>
            )}
          </div>
          <span style={{ fontSize: "0.9375rem", color: THEME.onMuted, fontFamily: THEME.fontBody }}>
            Quiero incluir el analisis financiero (numeros opcionales)
          </span>
        </label>
      </div>

      {wantsFinancial && (
        <div style={{
          background: THEME.surfaceLow, borderRadius: 12,
          padding: "1.25rem", marginBottom: "1.75rem",
        }}>
          <div style={{
            fontSize: "0.625rem", fontWeight: 700, color: THEME.outline,
            letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "1rem",
          }}>
            Datos financieros
          </div>
          <NumberField
            label="Si funciona: cuanto dinero entra"
            value={form.valueSuccess}
            period={form.valueSuccessPeriod}
            onChange={v => setForm(f => ({ ...f, valueSuccess: v }))}
            onPeriodChange={p => setForm(f => ({ ...f, valueSuccessPeriod: p }))}
            placeholder="Ej: 50000"
          />
          <NumberField
            label="Si falla: cuanto dinero sale de tu bolsillo"
            value={form.valueFailure}
            period={form.valueFailurePeriod}
            onChange={v => setForm(f => ({ ...f, valueFailure: v }))}
            onPeriodChange={p => setForm(f => ({ ...f, valueFailurePeriod: p }))}
            placeholder="Ej: 20000"
          />
          <NumberField
            label="Costo de oportunidad: cuanto dejas de percibir con otra opcion"
            value={form.opportunityCost}
            period={form.opportunityCostPeriod}
            onChange={v => setForm(f => ({ ...f, opportunityCost: v }))}
            onPeriodChange={p => setForm(f => ({ ...f, opportunityCostPeriod: p }))}
            placeholder="Ej: 30000"
          />
          <NumberField
            label="Cuanto costaria dar marcha atras si sale mal"
            value={form.revertCost}
            period="total"
            onChange={v => setForm(f => ({ ...f, revertCost: v }))}
            onPeriodChange={() => {}}
            placeholder="Ej: 5000"
          />
        </div>
      )}

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
          valueSuccess:       annualize(form.valueSuccess, form.valueSuccessPeriod),
          valueFailure:       -(annualize(form.valueFailure, form.valueFailurePeriod)),
          opportunityCost:    annualize(form.opportunityCost, form.opportunityCostPeriod),
          revertCost:         form.revertCost ?? 0,
          worstSeverity:      5,
          impact6m:           "",
          impact3y:           "",
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
        {loading ? "Analizando..." : (
          <>Evaluar decision
            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>query_stats</span>
          </>
        )}
      </button>
    </>
  );
}

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
        &larr; {step === "type" ? "Inicio" : "Atras"}
      </button>

      {step === "type" && (
        <>
          <h2 style={{
            fontFamily: THEME.fontHead, fontStyle: "italic",
            fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
            fontWeight: 600, color: THEME.primary, marginBottom: "0.5rem",
          }}>Que tipo de decision es?</h2>
          <p style={{ color: THEME.onMuted, fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.6 }}>
            Elige una categoria para obtener ejemplos relevantes.
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
          }}>Que decision tienes pendiente?</h2>
          <p style={{ color: THEME.onMuted, fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.6 }}>
            Elige un ejemplo o escribe tu propia situacion.
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
              placeholder="Ej: Deberia mudarme a otra ciudad por trabajo"
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
            >Usar esta decision</button>
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