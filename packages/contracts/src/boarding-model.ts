import { z } from 'zod';
import { PublicIdSchema,paginatedSchema } from './rest';
import { PublicProvenanceSchema } from './university';
import { OwnerPublicMapSchema,OwnerAreaAdvertisementSchema,OwnerHiddenAdvertisementSchema,CommunityAreaAdvertisementSchema,CommunityHiddenAdvertisementSchema,parsePublicBoardingResponse } from './boarding-public';
// Internal unit model; raw bed counts are never a public vacancy confirmation.
export const BoardingUnitModelSchema=z.strictObject({id:PublicIdSchema,boardingId:PublicIdSchema,
 label:z.string().trim().min(1).max(160),roomType:z.string().trim().min(1).max(80),capacity:z.number().int().min(0).max(10000),
 availableBeds:z.number().int().nonnegative().nullable(),occupancyRules:z.string().max(2000).nullable(),
}).refine(value=>value.availableBeds===null||value.availableBeds<=value.capacity);
// id is the canonical property/place ID; listingId identifies a separate revision.
// These are response contracts, never evidence of caller authority or write input.
const metadata={kind:z.literal('BOARDING'),listingId:PublicIdSchema,provenance:PublicProvenanceSchema};
export const PublicBoardingListingSchema=z.union([
 OwnerPublicMapSchema.extend(metadata),OwnerAreaAdvertisementSchema.extend(metadata),OwnerHiddenAdvertisementSchema.extend(metadata),
 CommunityAreaAdvertisementSchema.extend(metadata),CommunityHiddenAdvertisementSchema.extend(metadata),
]);
export type PublicBoardingListing=z.infer<typeof PublicBoardingListingSchema>;
export const PublicBoardingListingPageSchema=paginatedSchema(PublicBoardingListingSchema);
export function parsePublicBoardingListing(input:unknown,now=Date.now()):PublicBoardingListing{
 const {kind,listingId,provenance,...base}=PublicBoardingListingSchema.parse(input);
 return PublicBoardingListingSchema.parse({...parsePublicBoardingResponse(base,now),kind,listingId,provenance});
}
