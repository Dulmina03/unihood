import {z} from 'zod';
import {VacancyStatusSchema} from './enums';
import {PublicIdSchema,paginatedSchema} from './rest';
import {UnknownVacancySchema} from './boarding-public';
export const VacancyReasonSchema=z.enum(['INITIAL','RECONFIRMATION','STATUS_CHANGE','CORRECTION']);
const assertion={status:VacancyStatusSchema,availableBeds:z.number().int().min(0).max(10000).nullable()};
function consistent(v:{status:string;availableBeds:number|null}){return v.status==='AVAILABLE'?v.availableBeds!==null&&v.availableBeds>0:v.status==='FULL'?v.availableBeds===0:v.availableBeds===null;}
const confirmationInput={expectedUnitRevision:z.number().int().min(1).max(2147483646),expectedVacancyRevision:z.number().int().min(0).max(2147483646),...assertion,reason:VacancyReasonSchema};
export const OwnerUnitVacancyInputSchema=z.strictObject(confirmationInput).refine(consistent,'Status and explicitly confirmed count must agree');
export type OwnerUnitVacancyInput=z.infer<typeof OwnerUnitVacancyInputSchema>;
export const OwnerVacancyInputSchema=z.strictObject({unitId:PublicIdSchema,...confirmationInput}).refine(consistent,'Status and explicitly confirmed count must agree');
export type OwnerVacancyInput=z.infer<typeof OwnerVacancyInputSchema>;
const timed={confirmedAt:z.iso.datetime({offset:true}),expiresAt:z.iso.datetime({offset:true})};
export const ConfirmedUnitVacancySchema=z.strictObject({...assertion,...timed,source:z.literal('SYNTHETIC_OWNER')}).refine(v=>consistent(v)&&Date.parse(v.expiresAt)>Date.parse(v.confirmedAt),'Invalid confirmation or expiry');
export const UnitVacancySchema=z.union([UnknownVacancySchema,ConfirmedUnitVacancySchema]);
export type UnitVacancy=z.infer<typeof UnitVacancySchema>;
export const OwnerVacancyRevisionSchema=z.strictObject({...assertion,...timed,revision:z.number().int().positive(),unitRevision:z.number().int().positive(),reason:VacancyReasonSchema}).refine(v=>consistent(v)&&Date.parse(v.expiresAt)>Date.parse(v.confirmedAt),'Invalid confirmation history');
export const OwnerVacancyHistoryPageSchema=paginatedSchema(OwnerVacancyRevisionSchema);
export function currentUnitVacancy(input:UnitVacancy,now=Date.now()):UnitVacancy{if(!Number.isFinite(now))throw new Error('Invalid clock');const v=UnitVacancySchema.parse(input);if(v.confirmedAt===null)return v;if(Date.parse(v.confirmedAt)>now)return {status:'UNKNOWN',confirmedAt:null,expiresAt:null};if(Date.parse(v.expiresAt)<=now)return {...v,status:'UNKNOWN',availableBeds:null};return v;}
// Example policy only; deployment writes still require final authorization.
export function vacancyTtlDays(value:string|undefined):number|null{return value===undefined?14:/^(?:[1-9]|[1-9][0-9]|[12][0-9]{2}|3[0-5][0-9]|36[0-5])$/.test(value)?Number(value):null;}
