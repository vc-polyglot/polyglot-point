// ─── Nivel de decisión ────────────────────────────────────────────────────────
export type DecisionLevel = "cotidiana" | "carrera" | "financiera";

// ─── Input del usuario (formulario completo) ──────────────────────────────────
export interface DecisionInput {
  title:              string;
  level:              DecisionLevel;

  // Alternativas
  altA:               string;   // descripción qué cambia con A
  altB:               string;   // descripción qué cambia con B

  // Riesgo
  probability:        number;   // 0–100 (% éxito estimado)
  valueSuccess:       number;   // valor monetario/cualitativo si funciona
  valueFailure:       number;   // valor si falla (puede ser negativo)
  worstScenario:      string;   // descripción del peor escenario
  worstSeverity:      number;   // 1–10

  // Reversibilidad
  reversibilityScore: number;   // 0–10 (0=irreversible, 10=fácil revertir)
  revertCost:         number;   // costo económico de revertir

  // Horizonte temporal
  impact6m:           string;   // descripción impacto a 6 meses
  impact3y:           string;   // descripción impacto a 3 años

  // Costo de oportunidad
  opportunityCost:    number;   // qué dejas de ganar/hacer
  opportunityDesc:    string;   // descripción de la alternativa sacrificada
}

// ─── Resultados matemáticos (capa 1 — determinística) ────────────────────────
export interface DecisionMetrics {
  expectedValue:          number;   // valor esperado bruto
  expectedValueNet:       number;   // valor esperado neto (descontando oportunidad)
  riskIndex:              number;   // 0–100
  irreversibilityIndex:   number;   // 0–100
  sensitivityThreshold:   number;   // % en que la prob. puede estar equivocada antes de cambiar resultado
  baseScenario:           "favorable" | "neutro" | "adverso";
  pessimisticValue:       number;
  warnings:               string[];
}

// ─── Análisis IA (capa 2) ─────────────────────────────────────────────────────
export interface AIAnalysis {
  blindSpots:            string[];
  riskAssessment:        string;
  biasFlags:             string[];
  structuralCommentary:  string;
  lessonsLearned:        string[];
}

// ─── Respuesta completa del endpoint ─────────────────────────────────────────
export interface DecisionResult {
  metrics:  DecisionMetrics;
  analysis: AIAnalysis;
}