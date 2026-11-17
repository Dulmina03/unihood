import { z } from 'zod';
import { OwnerPublicMapSchema,OwnerAreaAdvertisementSchema,OwnerHiddenAdvertisementSchema,UnknownVacancySchema } from './boarding-public';
import { PublicProvenanceSchema } from './university';
// Fictional entrance identifier, not an arbitrary coordinate/private location.
export const OwnerVisibilityPreviewInputSchema=z.union([
 z.strictObject({visibility:z.literal('HIDDEN')}),
 z.strictObject({visibility:z.literal('AREA_ONLY'),locality:z.enum(['Synthetic North Quarter','Synthetic Garden District'])}),
 z.strictObject({visibility:z.literal('PUBLIC_MAP'),entranceFixture:z.literal('synthetic-courtyard-entrance'),publicMapConsent:z.literal(true),externalCopiesAcknowledged:z.literal(true)}),
]);
const template={title:z.literal('Synthetic owner visibility preview'),price:z.null(),vacancy:UnknownVacancySchema};
const OwnerTemplateSchema=z.union([OwnerPublicMapSchema.extend(template),OwnerAreaAdvertisementSchema.extend(template),OwnerHiddenAdvertisementSchema.extend(template)]);
export const OwnerVisibilityPreviewSchema=z.strictObject({outcome:z.literal('PREVIEW_ONLY'),published:z.literal(false),
 provenance:PublicProvenanceSchema.options[0],preview:OwnerTemplateSchema,
});
export type OwnerVisibilityPreviewInput=z.infer<typeof OwnerVisibilityPreviewInputSchema>;
export type OwnerVisibilityPreview=z.infer<typeof OwnerVisibilityPreviewSchema>;
