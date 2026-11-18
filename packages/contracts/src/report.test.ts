import {describe,it,expect} from 'vitest';
import {ReportAppealInputSchema,ReportInputSchema,ReportOperatorInputSchema,ReportReceiptSchema,ReportStatusViewSchema} from './report';
import {ContributionHistoryItemSchema,ContributionKindSchema} from './poi-correction';
const key='44000000-0000-4000-8000-000000000001',target='00000000-0000-4000-8000-000000000001';
const base={key,targetType:'BOARDING',targetId:target,reportType:'WRONG_FEE',details:'Synthetic fictional fee mismatch context only.',syntheticAcknowledged:true};
describe('UNI-044 report contracts',()=>{
 it('accepts a structured reporting case without caller-selected severity',()=>{
  const value=ReportInputSchema.parse({...base,observedOn:'2026-11-16'});
  expect(value.reportType).toBe('WRONG_FEE');expect(value).not.toHaveProperty('severity');
  for(const extra of [{severity:'P0'},{reporterId:'synthetic:owner-a'},{evidence:'PRIVATE_CANARY'},{published:true},{actorId:'x'},{status:'RESOLVED'}])expect(ReportInputSchema.safeParse({...base,...extra}).success).toBe(false);
 });
 it('requires route information reports to use an eligible route segment target',()=>{
  expect(ReportInputSchema.safeParse({...base,reportType:'ROUTE_INFORMATION'}).success).toBe(false);
  expect(ReportInputSchema.safeParse({...base,targetType:'ROUTE_SEGMENT',reportType:'ROUTE_INFORMATION'}).success).toBe(true);
  expect(ReportInputSchema.safeParse({...base,targetType:'ROUTE_SEGMENT'}).success).toBe(false);
 });
 it('bounds evidence text and rejects control/direction characters',()=>{
  expect(ReportInputSchema.safeParse({...base,details:'short'}).success).toBe(false);
  expect(ReportInputSchema.safeParse({...base,details:'Synthetic '+ 'x'.repeat(1000)}).success).toBe(false);
  expect(ReportInputSchema.safeParse({...base,details:'Synthetic \u202eoverride context only'}).success).toBe(false);
 });
 it('keeps receipts and status redacted and non-publishing',()=>{
  const receipt=ReportReceiptSchema.parse({reportId:key,outcome:'SUPPRESSED_HELD_REPORT',severity:'P0',status:'SUPPRESSED',published:false,reporterIdentity:'PROTECTED',appealable:true,dataKind:'SYNTHETIC'});
  expect(receipt).not.toHaveProperty('reporterRef');expect(receipt).not.toHaveProperty('details');
  for(const extra of [{reporterRef:'synthetic:contributor'},{details:'PRIVATE_CANARY'},{published:true}])expect(ReportReceiptSchema.safeParse({...receipt,...extra}).success).toBe(false);
  const view={reportId:key,reportType:'PRIVATE_DATA_EXPOSED',targetType:'MEDIA',targetId:null,severity:'P0',status:'SUPPRESSED',publicEffect:'MEDIA_BLOCKED',createdAt:'2026-11-16T00:00:00Z',appeal:null,reporterIdentity:'PROTECTED',dataKind:'SYNTHETIC'};
  expect(ReportStatusViewSchema.safeParse(view).success).toBe(true);expect(ReportStatusViewSchema.safeParse({...view,reporterRef:'x'}).success).toBe(false);
 });
 it('validates appeal and operator decision intent without identity fields',()=>{
  expect(ReportAppealInputSchema.safeParse({key,reason:'Synthetic fictional appeal reason only.',syntheticAcknowledged:true}).success).toBe(true);
  for(const extra of [{appellantRef:'synthetic:owner-a'},{status:'DENIED'},{reportId:key}])expect(ReportAppealInputSchema.safeParse({key,reason:'Synthetic fictional appeal reason only.',syntheticAcknowledged:true,...extra}).success).toBe(false);
  expect(ReportOperatorInputSchema.safeParse({key,action:'DECIDE_APPEAL',appealId:key,decision:'GRANTED',syntheticAcknowledged:true}).success).toBe(true);
  expect(ReportOperatorInputSchema.safeParse({key,action:'DECIDE_APPEAL',syntheticAcknowledged:true}).success).toBe(false);
  expect(ReportOperatorInputSchema.safeParse({key,action:'RESTORE_PUBLIC',decision:'GRANTED',syntheticAcknowledged:true}).success).toBe(false);
 });
 it('adds a bounded REPORT kind to actor-scoped contribution history',()=>{
  expect(ContributionKindSchema.parse('REPORT')).toBe('REPORT');
  const item={id:key,kind:'REPORT',state:'SUPPRESSED',createdAt:'2026-11-16T00:00:00Z',placeId:null,reportType:'PRIVATE_DATA_EXPOSED',severity:'P0',dataKind:'SYNTHETIC'};
  expect(ContributionHistoryItemSchema.safeParse(item).success).toBe(true);
  for(const extra of [{details:'PRIVATE_CANARY'},{reporterRef:'synthetic:contributor'},{targetId:target}])expect(ContributionHistoryItemSchema.safeParse({...item,...extra}).success).toBe(false);
  expect(ContributionHistoryItemSchema.safeParse({...item,severity:null}).success).toBe(false);
 });
});
