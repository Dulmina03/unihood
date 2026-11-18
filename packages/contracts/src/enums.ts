import { z } from 'zod';
export const PlaceKindSchema = z.enum(['BOARDING', 'POI']);
export const BoardingVisibilitySchema = z.enum(['PUBLIC_MAP', 'AREA_ONLY', 'HIDDEN']);
export const PublisherKindSchema = z.enum(['OWNER_OFFICIAL', 'COMMUNITY_RECOMMENDATION']);
export const PublicationStatusSchema = z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'DISPUTED', 'ARCHIVED']);
export const VacancyStatusSchema = z.enum(['AVAILABLE', 'FULL', 'UNKNOWN']);
export const SourceConfidenceSchema = z.enum(['COMMUNITY_SUBMITTED', 'SOURCE_CHECKED', 'OWNER_VERIFIED', 'DISPUTED']);
export const SubmissionRiskSchema = z.enum(['LOW', 'NEEDS_EVIDENCE', 'HIGH_RISK', 'REJECTED']);
export const RouteTimeContextSchema = z.enum(['DAY', 'NIGHT']);
// Canonical report vocabulary is intentionally separate from SubmissionRisk.
export const ReportTypeSchema = z.enum([
  'DUPLICATE', 'WRONG_FEE', 'WRONG_VACANCY', 'STALE_INFORMATION', 'INAPPROPRIATE_MEDIA',
  'PRIVATE_DATA_EXPOSED', 'FAKE_OWNERSHIP', 'HARASSMENT', 'NEGATIVE_REVIEW',
  'ROUTE_INFORMATION', 'CLOSURE', 'OTHER',
]);
export const ReportSeveritySchema = z.enum(['P0', 'P1', 'P2']);
export const ReportStatusSchema = z.enum(['HELD', 'SUPPRESSED', 'ESCALATED', 'RESOLVED', 'DISMISSED']);
export const ReportTargetTypeSchema = z.enum(['BOARDING', 'POI', 'MEDIA', 'ROUTE_SEGMENT']);
export const ReportPublicEffectSchema = z.enum(['NONE', 'LISTING_HIDDEN', 'MEDIA_BLOCKED']);
export const ReportAppealStatusSchema = z.enum(['OPEN', 'GRANTED', 'DENIED']);
export type PlaceKind = z.infer<typeof PlaceKindSchema>;
export type BoardingVisibility = z.infer<typeof BoardingVisibilitySchema>;
export type PublisherKind = z.infer<typeof PublisherKindSchema>;
export type PublicationStatus = z.infer<typeof PublicationStatusSchema>;
export type VacancyStatus = z.infer<typeof VacancyStatusSchema>;
export type SourceConfidence = z.infer<typeof SourceConfidenceSchema>;
export type SubmissionRisk = z.infer<typeof SubmissionRiskSchema>;
export type RouteTimeContext = z.infer<typeof RouteTimeContextSchema>;
export type ReportType = z.infer<typeof ReportTypeSchema>;
export type ReportSeverity = z.infer<typeof ReportSeveritySchema>;
export type ReportStatus = z.infer<typeof ReportStatusSchema>;
export type ReportTargetType = z.infer<typeof ReportTargetTypeSchema>;
export type ReportPublicEffect = z.infer<typeof ReportPublicEffectSchema>;
export type ReportAppealStatus = z.infer<typeof ReportAppealStatusSchema>;
// UNI-045 deterministic workflow risk, versioned and separate from report severity
// and source confidence. Votes/confirmations are never proof or authority.
export const RiskRuleVersionSchema = z.literal('risk-rules-v1');
export const RiskDecisionSchema = z.enum(['AUTO_PUBLISH', 'HOLD', 'NEEDS_EVIDENCE', 'ESCALATE']);
export const RiskLevelSchema = z.enum(['LOW', 'ELEVATED', 'HIGH']);
export const RiskRuleIdSchema = z.enum([
  'RR-001-OWNER-CONTROLLED-FIELD', 'RR-002-OWNERSHIP-CLAIM', 'RR-003-SELF-INTEREST',
  'RR-004-SENSITIVE-REPORT', 'RR-005-PRIVATE-TEXT', 'RR-006-CONTACT-OR-LINK',
  'RR-007-EVIDENCE-INSUFFICIENT', 'RR-008-STALE-OBSERVATION', 'RR-009-MEDIA-UNMODERATED',
  'RR-010-AGREEMENT-NOT-EVIDENCE', 'RR-011-COLLUSION-PATTERN', 'RR-012-REPORT-SUPPRESSION-ACTIVE',
  'RR-013-DUPLICATE-OR-CONFLICT', 'RR-014-CONFLICTING-REPORTS', 'RR-015-REPEATED-SUBMISSIONS',
  'RR-016-REPORT-CASE', 'RR-017-KIND-NOT-PUBLISHABLE', 'RR-018-PUBLICATION-GATE-CLOSED',
  'RR-019-ROUTINE-LOW-RISK',
]);
export type RiskRuleVersion = z.infer<typeof RiskRuleVersionSchema>;
export type RiskDecision = z.infer<typeof RiskDecisionSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type RiskRuleId = z.infer<typeof RiskRuleIdSchema>;
