import { useState, useEffect } from "react";
import type { DecisionInput, DecisionLevel } from "../types";
import { THEME } from "../theme/tokens";
import { TREE } from "../data/tree";
import type { Domain, Branch, Subbranch, Leaf } from "../data/tree";

interface Props {
  onSubmit: (input: DecisionInput) => void;
  onBack:   () => void;
  loading:  boolean;
}

type Step = "domain" | "branch" | "subbranch" | "leaf" | "details";

const BASE_URL = (typeof window !== "undefined" && (window as any)?.Capacitor?.isNativePlatform?.())
  ? "https://lexipop-decisions-production.up.railway.app"
  : "";

const DOMAIN_ACCENT: Record<string, { bg: string; color: string }> = {
  cotidiana:  { bg: "#fef8e1", color: "#7a5a00" },
  relaciones: { bg: "#fde8e5", color: "#8a2010" },
  carrera:    { bg: "#e0f0e8", color: "#0a4a28" },
  finanzas:   { bg: "#e8edf8", color: "#1a2a6a" },
  identidad:  { bg: "#f0e8f8", color: "#4a1a7a" },
};

function Breadcrumb({ domain, branch, subbranch, leaf, onClickDomain, onClickBranch, onClickSubbranch }: {
  domain?: Domain; branch?: Branch; subbranch?: Subbranch; leaf?: Leaf;
  onClickDomain: () => void; onClickBranch: () => void; onClickSubbranch: () => void;
}) {
  if (!domain) return null;
  const parts = [
    { label: domain.label,    onClick: onClickDomain,    dim: !!(branch) },
    branch    ? { label: branch.label,    onClick: onClickBranch,    dim: !!(subbranch || leaf) } : null,
    subbranch ? { label: subbranch.label, onClick: onClickSubbranch, dim: !!(leaf) } : null,
    leaf      ? { label: leaf.label,      onClick: () => {},         dim: false } : null,
  ].filter(Boolean) as { label: string; onClick: () => void; dim: boolean }[];

  return (
    <div style={{ display: "flex", flexWrap: "wrap" as const, alignItems: "center", gap: "0.25rem 0.375rem", marginBottom: "2rem" }}>
      {parts.map((p, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          {i > 0 && <span style={{ color: THEME.outline, fontSize: "0.75rem" }}>›</span>}
          <button onClick={p.onClick} disabled={!p.dim} style={{
            background: "none", border: "none", padding: 0,
            cursor: p.dim ? "pointer" : "default",
            fontFamily: THEME.fontBody, fontSize: "0.8125rem",
            fontWeight: p.dim ? 400 : 700,
            color: p.dim ? THEME.outline : THEME.onSurface,
            textDecoration: p.dim ? "underline" : "none",
            textDecorationColor: "rgba(0,0,0,0.18)",
            maxWidth: "10rem", overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
          }}>{p.label}</button>
        </span>
      ))}
    </div>
  );
}

function SelectItem({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", background: hovered ? THEME.surfaceCard : THEME.surfaceLow,
        border: `1.5px solid ${hovered ? THEME.primary : "transparent"}`,
        borderRadius: "0.875rem", padding: "1rem 1.25rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer", textAlign: "left" as const,
        transition: "all 150ms", fontFamily: THEME.fontBody,
        boxShadow: hovered ? "0 2px 12px rgba(0,0,0,0.07)" : "none",
      }}
    >
      <span style={{ fontSize: "0.9375rem", color: THEME.onSurface, fontWeight: 500, lineHeight: 1.4 }}>
        {label}
      </span>
      <span style={{ fontSize: "1.125rem", color: hovered ? THEME.primary : THEME.outline, marginLeft: "0.75rem", flexShrink: 0, transition: "color 150ms" }}>›</span>
    </button>
  );
}

function SliderField({ label, value, onChange, max = 100, suffix = "%" }: {
  label: string; value: number | undefined;
  onChange: (v: number) => void; max?: number; suffix?: string;
}) {
  const touched = value !== undefined;
  const display = touched ? value! : Math.round(max / 2);
  const pct = (display / max) * 100;
  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.625rem" }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 600, color: THEME.onMuted, lineHeight: 1.45, fontFamily: THEME.fontBody, flex: 1 }}>{label}</label>
        {touched ? (
          <span style={{ fontWeight: 700, color: THEME.primary, fontFamily: THEME.fontHead, fontSize: "1.1rem", flexShrink: 0, marginLeft: "0.75rem" }}>{value}{suffix}</span>
        ) : (
          <span style={{ fontSize: "0.75rem", color: THEME.outline, fontStyle: "italic", flexShrink: 0, marginLeft: "0.75rem" }}>sin respuesta</span>
        )}
      </div>
      <input type="range" min={0} max={max} value={display}
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
        <p style={{ textAlign: "center", fontSize: "0.6875rem", color: THEME.outline, marginTop: "0.4rem", fontStyle: "italic" }}>
          Mueve para responder — si no lo tocas no se incluye en el análisis
        </p>
      )}
    </div>
  );
}

const PERIODOS = [
  { id: "operacion", label: "Por operación" },
  { id: "mes",       label: "Al mes"        },
  { id: "anio",      label: "Al año"        },
  { id: "total",     label: "Total / ciclo completo" },
];

function NumberField({ label, value, period, onChange, onPeriodChange, placeholder }: {
  label: string; value: number | undefined; period: string;
  onChange: (v: number | undefined) => void; onPeriodChange: (p: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: THEME.onMuted, marginBottom: "0.5rem", lineHeight: 1.45, fontFamily: THEME.fontBody }}>{label}</label>
      <input type="number" value={value ?? ""} placeholder={placeholder ?? "0"}
        onChange={e => { const v = e.target.value; onChange(v === "" ? undefined : Number(v)); }}
        style={{
          width: "100%", padding: "0.75rem 1rem", background: THEME.surfaceLow,
          border: "none", borderBottom: `2px solid rgba(118,118,131,0.15)`,
          borderRadius: "0.5rem 0.5rem 0 0", fontSize: "1rem",
          fontFamily: THEME.fontBody, color: THEME.onSurface, outline: "none",
        }}
      />
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.5rem", marginTop: "0.625rem" }}>
        {PERIODOS.map(p => (
          <button key={p.id} type="button" onClick={() => onPeriodChange(p.id)} style={{
            padding: "0.5rem 0.875rem", borderRadius: 9999,
            border: `2px solid ${period === p.id ? THEME.primary : "rgba(118,118,131,0.2)"}`,
            background: period === p.id ? THEME.primary : "transparent",
            color: period === p.id ? "#ffffff" : THEME.onMuted,
            fontSize: "0.8125rem", fontWeight: 600, fontFamily: THEME.fontBody,
            cursor: "pointer", transition: "all 150ms",
          }}>{p.label}</button>
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
    probability: undefined, worstScenario: "",
    reversibilityScore: undefined, opportunityDesc: "",
    valueSuccess: undefined, valueSuccessPeriod: "total",
    valueFailure: undefined, valueFailurePeriod: "total",
    opportunityCost: undefined, opportunityCostPeriod: "total",
    revertCost: undefined,
  });

  useEffect(() => {
    fetch(`${BASE_URL}/api/decision/generate-questions`, {
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
      Error cargando preguntas. Recarga la página.
    </div>
  );

  const canSubmit = form.altA.trim().length > 1 && form.altB.trim().length > 1;

  const inputStyle = {
    width: "100%", padding: "0.75rem 1rem", background: THEME.surfaceLow,
    border: "none", borderBottom: `2px solid rgba(118,118,131,0.15)`,
    borderRadius: "0.5rem 0.5rem 0 0", fontSize: "1rem",
    fontFamily: THEME.fontBody, color: THEME.onSurface,
    outline: "none", resize: "vertical" as const,
  };

  const labelStyle = {
    display: "block", fontSize: "0.8125rem", fontWeight: 600 as const,
    color: THEME.onMuted, marginBottom: "0.625rem",
    lineHeight: 1.45, fontFamily: THEME.fontBody,
  };

  const PERIOD_MULTIPLIER: Record<string, number> = { operacion: 1, mes: 12, anio: 1, total: 1 };

  function annualize(value: number | undefined, period: string): number {
    if (!value) return 0;
    return value * (PERIOD_MULTIPLIER[period] ?? 1);
  }

  return (
    <>
      <div style={{ background: THEME.primary, borderRadius: 12, padding: "0.875rem 1.25rem", marginBottom: "2rem" }}>
        <div style={{ fontSize: "0.5625rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.3rem" }}>
          Tu decisión
        </div>
        <div style={{ fontFamily: THEME.fontHead, fontStyle: "italic", fontSize: "1.05rem", color: "#ffffff", lineHeight: 1.3 }}>
          {title}
        </div>
      </div>

      <h2 style={{ fontFamily: THEME.fontHead, fontStyle: "italic", fontSize: "clamp(1.5rem, 5vw, 1.875rem)", fontWeight: 600, color: THEME.primary, marginBottom: "0.5rem" }}>
        Cuéntame más
      </h2>
      <p style={{ color: THEME.onMuted, fontSize: "0.9375rem", marginBottom: "2rem", lineHeight: 1.6 }}>
        Responde lo que puedas. Los sliders grises no se incluyen en el análisis si no los tocas.
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

      <SliderField label={questions.probabilityQuestion} value={form.probability}
        onChange={v => setForm(f => ({ ...f, probability: v }))} max={100} suffix="%" />

      <div style={{ marginBottom: "1.75rem" }}>
        <label style={labelStyle}>{questions.worstScenarioQuestion}</label>
        <textarea rows={2} value={form.worstScenario} style={inputStyle}
          onChange={e => setForm(f => ({ ...f, worstScenario: e.target.value }))}
          placeholder="Sé honesto, no dramatices..." />
      </div>

      <SliderField label={questions.reversibilityQuestion} value={form.reversibilityScore}
        onChange={v => setForm(f => ({ ...f, reversibilityScore: v }))} max={10} suffix="/10" />

      <div style={{ marginBottom: "1.75rem" }}>
        <label style={labelStyle}>{questions.opportunityQuestion}</label>
        <textarea rows={2} value={form.opportunityDesc} style={inputStyle}
          onChange={e => setForm(f => ({ ...f, opportunityDesc: e.target.value }))}
          placeholder="¿Qué dejas de hacer si eliges esto?" />
      </div>

      <div style={{ borderTop: `1px solid rgba(118,118,131,0.15)`, paddingTop: "1.5rem", marginBottom: "1.75rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", userSelect: "none" as const }}>
          <div onClick={() => setWantsFinancial(w => !w)} style={{
            width: "1.25rem", height: "1.25rem", borderRadius: "0.375rem", flexShrink: 0,
            border: `2px solid ${wantsFinancial ? THEME.primary : THEME.outline}`,
            background: wantsFinancial ? THEME.primary : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 150ms", cursor: "pointer",
          }}>
            {wantsFinancial && <span style={{ color: "#fff", fontSize: "0.75rem", fontWeight: 700, lineHeight: 1 }}>&#10003;</span>}
          </div>
          <span style={{ fontSize: "0.9375rem", color: THEME.onMuted, fontFamily: THEME.fontBody }}>
            Quiero incluir el análisis financiero (números opcionales)
          </span>
        </label>
      </div>

      {wantsFinancial && (
        <div style={{ background: THEME.surfaceLow, borderRadius: 12, padding: "1.25rem", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "0.625rem", fontWeight: 700, color: THEME.outline, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "1rem" }}>
            Datos financieros
          </div>
          <NumberField label="Si funciona: cuánto dinero entra" value={form.valueSuccess} period={form.valueSuccessPeriod}
            onChange={v => setForm(f => ({ ...f, valueSuccess: v }))} onPeriodChange={p => setForm(f => ({ ...f, valueSuccessPeriod: p }))} placeholder="Ej: 50000" />
          <NumberField label="Si falla: cuánto dinero sale de tu bolsillo" value={form.valueFailure} period={form.valueFailurePeriod}
            onChange={v => setForm(f => ({ ...f, valueFailure: v }))} onPeriodChange={p => setForm(f => ({ ...f, valueFailurePeriod: p }))} placeholder="Ej: 20000" />
          <NumberField label="Costo de oportunidad: cuánto dejas de percibir con otra opción" value={form.opportunityCost} period={form.opportunityCostPeriod}
            onChange={v => setForm(f => ({ ...f, opportunityCost: v }))} onPeriodChange={p => setForm(f => ({ ...f, opportunityCostPeriod: p }))} placeholder="Ej: 30000" />
          <NumberField label="Cuánto costaría dar marcha atrás si sale mal" value={form.revertCost} period="total"
            onChange={v => setForm(f => ({ ...f, revertCost: v }))} onPeriodChange={() => {}} placeholder="Ej: 5000" />
        </div>
      )}

      <button
        disabled={!canSubmit || loading}
        onClick={() => onSubmit({
          title, level,
          altA: form.altA, altB: form.altB,
          probability:        form.probability!,
          worstScenario:      form.worstScenario,
          reversibilityScore: form.reversibilityScore!,
          opportunityDesc:    form.opportunityDesc,
          valueSuccess:       annualize(form.valueSuccess,    form.valueSuccessPeriod),
          valueFailure:       -(annualize(form.valueFailure,  form.valueFailurePeriod)),
          opportunityCost:    annualize(form.opportunityCost, form.opportunityCostPeriod),
          revertCost:         form.revertCost ?? 0,
          worstSeverity: 5, impact6m: "", impact3y: "",
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
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 200ms",
        }}
      >
        {loading ? "Analizando..." : "Evaluar decisión"}
      </button>
    </>
  );
}

export default function DecisionForm({ onSubmit, onBack, loading }: Props) {
  const [step,        setStep]        = useState<Step>("domain");
  const [domain,      setDomain]      = useState<Domain | null>(null);
  const [branch,      setBranch]      = useState<Branch | null>(null);
  const [subbranch,   setSubbranch]   = useState<Subbranch | null>(null);
  const [leaf,        setLeaf]        = useState<Leaf | null>(null);
  const [customTitle, setCustomTitle] = useState("");

  function goBack() {
    if (step === "domain")    return onBack();
    if (step === "branch")    { setDomain(null);   return setStep("domain"); }
    if (step === "subbranch") { setBranch(null);   return setStep("branch"); }
    if (step === "leaf")      {
      if (subbranch) { setSubbranch(null); return setStep("subbranch"); }
      return setStep("branch");
    }
    if (step === "details")   { setLeaf(null); setCustomTitle(""); return setStep("leaf"); }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" || (e.altKey && e.key === "ArrowLeft")) {
        e.preventDefault(); goBack();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step, subbranch]);

  const title = leaf?.label ?? customTitle;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "5.5rem 1.5rem 7rem", fontFamily: THEME.fontBody }}>

      <button onClick={goBack} style={{
        background: "none", border: "none", cursor: "pointer",
        color: THEME.outline, fontSize: "0.8125rem", marginBottom: "1.5rem",
        display: "flex", alignItems: "center", gap: "0.4rem",
        fontFamily: THEME.fontBody, padding: 0,
      }}>
        &larr; {step === "domain" ? "Inicio" : "Atrás"}
      </button>

      <Breadcrumb
        domain={domain ?? undefined}
        branch={branch ?? undefined}
        subbranch={subbranch ?? undefined}
        leaf={step === "details" && leaf ? leaf : undefined}
        onClickDomain={() => { setDomain(null); setBranch(null); setSubbranch(null); setLeaf(null); setCustomTitle(""); setStep("domain"); }}
        onClickBranch={() => { setBranch(null); setSubbranch(null); setLeaf(null); setCustomTitle(""); setStep("branch"); }}
        onClickSubbranch={() => { setSubbranch(null); setLeaf(null); setCustomTitle(""); setStep("subbranch"); }}
      />

      {step === "domain" && (
        <>
        <div style={{ marginBottom: "2rem", borderRadius: "1rem", overflow: "hidden" }}>
            <img
              src="/img-camino.png"
              alt=""
              style={{
                width: "100%",
                aspectRatio: "3 / 1",
                objectFit: "cover",
                objectPosition: "center 40%",
                display: "block",
              }}
            />
          </div>
          <h2 style={{ fontFamily: THEME.fontHead, fontStyle: "italic", fontSize: "clamp(1.75rem, 6vw, 2.25rem)", fontWeight: 600, color: THEME.primary, marginBottom: "0.5rem" }}>
            ¿Qué tipo de decisión tienes?
          </h2>
          <p style={{ color: THEME.onMuted, fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.6 }}>
            Elige el área que mejor describe tu situación.
          </p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem" }}>
            {TREE.map(d => {
              const accent = DOMAIN_ACCENT[d.id] ?? { bg: THEME.surfaceLow, color: THEME.onMuted };
              return (
                <button key={d.id} onClick={() => { setDomain(d); setStep("branch"); }}
                  style={{
                    background: accent.bg, border: "none", borderRadius: "1rem",
                    padding: "1.125rem 1.375rem",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer", textAlign: "left" as const, transition: "all 150ms",
                    fontFamily: THEME.fontBody,
                  }}>
                  <span style={{ fontSize: "1rem", fontWeight: 600, color: accent.color }}>{d.label}</span>
                  <span style={{ fontSize: "1.125rem", color: accent.color, opacity: 0.6 }}>›</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === "branch" && domain && (
        <>
          <h2 style={{ fontFamily: THEME.fontHead, fontStyle: "italic", fontSize: "clamp(1.5rem, 6vw, 2rem)", fontWeight: 600, color: THEME.primary, marginBottom: "0.5rem" }}>
            ¿Qué área específica?
          </h2>
          <p style={{ color: THEME.onMuted, fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.6 }}>
            Elige la que más se acerca.
          </p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.5rem" }}>
            {domain.branches.map(b => (
              <SelectItem key={b.id} label={b.label} onClick={() => {
                setBranch(b);
                setStep(b.subbranches?.length ? "subbranch" : "leaf");
              }} />
            ))}
          </div>
        </>
      )}

      {step === "subbranch" && branch && (
        <>
          <h2 style={{ fontFamily: THEME.fontHead, fontStyle: "italic", fontSize: "clamp(1.5rem, 6vw, 2rem)", fontWeight: 600, color: THEME.primary, marginBottom: "0.5rem" }}>
            ¿Qué está pasando?
          </h2>
          <p style={{ color: THEME.onMuted, fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.6 }}>
            Afina un poco más.
          </p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.5rem" }}>
            {branch.subbranches!.map(s => (
              <SelectItem key={s.id} label={s.label} onClick={() => { setSubbranch(s); setStep("leaf"); }} />
            ))}
          </div>
        </>
      )}

      {step === "leaf" && (
        <>
          <h2 style={{ fontFamily: THEME.fontHead, fontStyle: "italic", fontSize: "clamp(1.5rem, 6vw, 2rem)", fontWeight: 600, color: THEME.primary, marginBottom: "0.5rem" }}>
            ¿Cuál es tu decisión?
          </h2>
          <p style={{ color: THEME.onMuted, fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.6 }}>
            Elige la situación que más se parece a la tuya.
          </p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.5rem", marginBottom: "2rem" }}>
            {(subbranch?.leaves ?? branch?.leaves ?? []).map(l => (
              <SelectItem key={l.id} label={l.label} onClick={() => { setLeaf(l); setStep("details"); }} />
            ))}
          </div>

          <div style={{ borderTop: `1px solid rgba(118,118,131,0.15)`, paddingTop: "1.5rem" }}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: THEME.outline, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: "0.875rem" }}>
              O describe la tuya
            </p>
            <textarea rows={2} value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="Ej: Debería aceptar este proyecto o esperar otro mejor"
              style={{
                width: "100%", padding: "0.875rem", background: THEME.surfaceLow,
                border: "none", borderBottom: `2px solid rgba(118,118,131,0.15)`,
                borderRadius: "0.5rem 0.5rem 0 0", fontSize: "1rem",
                fontFamily: THEME.fontBody, resize: "vertical" as const,
                marginBottom: "1rem", outline: "none", color: THEME.onSurface,
              }}
            />
            <button
              onClick={() => { if (customTitle.trim()) { setLeaf(null); setStep("details"); } }}
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
            >Analizar esta decisión</button>
          </div>
        </>
      )}

      {step === "details" && domain && (
        <DynamicQuestions
          title={title}
          level={domain.id as DecisionLevel}
          onSubmit={onSubmit}
          loading={loading}
        />
      )}

    </div>
  );
}