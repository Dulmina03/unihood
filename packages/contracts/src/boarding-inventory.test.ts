import { describe,expect,it } from 'vitest';
import { formatLkrMinor,parseLkrInput,OwnerPriceInputSchema,OwnerUnitCreateSchema,PublicBoardingUnitSchema } from './boarding-inventory';
describe('official synthetic inventory contracts',()=>{
 it('uses exact integer LKR minor units without rounding or accepting ambiguous input',()=>{
  expect(parseLkrInput('123.45')).toBe(12345);expect(parseLkrInput('0.01')).toBe(1);expect(parseLkrInput('10')).toBe(1000);expect(parseLkrInput('1000000000')).toBe(100000000000);expect(formatLkrMinor(12345)).toContain('123.45');
  for(const value of ['01','1.234','-1','1e3','NaN','1,000','1000000000.01',' 1',''])expect(parseLkrInput(value)).toBeNull();
 });
 it('separates capacity and official price permission inputs from vacancy, authority, location and arbitrary public text',()=>{
  const unit={expectedInventoryRevision:0,template:'STUDY_ROOM',capacity:2};expect(OwnerUnitCreateSchema.safeParse(unit).success).toBe(true);for(const patch of [{availableBeds:2},{ownerVerified:true},{label:'PRIVATE_CANARY street'},{location:{lat:42,lng:43}},{capacity:-1}])expect(OwnerUnitCreateSchema.safeParse({...unit,...patch}).success).toBe(false);
  const price={unitId:'00000000-0000-4000-8000-000000000003',expectedPriceRevision:0,currency:'LKR',period:'MONTH',basis:'BED',rentMinor:100000,depositMinor:null,utilityTerms:'NOT_SHARED',mealTerms:'NOT_SHARED',effectiveAt:'2026-11-17T00:00:00Z',reason:'INITIAL'};
  expect(OwnerPriceInputSchema.safeParse(price).success).toBe(true);for(const patch of [{rentMinor:1.1},{currency:'USD'},{actorId:'owner'},{vacancy:'AVAILABLE'},{depositMinor:-1},{utilityTerms:'Private phone +000'}])expect(OwnerPriceInputSchema.safeParse({...price,...patch}).success).toBe(false);
 });
 it('never treats capacity as confirmed vacancy or accepts private/actor history in public units',()=>{
  const unit={id:'00000000-0000-4000-8000-000000000003',boardingId:'00000000-0000-4000-8000-000000000001',label:'Synthetic Study Room',template:'STUDY_ROOM',capacity:2,price:null,vacancy:{status:'UNKNOWN',confirmedAt:null,expiresAt:null},provenance:{dataKind:'SYNTHETIC',sourceLabel:'Fictional fixture',verifiedAt:null}};
  expect(PublicBoardingUnitSchema.safeParse(unit).success).toBe(true);for(const patch of [{availableBeds:2},{entrance:{lat:42,lng:43}},{authorRef:'someone'},{vacancy:{status:'AVAILABLE',confirmedAt:null,expiresAt:null}}])expect(PublicBoardingUnitSchema.safeParse({...unit,...patch}).success).toBe(false);
 });
});
