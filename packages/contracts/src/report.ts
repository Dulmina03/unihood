import { z } from 'zod';
import {
  ReportAppealStatusSchema,
  ReportPublicEffectSchema,
  ReportSeveritySchema,
  ReportStatusSchema,
  ReportTargetTypeSchema,
  ReportTypeSchema,
} from './enums';
import { PublicIdSchema } from './rest';

const text = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum).regex(/^[^\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]+$/);

export const ReportInputSchema = z.strictObject({
  key: z.uuid(),
  targetType: ReportTargetTypeSchema,
  targetId: PublicIdSchema,
  reportType: ReportTypeSchema,
  details: text(15, 1000),
  observedOn: z.iso.date().optional(),
  syntheticAcknowledged: z.literal(true),
}).refine(
  (value) => (value.targetType === 'ROUTE_SEGMENT') === (value.reportType === 'ROUTE_INFORMATION'),
  { message: 'Route information reports require an eligible route segment target.', path: ['targetType'] },
);

export const ReportReceiptSchema = z.strictObject({
  reportId: PublicIdSchema,
  outcome: z.enum(['HELD_REPORT', 'SUPPRESSED_HELD_REPORT']),
  severity: ReportSeveritySchema,
  status: ReportStatusSchema,
  published: z.literal(false),
  reporterIdentity: z.literal('PROTECTED'),
  appealable: z.boolean(),
  dataKind: z.literal('SYNTHETIC'),
});

export const ReportAppealInputSchema = z.strictObject({
  key: z.uuid(),
  reason: text(15, 1000),
  syntheticAcknowledged: z.literal(true),
});

export const ReportAppealViewSchema = z.strictObject({
  appealId: PublicIdSchema,
  status: ReportAppealStatusSchema,
  outcome: z.enum(['GRANTED', 'DENIED']).nullable(),
});

export const ReportAppealReceiptSchema = z.strictObject({
  appealId: PublicIdSchema,
  reportId: PublicIdSchema,
  status: ReportAppealStatusSchema,
  outcome: z.enum(['GRANTED', 'DENIED']).nullable(),
  published: z.literal(false),
  dataKind: z.literal('SYNTHETIC'),
});

export const ReportStatusViewSchema = z.strictObject({
  reportId: PublicIdSchema,
  reportType: ReportTypeSchema,
  targetType: ReportTargetTypeSchema,
  targetId: PublicIdSchema.nullable(),
  severity: ReportSeveritySchema,
  status: ReportStatusSchema,
  publicEffect: ReportPublicEffectSchema,
  createdAt: z.iso.datetime({ offset: true }),
  appeal: ReportAppealViewSchema.nullable(),
  reporterIdentity: z.literal('PROTECTED'),
  dataKind: z.literal('SYNTHETIC'),
});

export const ReportOperatorInputSchema = z.strictObject({
  key: z.uuid(),
  action: z.enum(['RESTORE_PUBLIC', 'DISMISS_REPORT', 'DECIDE_APPEAL']),
  appealId: PublicIdSchema.optional(),
  decision: z.enum(['GRANTED', 'DENIED']).optional(),
  syntheticAcknowledged: z.literal(true),
}).refine(
  (value) => value.action === 'DECIDE_APPEAL' ? value.appealId !== undefined && value.decision !== undefined : value.appealId === undefined && value.decision === undefined,
  { message: 'Appeal decision requires appealId and decision; no extra appeal fields otherwise.', path: ['appealId'] },
);

export const ReportOperatorReceiptSchema = z.strictObject({
  reportId: PublicIdSchema,
  status: ReportStatusSchema,
  severity: ReportSeveritySchema,
  publicEffect: ReportPublicEffectSchema,
  revision: z.number().int().positive(),
  appeal: ReportAppealViewSchema.nullable(),
  dataKind: z.literal('SYNTHETIC'),
});

export type ReportInput = z.infer<typeof ReportInputSchema>;
export type ReportReceipt = z.infer<typeof ReportReceiptSchema>;
export type ReportAppealInput = z.infer<typeof ReportAppealInputSchema>;
export type ReportAppealReceipt = z.infer<typeof ReportAppealReceiptSchema>;
export type ReportStatusView = z.infer<typeof ReportStatusViewSchema>;
export type ReportOperatorInput = z.infer<typeof ReportOperatorInputSchema>;
export type ReportOperatorReceipt = z.infer<typeof ReportOperatorReceiptSchema>;
