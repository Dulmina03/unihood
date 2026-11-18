import {describe,it,expect} from 'vitest';
import {PoiCorrectionInputSchema,ContributionHistoryPageSchema,ContributionHistoryQuerySchema} from './poi-correction';
const base={key:'40000000-0000-4000-8000-000000000042',placeId:'30000000-0000-4000-8000-000000000001',observedOn:'2026-11-16',evidenceNote:'Synthetic source observation, never a real venue claim.',publicBusinessConfirmed:true,syntheticAcknowledged:true};
describe('UNI-042 held POI correction and own history contracts',()=>{
 it('supports explicit name/category/closure/moved/detail suggestions without accepting a public decision',()=>{
  for(const change of [{kind:'NAME',name:'Synthetic Corrected Name'},{kind:'CATEGORY',category:'pharmacy'},{kind:'CLOSURE',state:'TEMPORARILY_CLOSED'},{kind:'MOVED',publicEntrance:{lat:42,lng:43}},{kind:'DETAILS',description:'Synthetic public-hours context; held for review.'}])expect(PoiCorrectionInputSchema.safeParse({...base,change}).success).toBe(true);
  for(const field of ['actorId','boardingId','visibility','ownerVerified','price','vacancy','phone','publish','evidenceUrl'])expect(PoiCorrectionInputSchema.safeParse({...base,change:{kind:'NAME',name:'Synthetic New Name'},[field]:'PRIVATE_CANARY'}).success).toBe(false);
 });
 it('requires valid dates, declarations, bounded evidence and valid public coordinates',()=>{
  expect(PoiCorrectionInputSchema.safeParse({...base,change:{kind:'NAME',name:'Synthetic \u202eSpoofed name'}}).success).toBe(false);
  const change={kind:'MOVED',publicEntrance:{lat:91,lng:43}};expect(PoiCorrectionInputSchema.safeParse({...base,change}).success).toBe(false);
  for(const observedOn of ['2026-02-30','yesterday','2026-11-16T00:00:00Z'])expect(PoiCorrectionInputSchema.safeParse({...base,observedOn,change:{kind:'CLOSURE',state:'PERMANENTLY_CLOSED'}}).success).toBe(false);
  expect(PoiCorrectionInputSchema.safeParse({...base,syntheticAcknowledged:false,change:{kind:'CATEGORY',category:'clinic'}}).success).toBe(false);
 });
 it('accepts only bounded own-status filters and excludes hidden draft payloads from history',()=>{
  for(const query of [{actorId:'other'},{state:'PUBLISHED'},{page:'10001'},{pageSize:'101'}])expect(ContributionHistoryQuerySchema.safeParse(query).success).toBe(false);
  const item={id:base.key,kind:'POI_CORRECTION',state:'PENDING',createdAt:'2026-11-16T00:00:00Z',placeId:base.placeId,correctionKind:'NAME',dataKind:'SYNTHETIC'};
  expect(ContributionHistoryPageSchema.safeParse({items:[item],page:{page:1,pageSize:20,hasNextPage:false}}).success).toBe(true);
  for(const patch of [{payload:'PRIVATE_CANARY'},{actor_ref:'other'},{entrance:{lat:42,lng:43}},{kind:'BOARDING_RECOMMENDATION'}])expect(ContributionHistoryPageSchema.safeParse({items:[{...item,...patch}],page:{page:1,pageSize:20,hasNextPage:false}}).success).toBe(false);
 });
});
