import {z} from 'zod';
import {PublicIdSchema,PaginationQuerySchema,paginatedSchema} from './rest';
import {PoiCategoryCodeSchema} from './place';
import {PublicCoordinateSchema} from './university';
import {ReportSeveritySchema,ReportTypeSchema,RiskDecisionSchema,RiskLevelSchema,RiskRuleIdSchema,RiskRuleVersionSchema} from './enums';
const text=z.string().trim().min(15).max(400).regex(/^[^\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]+$/);
export const PoiCorrectionChangeSchema=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('NAME'),name:z.string().trim().min(10).max(200).regex(/^Synthetic[^\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]*$/)}),
 z.strictObject({kind:z.literal('CATEGORY'),category:PoiCategoryCodeSchema}),
 z.strictObject({kind:z.literal('CLOSURE'),state:z.enum(['TEMPORARILY_CLOSED','PERMANENTLY_CLOSED'])}),
 z.strictObject({kind:z.literal('MOVED'),publicEntrance:PublicCoordinateSchema}),
 z.strictObject({kind:z.literal('DETAILS'),description:text}),
]);
export const PoiCorrectionInputSchema=z.strictObject({key:z.uuid(),placeId:PublicIdSchema,change:PoiCorrectionChangeSchema,observedOn:z.iso.date(),evidenceNote:text,publicBusinessConfirmed:z.literal(true),syntheticAcknowledged:z.literal(true)});
export const PoiCorrectionReceiptSchema=z.strictObject({contributionId:PublicIdSchema,placeId:PublicIdSchema.nullable(),outcome:z.literal('HELD_CORRECTION'),reviewState:z.enum(['PENDING','NEEDS_EVIDENCE']),published:z.literal(false),dataKind:z.literal('SYNTHETIC')});
export const ContributionKindSchema=z.enum(['POI_CORRECTION','POI_PROPOSAL','BOARDING_RECOMMENDATION','REVIEW','REPORT']);
export const ContributionStateSchema=z.enum(['PENDING','NEEDS_EVIDENCE','HELD','SUPPRESSED','ESCALATED','RESOLVED','DISMISSED']);
export const ContributionHistoryQuerySchema=PaginationQuerySchema.pick({pageSize:true}).extend({page:z.string().regex(/^(?:[1-9]|[1-9][0-9]{1,3}|10000)$/).optional(),kind:ContributionKindSchema.optional(),state:ContributionStateSchema.optional()});
export const ContributionHistoryItemSchema=z.strictObject({id:PublicIdSchema,kind:ContributionKindSchema,state:ContributionStateSchema,createdAt:z.iso.datetime(),placeId:PublicIdSchema.nullable(),correctionKind:z.enum(['NAME','CATEGORY','CLOSURE','MOVED','DETAILS']).nullable().optional(),reviewKind:z.enum(['GENERAL_OBSERVATION','VERIFIED_STAY']).nullable().optional(),rating:z.number().int().min(1).max(5).nullable().optional(),reportType:ReportTypeSchema.nullable().optional(),severity:ReportSeveritySchema.nullable().optional(),riskDecision:RiskDecisionSchema.nullable().optional(),riskLevel:RiskLevelSchema.nullable().optional(),riskRuleVersion:RiskRuleVersionSchema.nullable().optional(),riskReasons:z.array(RiskRuleIdSchema).max(19).nullable().optional(),riskExplanation:z.string().trim().min(8).max(240).nullable().optional(),dataKind:z.literal('SYNTHETIC')}).refine(value=>{if(value.kind==='POI_CORRECTION')return (value.correctionKind??null)!==null&&(value.reviewKind??null)===null&&(value.rating??null)===null&&(value.reportType??null)===null;if(value.kind==='REVIEW')return value.reviewKind!==null&&value.placeId!==null&&(value.correctionKind??null)===null&&(value.reportType??null)===null;if(value.kind==='REPORT')return value.reportType!==undefined&&value.severity!==undefined&&value.reportType!==null&&value.severity!==null&&value.placeId===null&&(value.correctionKind??null)===null&&(value.reviewKind??null)===null&&(value.rating??null)===null;return value.placeId===null&&(value.correctionKind??null)===null&&(value.reviewKind??null)===null&&(value.rating??null)===null&&(value.reportType??null)===null;});
export const ContributionHistoryPageSchema=paginatedSchema(ContributionHistoryItemSchema);
export type PoiCorrectionInput=z.infer<typeof PoiCorrectionInputSchema>;
export type PoiCorrectionReceipt=z.infer<typeof PoiCorrectionReceiptSchema>;
export type ContributionHistoryQuery=z.infer<typeof ContributionHistoryQuerySchema>;
export type ContributionHistoryPage=z.infer<typeof ContributionHistoryPageSchema>;
