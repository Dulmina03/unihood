import { z } from 'zod';
import { PublicIdSchema, paginatedSchema } from './rest';
const text = z.string().trim().min(1).max(160);
export const PublicEntranceSchema = z.strictObject({lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180)});
export const OwnerPriceSchema = z.strictObject({currency: z.literal('LKR'), rentMonthly: z.number().nonnegative().max(1e9), deposit: z.number().nonnegative().max(1e9).optional(), verifiedSource: z.literal('OWNER')});
export const UnknownVacancySchema = z.strictObject({status: z.literal('UNKNOWN'), confirmedAt: z.null(), expiresAt: z.null()});
const confirmation = {confirmedAt: z.iso.datetime({offset: true}), expiresAt: z.iso.datetime({offset: true})};
export const OwnerVacancySchema = z.union([
  UnknownVacancySchema,
  z.strictObject({status: z.enum(['AVAILABLE', 'FULL']), ...confirmation}),
]).refine((value) => value.status === 'UNKNOWN' || Date.parse(value.expiresAt) > Date.parse(value.confirmedAt), 'Expiry must follow confirmation');
const base = {id: PublicIdSchema, title: text};
const owner = {...base, publisherKind: z.literal('OWNER_OFFICIAL'), ownerVerified: z.literal(true), price: OwnerPriceSchema.nullable(), vacancy: OwnerVacancySchema};
// Contacts/media/routes are deliberately absent until their consent/provenance contracts exist.
export const OwnerPublicMapSchema = z.strictObject({...owner, visibility: z.literal('PUBLIC_MAP'), publicMapConsent: z.literal(true), entrance: PublicEntranceSchema, locationLabel: text.nullable()});
export const OwnerAreaAdvertisementSchema = z.strictObject({...owner, visibility: z.literal('AREA_ONLY'), entrance: z.null(), locationLabel: text, distanceMeters: z.null(), route: z.null()});
export const OwnerHiddenAdvertisementSchema = z.strictObject({...owner, visibility: z.literal('HIDDEN'), entrance: z.null(), locationLabel: z.null(), distanceMeters: z.null(), route: z.null()});
const community = {...base, publisherKind: z.literal('COMMUNITY_RECOMMENDATION'), price: z.null(), vacancy: UnknownVacancySchema, disclaimer: z.literal('Community-submitted, not owner-verified'), entrance: z.null(), distanceMeters: z.null(), route: z.null()};
export const CommunityAreaAdvertisementSchema = z.strictObject({...community, visibility: z.literal('AREA_ONLY'), locationLabel: text});
export const CommunityHiddenAdvertisementSchema = z.strictObject({...community, visibility: z.literal('HIDDEN'), locationLabel: z.null()});
export const PublicBoardingResponseSchema = z.union([OwnerPublicMapSchema, OwnerAreaAdvertisementSchema, OwnerHiddenAdvertisementSchema, CommunityAreaAdvertisementSchema, CommunityHiddenAdvertisementSchema]);
export type PublicBoardingResponse = z.infer<typeof PublicBoardingResponseSchema>;
export const PublicBoardingPageSchema = paginatedSchema(PublicBoardingResponseSchema);
// Serialize a deliberately built public projection, never a raw DB entity. Reject extras recursively.
export function parsePublicBoardingResponse(input: unknown, now = Date.now()): PublicBoardingResponse {
  if (!Number.isFinite(now)) throw new Error('Invalid clock');
  const value = PublicBoardingResponseSchema.parse(input);
  if (value.vacancy.status !== 'UNKNOWN' && (Date.parse(value.vacancy.confirmedAt) > now || Date.parse(value.vacancy.expiresAt) <= now)) {
    value.vacancy = {status: 'UNKNOWN', confirmedAt: null, expiresAt: null};
  }
  return value;
}
