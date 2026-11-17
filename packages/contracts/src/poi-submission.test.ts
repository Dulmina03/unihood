import { describe,it,expect } from 'vitest';
import { PoiSubmissionInputSchema,PoiSubmissionResultSchema } from './poi-submission';
const input={key:'00000000-0000-4000-8000-000000000001',draft:{kind:'POI',name:'Synthetic Pharmacy',category:'pharmacy',location:{lat:0,lng:0}},resolution:{action:'continue_as_distinct_with_reason',reason:'Separate synthetic public business'}};
describe('private pending POI intent contracts',()=>{
 it('requires a bounded synthetic public POI and an explicit review choice',()=>{
  expect(PoiSubmissionInputSchema.safeParse(input).success).toBe(true);
  for(const bad of [{...input,key:'repeat'},{...input,actorId:'synthetic:owner-a'},{...input,draft:{...input.draft,kind:'BOARDING'}},{...input,draft:{...input.draft,name:'A real unverified business'}},{...input,draft:{...input.draft,privateAddress:'PRIVATE_CANARY'}},{...input,resolution:{action:'cancel'}},{...input,resolution:{action:'continue_as_distinct_with_reason',reason:'short'}}])expect(PoiSubmissionInputSchema.safeParse(bad).success).toBe(false);
 });
 it('preserves opaque source identities and rejects publication/private evidence outputs',()=>{
  expect(PoiSubmissionInputSchema.parse({...input,source:{provider:' synthetic ','externalId':' ００１ ',licenseTag:'Synthetic only'}}).source?.externalId).toBe(' ００１ ');
  for(const value of [{outcome:'PUBLISHED',placeId:input.key,requiresReview:false},{outcome:'REVIEW_REQUIRED',requiresReview:true,location:{lat:0,lng:0}},{outcome:'REVIEW_REQUIRED',requiresReview:true,proposalId:input.key}])expect(PoiSubmissionResultSchema.safeParse(value).success).toBe(false);
 });
});
