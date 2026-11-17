import { describe,it,expect } from 'vitest';
import { BoardingUnitModelSchema,PublicBoardingListingSchema,parsePublicBoardingListing,publicJsonSchemas } from './index';
const id='61000000-0000-4000-8000-000000000001',listingId='62000000-0000-4000-8000-000000000001';
const unknown={status:'UNKNOWN',confirmedAt:null,expiresAt:null};
const base={id,kind:'BOARDING',listingId,title:'Synthetic contract boarding',provenance:{dataKind:'SYNTHETIC',sourceLabel:'Synthetic contract only; no real owner or property',verifiedAt:null}};
const owner={...base,publisherKind:'OWNER_OFFICIAL',ownerVerified:true,price:null,vacancy:unknown};
const community={...base,publisherKind:'COMMUNITY_RECOMMENDATION',disclaimer:'Community-submitted, not owner-verified',price:null,vacancy:unknown};
const restricted={entrance:null,distanceMeters:null,route:null};
describe('boarding foundation contracts',()=>{
 it('keeps canonical property and advertisement revision IDs distinct across all five privacy variants',()=>{
  const variants=[{...owner,visibility:'PUBLIC_MAP',publicMapConsent:true,entrance:{lat:0,lng:0},locationLabel:null},
   {...owner,...restricted,visibility:'AREA_ONLY',locationLabel:'Synthetic broad locality'}, {...owner,...restricted,visibility:'HIDDEN',locationLabel:null},
   {...community,...restricted,visibility:'AREA_ONLY',locationLabel:'Synthetic owner-approved broad locality'}, {...community,...restricted,visibility:'HIDDEN',locationLabel:null}];
  for(const value of variants){expect(parsePublicBoardingListing(value,0)).toEqual(value);for(const extra of [{exactGeo:{lat:0,lng:0}},{buildingId:id},{addressEnc:'PRIVATE_CANARY'},{media:{objectKey:'PRIVATE_CANARY'}},{sourceNote:'PRIVATE_CANARY'}])expect(PublicBoardingListingSchema.safeParse({...value,...extra}).success).toBe(false);}
  for(const value of variants.slice(1))for(const extra of [{entrance:{lat:0,lng:0}},{distanceMeters:1},{route:{points:[[0,0]]}}])expect(PublicBoardingListingSchema.safeParse({...value,...extra}).success).toBe(false);
  expect(PublicBoardingListingSchema.safeParse({...variants[4],visibility:'PUBLIC_MAP',ownerVerified:true,publicMapConsent:true,entrance:{lat:0,lng:0}}).success).toBe(false);
 });
 it('normalizes expired/future official assertions without exposing raw inventory',()=>{
  const value={...owner,...restricted,visibility:'HIDDEN',locationLabel:null,vacancy:{status:'AVAILABLE',confirmedAt:'2026-11-16T00:00:00Z',expiresAt:'2026-11-17T00:00:00Z'}};
  expect(parsePublicBoardingListing(value,Date.parse('2026-11-17T00:00:00Z')).vacancy).toEqual(unknown);
  expect(parsePublicBoardingListing(value,0).vacancy).toEqual(unknown);
  expect(()=>parsePublicBoardingListing(value,NaN)).toThrow();
 });
 it('validates internal capacities without registering private storage models as public schemas',()=>{
  const unit={id,boardingId:id,label:'Synthetic unit',roomType:'Synthetic shared room',capacity:2,availableBeds:null,occupancyRules:null};
  expect(BoardingUnitModelSchema.safeParse(unit).success).toBe(true);
  for(const extra of [{capacity:-1},{availableBeds:3},{availableBeds:-1},{capacity:1.5},{capacity:0,availableBeds:1},{privateGeo:{lat:0,lng:0}}])expect(BoardingUnitModelSchema.safeParse({...unit,...extra}).success).toBe(false);
  const schemas=publicJsonSchemas();expect(schemas.PublicBoardingListing).toBeDefined();expect(schemas.PublicBoardingListingPage).toBeDefined();
  for(const name of ['BoardingUnitModel','PrivateBoardingLocation','MediaAsset','BoardingProperty'])expect(schemas).not.toHaveProperty(name);
 });
});
