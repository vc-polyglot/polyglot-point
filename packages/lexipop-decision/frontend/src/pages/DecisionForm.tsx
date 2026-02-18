import { useState } from "react";
import type { DecisionInput, DecisionLevel } from "../types";

interface Props {
  onSubmit: (input: DecisionInput) => void;
  onBack:   () => void;
  loading:  boolean;
}

const defaultInput: DecisionInput = {
  title: "", level: "cotidiana",
  altA: "", altB: "",
  probability: 60, valueSuccess: 10000, valueFailure: -2000,
  worstScenario: "", worstSeverity: 5,
  reversibilityScore: 5, revertCost: 0,
  impact6m: "", impact3y: "",
  opportunityCost: 0, opportunityDesc: "",
};

function Collapse({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border: "1.5px solid var(--border)", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", background: open ? "var(--blue-light)" : "var(--bg-muted)",
        border: "none", padding: "14px 18px", display: "flex", justifyContent: "space-between",
        alignItems: "center", cursor: "pointer",
      }}>
        <span style={{ fontWeight: 500, fontSize: 14 }}>{icon} {title}</span>
        <span style={{ color: "var(--text-mid)", transform: open ? "rotate(180deg)" : "none", transition: "0.2s", fontSize: 12 }}>▾</span>
      </button>
      {open && <div style={{ padding: "20px 18px 8px", background: "var(--bg-card)" }}>{children}</div>}
    </div>
  );
}

function SliderRow({ label, value, onChange, min = 0, max = 100, suffix = "%" }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; suffix?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-mid)" }}>{label}</label>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--blue)", fontFamily: "'DM Serif Display',serif" }}>
          {value}{suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))} style={{ width: "100%" }} />
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, multi }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multi?: boolean;
}) {
  const shared = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1.5px solid var(--border)", fontSize: 14, background: "var(--bg-muted)",
    outline: "none", transition: "border 0.2s", resize: "vertical" as const,
  };
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-mid)", marginBottom: 8 }}>{label}</label>
      {multi
        ? <textarea rows={2} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={shared}
            onFocus={e => e.target.style.borderColor = "var(--blue)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{ ...shared, resize: undefined }}
            onFocus={e => e.target.style.borderColor = "var(--blue)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"} />
      }
    </div>
  );
}

function NumberField({ label, value, onChange, prefix = "$" }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-mid)", marginBottom: 8 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-mid)", fontSize: 14 }}>{prefix}</span>
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
          style={{ width: "100%", padding: "11px 14px 11px 28px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, background: "var(--bg-muted)", outline: "none" }}
          onFocus={e => e.target.style.borderColor = "var(--blue)"}
          onBlur={e => e.target.style.borderColor = "var(--border)"} />
      </div>
    </div>
  );
}

export default function DecisionForm({ onSubmit, onBack, loading }: Props) {
  const [step, setStep]   = useState<1 | 2>(1);
  const [form, setForm]   = useState<DecisionInput>(defaultInput);

  const set = <K extends keyof DecisionInput>(k: K) => (v: DecisionInput[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const canContinue = form.title.trim().length > 2;
  const canSubmit   = form.altA.trim().length > 5;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 24px 64px" }} className="fade-up">

      {/* Header */}
      <button onClick={step === 1 ? onBack : () => setStep(1)} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "var(--text-mid)", fontSize: 13, marginBottom: 32, display: "flex", alignItems: "center", gap: 6,
      }}>← {step === 1 ? "Inicio" : "Paso anterior"}
      </button>

      {/* Progress */}
      <div style={{ display: "flex", gap: 8, marginBottom: 36 }}>
        {[1, 2].map(n => (
          <div key={n} style={{
            height: 3, flex: 1, borderRadius: 2,
            background: n <= step ? "var(--blue)" : "var(--border)", transition: "background 0.3s",
          }} />
        ))}
      </div>

      {step === 1 && (
        <>
          <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, fontWeight: 400, marginBottom: 8 }}>
            Define la decisión
          </h2>
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginBottom: 36 }}>
            Sé específico. Una decisión bien definida es la mitad del análisis.
          </p>

          <TextField label="¿Qué decisión estás evaluando?" value={form.title}
            onChange={set("title")} placeholder="Ej: Renunciar a mi trabajo para emprender" />

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-mid)", marginBottom: 10 }}>
              Tipo de decisión
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {([
                ["cotidiana",  "🌱 Cotidiana"],
                ["carrera",    "🚀 Carrera"],
                ["financiera", "💰 Financiera mayor"],
              ] as [DecisionLevel, string][]).map(([val, label]) => (
                <button key={val} onClick={() => set("level")(val)} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", border: "1.5px solid",
                  borderColor: form.level === val ? "var(--blue)" : "var(--border)",
                  background:  form.level === val ? "var(--blue-light)" : "var(--bg-card)",
                  color:       form.level === val ? "var(--blue)" : "var(--text-mid)",
                  transition: "all 0.15s",
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button disabled={!canContinue} onClick={() => setStep(2)} style={{
            width: "100%", background: canContinue ? "var(--blue)" : "var(--border)",
            color: "white", border: "none", padding: "14px", borderRadius: 12,
            fontSize: 15, fontWeight: 600, cursor: canContinue ? "pointer" : "not-allowed", transition: "0.2s",
          }}>
            Continuar →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, fontWeight: 400, marginBottom: 8 }}>
            Estructura la decisión
          </h2>
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginBottom: 28 }}>
            Completa cada sección. Cada campo que rellenas entrena tu razonamiento.
          </p>

          <Collapse title="Impacto" icon="🔹">
            <TextField label="¿Qué cambia si decides A (sí/hacerlo)?" value={form.altA}
              onChange={set("altA")} placeholder="Describe los cambios concretos" multi />
            <TextField label="¿Qué cambia si decides B (no/alternativa)?" value={form.altB}
              onChange={set("altB")} placeholder="Describe los cambios concretos" multi />
          </Collapse>

          <Collapse title="Riesgo" icon="🔹">
            <SliderRow label="Probabilidad de que funcione" value={form.probability}
              onChange={set("probability")} />
            <NumberField label="Valor si funciona (monetario o puntaje)" value={form.valueSuccess}
              onChange={set("valueSuccess")} />
            <NumberField label="Valor si falla (puede ser negativo)" value={form.valueFailure}
              onChange={set("valueFailure")} />
            <TextField label="Describe el peor escenario posible" value={form.worstScenario}
              onChange={set("worstScenario")} placeholder="Sé honesto, no dramatices" multi />
            <SliderRow label="Severidad del peor escenario" value={form.worstSeverity}
              onChange={set("worstSeverity")} min={1} max={10} suffix="/10" />
          </Collapse>

          <Collapse title="Reversibilidad" icon="🔹">
            <SliderRow label="¿Qué tan fácil es deshacerla?" value={form.reversibilityScore}
              onChange={set("reversibilityScore")} min={0} max={10} suffix="/10" />
            <NumberField label="Costo estimado de revertir la decisión" value={form.revertCost}
              onChange={set("revertCost")} />
          </Collapse>

          <Collapse title="Horizonte temporal" icon="🔹">
            <TextField label="¿Cómo te afecta en 6 meses?" value={form.impact6m}
              onChange={set("impact6m")} placeholder="Impacto a corto plazo" multi />
            <TextField label="¿Cómo te afecta en 3 años?" value={form.impact3y}
              onChange={set("impact3y")} placeholder="Impacto a largo plazo" multi />
          </Collapse>

          <Collapse title="Costo de oportunidad" icon="🔹">
            <TextField label="¿Qué dejas de hacer si eliges A?" value={form.opportunityDesc}
              onChange={set("opportunityDesc")} placeholder="La mejor alternativa que sacrificas" multi />
            <NumberField label="Valor estimado de lo que sacrificas" value={form.opportunityCost}
              onChange={set("opportunityCost")} />
          </Collapse>

          <button disabled={!canSubmit || loading} onClick={() => onSubmit(form)} style={{
            width: "100%", marginTop: 8,
            background: canSubmit && !loading ? "var(--blue)" : "var(--border)",
            color: "white", border: "none", padding: "16px",
            borderRadius: 12, fontSize: 16, fontWeight: 600,
            cursor: canSubmit && !loading ? "pointer" : "not-allowed", transition: "0.2s",
            letterSpacing: "-0.01em",
          }}>
            {loading ? "Analizando…" : "🔵 Evaluar decisión"}
          </button>
        </>
      )}
    </div>
  );
}