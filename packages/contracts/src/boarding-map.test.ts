import { describe,it,expect } from 'vitest';
import { BoardingMapChangeSchema,BoardingMapPinSchema,BoardingMapQuerySchema } from './boarding-map';
describe('consented public boarding map seam',()=>{
 it('rejects private modes, unconsented or community geometry, and inventory/metadata extras',()=>{
  const pin={id:'00000000-0000-4000-8000-000000000001',kind:'BOARDING',title:'Synthetic fixture',visibility:'PUBLIC_MAP',publisherKind:'OWNER_OFFICIAL',ownerVerified:true,publicMapConsent:true,entrance:{lat:0,lng:0},locationLabel:null,price:null,vacancy:{status:'UNKNOWN',confirmedAt:null,expiresAt:null},provenance:{dataKind:'SYNTHETIC',sourceLabel:'Fictional fixture',verifiedAt:null}};
  expect(BoardingMapPinSchema.safeParse(pin).success).toBe(true);for(const patch of [{visibility:'HIDDEN'},{visibility:'AREA_ONLY'},{publisherKind:'COMMUNITY_RECOMMENDATION'},{publicMapConsent:false},{privatePoint:{lat:42,lng:43}},{provenance:{...pin.provenance,dataKind:'VERIFIED'}}])expect(BoardingMapPinSchema.safeParse({...pin,...patch}).success).toBe(false);
 });
 it('accepts only revision-safe closed choices, not client coordinates/identity or spatial queries',()=>{
  expect(BoardingMapChangeSchema.safeParse({expectedRevision:1,choice:{visibility:'HIDDEN'}}).success).toBe(true);
  for(const choice of [{visibility:'HIDDEN',entrance:{lat:42,lng:43}},{visibility:'PUBLIC_MAP',entranceFixture:'synthetic-courtyard-entrance',publicMapConsent:false,externalCopiesAcknowledged:true}])expect(BoardingMapChangeSchema.safeParse({expectedRevision:1,choice}).success).toBe(false);
  for(const query of [{bbox:'42,43,44,45'},{sort:'distance'},{ownerId:'someone'}])expect(BoardingMapQuerySchema.safeParse(query).success).toBe(false);
 });
});
