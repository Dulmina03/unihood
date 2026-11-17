import { z } from 'zod';
import { PublicIdSchema,PaginationQuerySchema,paginatedSchema } from './rest';
import { PublicProvenanceSchema } from './university';
import { UnitVacancySchema,OwnerVacancyRevisionSchema } from './boarding-vacancy';
export const UnitTemplateSchema=z.enum(['STUDY_ROOM','SHARED_ROOM']);
const version=z.number().int().min(0).max(2147483646);
const capacity=z.number().int().min(0).max(10000);
export const LkrMinorSchema=z.number().int().min(0).max(100000000000);
export const ChargeTermsSchema=z.enum(['NOT_SHARED','INCLUDED','SEPARATE']);
export const PriceReasonSchema=z.enum(['INITIAL','CORRECTION','FEE_CHANGE']);
const fee={currency:z.literal('LKR'),period:z.literal('MONTH'),basis:z.enum(['ROOM','BED']),rentMinor:LkrMinorSchema,depositMinor:LkrMinorSchema.nullable(),utilityTerms:ChargeTermsSchema,mealTerms:ChargeTermsSchema,effectiveAt:z.iso.datetime({offset:true})};
export const OwnerUnitCreateSchema=z.strictObject({expectedInventoryRevision:version,template:UnitTemplateSchema,capacity});
export type OwnerUnitCreate=z.infer<typeof OwnerUnitCreateSchema>;
export const OwnerUnitUpdateSchema=z.strictObject({expectedRevision:version.min(1),template:UnitTemplateSchema,capacity});
export type OwnerUnitUpdate=z.infer<typeof OwnerUnitUpdateSchema>;
export const OwnerPriceInputSchema=z.strictObject({unitId:PublicIdSchema,expectedPriceRevision:version,...fee,reason:PriceReasonSchema});
export type OwnerPriceInput=z.infer<typeof OwnerPriceInputSchema>;
export const OfficialUnitPriceSchema=z.strictObject({...fee,revision:z.number().int().positive(),recordedAt:z.iso.datetime({offset:true})});
export const OwnerPriceRevisionSchema=OfficialUnitPriceSchema.extend({reason:PriceReasonSchema});
export const OwnerPriceHistoryPageSchema=paginatedSchema(OwnerPriceRevisionSchema);
export const PublicBoardingUnitSchema=z.strictObject({id:PublicIdSchema,boardingId:PublicIdSchema,label:z.enum(['Synthetic Study Room','Synthetic Shared Room']),template:UnitTemplateSchema,capacity,price:OfficialUnitPriceSchema.nullable(),vacancy:UnitVacancySchema,provenance:PublicProvenanceSchema.options[0]}).refine(v=>v.vacancy.status!=='AVAILABLE'||v.vacancy.availableBeds!==null&&v.vacancy.availableBeds<=v.capacity,'Confirmed count exceeds capacity');
export type PublicBoardingUnit=z.infer<typeof PublicBoardingUnitSchema>;
export const BoardingUnitPageSchema=paginatedSchema(PublicBoardingUnitSchema);
export const BoardingUnitQuerySchema=PaginationQuerySchema.pick({page:true,pageSize:true});
export const OwnerBoardingUnitSchema=PublicBoardingUnitSchema.safeExtend({vacancyRevision:z.number().int().nonnegative(),vacancyHistory:z.array(OwnerVacancyRevisionSchema).max(20),hasMoreVacancyHistory:z.boolean(),revision:z.number().int().positive(),priceRevision:z.number().int().nonnegative(),priceHistory:z.array(OwnerPriceRevisionSchema).max(20),hasMoreHistory:z.boolean()});
export const OwnerInventorySchema=z.strictObject({id:PublicIdSchema,synthetic:z.literal(true),inventoryRevision:z.number().int().nonnegative(),units:z.array(OwnerBoardingUnitSchema).max(100)});
export type OwnerInventory=z.infer<typeof OwnerInventorySchema>;
export const InventoryMutationSchema=z.strictObject({id:PublicIdSchema,unitId:PublicIdSchema,synthetic:z.literal(true)});
// Decimal input is converted without floating-point multiplication or rounding.
export function parseLkrInput(input:string):number|null{if(!/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/.test(input))return null;const [whole,fraction='']=input.split('.');const minor=Number(whole)*100+Number(fraction.padEnd(2,'0'));return LkrMinorSchema.safeParse(minor).success?minor:null;}
export function formatLkrMinor(minor:number){return new Intl.NumberFormat('en-LK',{style:'currency',currency:'LKR',minimumFractionDigits:2,maximumFractionDigits:2}).format(LkrMinorSchema.parse(minor)/100);}
