import { describe,it,expect } from 'vitest';
import { PublicPoiProposalInputSchema,PublicPoiProposalResultSchema } from './poi-proposal';
const input={key:'59000000-0000-4000-8000-000000000001',draft:{kind:'POI',name:'Synthetic Public Pharmacy',category:'pharmacy',location:{lat:0,lng:0}},resolution:{action:'continue_as_distinct_with_reason',reason:'A fictional distinct public business'},sourceNote:'Original synthetic observation',publicBusinessConfirmed:true};
describe('public proposal wire contract',()=>{
 it('requires explicit public business confirmation and a bounded source',()=>{
  expect(PublicPoiProposalInputSchema.safeParse(input).success).toBe(true);
  for(const value of [{...input,publicBusinessConfirmed:false},{...input,sourceNote:'short'},{...input,draft:{...input.draft,kind:'BOARDING'}},{...input,draft:{...input.draft,name:'Unlabeled real place'}},...['actorId','source','status','reviewState','ownerVerified','rent','media'].map(key=>({...input,[key]:'PRIVATE_CANARY'}))])expect(PublicPoiProposalInputSchema.safeParse(value).success).toBe(false);
 });
 it('cannot advertise publication, authority or private evidence in a receipt',()=>{
  expect(PublicPoiProposalResultSchema.safeParse({outcome:'PENDING_REVIEW',proposalId:input.key,requiresReview:true,reviewState:'NEEDS_EVIDENCE'}).success).toBe(true);
  for(const value of [{outcome:'PENDING_REVIEW',proposalId:input.key,requiresReview:true,reviewState:'PUBLISHED'},{outcome:'REVIEW_REQUIRED',requiresReview:true,sourceNote:'PRIVATE_CANARY'},{outcome:'PENDING_REVIEW',proposalId:input.key,requiresReview:false,reviewState:'PENDING'}])expect(PublicPoiProposalResultSchema.safeParse(value).success).toBe(false);
 });
});
