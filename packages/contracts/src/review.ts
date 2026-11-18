import { z } from 'zod';
import { PublicIdSchema } from './rest';

const text = (minimum: number, maximum: number) => z.string().trim().min(minimum).max(maximum).regex(/^[^\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]+$/);

export const ReviewInputSchema = z.strictObject({
  key: PublicIdSchema,
  targetType: z.enum(['BOARDING', 'POI']),
  targetId: PublicIdSchema,
  reviewKind: z.enum(['GENERAL_OBSERVATION', 'VERIFIED_STAY']),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  observation: text(1, 1000).optional(),
  sourceConfidence: z.enum(['COMMUNITY_SUBMITTED', 'SOURCE_CHECKED']),
  sourceLabel: z.enum(['SYNTHETIC', 'HELD_UNVERIFIED']),
  syntheticAcknowledged: z.literal(true),
}).refine(value => value.rating !== null && value.rating !== undefined || (value.observation ?? '').trim().length > 0, {
  message: 'At least one rating or meaningful observation is required.',
  path: ['observation'],
});

export const ReviewReceiptSchema = z.strictObject({
  contributionId: PublicIdSchema,
  outcome: z.literal('HELD_REVIEW'),
  reviewState: z.enum(['PENDING', 'NEEDS_EVIDENCE']),
  published: z.literal(false),
  dataKind: z.literal('SYNTHETIC'),
});

export type ReviewInput = z.infer<typeof ReviewInputSchema>;
export type ReviewReceipt = z.infer<typeof ReviewReceiptSchema>;
