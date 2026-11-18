import { describe, expect, it } from 'vitest';
import { BoardingDuplicateInputSchema, BoardingDuplicateCandidateSchema, BoardingDuplicateResultSchema, BoardingResolutionInputSchema, BoardingResolutionReceiptSchema, boardingNameScore } from './boarding-duplicates';
const id='40000000-0000-4000-8000-000000000041';
const draft={title:'Synthetic Quiet Nook Annex',description:'Fictional permitted context, not a real property.',locality:null,facilities:[],privacyAcknowledged:true,mediaGuidanceAcknowledged:true};
describe('privacy-safe boarding duplicates',()=>{
 it('normalizes Unicode width/punctuation without guessed transliteration or geometry',()=>{
  expect(boardingNameScore('Synthetic Quiet Nook Annex','Synthetic Ｑuiet--Nook Annex')).toBe(100);
  expect(boardingNameScore('Synthetic Quiet Nook Annex','Synthetic Quiet Nook Anex')).toBeGreaterThan(70);
  expect(boardingNameScore('Synthetic Quiet Nook Annex','Synthetic Different Operator')).toBeLessThan(35);
  expect(boardingNameScore('Synthetic தமிழ் இடம்','Synthetic தமிழ் இடம்')).toBe(100);
 });
 it('rejects spatial/contact/fingerprint inputs and any hidden-locality or output extension',()=>{
  for(const field of ['lat','lng','entrance','distance','radius','buildingId','phone','contactFingerprint','imageHash','ownerId'])expect(BoardingDuplicateInputSchema.safeParse({title:draft.title,locality:null,[field]:'PRIVATE_CANARY'}).success).toBe(false);
  const candidate={boardingId:id,title:draft.title,publisherKind:'OWNER_OFFICIAL',visibility:'HIDDEN',locality:null,nameScore:95,dataKind:'SYNTHETIC'};
  expect(BoardingDuplicateCandidateSchema.safeParse(candidate).success).toBe(true);
  expect(BoardingDuplicateCandidateSchema.safeParse({...candidate,locality:'PRIVATE_LOCALITY'}).success).toBe(false);
  expect(BoardingDuplicateCandidateSchema.safeParse({...candidate,entrance:{lat:42,lng:43}}).success).toBe(false);
  expect(BoardingDuplicateResultSchema.safeParse({policyVersion:'boarding-ad-text-v1',candidates:[candidate],hasMore:false,incomplete:false,requiresReview:false}).success).toBe(false);
 });
 it('requires an explicit existing canonical ID or meaningful distinct reason; no owner publication fields',()=>{
  expect(BoardingResolutionInputSchema.safeParse({key:id,draft,resolution:{kind:'EXISTING',boardingId:id}}).success).toBe(true);
  expect(BoardingResolutionInputSchema.safeParse({key:id,draft,resolution:{kind:'DISTINCT',reason:'Different fictional operator; no private address.'}}).success).toBe(true);
  for(const resolution of [{kind:'DISTINCT',reason:'new'},{kind:'EXISTING',boardingId:id,publish:true},{kind:'AUTO_MERGE',boardingId:id}])expect(BoardingResolutionInputSchema.safeParse({key:id,draft,resolution}).success).toBe(false);
 });
 it('returns only an own held result and an eligible public canonical ID, never a private pending relation',()=>{
  const receipt={contributionId:id,outcome:'HELD_RECOMMENDATION',reviewState:'PENDING',publisherKind:'COMMUNITY_RECOMMENDATION',dataKind:'SYNTHETIC',published:false,resolution:'ATTACHED_FOR_REVIEW',canonicalBoardingId:id};
  expect(BoardingResolutionReceiptSchema.safeParse(receipt).success).toBe(true);
  expect(BoardingResolutionReceiptSchema.safeParse({...receipt,canonicalBoardingId:null}).success).toBe(false);
  expect(BoardingResolutionReceiptSchema.safeParse({...receipt,possibleRelatedIntakeId:id}).success).toBe(false);
  expect(BoardingResolutionReceiptSchema.safeParse({...receipt,published:true}).success).toBe(false);
 });
});
