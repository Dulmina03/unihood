import { randomUUID } from 'node:crypto';
import { evaluateRisk, riskSummary, type RiskEvaluation, type RiskSignals } from '@unihood/contracts';

export type RiskQuery = (sql: string, values: unknown[]) => Promise<Record<string, unknown>[]>;

// Persists a versioned, explainable evaluation in the same transaction as the
// contribution. Only rule ids and the fixed public explanation are stored.
export async function recordRisk(query: RiskQuery, kind: RiskSignals['contributionKind'], contributionId: string, signals: RiskSignals): Promise<RiskEvaluation> {
  const evaluation = evaluateRisk(signals);
  const summary = riskSummary(evaluation);
  await query('INSERT INTO unihood_private.risk_evaluations(id,contribution_kind,contribution_id,rule_version,decision,risk_level,reasons,explanation) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [
    randomUUID(), kind, contributionId, evaluation.ruleVersion, evaluation.decision, evaluation.riskLevel,
    evaluation.reasons.map(item => item.rule), summary.riskExplanation,
  ]);
  return evaluation;
}
