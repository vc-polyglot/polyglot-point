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

export function runDecisionEngine(input: DecisionInput): DecisionMetrics {
  // Defaults para campos opcionales (sliders no tocados)
  const probability        = input.probability        ?? 50;
  const worstSeverity      = input.worstSeverity      ?? 5;
  const reversibilityScore = input.reversibilityScore ?? 5;
  const revertCost         = input.revertCost         ?? 0;
  const valueSuccess       = input.valueSuccess       ?? 0;
  const valueFailure       = input.valueFailure       ?? 0;
  const opportunityCost    = input.opportunityCost    ?? 0;

  const ev    = calcExpectedValue(probability, valueSuccess, valueFailure);
  const evNet = calcExpectedValueNet(ev, opportunityCost);

  const riskIndex            = calcRiskIndex(probability, worstSeverity);
  const irreversibilityIndex = calcIrreversibilityIndex(reversibilityScore, revertCost, valueSuccess);
  const sensitivityThreshold = calcSensitivityThreshold(probability, valueSuccess, valueFailure);
  const baseScenario         = calcBaseScenario(probability);
  const warnings             = calcWarnings(
    probability, reversibilityScore, worstSeverity,
    input.altB, opportunityCost, ev
  );

  return {
    expectedValue:        ev,
    expectedValueNet:     evNet,
    riskIndex,
    irreversibilityIndex,
    sensitivityThreshold,
    baseScenario,
    pessimisticValue:     valueFailure,
    warnings,
  };
}