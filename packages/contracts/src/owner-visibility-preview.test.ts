import { describe,it,expect } from 'vitest';
import { OwnerVisibilityPreviewInputSchema,OwnerVisibilityPreviewSchema } from './owner-visibility-preview';
describe('mode-specific owner preview request',()=>{
 it('requires true acknowledgements only for the explicitly selected fictional public entrance',()=>{expect(OwnerVisibilityPreviewInputSchema.safeParse({visibility:'PUBLIC_MAP',entranceFixture:'synthetic-courtyard-entrance',publicMapConsent:true,externalCopiesAcknowledged:true}).success).toBe(true);for(const missing of ['entranceFixture','publicMapConsent','externalCopiesAcknowledged']){const input:Record<string,unknown>={visibility:'PUBLIC_MAP',entranceFixture:'synthetic-courtyard-entrance',publicMapConsent:true,externalCopiesAcknowledged:true};delete input[missing];expect(OwnerVisibilityPreviewInputSchema.safeParse(input).success).toBe(false);}});
 it('accepts only the appropriate private-mode label and rejects injected geometry or authority',()=>{
  expect(OwnerVisibilityPreviewInputSchema.safeParse({visibility:'HIDDEN'}).success).toBe(true);expect(OwnerVisibilityPreviewInputSchema.safeParse({visibility:'AREA_ONLY',locality:'Synthetic North Quarter'}).success).toBe(true);
  for(const input of [{visibility:'HIDDEN',locality:'Synthetic North Quarter'},{visibility:'AREA_ONLY'},...['HIDDEN','AREA_ONLY'].map(visibility=>({visibility,locality:'Synthetic North Quarter',entrance:{lat:1,lng:2}})),{visibility:'HIDDEN',ownerVerified:true}])expect(OwnerVisibilityPreviewInputSchema.safeParse(input).success).toBe(false);
 });
 it('limits the unpublished response to the fixed synthetic owner template with no official inventory',()=>{
  const preview={id:'00000000-0000-4000-8000-000000000001',title:'Synthetic owner visibility preview',publisherKind:'OWNER_OFFICIAL',ownerVerified:true,visibility:'HIDDEN',locationLabel:null,entrance:null,distanceMeters:null,route:null,price:null,vacancy:{status:'UNKNOWN',confirmedAt:null,expiresAt:null}};
  const response={outcome:'PREVIEW_ONLY',published:false,provenance:{dataKind:'SYNTHETIC',sourceLabel:'Synthetic fixture',verifiedAt:null},preview};expect(OwnerVisibilityPreviewSchema.safeParse(response).success).toBe(true);
  const {ownerVerified,...community}=preview;void ownerVerified;
  for(const value of [{...preview,title:'PRIVATE_CANARY'},{...preview,price:{currency:'LKR',rentMonthly:999,verifiedSource:'OWNER'}},{...preview,vacancy:{status:'AVAILABLE',confirmedAt:'2026-11-17T00:00:00Z',expiresAt:'2026-11-18T00:00:00Z'}},{...community,publisherKind:'COMMUNITY_RECOMMENDATION',disclaimer:'Community-submitted, not owner-verified'}])expect(OwnerVisibilityPreviewSchema.safeParse({...response,preview:value}).success).toBe(false);
 });
});
