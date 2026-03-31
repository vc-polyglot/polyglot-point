import { useState } from "react";
import type { DecisionInput, DecisionLevel } from "../types";

interface Props {
  onSubmit: (input: DecisionInput) => void;
  onBack:   () => void;
  loading:  boolean;
}

// ── Tokens ────────────────────────────────────────────────────────────────────
const T = {
  primary:       "#000666",
  primaryMid:    "#1a237e",
  primaryFixed:  "#e0e0ff",
  surfaceBase:   "#fbf9f5",
  surfaceLow:    "#f5f3ef",
  surfaceCard:   "#ffffff",
  surfaceMid:    "#efeeea",
  surfaceHigh:   "#eae8e4",
  teal:          "#beebe7",
  water:         "#d2e6ef",
  onSurface:     "#1b1c1a",
  onMuted:       "#454652",
  outline:       "#767683",
  outlineLight:  "rgba(198,197,212,0.25)",
  error:         "#ba1a1a",
  fontHead:      "'Newsreader', Georgia, serif",
  fontBody:      "'Inter', system-ui, sans-serif",
};

const defaultInput: DecisionInput = {
  title: "", level: "cotidiana",
  altA: "", altB: "",
  probability: 60, valueSuccess: 10000, valueFailure: -2000,
  worstScenario: "", worstSeverity: 5,
  reversibilityScore: 5, revertCost: 0,
  impact6m: "", impact3y: "",
  opportunityCost: 0, opportunityDesc: "",
};

// ── Sub-componentes ───────────────────────────────────────────────────────────
function Collapse({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderRadius: 16, marginBottom: 12, overflow: "hidden", background: T.surfaceCard }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", background: open ? T.surfaceLow : T.surfaceCard,
          border: "none", padding: "1rem 1.25rem",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer", transition: "background 200ms",
        }}
      >
        <span style={{ fontFamily: T.fontHead, fontSize: "1rem", fontWeight: 600, color: T.primary }}>
          {title}
        </span>
        <span style={{
          color: T.outline,
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 200ms",
          fontSize: "0.85rem",
        }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: "1.25rem 1.25rem 0.25rem", background: T.surfaceCard }}>
          {children}
        </div>
      )}
    </div>
  );
}

function SliderRow({ label, value, onChange, min = 0, max = 100, suffix = "%" }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; suffix?: string;
}) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: T.onMuted, fontFamily: T.fontBody }}>
          {label}
        </label>
        <span style={{ fontSize: "1.1rem", fontWeight: 700, color: T.primary, fontFamily: T.fontHead }}>
          {value}{suffix}
        </span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: "100%", height: "0.5rem",
          background: `linear-gradient(to right, ${T.primary} ${((value - min) / (max - min)) * 100}%, ${T.surfaceHigh} 0%)`,
          borderRadius: 9999, appearance: "none", WebkitAppearance: "none", cursor: "pointer", outline: "none",
        }}
      />
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, multi }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multi?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const inputStyle = {
    width: "100%", padding: "0.75rem 1rem",
    background: focused ? T.surfaceCard : T.surfaceLow,
    border: "none",
    borderBottom: `2px solid ${focused ? T.primary : "rgba(118,118,131,0.15)"}`,
    borderRadius: "0.5rem 0.5rem 0 0",
    fontSize: "1rem", color: T.onSurface, fontFamily: T.fontBody,
    outline: "none", transition: "all 200ms", resize: "vertical" as const,
  };
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label style={{
        display: "block", fontSize: "0.625rem", fontWeight: 600,
        textTransform: "uppercase" as const, letterSpacing: "0.15em",
        color: T.onMuted, fontFamily: T.fontBody, marginBottom: "0.5rem",
      }}>{label}</label>
      {multi
        ? <textarea rows={2} value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} style={inputStyle}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} style={{ ...inputStyle, resize: undefined }}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      }
    </div>
  );
}

function NumberField({ label, value, onChange, prefix = "$" }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label style={{
        display: "block", fontSize: "0.625rem", fontWeight: 600,
        textTransform: "uppercase" as const, letterSpacing: "0.15em",
        color: T.onMuted, fontFamily: T.fontBody, marginBottom: "0.5rem",
      }}>{label}</label>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)",
          color: T.outline, fontSize: "0.875rem", fontFamily: T.fontBody,
        }}>{prefix}</span>
        <input
          type="number" value={value} onChange={e => onChange(Number(e.target.value))}
          style={{
            width: "100%", padding: "0.75rem 1rem 0.75rem 1.75rem",
            background: focused ? T.surfaceCard : T.surfaceLow,
            border: "none",
            borderBottom: `2px solid ${focused ? T.primary : "rgba(118,118,131,0.15)"}`,
            borderRadius: "0.5rem 0.5rem 0 0",
            fontSize: "1rem", color: T.onSurface, fontFamily: T.fontBody, outline: "none", transition: "all 200ms",
          }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function DecisionForm({ onSubmit, onBack, loading }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<DecisionInput>(defaultInput);

  const set = <K extends keyof DecisionInput>(k: K) => (v: DecisionInput[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const canContinue = form.title.trim().length > 2;
  const canSubmit   = form.altA.trim().length > 5;

  const levels: [DecisionLevel, string, string][] = [
    ["cotidiana",  "Cotidiana",  T.teal],
    ["carrera",    "Carrera",    T.primaryFixed],
    ["financiera", "Financiera", T.water],
  ];

  return (
    <div style={{
      maxWidth: 600, margin: "0 auto",
      padding: "5.5rem 1.5rem 7rem",
      fontFamily: T.fontBody,
    }}>

      {/* Back */}
      <button
        onClick={step === 1 ? onBack : () => setStep(1)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: T.outline, fontSize: "0.8125rem", marginBottom: "2rem",
          display: "flex", alignItems: "center", gap: "0.4rem",
          fontFamily: T.fontBody, padding: 0,
        }}
      >
        ← {step === 1 ? "Inicio" : "Paso anterior"}
      </button>

      {/* Progress */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2.5rem" }}>
        {[1, 2].map(n => (
          <div key={n} style={{
            height: 3, flex: 1, borderRadius: 9999,
            background: n <= step ? T.primary : T.surfaceHigh,
            transition: "background 300ms",
          }} />
        ))}
      </div>

      {/* ── PASO 1 ── */}
      {step === 1 && (
        <>
          <h2 style={{
            fontFamily: T.fontHead, fontStyle: "italic",
            fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
            fontWeight: 600, color: T.primary, marginBottom: "0.5rem",
          }}>
            Define la decisión
          </h2>
          <p style={{ color: T.onMuted, fontSize: "1rem", marginBottom: "2.5rem", lineHeight: 1.6 }}>
            Sé específico. Una decisión bien definida es la mitad del análisis.
          </p>

          <TextField
            label="¿Qué decisión estás evaluando?"
            value={form.title} onChange={set("title")}
            placeholder="Ej: Renunciar a mi trabajo para emprender"
          />

          {/* Tipo */}
          <div style={{ marginBottom: "2rem" }}>
            <label style={{
              display: "block", fontSize: "0.625rem", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.15em",
              color: T.onMuted, marginBottom: "0.75rem",
            }}>Tipo de decisión</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {levels.map(([val, label, accent]) => (
                <button
                  key={val}
                  onClick={() => set("level")(val)}
                  style={{
                    padding: "0.875rem 1.25rem", borderRadius: 12,
                    border: `2px solid ${form.level === val ? T.primary : "transparent"}`,
                    background: form.level === val ? T.surfaceCard : T.surfaceLow,
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    cursor: "pointer", transition: "all 150ms", textAlign: "left",
                  }}
                >
                  <span style={{
                    width: "0.5rem", height: "0.5rem", borderRadius: 9999,
                    background: accent, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: "0.9375rem", fontWeight: 500,
                    color: form.level === val ? T.primary : T.onMuted,
                    fontFamily: T.fontBody,
                  }}>{label}</span>
                  {form.level === val && (
                    <span style={{ marginLeft: "auto", color: T.primary, fontSize: "1rem" }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!canContinue}
            onClick={() => setStep(2)}
            style={{
              width: "100%",
              background: canContinue
                ? `linear-gradient(180deg, ${T.primary} 0%, ${T.primaryMid} 100%)`
                : T.surfaceHigh,
              color: canContinue ? "#ffffff" : T.outline,
              border: "none", padding: "1rem", borderRadius: 12,
              fontSize: "1rem", fontWeight: 600, fontFamily: T.fontBody,
              cursor: canContinue ? "pointer" : "not-allowed",
              transition: "all 200ms",
              boxShadow: canContinue ? "0 8px 24px rgba(0,6,102,0.18)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            }}
          >
            Continuar
            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>arrow_forward</span>
          </button>
        </>
      )}

      {/* ── PASO 2 ── */}
      {step === 2 && (
        <>
          <h2 style={{
            fontFamily: T.fontHead, fontStyle: "italic",
            fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
            fontWeight: 600, color: T.primary, marginBottom: "0.5rem",
          }}>
            Estructura la decisión
          </h2>
          <p style={{ color: T.onMuted, fontSize: "1rem", marginBottom: "1.75rem", lineHeight: 1.6 }}>
            Cada campo que rellenas entrena tu razonamiento.
          </p>

          <Collapse title="Impacto">
            <TextField label="¿Qué cambia si decides A (sí / hacerlo)?"
              value={form.altA} onChange={set("altA")}
              placeholder="Describe los cambios concretos" multi />
            <TextField label="¿Qué cambia si decides B (no / alternativa)?"
              value={form.altB} onChange={set("altB")}
              placeholder="Describe los cambios concretos" multi />
          </Collapse>

          <Collapse title="Riesgo">
            <SliderRow label="Probabilidad de que funcione"
              value={form.probability} onChange={set("probability")} />
            <NumberField label="Valor si funciona"
              value={form.valueSuccess} onChange={set("valueSuccess")} />
            <NumberField label="Valor si falla (puede ser negativo)"
              value={form.valueFailure} onChange={set("valueFailure")} />
            <TextField label="Describe el peor escenario posible"
              value={form.worstScenario} onChange={set("worstScenario")}
              placeholder="Sé honesto, no dramatices" multi />
            <SliderRow label="Severidad del peor escenario"
              value={form.worstSeverity} onChange={set("worstSeverity")}
              min={1} max={10} suffix="/10" />
          </Collapse>

          <Collapse title="Reversibilidad">
            <SliderRow label="¿Qué tan fácil es deshacerla?"
              value={form.reversibilityScore} onChange={set("reversibilityScore")}
              min={0} max={10} suffix="/10" />
            <NumberField label="Costo estimado de revertir la decisión"
              value={form.revertCost} onChange={set("revertCost")} />
          </Collapse>

          <Collapse title="Horizonte temporal">
            <TextField label="¿Cómo te afecta en 6 meses?"
              value={form.impact6m} onChange={set("impact6m")}
              placeholder="Impacto a corto plazo" multi />
            <TextField label="¿Cómo te afecta en 3 años?"
              value={form.impact3y} onChange={set("impact3y")}
              placeholder="Impacto a largo plazo" multi />
          </Collapse>

          <Collapse title="Costo de oportunidad">
            <TextField label="¿Qué dejas de hacer si eliges A?"
              value={form.opportunityDesc} onChange={set("opportunityDesc")}
              placeholder="La mejor alternativa que sacrificas" multi />
            <NumberField label="Valor estimado de lo que sacrificas"
              value={form.opportunityCost} onChange={set("opportunityCost")} />
          </Collapse>

          <button
            disabled={!canSubmit || loading}
            onClick={() => onSubmit(form)}
            style={{
              width: "100%", marginTop: "0.5rem",
              background: canSubmit && !loading
                ? `linear-gradient(180deg, ${T.primary} 0%, ${T.primaryMid} 100%)`
                : T.surfaceHigh,
              color: canSubmit && !loading ? "#ffffff" : T.outline,
              border: "none", padding: "1.1rem", borderRadius: 12,
              fontSize: "1rem", fontWeight: 600, fontFamily: T.fontBody,
              cursor: canSubmit && !loading ? "pointer" : "not-allowed",
              transition: "all 200ms",
              boxShadow: canSubmit && !loading ? "0 8px 24px rgba(0,6,102,0.18)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              letterSpacing: "-0.01em",
            }}
          >
            {loading ? (
              <>Analizando…</>
            ) : (
              <>
                Evaluar decisión
                <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>query_stats</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
