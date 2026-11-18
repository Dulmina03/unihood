import type { RiskSignals } from '@unihood/contracts';

// Public writes remain closed until final identity/publication gates (ADR-0005).
// This is the single runtime switch; tests exercise the evaluator independently.
export const PUBLIC_WRITES_ENABLED = false;
export const OBSERVATION_FRESH_DAYS = 30;

export type ContributionContentSignals = Pick<RiskSignals['content'],
  'sensitivePrivateText' | 'contactOrLink' | 'residentialClaim' | 'ownershipClaim'>;

const contact = /@|(?:\+?\d[\d ().,-]{6,}\d)|https?:\/\/|www\./i;
const privateText = /\b(address|apartment|house number|latitude|longitude|coordinates|phone|contact|rent|price|vacancy)\b/i;
const residential = /\b(residential|bedroom|dorm|dormitory|hostel|boarding house)\b/i;
const ownership = /\b(i own|we own|my property|our property|owner of|landlord)\b/i;

// Conservative English signals for holding synthetic examples. Absence of a
// signal never certifies safe text, ownership or publication eligibility.
export function contentSignals(...parts: (string | null | undefined)[]): ContributionContentSignals {
  const text = parts.filter(Boolean).join(' ');
  return {
    sensitivePrivateText: privateText.test(text),
    contactOrLink: contact.test(text),
    residentialClaim: residential.test(text),
    ownershipClaim: ownership.test(text),
  };
}

export function observedRecently(observedOn: string | null | undefined): boolean | null {
  if (!observedOn) return null;
  const observed = Date.parse(`${observedOn}T00:00:00Z`);
  if (!Number.isFinite(observed)) return false;
  return Date.now() - observed <= OBSERVATION_FRESH_DAYS * 86_400_000;
}

export function baseSignals(kind: RiskSignals['contributionKind'], targetKind: RiskSignals['targetKind'], content: ContributionContentSignals): RiskSignals {
  return {
    contributionKind: kind,
    targetKind,
    publicationKindEligible: false,
    publicWritesEnabled: PUBLIC_WRITES_ENABLED,
    evidence: { sourceConfidence: 'COMMUNITY_SUBMITTED', hasEvidenceNote: false, evidenceRequired: false, observedWithinDays: null },
    duplicates: { pendingDuplicate: false, canonicalCollision: false },
    conflicts: { actorManagesTarget: false, activeSuppression: false, conflictingReports: 0 },
    submissionPattern: { recentSameActor: 0, recentDistinctActors: 0 },
    content: { ...content, officialFieldAttempt: false, mediaUnmoderated: false },
    confirmations: { total: 0, distinctActors: 0 },
    sensitiveReport: false,
  };
}
