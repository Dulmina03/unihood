import { z } from 'zod';
import { PublisherKindSchema,BoardingVisibilitySchema } from './enums';
import { PaginationQuerySchema,paginatedSchema,PublicIdSchema } from './rest';
import { PublicProvenanceSchema } from './university';
import { OwnerAreaAdvertisementSchema,OwnerHiddenAdvertisementSchema,CommunityAreaAdvertisementSchema,CommunityHiddenAdvertisementSchema,UnknownVacancySchema } from './boarding-public';
import { parsePublicBoardingListing } from './boarding-model';
export const BoardingAdvertisementQuerySchema=PaginationQuerySchema.extend({publisherKind:PublisherKindSchema.optional(),visibility:BoardingVisibilitySchema.exclude(['PUBLIC_MAP']).optional()});
export type BoardingAdvertisementQuery=z.infer<typeof BoardingAdvertisementQuerySchema>;
const previewMetadata={price:z.null(),vacancy:UnknownVacancySchema,kind:z.literal('BOARDING'),listingId:PublicIdSchema,provenance:PublicProvenanceSchema.options[0]};
// This local/test read seam cannot authorize real data or public boarding geometry.
const PreviewListingSchema=z.union([OwnerAreaAdvertisementSchema.extend(previewMetadata),OwnerHiddenAdvertisementSchema.extend(previewMetadata),CommunityAreaAdvertisementSchema.extend(previewMetadata),CommunityHiddenAdvertisementSchema.extend(previewMetadata)]);
export const PublicBoardingAdvertisementSchema=z.strictObject({listing:PreviewListingSchema,summary:z.string().trim().min(1).max(800),updatedAt:z.iso.datetime()});
export type PublicBoardingAdvertisement=z.infer<typeof PublicBoardingAdvertisementSchema>;
export const BoardingAdvertisementPageSchema=paginatedSchema(PublicBoardingAdvertisementSchema);
export function parseBoardingAdvertisement(input:unknown,now=Date.now()):PublicBoardingAdvertisement {
 const item=PublicBoardingAdvertisementSchema.parse(input);
 return PublicBoardingAdvertisementSchema.parse({...item,listing:parsePublicBoardingListing(item.listing,now)});
}
