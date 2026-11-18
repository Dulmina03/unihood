import {describe,it,expect} from 'vitest';
import {ReviewInputSchema,ReviewReceiptSchema} from './review';
import {ContributionHistoryPageSchema,ContributionHistoryQuerySchema} from './poi-correction';
const base={key:'40000000-0000-4000-8000-000000000043',targetType:'BOARDING',targetId:'30000000-0000-4000-8000-000000000001',reviewKind:'GENERAL_OBSERVATION',sourceConfidence:'COMMUNITY_SUBMITTED',sourceLabel:'SYNTHETIC',syntheticAcknowledged:true};
describe('UNI-043 structured review contracts',()=>{
 it('accepts general observation with rating only, observation only, or both',()=>{
  expect(ReviewInputSchema.safeParse({...base,rating:4}).success).toBe(true);
  expect(ReviewInputSchema.safeParse({...base,observation:'Synthetic general context only.'}).success).toBe(true);
  expect(ReviewInputSchema.safeParse({...base,rating:5,observation:'Synthetic stay context, no verified claim.'}).success).toBe(true);
  expect(ReviewInputSchema.safeParse({...base,reviewKind:'VERIFIED_STAY',rating:3,observation:'Synthetic stay-based context.'}).success).toBe(true);
 });
 it('rejects missing both rating and observation, invalid ratings, and private fields',()=>{
  expect(ReviewInputSchema.safeParse({...base}).success).toBe(false);
  for(const rating of [0,6,1.5])expect(ReviewInputSchema.safeParse({...base,rating}).success).toBe(false);
  for(const field of ['actorId','boardingId','address','phone','contact','price','rent','vacancy','owner','publish','evidenceUrl','coordinates','latitude','longitude'])expect(ReviewInputSchema.safeParse({...base,rating:4,[field]:'PRIVATE_CANARY'}).success).toBe(false);
 });
 it('requires synthetic acknowledgement',()=>{
  expect(ReviewInputSchema.safeParse({...base,syntheticAcknowledged:false,rating:4}).success).toBe(false);
 });
 it('accepts only bounded own-status filters and excludes private payload from history',()=>{
  for(const query of [{actorId:'other'},{state:'PUBLISHED'},{page:'10001'},{pageSize:'101'}])expect(ContributionHistoryQuerySchema.safeParse(query).success).toBe(false);
  const item={id:base.key,kind:'REVIEW',state:'PENDING',createdAt:'2026-11-16T00:00:00Z',placeId:base.targetId,reviewKind:'GENERAL_OBSERVATION',rating:4,dataKind:'SYNTHETIC'};
  expect(ContributionHistoryPageSchema.safeParse({items:[item],page:{page:1,pageSize:20,hasNextPage:false}}).success).toBe(true);
  for(const patch of [{payload:'PRIVATE_CANARY'},{actor_ref:'other'},{correctionKind:'NAME'},{kind:'POI_CORRECTION'}])expect(ContributionHistoryPageSchema.safeParse({items:[{...item,...patch}],page:{page:1,pageSize:20,hasNextPage:false}}).success).toBe(false);
 });
 it('produces a minimal held review receipt',()=>{
  const receipt={contributionId:base.key,outcome:'HELD_REVIEW',reviewState:'PENDING',published:false,dataKind:'SYNTHETIC'};
  expect(ReviewReceiptSchema.safeParse(receipt).success).toBe(true);
  expect(ReviewReceiptSchema.safeParse({...receipt,published:true}).success).toBe(false);
 });
});
