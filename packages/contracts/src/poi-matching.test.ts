import { describe, expect, it } from 'vitest';
import { normalizePoiName, PoiMatchInputSchema, PoiMatchResultSchema } from './poi-matching';
const input={kind:'POI',name:'Synthetic Pharmacy',category:'pharmacy',location:{lat:0,lng:0}};
describe('versioned public POI normalization and internal matching boundary',()=>{
 it.each([['  ＳＹＮＴＨＥＴＩＣ — PHARMACY!!!  ','synthetic pharmacy'],['Synthetic café','synthetic café'],['Synthetic cafe\u0301','synthetic café'],['Synthetic රෝහල · மருத்துவமனை','synthetic රෝහල மருத்துவமனை'],['Synthetic ක්\u200dරීඩා','synthetic ක්\u200dරීඩා']])('normalizes %s without losing script marks', (original, expected)=>{
  expect(normalizePoiName(original)).toBe(expected);expect(normalizePoiName(normalizePoiName(original))).toBe(expected);
 });
 it('does not invent transliterations or equate distinct scripts/diacritics',()=>{
  expect(normalizePoiName('Synthetic café')).not.toBe(normalizePoiName('Synthetic cafe'));expect(normalizePoiName('Synthetic மருத்துவமனை')).not.toBe(normalizePoiName('Synthetic hospital'));
 });
 it('accepts strict bounded public POI inputs and rejects residential/identity/media data',()=>{
  expect(PoiMatchInputSchema.parse(input)).toMatchObject({radiusMeters:50,limit:10});
  const source={provider:' Synthetic Provider ',externalId:' ００１ '};expect(PoiMatchInputSchema.parse({...input,source}).source).toEqual(source);
  expect(PoiMatchInputSchema.safeParse({...input,source:{provider:'synthetic',externalId:'   '}}).success).toBe(false);
  for(const patch of [{kind:'BOARDING'},{visibility:'HIDDEN'},{ownerId:'owner'},{contact:'PRIVATE_CANARY'},{photoHash:'hash'},{radiusMeters:201},{radiusMeters:NaN},{limit:21},{name:'!!!'},{name:'\ufdfa'.repeat(200)},{name:'\u200d'},{name:'Synthetic\u202esecret'},{location:{lat:91,lng:0}}])expect(PoiMatchInputSchema.safeParse({...input,...patch}).success).toBe(false);
 });
 it('cannot express an automatic merge or a probability assertion in its result',()=>{
  const result={policyVersion:'public-poi-v1',scope:'PUBLIC_POI_ONLY',candidates:[],hasMore:false,incomplete:false,requiresReview:true};
  expect(PoiMatchResultSchema.safeParse(result).success).toBe(true);
  expect(PoiMatchResultSchema.safeParse({...result,requiresReview:false}).success).toBe(false);expect(PoiMatchResultSchema.safeParse({...result,mergeInto:'id'}).success).toBe(false);
 });
});
