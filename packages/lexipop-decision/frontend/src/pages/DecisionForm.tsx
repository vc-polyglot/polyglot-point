import { useState } from "react";
import type { DecisionInput, DecisionLevel } from "../types";

interface Props {
  onSubmit: (input: DecisionInput) => void;
  onBack:   () => void;
  loading:  boolean;
}

// ── Tokens ────────────────────────────────────────────────────────────────────
const T = {
  primary:      "#000666",
  primaryMid:   "#1a237e",
  primaryFixed: "#e0e0ff",
  surfaceLow:   "#f5f3ef",
  surfaceCard:  "#ffffff",
  surfaceHigh:  "#eae8e4",
  teal:         "#beebe7",
  water:        "#d2e6ef",
  onSurface:    "#1b1c1a",
  onMuted:      "#454652",
  outline:      "#767683",
  fontHead:     "'Newsreader', Georgia, serif",
  fontBody:     "'Inter', system-ui, sans-serif",
};

// ── Categorías y sub-opciones ─────────────────────────────────────────────────
const CATEGORIES: {
  id: DecisionLevel;
  label: string;
  accent: string;
  emoji: string;
  subs: string[];
}[] = [
  {
    id: "cotidiana", label: "Cotidiana", accent: T.teal, emoji: "🌿",
    subs: [
      "Salud y bienestar",
      "Hogar o vivienda",
      "Compra importante",
      "Hábitos o rutinas",
      "Relaciones personales",
    ],
  },
  {
    id: "carrera", label: "Carrera", accent: T.primaryFixed, emoji: "🎯",
    subs: [
      "Cambio de trabajo",
      "Estudios o formación",
      "Emprendimiento",
      "Proyecto o ascenso",
      "Trabajo freelance",
    ],
  },
  {
    id: "financiera", label: "Financiera", accent: T.water, emoji: "💡",
    subs: [
      "Inversión o ahorro",
      "Deuda o crédito",
      "Seguro o protección",
      "Gasto mayor",
      "Retiro o patrimonio",
    ],
  },
];

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
        <span style={{ fontFamily: T.fontHead, fontStyle: "italic", fontSize: "1rem", fontWeight: 600, color: T.primary }}>
          {title}
        </span>
        <span style={{
          color: T.outline, fontSize: "0.85rem",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 200ms",
        }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: "1.25rem 1.25rem 0.5rem", background: T.surfaceCard }}>
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
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.625rem" }}>
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
          background: `linear-gradient(to right, ${T.primary} ${pct}%, ${T.surfaceHigh} ${pct}%)`,
          borderRadius: 9999, appearance: "none", WebkitAppearance: "none",
          cursor: "pointer", outline: "none",
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
  const base: React.CSSProperties = {
    width: "100%", padding: "0.875rem 1rem",
    background: focused ? "#fff" : T.surfaceLow,
    border: `1.5px solid ${focused ? T.primary : "transparent"}`,
    borderRadius: 10,
    fontSize: "1rem", color: T.onSurface, fontFamily: T.fontBody,
    outline: "none", transition: "all 200ms", boxSizing: "border-box",
    boxShadow: focused ? "0 0 0 3px rgba(0,6,102,0.08)" : "none",
  };
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label style={{
        display: "block", fontSize: "0.6875rem", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.12em",
        color: focused ? T.primary : T.onMuted,
        fontFamily: T.fontBody, marginBottom: "0.5rem",
        transition: "color 200ms",
      }}>{label}</label>
      {multi
        ? <textarea rows={2} value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} style={{ ...base, resize: "vertical" as const }}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} style={base}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      }
    </div>
  );
}

// NumberField: type="text" — acepta negativos, comas, cualquier signo
function NumberField({ label, value, onChange, prefix = "$" }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw]         = useState(String(value));

  function handleChange(s: string) {
    setRaw(s);
    const n = parseFloat(s.replace(/,/g, ""));
    if (!isNaN(n)) onChange(n);
  }

  function handleBlur() {
    setFocused(false);
    const n = parseFloat(raw.replace(/,/g, ""));
    if (!isNaN(n)) setRaw(String(n));
  }

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label style={{
        display: "block", fontSize: "0.6875rem", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.12em",
        color: focused ? T.primary : T.onMuted,
        fontFamily: T.fontBody, marginBottom: "0.5rem",
        transition: "color 200ms",
      }}>{label}</label>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)",
          color: T.outline, fontSize: "0.875rem", fontFamily: T.fontBody, pointerEvents: "none",
        }}>{prefix}</span>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          style={{
            width: "100%", padding: "0.875rem 1rem 0.875rem 2rem",
            background: focused ? "#fff" : T.surfaceLow,
            border: `1.5px solid ${focused ? T.primary : "transparent"}`,
            borderRadius: 10,
            fontSize: "1rem", color: T.onSurface, fontFamily: T.fontBody,
            outline: "none", transition: "all 200ms", boxSizing: "border-box",
            boxShadow: focused ? "0 0 0 3px rgba(0,6,102,0.08)" : "none",
          }}
        />
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function DecisionForm({ onSubmit, onBack, loading }: Props) {
  const [step,        setStep]        = useState<1 | 2>(1);
  const [form,        setForm]        = useState<DecisionInput>(defaultInput);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [otraText,    setOtraText]    = useState("");

  const set = <K extends keyof DecisionInput>(k: K) => (v: DecisionInput[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const activeCat = CATEGORIES.find(c => c.id === form.level)!;

  function syncTitle(sub: string | null, otra: string) {
    const t = sub === "otra" ? otra : (sub ?? "");
    setForm(prev => ({ ...prev, title: t }));
  }

  function pickCategory(id: DecisionLevel) {
    setSelectedSub(null);
    setOtraText("");
    setForm(prev => ({ ...prev, level: id, title: "" }));
  }

  function pickSub(sub: string) {
    setSelectedSub(sub);
    setOtraText("");
    syncTitle(sub, "");
  }

  function pickOtra() {
    setSelectedSub("otra");
    syncTitle("otra", otraText);
  }

  const effectiveTitle = selectedSub === "otra" ? otraText : (selectedSub ?? "");
  const canContinue    = effectiveTitle.trim().length > 2;
  const canSubmit      = form.altA.trim().length > 5;

  return (
    <div style={{
      maxWidth: 600, margin: "0 auto",
      padding: "7rem 1.5rem 7rem",
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
            fontWeight: 600, color: T.primary, marginBottom: "0.4rem",
          }}>
            Define la decisión
          </h2>
          <p style={{ color: T.onMuted, fontSize: "0.9375rem", marginBottom: "2rem", lineHeight: 1.6 }}>
            Sé específico. Una decisión bien definida es la mitad del análisis.
          </p>

          {/* Categorías */}
          <label style={{
            display: "block", fontSize: "0.6875rem", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.12em",
            color: T.onMuted, fontFamily: T.fontBody, marginBottom: "0.75rem",
          }}>¿Qué tipo de decisión es?</label>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => pickCategory(cat.id)}
                style={{
                  flex: 1, padding: "0.875rem 0.25rem",
                  borderRadius: 12,
                  border: `1.5px solid ${form.level === cat.id ? T.primary : "transparent"}`,
                  background: form.level === cat.id ? T.surfaceCard : T.surfaceLow,
                  cursor: "pointer", transition: "all 150ms", textAlign: "center",
                  boxShadow: form.level === cat.id ? "0 2px 12px rgba(0,6,102,0.1)" : "none",
                }}
              >
                <div style={{ fontSize: "1.375rem", marginBottom: "0.3rem" }}>{cat.emoji}</div>
                <div style={{
                  fontSize: "0.8125rem", fontWeight: 600,
                  color: form.level === cat.id ? T.primary : T.onMuted,
                  fontFamily: T.fontBody,
                }}>{cat.label}</div>
                <div style={{
                  width: "1.25rem", height: "3px", borderRadius: 9999,
                  background: cat.accent, margin: "0.4rem auto 0",
                }} />
              </button>
            ))}
          </div>

          {/* Sub-opciones */}
          <div style={{
            borderRadius: 14,
            background: T.surfaceLow,
            padding: "1rem",
            marginBottom: "1.25rem",
          }}>
            <label style={{
              display: "block", fontSize: "0.6875rem", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.12em",
              color: T.onMuted, fontFamily: T.fontBody, marginBottom: "0.75rem",
            }}>¿Sobre qué trata?</label>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {activeCat.subs.map(sub => (
                <button
                  key={sub}
                  onClick={() => pickSub(sub)}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: 10,
                    border: `1.5px solid ${selectedSub === sub ? T.primary : "transparent"}`,
                    background: selectedSub === sub ? T.surfaceCard : "rgba(255,255,255,0.6)",
                    cursor: "pointer", textAlign: "left",
                    fontSize: "0.9375rem", fontWeight: 500,
                    color: selectedSub === sub ? T.primary : T.onMuted,
                    fontFamily: T.fontBody,
                    transition: "all 150ms",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    boxShadow: selectedSub === sub ? "0 2px 8px rgba(0,6,102,0.08)" : "none",
                  }}
                >
                  {sub}
                  {selectedSub === sub && <span style={{ color: T.primary, fontSize: "0.875rem" }}>✓</span>}
                </button>
              ))}

              {/* Otra */}
              <button
                onClick={pickOtra}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: 10,
                  border: `1.5px solid ${selectedSub === "otra" ? T.primary : "transparent"}`,
                  background: selectedSub === "otra" ? T.surfaceCard : "rgba(255,255,255,0.6)",
                  cursor: "pointer", textAlign: "left",
                  fontSize: "0.9375rem", fontWeight: 500,
                  color: selectedSub === "otra" ? T.primary : T.onMuted,
                  fontFamily: T.fontBody,
                  transition: "all 150ms",
                }}
              >
                Otra…
              </button>

              {selectedSub === "otra" && (
                <textarea
                  autoFocus
                  rows={2}
                  value={otraText}
                  onChange={e => {
                    setOtraText(e.target.value);
                    syncTitle("otra", e.target.value);
                  }}
                  placeholder="Describe tu decisión aquí…"
                  style={{
                    width: "100%", padding: "0.875rem 1rem",
                    background: "#fff",
                    border: `1.5px solid ${T.primary}`,
                    borderRadius: 10,
                    fontSize: "1rem", color: T.onSurface, fontFamily: T.fontBody,
                    outline: "none", resize: "vertical" as const,
                    boxShadow: "0 0 0 3px rgba(0,6,102,0.08)",
                    boxSizing: "border-box", marginTop: "0.25rem",
                  }}
                />
              )}
            </div>
          </div>

          {/* Preview */}
          {canContinue && (
            <div style={{
              padding: "0.875rem 1rem",
              background: "rgba(0,6,102,0.05)",
              borderRadius: 10,
              marginBottom: "1.25rem",
              borderLeft: `3px solid ${T.primary}`,
            }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: T.primary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem", fontFamily: T.fontBody }}>
                Tu decisión
              </div>
              <div style={{ fontSize: "0.9375rem", color: T.onSurface, fontFamily: T.fontBody }}>
                {effectiveTitle}
              </div>
            </div>
          )}

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
              boxShadow: canContinue ? "0 8px 24px rgba(0,6,102,0.2)" : "none",
            }}
          >
            Continuar →
          </button>
        </>
      )}

      {/* ── PASO 2 ── */}
      {step === 2 && (
        <>
          <h2 style={{
            fontFamily: T.fontHead, fontStyle: "italic",
            fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
            fontWeight: 600, color: T.primary, marginBottom: "0.4rem",
          }}>
            Estructura la decisión
          </h2>
          <p style={{ color: T.onMuted, fontSize: "0.9375rem", marginBottom: "1.75rem", lineHeight: 1.6 }}>
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
              boxShadow: canSubmit && !loading ? "0 8px 24px rgba(0,6,102,0.2)" : "none",
              letterSpacing: "-0.01em",
            }}
          >
            {loading ? "Analizando…" : "Evaluar decisión →"}
          </button>
        </>
      )}
    </div>
  );
}
