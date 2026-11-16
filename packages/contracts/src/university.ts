import { z } from 'zod';
import { PublicIdSchema, PaginationQuerySchema, paginatedSchema } from './rest';

export const UniversitySlugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const label = z.string().trim().min(1).max(160);
export const PublicProvenanceSchema = z.discriminatedUnion('dataKind', [
  z.strictObject({dataKind: z.literal('SYNTHETIC'), sourceLabel: label, verifiedAt: z.null()}),
  z.strictObject({dataKind: z.literal('VERIFIED'), sourceLabel: label, verifiedAt: z.iso.datetime()}),
]);
export const PublicCoordinateSchema = z.strictObject({lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180)});
export const UniversitySchema = z.strictObject({id: PublicIdSchema, slug: UniversitySlugSchema, name: label, city: label,
  country: z.string().regex(/^[A-Z]{2}$/), provenance: PublicProvenanceSchema});
export const CampusSchema = z.strictObject({id: PublicIdSchema, universityId: PublicIdSchema, name: label,
  publicArea: label.nullable(), provenance: PublicProvenanceSchema});
export const CampusEntranceSchema = z.strictObject({id: PublicIdSchema, campusId: PublicIdSchema, name: label,
  location: PublicCoordinateSchema, isPrimary: z.boolean(), provenance: PublicProvenanceSchema});
// Narrow this resource to stable name/id ordering; no residential distance/search filters.
export const UniversityListQuerySchema = PaginationQuerySchema.pick({page: true, pageSize: true}).extend({slug: UniversitySlugSchema.optional()});
export const CampusListQuerySchema = PaginationQuerySchema.pick({page: true, pageSize: true});
export const EntranceListQuerySchema = CampusListQuerySchema.extend({campusId: PublicIdSchema.optional()});
export const UniversityPathSchema = z.strictObject({id: PublicIdSchema});
export const UniversityPageSchema = paginatedSchema(UniversitySchema);
export const CampusPageSchema = paginatedSchema(CampusSchema);
export const CampusEntrancePageSchema = paginatedSchema(CampusEntranceSchema);
export type UniversityListQuery = z.infer<typeof UniversityListQuerySchema>;
export type CampusListQuery = z.infer<typeof CampusListQuerySchema>;
export type EntranceListQuery = z.infer<typeof EntranceListQuerySchema>;
