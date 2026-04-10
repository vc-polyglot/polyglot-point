// Espejo de backend/core/types.ts para el frontend.
// Sin importar el backend directamente — son tipos duplicados por diseño
// (el frontend no debe depender del backend en el monorepo).

export type DecisionLevel = "cotidiana" | "carrera" | "financiera";

export interface DecisionInput {
  title:              string;
  level:              DecisionLevel;
  altA:               string;
  altB:               string;
  probability:        number;
  valueSuccess:       number;
  valueFailure:       number;
  worstScenario:      string;
  worstSeverity:      number;
  reversibilityScore: number;
  revertCost:         number;
  impact6m:           string;
  impact3y:           string;
  opportunityCost:    number;
  opportunityDesc:    string;
}

export interface DecisionMetrics {
  expectedValue:        number;
  expectedValueNet:     number;
  riskIndex:            number;
  irreversibilityIndex: number;
  sensitivityThreshold: number;
  baseScenario:         "favorable" | "neutro" | "adverso";
  pessimisticValue:     number;
  warnings:             string[];
}

export interface AIAnalysis {
  blindSpots:           string[];
  riskAssessment:       string;
  biasFlags:            string[];
  structuralCommentary: string;
  lessonsLearned:       string[];
}

export interface DecisionResult {
  metrics:  DecisionMetrics;
  analysis: AIAnalysis;
}