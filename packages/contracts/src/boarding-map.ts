import { z } from 'zod';
import { OwnerPublicMapSchema, UnknownVacancySchema } from './boarding-public';
import { PublicProvenanceSchema } from './university';
import { paginatedSchema, PaginationQuerySchema, PublicIdSchema } from './rest';
import { OwnerVisibilityPreviewInputSchema } from './owner-visibility-preview';
// Closed synthetic seam; no real-owner claim, inventory, private point or routing payload.
export const BoardingMapPinSchema = OwnerPublicMapSchema.extend({kind:z.literal('BOARDING'),price:z.null(),vacancy:UnknownVacancySchema,provenance:PublicProvenanceSchema.options[0]});
export type BoardingMapPin=z.infer<typeof BoardingMapPinSchema>;
export const BoardingMapPageSchema=paginatedSchema(BoardingMapPinSchema);
export const BoardingMapQuerySchema=PaginationQuerySchema.pick({page:true,pageSize:true,q:true});
export const BoardingMapChangeSchema=z.strictObject({expectedRevision:z.number().int().positive().max(2147483646),choice:OwnerVisibilityPreviewInputSchema});
export type BoardingMapChange=z.infer<typeof BoardingMapChangeSchema>;
export const BoardingMapSettingsSchema=z.strictObject({id:PublicIdSchema,revision:z.number().int().positive(),visibility:z.enum(['PUBLIC_MAP','AREA_ONLY','HIDDEN']),locality:z.enum(['Synthetic North Quarter','Synthetic Garden District']).nullable(),synthetic:z.literal(true)});
