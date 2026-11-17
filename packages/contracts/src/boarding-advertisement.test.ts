import { describe,it,expect } from 'vitest';
import { BoardingAdvertisementQuerySchema,PublicBoardingAdvertisementSchema } from './boarding-advertisement';
describe('nonspatial advertisement filters',()=>{
 it('limits current preview responses to synthetic private variants without official assertions',()=>{
  const listing={id:'71000000-0000-4000-8000-000000000001',listingId:'72000000-0000-4000-8000-000000000001',kind:'BOARDING',title:'Synthetic preview',publisherKind:'OWNER_OFFICIAL',ownerVerified:true,visibility:'HIDDEN',locationLabel:null,entrance:null,distanceMeters:null,route:null,price:null,vacancy:{status:'UNKNOWN',confirmedAt:null,expiresAt:null},provenance:{dataKind:'SYNTHETIC',sourceLabel:'Synthetic fixture',verifiedAt:null}};
  const item={listing,summary:'Fictional preview',updatedAt:'2026-11-17T00:00:00Z'};expect(PublicBoardingAdvertisementSchema.safeParse(item).success).toBe(true);
  for(const extra of [{visibility:'PUBLIC_MAP',publicMapConsent:true,entrance:{lat:0,lng:0}},{provenance:{dataKind:'VERIFIED',sourceLabel:'Claimed real source',verifiedAt:'2026-11-17T00:00:00Z'}},{price:{currency:'LKR',rentMonthly:1000,verifiedSource:'OWNER'}},{vacancy:{status:'AVAILABLE',confirmedAt:'2026-11-17T00:00:00Z',expiresAt:'2026-11-18T00:00:00Z'}}])expect(PublicBoardingAdvertisementSchema.safeParse({...item,listing:{...listing,...extra}}).success).toBe(false);
 });
 it('accepts bounded source/visibility/title search and refuses inference fields',()=>{
  expect(BoardingAdvertisementQuerySchema.parse({q:' Synthetic ',publisherKind:'OWNER_OFFICIAL',visibility:'AREA_ONLY',page:'2',sort:'title'}).q).toBe('Synthetic');
  for(const v of [{sort:'distance'},{visibility:'PUBLIC_MAP'},{lat:'0'},{q:['a','b']},{q:''},{page:'01'},{pageSize:'101'},{ownerVerified:'true'}])expect(BoardingAdvertisementQuerySchema.safeParse(v).success).toBe(false);
 });
});
