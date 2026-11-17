import { z } from 'zod';
import { PublicIdSchema } from './rest';
import { PublisherKindSchema, BoardingVisibilitySchema } from './enums';
import { PublicEntranceSchema, OwnerPriceSchema, OwnerVacancySchema } from './boarding-public';
import { PublicProvenanceSchema } from './university';

export const NearbyEssentialItemSchema = z.strictObject({
  id: PublicIdSchema,
  name: z.string().trim().min(1).max(160),
  category: z.strictObject({
    code: z.string().trim().min(1).max(64),
    label: z.string().trim().min(1).max(160),
  }),
  location: PublicEntranceSchema,
  distanceMeters: z.number().int().nonnegative().max(100000),
  provenance: PublicProvenanceSchema.options[0],
});
export type NearbyEssentialItem = z.infer<typeof NearbyEssentialItemSchema>;

export const BoardingNearbyEssentialsResponseSchema = z.strictObject({
  boardingId: PublicIdSchema,
  visibility: z.literal('PUBLIC_MAP'),
  entrance: PublicEntranceSchema,
  items: z.array(NearbyEssentialItemSchema).max(50),
});
export type BoardingNearbyEssentialsResponse = z.infer<typeof BoardingNearbyEssentialsResponseSchema>;

export const BoardingComparisonQuerySchema = z.strictObject({
  ids: z.string().trim().min(1).max(500).refine((v) => {
    const list = v.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    return list.length >= 1 && list.length <= 4 && list.every((id) => PublicIdSchema.safeParse(id).success);
  }, 'Must provide between 1 and 4 valid comma-separated public boarding IDs'),
});
export type BoardingComparisonQuery = z.infer<typeof BoardingComparisonQuerySchema>;

export const ComparisonEssentialSummarySchema = z.strictObject({
  category: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(160),
  count: z.number().int().nonnegative(),
  nearestDistanceMeters: z.number().int().nonnegative().nullable(),
});
export type ComparisonEssentialSummary = z.infer<typeof ComparisonEssentialSummarySchema>;

export const ComparisonUnitSummarySchema = z.strictObject({
  id: PublicIdSchema,
  label: z.string().trim().min(1).max(160),
  template: z.string().trim().min(1).max(64),
  capacity: z.number().int().positive(),
  rentMinor: z.number().int().nonnegative().nullable(),
  basis: z.enum(['ROOM', 'BED']).nullable(),
  vacancyStatus: z.enum(['AVAILABLE', 'FULL', 'UNKNOWN']),
});
export type ComparisonUnitSummary = z.infer<typeof ComparisonUnitSummarySchema>;

export const BoardingComparisonItemSchema = z.strictObject({
  id: PublicIdSchema,
  title: z.string().trim().min(1).max(160),
  publisherKind: PublisherKindSchema,
  visibility: BoardingVisibilitySchema,
  locationLabel: z.string().trim().min(1).max(160).nullable(),
  hasExactEntrance: z.boolean(),
  entrance: PublicEntranceSchema.nullable(),
  price: OwnerPriceSchema.nullable(),
  vacancy: OwnerVacancySchema,
  unitsSummary: z.array(ComparisonUnitSummarySchema).max(50),
  nearbyEssentials: z.array(ComparisonEssentialSummarySchema).nullable(),
  summary: z.string().trim().min(1).max(800),
  updatedAt: z.iso.datetime({offset: true}),
  provenance: PublicProvenanceSchema.options[0],
}).refine((v) => {
  if (v.visibility === 'HIDDEN' && v.locationLabel !== null) return false;
  if (v.publisherKind === 'COMMUNITY_RECOMMENDATION' && (
    v.visibility === 'PUBLIC_MAP' || v.price !== null || v.vacancy.status !== 'UNKNOWN' || v.unitsSummary.length !== 0
  )) return false;
  if (v.visibility !== 'PUBLIC_MAP') {
    return v.entrance === null && v.hasExactEntrance === false && v.nearbyEssentials === null;
  }
  return v.entrance !== null && v.hasExactEntrance === true && v.nearbyEssentials !== null;
}, 'Exact entrance and nearby essentials are permitted ONLY for PUBLIC_MAP visibility');
export type BoardingComparisonItem = z.infer<typeof BoardingComparisonItemSchema>;

export const BoardingComparisonResponseSchema = z.strictObject({
  items: z.array(BoardingComparisonItemSchema).max(4),
  requestedCount: z.number().int().nonnegative(),
  comparedCount: z.number().int().nonnegative(),
});
export type BoardingComparisonResponse = z.infer<typeof BoardingComparisonResponseSchema>;

export function parseBoardingNearbyEssentials(input: unknown): BoardingNearbyEssentialsResponse {
  return BoardingNearbyEssentialsResponseSchema.parse(input);
}

export function parseBoardingComparisonResponse(input: unknown, now = Date.now()): BoardingComparisonResponse {
  if (!Number.isFinite(now)) throw new Error('Invalid clock');
  const value = BoardingComparisonResponseSchema.parse(input);
  for (const item of value.items) {
    if (item.vacancy.status !== 'UNKNOWN' && (Date.parse(item.vacancy.confirmedAt) > now || Date.parse(item.vacancy.expiresAt) <= now)) {
      item.vacancy = {status: 'UNKNOWN', confirmedAt: null, expiresAt: null};
    }
  }
  return value;
}
