import { BoardingRecommendationDraftSchema, BoardingRecommendationInputSchema, BoardingRecommendationReceiptSchema } from './boarding-recommendation';
import {OwnerContactReceiptSchema,OwnerMediaUploadBodySchema,MediaBinarySchema,OwnerMediaItemSchema,OwnerMediaPageSchema,OwnerMediaReceiptSchema,OwnerPrivateContactInputSchema,OwnerPrivateContactSchema,OwnerPrivacyOverviewSchema,OwnerPrivacyEventPageSchema,PrivacyRevisionInputSchema} from './boarding-privacy';
import {NearbyEssentialItemSchema,BoardingNearbyEssentialsResponseSchema,BoardingComparisonQuerySchema,ComparisonEssentialSummarySchema,ComparisonUnitSummarySchema,BoardingComparisonItemSchema,BoardingComparisonResponseSchema} from './boarding-details';
import {OwnerUnitVacancyInputSchema,OwnerVacancyInputSchema,UnitVacancySchema,OwnerVacancyHistoryPageSchema} from './boarding-vacancy';
import { OwnerPriceHistoryPageSchema,OwnerUnitCreateSchema,OwnerUnitUpdateSchema,OwnerPriceInputSchema,OfficialUnitPriceSchema,PublicBoardingUnitSchema,BoardingUnitPageSchema,BoardingUnitQuerySchema,OwnerInventorySchema,InventoryMutationSchema } from './boarding-inventory';
import { BoardingMapPinSchema,BoardingMapPageSchema,BoardingMapQuerySchema,BoardingMapChangeSchema,BoardingMapSettingsSchema } from './boarding-map';
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
  BoardingRecommendationDraft: BoardingRecommendationDraftSchema, BoardingRecommendationInput: BoardingRecommendationInputSchema, BoardingRecommendationReceipt: BoardingRecommendationReceiptSchema,
  OwnerContactReceipt:OwnerContactReceiptSchema,OwnerMediaUploadBody:OwnerMediaUploadBodySchema,MediaBinary:MediaBinarySchema,OwnerMediaItem:OwnerMediaItemSchema,OwnerMediaPage:OwnerMediaPageSchema,OwnerMediaReceipt:OwnerMediaReceiptSchema,OwnerPrivateContactInput:OwnerPrivateContactInputSchema,OwnerPrivateContact:OwnerPrivateContactSchema,OwnerPrivacyOverview:OwnerPrivacyOverviewSchema,OwnerPrivacyEventPage:OwnerPrivacyEventPageSchema,PrivacyRevisionInput:PrivacyRevisionInputSchema,
  OwnerUnitVacancyInput:OwnerUnitVacancyInputSchema,OwnerVacancyInput:OwnerVacancyInputSchema,UnitVacancy:UnitVacancySchema,OwnerVacancyHistoryPage:OwnerVacancyHistoryPageSchema,
  OwnerPriceHistoryPage:OwnerPriceHistoryPageSchema,OwnerUnitCreate:OwnerUnitCreateSchema,OwnerUnitUpdate:OwnerUnitUpdateSchema,OwnerPriceInput:OwnerPriceInputSchema,OfficialUnitPrice:OfficialUnitPriceSchema,PublicBoardingUnit:PublicBoardingUnitSchema,BoardingUnitPage:BoardingUnitPageSchema,BoardingUnitQuery:BoardingUnitQuerySchema,OwnerInventory:OwnerInventorySchema,InventoryMutation:InventoryMutationSchema,
  BoardingMapPin:BoardingMapPinSchema,BoardingMapPage:BoardingMapPageSchema,BoardingMapQuery:BoardingMapQuerySchema,BoardingMapChange:BoardingMapChangeSchema,BoardingMapSettings:BoardingMapSettingsSchema,
  NearbyEssentialItem:NearbyEssentialItemSchema,BoardingNearbyEssentialsResponse:BoardingNearbyEssentialsResponseSchema,BoardingComparisonQuery:BoardingComparisonQuerySchema,ComparisonEssentialSummary:ComparisonEssentialSummarySchema,ComparisonUnitSummary:ComparisonUnitSummarySchema,BoardingComparisonItem:BoardingComparisonItemSchema,BoardingComparisonResponse:BoardingComparisonResponseSchema,
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
