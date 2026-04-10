// ─── Funciones puras. Sin efectos secundarios. Sin dependencias externas. ─────

/**
 * Valor esperado bruto.
 * EV = P(éxito) × V(éxito) + P(fallo) × V(fallo)
 */
export function calcExpectedValue(
  probability: number,    // 0–100
  valueSuccess: number,
  valueFailure: number
): number {
  const p = probability / 100;
  return p * valueSuccess + (1 - p) * valueFailure;
}

/**
 * Valor esperado neto descontando el costo de oportunidad.
 */
export function calcExpectedValueNet(
  expectedValue: number,
  opportunityCost: number
): number {
  return expectedValue - opportunityCost;
}

/**
 * Índice de riesgo (0–100).
 * Combina probabilidad de fallo (70%) + severidad del peor escenario (30%).
 */
export function calcRiskIndex(
  probability: number,    // 0–100
  worstSeverity: number   // 1–10
): number {
  const failureProbWeight = (1 - probability / 100) * 70;
  const severityWeight    = (worstSeverity / 10) * 30;
  return Math.round(failureProbWeight + severityWeight);
}

/**
 * Índice de irreversibilidad (0–100).
 * 0 = totalmente reversible, 100 = irreversible.
 */
export function calcIrreversibilityIndex(
  reversibilityScore: number,  // 0–10
  revertCost: number,
  valueSuccess: number
): number {
  const scoreComponent = ((10 - reversibilityScore) / 10) * 70;
  // Si el costo de revertir es alto en relación al upside, penaliza más
  const costRatio        = valueSuccess > 0 ? Math.min(revertCost / valueSuccess, 1) : 0;
  const costComponent    = costRatio * 30;
  return Math.round(scoreComponent + costComponent);
}

/**
 * Threshold de sensibilidad.
 * ¿Cuántos puntos porcentuales puede estar equivocada la probabilidad
 * antes de que el valor esperado cambie de signo?
 */
export function calcSensitivityThreshold(
  probability: number,
  valueSuccess: number,
  valueFailure: number
): number {
  // Punto de indiferencia: P* tal que P*·VS + (1-P*)·VF = 0
  const range = valueSuccess - valueFailure;
  if (range === 0) return 0;
  const breakEvenProb = -valueFailure / range;         // 0–1
  const breakEvenPct  = Math.round(breakEvenProb * 100);
  return Math.abs(probability - breakEvenPct);
}

/**
 * Escenario base cualitativo.
 */
export function calcBaseScenario(
  probability: number
): "favorable" | "neutro" | "adverso" {
  if (probability >= 60) return "favorable";
  if (probability >= 40) return "neutro";
  return "adverso";
}

/**
 * Advertencias automáticas basadas en los inputs.
 * Devuelve array de strings en español. Sin IA.
 */
export function calcWarnings(
  probability: number,
  reversibilityScore: number,
  worstSeverity: number,
  altB: string,
  opportunityCost: number,
  expectedValue: number
): string[] {
  const warnings: string[] = [];

  if (probability > 80) {
    warnings.push("Probabilidad estimada muy alta (>80%). Verifica si estás siendo optimista.");
  }
  if (probability < 25) {
    warnings.push("Probabilidad de éxito baja (<25%). El upside debe ser excepcional para justificarlo.");
  }
  if (reversibilityScore < 3) {
    warnings.push("Decisión casi irreversible. Aplica mayor cautela antes de comprometerte.");
  }
  if (worstSeverity >= 8) {
    warnings.push("Severidad del peor escenario muy alta. No lo subestimes.");
  }
  if (!altB || altB.trim().length < 15) {
    warnings.push("No cuantificaste completamente la alternativa B.");
  }
  if (opportunityCost > 0 && opportunityCost > expectedValue) {
    warnings.push("El costo de oportunidad supera el valor esperado. Reconsideración recomendada.");
  }

  return warnings;
}