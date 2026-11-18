import { z } from 'zod';
import { BoardingRecommendationDraftSchema, BoardingRecommendationInputSchema, BoardingRecommendationReceiptSchema } from './boarding-recommendation';
import { PublicIdSchema } from './rest';
import { normalizePoiName } from './poi-matching';
export const BoardingDuplicateInputSchema = z.strictObject({ title: BoardingRecommendationDraftSchema.shape.title, locality: BoardingRecommendationDraftSchema.shape.locality });
export const BoardingDuplicateCandidateSchema = z.strictObject({
  boardingId: PublicIdSchema, title: z.string().trim().min(1).max(160), publisherKind: z.enum(['OWNER_OFFICIAL', 'COMMUNITY_RECOMMENDATION']),
  visibility: z.enum(['HIDDEN', 'AREA_ONLY']), locality: z.string().trim().min(1).max(160).nullable(),
  nameScore: z.number().int().min(0).max(100), dataKind: z.literal('SYNTHETIC'),
}).refine(value => value.visibility !== 'HIDDEN' || value.locality === null);
export const BoardingDuplicateResultSchema = z.strictObject({ policyVersion: z.literal('boarding-ad-text-v1'), candidates: z.array(BoardingDuplicateCandidateSchema).max(5), hasMore: z.boolean(), incomplete: z.boolean(), requiresReview: z.literal(true) });
export const BoardingResolutionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('EXISTING'), boardingId: PublicIdSchema }),
  z.strictObject({ kind: z.literal('DISTINCT'), reason: z.string().trim().min(15).max(240).regex(/^[^\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]+$/) }),
]);
export const BoardingResolutionInputSchema = BoardingRecommendationInputSchema.extend({ resolution: BoardingResolutionSchema });
export const BoardingResolutionReceiptSchema = BoardingRecommendationReceiptSchema.extend({
  resolution: z.enum(['ATTACHED_FOR_REVIEW', 'REVIEW_REQUIRED']), canonicalBoardingId: PublicIdSchema.nullable(),
}).refine(value => (value.resolution === 'ATTACHED_FOR_REVIEW') === (value.canonicalBoardingId !== null));
export type BoardingDuplicateInput = z.infer<typeof BoardingDuplicateInputSchema>;
export type BoardingDuplicateCandidate = z.infer<typeof BoardingDuplicateCandidateSchema>;
export type BoardingDuplicateResult = z.infer<typeof BoardingDuplicateResultSchema>;
export type BoardingResolutionInput = z.infer<typeof BoardingResolutionInputSchema>;
export type BoardingResolutionReceipt = z.infer<typeof BoardingResolutionReceiptSchema>;
// A synthetic public-text signal, not probability or identity proof. Preserve
// Unicode marks/joiners and original display text; never geocode a name.
export function boardingNameScore(a: string, b: string): number {
  const normalize = (text: string) => normalizePoiName(text).replace(/^synthetic\s+/, '');
  const left = normalize(a), right = normalize(b); if (!left || !right) return 0; if (left === right) return 100;
  const grams = (text: string) => new Set(Array.from({ length: Math.max(0, text.length - 2) }, (_, index) => text.slice(index, index + 3)));
  const l = grams(left), r = grams(right); if (!l.size || !r.size) return 0;
  let intersection = 0; for (const gram of l) if (r.has(gram)) intersection++;
  return Math.round(200 * intersection / (l.size + r.size));
}
