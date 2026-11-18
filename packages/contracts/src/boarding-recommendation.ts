import { z } from 'zod';
import { PublicIdSchema } from './rest';
// Synthetic intake only. There is deliberately no coordinate, owner, contact,
// official fee/vacancy, publication or canonical-creation field.
const text = (minimum: number, maximum: number) => z.string().trim().min(minimum).max(maximum).regex(/^[^\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]+$/);
export const BoardingRecommendationDraftSchema = z.strictObject({
  title: text(10, 120).startsWith('Synthetic '),
  description: text(15, 400),
  locality: z.enum(['Synthetic North Quarter', 'Synthetic Garden District']).nullable(),
  facilities: z.array(z.enum(['Study space', 'Shared kitchen', 'Laundry area', 'Wi-Fi'])).max(4).refine(v => new Set(v).size === v.length),
  privacyAcknowledged: z.literal(true),
  mediaGuidanceAcknowledged: z.literal(true),
});
export const BoardingRecommendationInputSchema = z.strictObject({ key: PublicIdSchema, draft: BoardingRecommendationDraftSchema });
export const BoardingRecommendationReceiptSchema = z.strictObject({
  contributionId: PublicIdSchema,
  outcome: z.literal('HELD_RECOMMENDATION'),
  reviewState: z.enum(['PENDING', 'NEEDS_EVIDENCE']),
  publisherKind: z.literal('COMMUNITY_RECOMMENDATION'),
  dataKind: z.literal('SYNTHETIC'),
  published: z.literal(false),
});
export type BoardingRecommendationDraft = z.infer<typeof BoardingRecommendationDraftSchema>;
export type BoardingRecommendationInput = z.infer<typeof BoardingRecommendationInputSchema>;
export type BoardingRecommendationReceipt = z.infer<typeof BoardingRecommendationReceiptSchema>;
