import { z } from 'zod';
import { ContributionKindSchema } from './poi-correction';
import {
  RiskDecisionSchema, RiskLevelSchema, RiskRuleIdSchema, RiskRuleVersionSchema,
  SourceConfidenceSchema,
} from './enums';

export const RISK_RULE_VERSION = 'risk-rules-v1' as const;
const count = z.number().int().min(0).max(100000);

// Server-derived facts only. Raw submission text, evidence, reporter identity and
// coordinates are never part of a persisted or returned risk evaluation.
export const RiskSignalsSchema = z.strictObject({
  contributionKind: ContributionKindSchema,
  targetKind: z.enum(['POI', 'BOARDING', 'MEDIA', 'ROUTE_SEGMENT']).nullable(),
  publicationKindEligible: z.boolean(),
  publicWritesEnabled: z.boolean(),
  evidence: z.strictObject({
    sourceConfidence: SourceConfidenceSchema,
    hasEvidenceNote: z.boolean(),
    evidenceRequired: z.boolean(),
    observedWithinDays: z.boolean().nullable(),
  }),
  duplicates: z.strictObject({ pendingDuplicate: z.boolean(), canonicalCollision: z.boolean() }),
  conflicts: z.strictObject({
    actorManagesTarget: z.boolean(),
    activeSuppression: z.boolean(),
    conflictingReports: count,
  }),
  submissionPattern: z.strictObject({ recentSameActor: count, recentDistinctActors: count }),
  content: z.strictObject({
    sensitivePrivateText: z.boolean(),
    contactOrLink: z.boolean(),
    officialFieldAttempt: z.boolean(),
    residentialClaim: z.boolean(),
    ownershipClaim: z.boolean(),
    mediaUnmoderated: z.boolean(),
  }),
  confirmations: z.strictObject({ total: count, distinctActors: count }),
  sensitiveReport: z.boolean(),
});

export const RiskReasonSchema = z.strictObject({
  rule: RiskRuleIdSchema,
  decision: RiskDecisionSchema,
  explanation: z.string().trim().min(8).max(240),
});

export const RiskEvaluationSchema = z.strictObject({
  ruleVersion: RiskRuleVersionSchema,
  decision: RiskDecisionSchema,
  riskLevel: RiskLevelSchema,
  requiresReview: z.boolean(),
  publicationEligible: z.boolean(),
  reasons: z.array(RiskReasonSchema).min(1).max(19),
  dataKind: z.literal('SYNTHETIC'),
});

export type RiskSignals = z.infer<typeof RiskSignalsSchema>;
export type RiskReason = z.infer<typeof RiskReasonSchema>;
export type RiskEvaluation = z.infer<typeof RiskEvaluationSchema>;

type Rule = { id: z.infer<typeof RiskRuleIdSchema>; decision: z.infer<typeof RiskDecisionSchema>; explanation: string; when: (s: RiskSignals) => boolean };
const rule = (id: Rule['id'], decision: Rule['decision'], explanation: string, when: Rule['when']): Rule => ({ id, decision, explanation, when });

// Ordered catalog. Identical signals and rule version always yield the same
// reasons and decision; no clocks, randomness, scores or vote thresholds decide.
export const RISK_RULES: readonly Rule[] = [
  rule('RR-001-OWNER-CONTROLLED-FIELD', 'ESCALATE', 'Owner-controlled fee, vacancy, visibility, contact or ownership changes are not accepted from community contributions.', s => s.content.officialFieldAttempt),
  rule('RR-002-OWNERSHIP-CLAIM', 'ESCALATE', 'Ownership claims require restricted verification and cannot be granted by a contribution.', s => s.content.ownershipClaim),
  rule('RR-003-SELF-INTEREST', 'ESCALATE', 'This actor has a management interest in the target and cannot review it.', s => s.conflicts.actorManagesTarget),
  rule('RR-004-SENSITIVE-REPORT', 'ESCALATE', 'A sensitive or harmful report needs restricted support handling.', s => s.sensitiveReport),
  rule('RR-005-PRIVATE-TEXT', 'NEEDS_EVIDENCE', 'Private residential or personal details need verification before any publication.', s => s.content.sensitivePrivateText || s.content.residentialClaim),
  rule('RR-006-CONTACT-OR-LINK', 'NEEDS_EVIDENCE', 'Contact details or external links need verification and are not public evidence.', s => s.content.contactOrLink),
  rule('RR-007-EVIDENCE-INSUFFICIENT', 'NEEDS_EVIDENCE', 'This contribution type needs a dated evidence note before review can proceed.', s => s.evidence.evidenceRequired && !s.evidence.hasEvidenceNote),
  rule('RR-008-STALE-OBSERVATION', 'NEEDS_EVIDENCE', 'The observation date is too old to support a current public claim.', s => s.evidence.observedWithinDays === false),
  rule('RR-009-MEDIA-UNMODERATED', 'NEEDS_EVIDENCE', 'Media must pass moderation and metadata stripping before any public use.', s => s.content.mediaUnmoderated),
  rule('RR-010-AGREEMENT-NOT-EVIDENCE', 'NEEDS_EVIDENCE', 'Agreement alone is not verification; independent evidence is still required.', s => s.confirmations.total >= 3 && !s.evidence.hasEvidenceNote),
  rule('RR-011-COLLUSION-PATTERN', 'NEEDS_EVIDENCE', 'Repeated agreement from too few accounts is not independent confirmation.', s => s.confirmations.total >= 3 && s.confirmations.distinctActors < 3),
  rule('RR-012-REPORT-SUPPRESSION-ACTIVE', 'HOLD', 'An existing report hold or suppression must be resolved before publication.', s => s.conflicts.activeSuppression),
  rule('RR-013-DUPLICATE-OR-CONFLICT', 'HOLD', 'A pending duplicate or conflicting public record requires review.', s => s.duplicates.pendingDuplicate || s.duplicates.canonicalCollision),
  rule('RR-014-CONFLICTING-REPORTS', 'HOLD', 'Conflicting reports require review and do not justify erasing legitimate content.', s => s.conflicts.conflictingReports > 0),
  rule('RR-015-REPEATED-SUBMISSIONS', 'HOLD', 'Repeated submissions from this actor need review before any public effect.', s => s.submissionPattern.recentSameActor >= 3),
  rule('RR-016-REPORT-CASE', 'HOLD', 'Reports are confidential cases; they never auto-publish a fact or change a record.', s => s.contributionKind === 'REPORT'),
  rule('RR-017-KIND-NOT-PUBLISHABLE', 'HOLD', 'This contribution type is held; routine auto-publication applies only to eligible public POI proposals.', s => !s.publicationKindEligible),
  rule('RR-018-PUBLICATION-GATE-CLOSED', 'HOLD', 'Routine publication stays disabled until final identity and public-write gates pass.', s => !s.publicWritesEnabled),
  rule('RR-019-ROUTINE-LOW-RISK', 'AUTO_PUBLISH', 'Routine low-risk community contribution may publish as community-submitted, without owner verification.', s =>
    s.publicationKindEligible && s.publicWritesEnabled && s.contributionKind !== 'REPORT'
    && !s.content.officialFieldAttempt && !s.content.ownershipClaim && !s.content.sensitivePrivateText
    && !s.content.contactOrLink && !s.content.residentialClaim && !s.content.mediaUnmoderated
    && !s.duplicates.pendingDuplicate && !s.duplicates.canonicalCollision
    && !s.conflicts.actorManagesTarget && !s.conflicts.activeSuppression && s.conflicts.conflictingReports === 0
    && s.submissionPattern.recentSameActor < 3 && !s.sensitiveReport
    && !(s.evidence.evidenceRequired && !s.evidence.hasEvidenceNote)
    && s.evidence.observedWithinDays !== false
    && !(s.confirmations.total >= 3 && (!s.evidence.hasEvidenceNote || s.confirmations.distinctActors < 3))),
];

const rank = { AUTO_PUBLISH: 0, HOLD: 1, NEEDS_EVIDENCE: 2, ESCALATE: 3 } as const;

export function evaluateRisk(raw: unknown): RiskEvaluation {
  const signals = RiskSignalsSchema.parse(raw);
  const reasons = RISK_RULES.filter(item => item.when(signals)).map(({ id, decision, explanation }) => ({ rule: id, decision, explanation }));
  const decision = reasons.reduce<z.infer<typeof RiskDecisionSchema>>((current, item) => rank[item.decision] > rank[current] ? item.decision : current, 'AUTO_PUBLISH');
  // RR-019 is the only publication path and it never bypasses kind or gate rules.
  const reasonsFinal = reasons.length ? reasons : [{ rule: 'RR-017-KIND-NOT-PUBLISHABLE' as const, decision: 'HOLD' as const, explanation: RISK_RULES[16].explanation }];
  return RiskEvaluationSchema.parse({
    ruleVersion: RISK_RULE_VERSION,
    decision,
    riskLevel: decision === 'AUTO_PUBLISH' ? 'LOW' : decision === 'ESCALATE' ? 'HIGH' : 'ELEVATED',
    requiresReview: decision !== 'AUTO_PUBLISH',
    publicationEligible: decision === 'AUTO_PUBLISH',
    reasons: reasonsFinal,
    dataKind: 'SYNTHETIC',
  });
}

export function riskSummary(evaluation: RiskEvaluation) {
  const primary = [...evaluation.reasons].sort((left, right) => rank[right.decision] - rank[left.decision] || right.rule.localeCompare(left.rule))[0];
  return {
    riskDecision: evaluation.decision,
    riskLevel: evaluation.riskLevel,
    riskRuleVersion: evaluation.ruleVersion,
    riskReasons: evaluation.reasons.map(item => item.rule),
    riskExplanation: primary.explanation,
  };
}
