import { z } from 'zod';
import { PublicIdSchema } from './rest';
import { PublicCoordinateSchema } from './university';
import { PoiCategoryCodeSchema } from './place';
// Versioned matching key only. Never overwrite the original display name or
// strip vowel marks/joiners used by Sinhala and Tamil; no guessed transliteration.
export function normalizePoiName(value: string): string {
  return value.normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\u200c\u200d]+/gu, ' ').trim().replace(/\s+/gu, ' ');
}
const name = z.string().trim().min(1).max(200).regex(/^[^\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]+$/)
  .refine(value => {const normalized=normalizePoiName(value);return normalized.length<=200 && /[\p{L}\p{N}]/u.test(normalized);}, 'A matching name needs letters or numbers and at most 200 normalized characters');
// Source IDs are opaque: trimming/case-folding/NFKC could identify another row.
const opaqueId = (max: number) => z.string().min(1).max(max).regex(/^[^\u0000-\u001f\u007f]+$/).refine(value => Boolean(value.trim()));
// Internal foundation contract. Not a public REST operation or an authority grant.
export const PoiMatchInputSchema = z.strictObject({kind: z.literal('POI'), name,
  category: PoiCategoryCodeSchema, location: PublicCoordinateSchema,
  source: z.strictObject({provider: opaqueId(100), externalId: opaqueId(240)}).optional(),
  buildingId: PublicIdSchema.optional(), radiusMeters: z.number().finite().min(1).max(200).default(50),
  limit: z.number().int().min(1).max(20).default(10)});
export type PoiMatchInput = z.input<typeof PoiMatchInputSchema>;
export const PoiMatchCandidateSchema = z.strictObject({id: PublicIdSchema, name, category: PoiCategoryCodeSchema,
  score: z.number().int().min(0).max(100), classification: z.enum(['STRONG_CANDIDATE', 'POSSIBLE_CANDIDATE', 'REVIEW_REQUIRED']),
  signals: z.strictObject({nameSimilarity: z.number().finite().min(0).max(1), normalizedNameExact: z.boolean(), categoryMatch: z.boolean(),
    withinRadius: z.boolean(), sameBuilding: z.boolean(), sourceMatch: z.boolean()}), requiresReview: z.literal(true)});
export const PoiMatchResultSchema = z.strictObject({policyVersion: z.literal('public-poi-v1'), scope: z.literal('PUBLIC_POI_ONLY'),
  candidates: z.array(PoiMatchCandidateSchema).max(20), hasMore: z.boolean(), incomplete: z.boolean(), requiresReview: z.literal(true)});
export type PoiMatchCandidate = z.infer<typeof PoiMatchCandidateSchema>;
