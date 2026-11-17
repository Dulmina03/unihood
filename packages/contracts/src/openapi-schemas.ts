import { OwnerVisibilityPreviewInputSchema,OwnerVisibilityPreviewSchema } from './owner-visibility-preview';
import { OwnerWizardDraftSchema,OwnerDraftCheckSchema } from './owner-draft';
import { PublicBoardingListingSchema, PublicBoardingListingPageSchema } from './boarding-model';
import { PublicPoiProposalInputSchema, PublicPoiProposalResultSchema } from './poi-proposal';
import { DuplicateCheckInputSchema, DuplicateCheckResultSchema } from './duplicate-check';
import { PublicPoiDetailSchema, PublicPoiSchema, PoiCategorySchema, PoiPageSchema, PoiCategoryPageSchema, PoiListQuerySchema, PoiCategoryQuerySchema } from './place';
import { PublicIdSchema } from './rest';
import { UniversitySchema, CampusSchema, CampusEntranceSchema, UniversityPageSchema, CampusPageSchema, CampusEntrancePageSchema, UniversityListQuerySchema, CampusListQuerySchema, EntranceListQuerySchema } from './university';
import { z } from 'zod';
import { HealthResponseSchema, ReadinessResponseSchema, ReadyResponseSchema, NotReadyResponseSchema } from './health';
import * as enums from './enums';
import { ErrorResponseSchema, PaginationQuerySchema, PageMetaSchema } from './rest';
import { PublicBoardingResponseSchema, PublicBoardingPageSchema, OwnerPublicMapSchema } from './boarding-public';
import { BoardingAdvertisementQuerySchema,PublicBoardingAdvertisementSchema,BoardingAdvertisementPageSchema } from './boarding-advertisement';
// No actor identities/memberships, private location/media or persistence entities belong in OpenAPI components.
export const PublicSchemaRegistry = {
  OwnerVisibilityPreviewInput:OwnerVisibilityPreviewInputSchema,OwnerVisibilityPreview:OwnerVisibilityPreviewSchema,
  OwnerWizardDraft:OwnerWizardDraftSchema,OwnerDraftCheck:OwnerDraftCheckSchema,
  BoardingAdvertisementQuery:BoardingAdvertisementQuerySchema, PublicBoardingAdvertisement:PublicBoardingAdvertisementSchema, BoardingAdvertisementPage:BoardingAdvertisementPageSchema,
  PublicBoardingListing:PublicBoardingListingSchema, PublicBoardingListingPage:PublicBoardingListingPageSchema,
  PublicPoiProposalInput:PublicPoiProposalInputSchema, PublicPoiProposalResult:PublicPoiProposalResultSchema,
  DuplicateCheckInput: DuplicateCheckInputSchema, DuplicateCheckResult: DuplicateCheckResultSchema,
  PublicPoiDetail: PublicPoiDetailSchema, PublicPoi: PublicPoiSchema, PoiCategory: PoiCategorySchema, PoiPage: PoiPageSchema, PoiCategoryPage: PoiCategoryPageSchema, PoiListQuery: PoiListQuerySchema, PoiCategoryQuery: PoiCategoryQuerySchema,
  PublicId: PublicIdSchema, University: UniversitySchema, Campus: CampusSchema, CampusEntrance: CampusEntranceSchema,
  UniversityPage: UniversityPageSchema, CampusPage: CampusPageSchema, CampusEntrancePage: CampusEntrancePageSchema,
  UniversityListQuery: UniversityListQuerySchema, CampusListQuery: CampusListQuerySchema, EntranceListQuery: EntranceListQuerySchema,
  ...enums, HealthResponse: HealthResponseSchema, ReadinessResponse: ReadinessResponseSchema, ReadyResponse: ReadyResponseSchema, NotReadyResponse: NotReadyResponseSchema,
  ErrorResponse: ErrorResponseSchema, PaginationQuery: PaginationQuerySchema, PageMeta: PageMetaSchema,
  PublicBoardingResponse: PublicBoardingResponseSchema, PublicBoardingPage: PublicBoardingPageSchema,
  OwnerPublicMap: OwnerPublicMapSchema,
};
export type PublicSchemaName = keyof typeof PublicSchemaRegistry;
export function publicJsonSchemas() {
  return Object.fromEntries(Object.entries(PublicSchemaRegistry).map(([name, schema]) => {
    const json = z.toJSONSchema(schema, {target: 'draft-2020-12', unrepresentable: 'throw'});
    return [name, json];
  }));
}
