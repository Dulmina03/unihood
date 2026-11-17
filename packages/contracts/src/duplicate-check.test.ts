import { describe,expect,it } from 'vitest';
import { DuplicateCheckInputSchema,DuplicateCheckResultSchema,DuplicateChoiceSchema } from './duplicate-check';
const input={kind:'POI',name:'Synthetic pharmacy',category:'pharmacy',location:{lat:0,lng:0}};
describe('public duplicate preflight and ephemeral choice',()=>{
 it('bounds public fields and rejects residential, tuning and internal source authority',()=>{
  expect(DuplicateCheckInputSchema.safeParse(input).success).toBe(true);
  for(const data of [{...input,kind:'BOARDING'},{...input,location:{lat:91,lng:0}},{...input,name:'!?!'},...['source','buildingId','radiusMeters','limit','contact','owner','visibility'].map(key=>({...input,[key]:'PRIVATE_CANARY'}))])expect(DuplicateCheckInputSchema.safeParse(data).success).toBe(false);
 });
 it('cannot turn a choice or a clean preflight into publication authority',()=>{
  expect(DuplicateCheckResultSchema.safeParse({checkOnly:true,policyVersion:'public-poi-v1',scope:'PUBLIC_POI_ONLY',candidates:[],hasMore:false,incomplete:false,requiresReview:true}).success).toBe(true);
  for(const data of [{action:'suggest_update',placeId:'../private'},{action:'continue_as_distinct_with_reason',reason:'short'},{action:'continue_as_distinct_with_reason',reason:'x'.repeat(501)},{action:'cancel',publish:true}])expect(DuplicateChoiceSchema.safeParse(data).success).toBe(false);
  expect(DuplicateChoiceSchema.parse({action:'continue_as_distinct_with_reason',reason:'Different public pharmacy unit'}).action).toBe('continue_as_distinct_with_reason');
 });
});
