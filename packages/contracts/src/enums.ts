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
