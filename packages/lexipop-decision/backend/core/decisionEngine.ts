import {
  calcExpectedValue,
  calcExpectedValueNet,
  calcRiskIndex,
  calcIrreversibilityIndex,
  calcSensitivityThreshold,
  calcBaseScenario,
  calcWarnings,
} from "./calculations";
import type { DecisionInput, DecisionMetrics } from "./types";

/**
 * Motor principal.
 * Recibe el input del usuario y devuelve métricas determinísticas.
 * Sin efectos secundarios. Sin llamadas a red. Sin IA.
 */
export function runDecisionEngine(input: DecisionInput): DecisionMetrics {
  const ev    = calcExpectedValue(input.probability, input.valueSuccess, input.valueFailure);
  const evNet = calcExpectedValueNet(ev, input.opportunityCost);

  const riskIndex            = calcRiskIndex(input.probability, input.worstSeverity);
  const irreversibilityIndex = calcIrreversibilityIndex(
    input.reversibilityScore,
    input.revertCost,
    input.valueSuccess
  );
  const sensitivityThreshold = calcSensitivityThreshold(
    input.probability,
    input.valueSuccess,
    input.valueFailure
  );
  const baseScenario = calcBaseScenario(input.probability);
  const warnings     = calcWarnings(
    input.probability,
    input.reversibilityScore,
    input.worstSeverity,
    input.altB,
    input.opportunityCost,
    ev
  );

  return {
    expectedValue:        ev,
    expectedValueNet:     evNet,
    riskIndex,
    irreversibilityIndex,
    sensitivityThreshold,
    baseScenario,
    pessimisticValue:     input.valueFailure,
    warnings,
  };
}