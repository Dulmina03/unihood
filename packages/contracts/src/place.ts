import { z } from 'zod';
import { PaginationQuerySchema, PublicIdSchema, paginatedSchema } from './rest';
import { PublicCoordinateSchema } from './university';
export const PoiCategoryCodeSchema = z.string().min(1).max(60).regex(/^[a-z][a-z0-9_]*$/);
export const PoiCategorySchema = z.strictObject({code: PoiCategoryCodeSchema, label: z.string().trim().min(1).max(120)});
export function poiBounds(value: string) {
  const parts = value.split(',').map(Number);
  if (parts.length !== 4 || parts.some((x) => !Number.isFinite(x))) return null;
  const [west, south, east, north] = parts;
  return west >= -180 && east <= 180 && south >= -90 && north <= 90 && west < east && south < north && east - west <= 1 && north - south <= 1 ? parts : null;
}
export const PoiBoundsSchema = z.string().max(160).regex(/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/)
  .refine((value) => poiBounds(value) !== null, 'Ordered W,S,E,N bbox, at most one degree wide/high; no antimeridian wrap')
  .describe('Required west,south,east,north decimal degrees; -180..180 longitude/-90..90 latitude, strict increasing bounds, maximum width/height 1 degree, no antimeridian wrap.');
const provenance = z.discriminatedUnion('dataKind', [
  z.strictObject({dataKind: z.literal('SYNTHETIC'), sourceLabel: z.string().min(1).max(240), verifiedAt: z.null()}),
  z.strictObject({dataKind: z.literal('VERIFIED'), sourceLabel: z.string().min(1).max(240), verifiedAt: z.iso.datetime()}),
]);
export const PublicPoiSchema = z.strictObject({id: PublicIdSchema, kind: z.literal('POI'), name: z.string().trim().min(1).max(200),
  category: PoiCategorySchema, location: PublicCoordinateSchema, provenance, lastConfirmedAt: z.iso.datetime().nullable()});
// Record edits, source verification and location confirmation are separate facts.
export const PublicPoiDetailSchema = PublicPoiSchema.extend({updatedAt: z.iso.datetime()});
export const PoiPathSchema = z.strictObject({id: PublicIdSchema});
export const PoiListQuerySchema = PaginationQuerySchema.pick({pageSize: true}).extend({
  page: z.string().regex(/^(?:[1-9]|[1-9][0-9]{1,3}|10000)$/).optional(), bbox: PoiBoundsSchema,
  category: PoiCategoryCodeSchema.optional(), q: z.string().trim().min(1).max(100).regex(/^[^\u0000-\u001f\u007f]+$/).optional(),
  sort: z.enum(['name', 'newest']).optional(),
});
export const PoiPageSchema = paginatedSchema(PublicPoiSchema);
export const PoiCategoryPageSchema = paginatedSchema(PoiCategorySchema);
export const PoiCategoryQuerySchema = PoiListQuerySchema.pick({bbox: true});
export type PublicPoi = z.infer<typeof PublicPoiSchema>;
export type PublicPoiDetail = z.infer<typeof PublicPoiDetailSchema>;
export type PoiListQuery = z.infer<typeof PoiListQuerySchema>;
