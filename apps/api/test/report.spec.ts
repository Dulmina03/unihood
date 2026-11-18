import {ConflictException,ForbiddenException,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {ReportService} from '../src/reports/report.service';
import type {UniversityRepository} from '../src/universities/university.repository';
import type {ActorContext,PermissionService} from '@unihood/contracts';
const contributor={actorId:'synthetic:contributor',authStatus:'LOCAL_TEST_ACTOR',memberships:[]} as ActorContext;
const owner={actorId:'synthetic:owner-a',authStatus:'LOCAL_TEST_ACTOR',memberships:[]} as ActorContext;
const operator={actorId:'synthetic:operator',authStatus:'LOCAL_TEST_ACTOR',memberships:[]} as ActorContext;
const key='44000000-0000-4000-8000-000000000001',target='00000000-0000-4000-8000-000000000001';
const input={key,targetType:'BOARDING',targetId:target,reportType:'WRONG_FEE',details:'Synthetic fictional fee mismatch context only.',syntheticAcknowledged:true};
const encryptionKey='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
type Query=(sql:string,values:unknown[])=>Promise<Record<string,unknown>[]>;
function setup(options:{visible?:boolean;suggest?:boolean;manage?:boolean;operate?:boolean;route?:boolean;previous?:Record<string,unknown>[];report?:Record<string,unknown>;appeals?:Record<string,unknown>[]}={}){
 const calls:{sql:string;args:unknown[]}[]=[];
 const query:Query=async(sql,args)=>{calls.push({sql,args});
  if(sql.includes('pg_advisory_xact_lock')||sql.startsWith('INSERT'))return[];
  if(sql.includes('payload_hash FROM unihood_private.report_cases'))return options.previous??[];
  if(sql.includes('SELECT id,reporter_ref,owner_boarding_ref'))return options.report?[options.report]:[];
  if(sql.includes('SELECT id,status,severity,public_effect,revision'))return options.report?[{...options.report,status:'DISMISSED',public_effect:'NONE'}]:[];
  if(sql.includes('SELECT id,status FROM unihood_private.report_cases'))return options.report?[{id:options.report.id,status:options.report.status}]:[];
  if(sql.includes('FROM unihood_private.report_cases WHERE id=$1'))return options.report?[options.report]:[];
  if(sql.includes('FROM unihood_private.report_appeals'))return options.appeals??[];
  if(sql.includes('FROM public.places p JOIN public.boarding_properties'))return options.visible===false?[]:[{id:target}];
  if(sql.includes('FROM public.places p JOIN public.public_place_locations'))return options.visible===false?[]:[{id:target}];
  if(sql.includes('FROM public.route_segments'))return options.route?[{id:target}]:[];
  if(sql.includes('FROM unihood_private.media_assets'))return options.visible===false?[]:[{id:target,boarding_id:target}];
  if(sql.includes('FROM public.listings WHERE boarding_id=$1 AND is_current'))return options.visible===false?[]:[{id:target,publication_status:'PUBLISHED',is_current:true}];
  return[];
 };
 const repo={includeSynthetic:true,query,transaction:async(work:(q:Query)=>Promise<unknown>)=>work(query)} as unknown as UniversityRepository;
 const permissions={canSuggestPlace:async()=>options.suggest!==false,canManageProperty:async()=>options.manage===true,canOperateReports:async()=>options.operate===true} as unknown as PermissionService;
 return {service:new ReportService(repo,permissions),calls};
}
const row={id:key,reporter_ref:'synthetic:contributor',owner_boarding_ref:target,target_type:'BOARDING',target_ref:target,report_type:'WRONG_FEE',severity:'P1',status:'HELD',public_effect:'NONE',revision:1,created_at:'2026-11-16T00:00:00Z'};
describe('UNI-044 confidential report service',()=>{
 const saved=process.env.REPORT_ENCRYPTION_KEY_HEX;
 beforeEach(()=>{process.env.REPORT_ENCRYPTION_KEY_HEX=encryptionKey;});afterAll(()=>{if(saved===undefined)delete process.env.REPORT_ENCRYPTION_KEY_HEX;else process.env.REPORT_ENCRYPTION_KEY_HEX=saved;});
 it('holds an ordinary wrong-fee report without touching official facts or public records',async()=>{
  const {service,calls}=setup();const receipt=await service.create(contributor,input);
  expect(receipt).toMatchObject({outcome:'HELD_REPORT',severity:'P1',status:'HELD',published:false,reporterIdentity:'PROTECTED'});
  const inserts=calls.filter(c=>c.sql.startsWith('INSERT')).map(c=>c.sql).join(' ');expect(inserts).toContain('unihood_private.report_cases');expect(inserts).toContain('unihood_private.report_audit_events');expect(inserts).not.toContain('report_suppressions');
  const all=calls.map(c=>c.sql).join(' ');expect(all).not.toMatch(/boarding_official_prices|UPDATE |DELETE |boarding_advertisement_previews|place_reviews/);
  expect(calls.find(c=>c.sql.startsWith('INSERT INTO unihood_private.report_cases'))!.args.join(' ')).not.toContain('Synthetic fictional fee');
 });
 it('temporarily suppresses only obvious private-data exposure or inappropriate media',async()=>{
  for(const [type,targetType,effect,severity] of [['PRIVATE_DATA_EXPOSED','BOARDING','LISTING_HIDDEN','P0'],['PRIVATE_DATA_EXPOSED','MEDIA','MEDIA_BLOCKED','P0'],['INAPPROPRIATE_MEDIA','MEDIA','MEDIA_BLOCKED','P1']] as const){
   const {service,calls}=setup();const receipt=await service.create(contributor,{...input,reportType:type,targetType});
   expect(receipt.status).toBe('SUPPRESSED');expect(receipt.outcome).toBe('SUPPRESSED_HELD_REPORT');expect(receipt.severity).toBe(severity);
   expect(calls.some(c=>c.sql.includes('INSERT INTO unihood_private.report_suppressions')&&String(c.args[4])===effect)).toBe(true);
   if(effect==='LISTING_HIDDEN')expect(calls.some(c=>c.sql.includes("SET publication_status='DISPUTED',is_current=false")&&c.args[0]===target)).toBe(true);
   expect(calls.some(c=>c.sql.includes('public_projection_revisions SET revision=revision+1'))).toBe(true);
  }
  for(const type of ['WRONG_FEE','FAKE_OWNERSHIP','NEGATIVE_REVIEW','HARASSMENT']){const {service,calls}=setup();const receipt=await service.create(contributor,{...input,reportType:type});expect(receipt.status).not.toBe('SUPPRESSED');expect(calls.some(c=>c.sql.includes('report_suppressions'))).toBe(false);}
  const {service}=setup();expect((await service.create(contributor,{...input,reportType:'INAPPROPRIATE_MEDIA',targetType:'BOARDING'})).status).not.toBe('SUPPRESSED');
 });
 it('fails closed without evidence encryption and before database work for unauthorized actors',async()=>{
  delete process.env.REPORT_ENCRYPTION_KEY_HEX;const blocked=setup();await expect(blocked.service.create(contributor,input)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(blocked.calls).toEqual([]);
  process.env.REPORT_ENCRYPTION_KEY_HEX=encryptionKey;const denied=setup({suggest:false});await expect(denied.service.create(contributor,input)).rejects.toBeInstanceOf(ForbiddenException);expect(denied.calls).toEqual([]);
  const operatorDenied=setup({operate:true});await expect(operatorDenied.service.create(operator,input)).rejects.toBeInstanceOf(ForbiddenException);
 });
 it('keeps idempotency and refuses changed intent',async()=>{
  const {service,calls}=setup();const first=await service.create(contributor,input),second=await service.create(contributor,input);expect(first.reportId).not.toBe(second.reportId);
  const prior={...row,payload_hash:'b'.repeat(64)},{service:conflict}=setup({previous:[prior]});await expect(conflict.create(contributor,input)).rejects.toBeInstanceOf(ConflictException);expect(calls.some(c=>c.sql.includes('INSERT INTO unihood_private.report_cases'))).toBe(true);
 });
 it('rejects unavailable public media and ineligible route targets',async()=>{
  const {service}=setup({visible:false});await expect(service.create(contributor,{...input,targetType:'MEDIA',reportType:'PRIVATE_DATA_EXPOSED'})).rejects.toBeInstanceOf(NotFoundException);
  const route=setup({route:false});await expect(route.service.create(contributor,{...input,targetType:'ROUTE_SEGMENT',reportType:'ROUTE_INFORMATION'})).rejects.toBeInstanceOf(NotFoundException);
  const eligible=setup({route:true});await expect(eligible.service.create(contributor,{...input,targetType:'ROUTE_SEGMENT',reportType:'ROUTE_INFORMATION'})).resolves.toMatchObject({status:'HELD'});
 });
 it('returns redacted status only to the reporter, affected owner or restricted operator',async()=>{
  const {service}=setup({report:row});const view=await service.status(contributor,key);
  expect(view).toMatchObject({reportId:key,reporterIdentity:'PROTECTED',targetId:target});expect(view).not.toHaveProperty('reporterRef');expect(JSON.stringify(view)).not.toMatch(/synthetic:contributor|details|ciphertext/);
  const unrelated=setup({report:row});await expect(unrelated.service.status(owner,key)).rejects.toBeInstanceOf(NotFoundException);
  const affected=setup({report:row,manage:true});await expect(affected.service.status(owner,key)).resolves.toMatchObject({reportId:key});
  const restricted=setup({report:row,operate:true});await expect(restricted.service.status(operator,key)).resolves.toMatchObject({reportId:key});
 });
 it('opens one encrypted private appeal for the reporter or affected owner and never stores plaintext',async()=>{
  const {service,calls}=setup({report:row,manage:true});const receipt=await service.appeal(owner,key,{key,reason:'Synthetic fictional appeal reason only.',syntheticAcknowledged:true});
  expect(receipt).toMatchObject({reportId:key,status:'OPEN',outcome:null,published:false});const insert=calls.find(c=>c.sql.includes('INSERT INTO unihood_private.report_appeals'))!;expect(insert.args.join(' ')).not.toContain('Synthetic fictional appeal');
  const unrelated=setup({report:{...row,owner_boarding_ref:null},manage:true});await expect(unrelated.service.appeal(owner,key,{key,reason:'Synthetic fictional appeal reason only.',syntheticAcknowledged:true})).rejects.toBeInstanceOf(NotFoundException);
 });
 it('restricts reversible operator transitions to an issued local/test operator',async()=>{
  const denied=setup({report:row});await expect(denied.service.operate(operator,key,{key,action:'RESTORE_PUBLIC',syntheticAcknowledged:true})).rejects.toBeInstanceOf(ForbiddenException);
  const allowed=setup({report:row,operate:true,appeals:[]});await expect(allowed.service.operate(operator,key,{key,action:'RESTORE_PUBLIC',syntheticAcknowledged:true})).rejects.toBeInstanceOf(ConflictException);
  const dismissed=setup({report:row,operate:true});await expect(dismissed.service.operate(operator,key,{key,action:'DISMISS_REPORT',syntheticAcknowledged:true})).resolves.toMatchObject({reportId:key,status:'DISMISSED',publicEffect:'NONE'});
  expect(dismissed.calls.some(c=>c.sql.includes('UPDATE unihood_private.report_cases SET public_effect'))).toBe(true);
 });
});
