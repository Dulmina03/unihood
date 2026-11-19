import {BadRequestException,ConflictException,ForbiddenException,NotFoundException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {BoardingRequestService} from '../src/requests/boarding-request.service';
import type {UniversityRepository} from '../src/universities/university.repository';
import type {ActorContext,PermissionService} from '@unihood/contracts';

const contributor={actorId:'synthetic:contributor',authStatus:'LOCAL_TEST_ACTOR',memberships:[]} as ActorContext;
const owner={actorId:'synthetic:owner-a',authStatus:'LOCAL_TEST_ACTOR',memberships:[]} as ActorContext;
const boardingId='00000000-0000-4000-8000-000000000001',requestId='46000000-0000-4000-8000-000000000001',key='46000000-0000-4000-8000-000000000002';
const input={requestKey:key,boardingId,kind:'CONTACT_OWNER',syntheticAcknowledged:true};
const payloadHash=createHash('sha256').update(`boarding-request-v1:${boardingId}:CONTACT_OWNER`).digest('hex');
const row={id:requestId,requester_ref:'synthetic:contributor',boarding_id:boardingId,kind:'CONTACT_OWNER',status:'MOCK_PENDING',data_kind:'SYNTHETIC',payload_hash:payloadHash,created_at:'2026-11-19T00:00:00.000000Z'};
type Query=(sql:string,values:unknown[])=>Promise<Record<string,unknown>[]>;
function setup(options:{visibility?:'PUBLIC_MAP'|'AREA_ONLY'|'HIDDEN'|null;visible?:boolean;previous?:Record<string,unknown>[];duplicate?:Record<string,unknown>[];statusRow?:Record<string,unknown>;suggest?:boolean}={}){
 const calls:{sql:string;args:unknown[]}[]=[];
 let insertedKind:'CONTACT_OWNER'|'REQUEST_LOCATION'='CONTACT_OWNER';
 const query:Query=async(sql,args)=>{calls.push({sql,args});
  if(sql.startsWith('INSERT INTO unihood_private.boarding_requests')){insertedKind=String(args[3]) as typeof insertedKind;return[];}
  if(sql.includes('pg_advisory_xact_lock'))return[];
  if(sql.includes('FROM public.boarding_advertisement_previews'))return options.visible===false||options.visibility===null?[]:[{visibility:options.visibility??'AREA_ONLY'}];
  if(sql.includes('payload_hash FROM unihood_private.boarding_requests'))return options.previous??[];
  if(sql.includes('boarding_id=$2 AND kind=$3'))return options.duplicate??[];
  if(sql.includes('WHERE id=$1 AND requester_ref=$2'))return options.statusRow?[options.statusRow]:[];
  if(sql.includes('WHERE id=$1'))return [{...row,kind:insertedKind,payload_hash:insertedKind==='CONTACT_OWNER'?payloadHash:createHash('sha256').update(`boarding-request-v1:${boardingId}:REQUEST_LOCATION`).digest('hex')}];
  return[];
 };
 const repo={includeSynthetic:true,query,transaction:async(work:(q:Query)=>Promise<unknown>)=>work(query)} as unknown as UniversityRepository;
 const permissions={canSuggestPlace:async()=>options.suggest!==false} as unknown as PermissionService;
 return {service:new BoardingRequestService(repo,permissions),calls};
}
describe('UNI-046 mock boarding request service',()=>{
 it('records owner contact intent as a synthetic pending receipt without changing public facts',async()=>{
  const {service,calls}=setup();const receipt=await service.create(contributor,input);
  expect(receipt).toMatchObject({requestId,boardingId,kind:'CONTACT_OWNER',status:'MOCK_PENDING',synthetic:true,ownerNotified:false,locationDisclosed:false,duplicate:false});
  const all=calls.map(c=>c.sql).join(' ');expect(all).not.toMatch(/UPDATE |DELETE |boarding_official_prices|boarding_vacancy|private_contact|boarding_contacts/);
  expect(calls.filter(c=>/^(?:INSERT|UPDATE|DELETE)/.test(c.sql)).map(c=>c.sql)).toEqual([expect.stringContaining('INSERT INTO unihood_private.boarding_requests')]);
  expect(all).not.toMatch(/latitude|longitude|\bgeom\b/);
  expect(JSON.stringify(receipt)).not.toMatch(/phone|email|coordinate|synthetic:contributor/);
 });
 it('accepts a location request for area-only/hidden owner ads but rejects an already-public map',async()=>{
  for(const visibility of ['AREA_ONLY','HIDDEN'] as const){const {service}=setup({visibility});await expect(service.create(contributor,{...input,kind:'REQUEST_LOCATION'})).resolves.toMatchObject({kind:'REQUEST_LOCATION',locationDisclosed:false});}
  const {service}=setup({visibility:'PUBLIC_MAP'});await expect(service.create(contributor,{...input,kind:'REQUEST_LOCATION'})).rejects.toBeInstanceOf(BadRequestException);
 });
 it('rejects missing/community advertisements and non-contributor actors',async()=>{
  const {service}=setup({visible:false});await expect(service.create(contributor,input)).rejects.toBeInstanceOf(NotFoundException);
  const notContributor=setup();await expect(notContributor.service.create(owner,input)).rejects.toBeInstanceOf(ForbiddenException);
  const denied=setup({suggest:false});await expect(denied.service.create(contributor,input)).rejects.toBeInstanceOf(ForbiddenException);
 });
 it('replays the same key, prevents duplicate kind requests and rejects changed intent',async()=>{
  const replay=setup({previous:[row]});await expect(replay.service.create(contributor,input)).resolves.toMatchObject({requestId,duplicate:true});
  const duplicate=setup({duplicate:[row]});await expect(duplicate.service.create(contributor,input)).resolves.toMatchObject({requestId,duplicate:true});
  const conflict=setup({previous:[{...row,payload_hash:'f'.repeat(64)}]});await expect(conflict.service.create(contributor,input)).rejects.toBeInstanceOf(ConflictException);
 });
 it('returns only the requester-owned status view',async()=>{
  const {service}=setup({statusRow:row});await expect(service.status(contributor,requestId)).resolves.toMatchObject({requestId,status:'MOCK_PENDING',ownerNotified:false,locationDisclosed:false});
  const missing=setup();await expect(missing.service.status(contributor,requestId)).rejects.toBeInstanceOf(NotFoundException);
  await expect(missing.service.status(owner,requestId)).rejects.toBeInstanceOf(ForbiddenException);
 });
});
