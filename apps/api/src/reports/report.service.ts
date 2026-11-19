import {ConflictException,ForbiddenException,Injectable,Inject,NotFoundException,ServiceUnavailableException,BadRequestException} from '@nestjs/common';
import {createHash,randomUUID} from 'node:crypto';
import {PublicIdSchema,ReportAppealInputSchema,ReportAppealReceiptSchema,ReportInputSchema,ReportOperatorInputSchema,ReportOperatorReceiptSchema,ReportReceiptSchema,ReportStatusViewSchema,type ActorContext,type PermissionService} from '@unihood/contracts';
import {PERMISSION_SERVICE} from '../identity/tokens';
import {UniversityRepository} from '../universities/university.repository';
import {encryptReportEvidence,reportKey} from './report-crypto';
import {baseSignals,contentSignals,observedRecently} from '../risk/risk-signals';
import {recordRisk} from '../risk/risk-evaluation';
type Query=(sql:string,values:unknown[])=>Promise<Record<string,unknown>[]>;
type Row=Record<string,unknown>;
const actorRefs=['synthetic:contributor','synthetic:contributor-b','synthetic:owner-a','synthetic:price-manager-a'];
const severityOf=(type:string)=>type==='PRIVATE_DATA_EXPOSED'||type==='FAKE_OWNERSHIP'||type==='HARASSMENT'?'P0':type==='INAPPROPRIATE_MEDIA'||type==='WRONG_FEE'||type==='WRONG_VACANCY'||type==='STALE_INFORMATION'||type==='CLOSURE'?'P1':'P2';
const automaticEffect=(type:string,targetType:string)=>type==='PRIVATE_DATA_EXPOSED'&&targetType==='BOARDING'?'LISTING_HIDDEN':(type==='PRIVATE_DATA_EXPOSED'||type==='INAPPROPRIATE_MEDIA')&&targetType==='MEDIA'?'MEDIA_BLOCKED':'NONE';
const date=`to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at`;
const reportColumns=`id,reporter_ref,owner_boarding_ref,target_type,target_ref,report_type,severity,status,public_effect,revision,${date}`;
@Injectable()
export class ReportService{
 constructor(private readonly repository:UniversityRepository,@Inject(PERMISSION_SERVICE)private readonly permissions:PermissionService){}
 private async actorId(actor:ActorContext){const id=actor.actorId;if(!this.repository.includeSynthetic||actor.authStatus!=='LOCAL_TEST_ACTOR'||!id)throw new ForbiddenException();if(id==='synthetic:operator'){if(!await this.permissions.canOperateReports(actor))throw new ForbiddenException();return id;}if(!actorRefs.includes(id))throw new ForbiddenException();return id;}
 private async contributor(actor:ActorContext){const id=await this.actorId(actor);if(id==='synthetic:operator'||!await this.permissions.canSuggestPlace(actor))throw new ForbiddenException();return id;}
 private receipt(row:Row){const effect=row.public_effect;return ReportReceiptSchema.parse({reportId:row.id,outcome:effect==='NONE'?'HELD_REPORT':'SUPPRESSED_HELD_REPORT',severity:row.severity,status:row.status,published:false,reporterIdentity:'PROTECTED',appealable:true,dataKind:'SYNTHETIC'});}
 private appealView(row:Row|null){return row?{appealId:row.id,status:row.status,outcome:row.status==='GRANTED'?'GRANTED':row.status==='DENIED'?'DENIED':null}:null;}
 private appealReceipt(reportId:string,row:Row){return ReportAppealReceiptSchema.parse({appealId:row.id,reportId,status:row.status,outcome:row.status==='GRANTED'?'GRANTED':row.status==='DENIED'?'DENIED':null,published:false,dataKind:'SYNTHETIC'});}
 private async audit(query:Query,reportId:string,event:string,actorId:string,detail:string){await query('INSERT INTO unihood_private.report_audit_events(id,report_id,event_type,actor_ref,redacted_detail) VALUES($1,$2,$3,$4,$5)',[randomUUID(),reportId,event,actorId,detail]);}
 private async bump(query:Query){await query("UPDATE unihood_private.public_projection_revisions SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE name='reports'",[]);}
 private async target(query:Query,input:{targetType:string;targetId:string}){
  if(input.targetType==='BOARDING'){const rows=await query("SELECT p.id FROM public.places p JOIN public.boarding_properties b ON b.place_id=p.id WHERE p.id=$1 AND p.kind='BOARDING' AND p.status='ACTIVE' AND p.merged_into IS NULL AND p.data_kind='SYNTHETIC' AND b.data_kind='SYNTHETIC'",[input.targetId]);if(!rows.length)throw new NotFoundException();return {ownerBoardingRef:input.targetId};}
  if(input.targetType==='POI'){const rows=await query("SELECT p.id FROM public.places p JOIN public.public_place_locations l ON l.place_id=p.id AND l.place_kind=p.kind AND l.place_status=p.status WHERE p.id=$1 AND p.kind='POI' AND p.status='ACTIVE' AND p.merged_into IS NULL AND p.data_kind='SYNTHETIC'",[input.targetId]);if(!rows.length)throw new NotFoundException();return {ownerBoardingRef:null};}
  if(input.targetType==='MEDIA'){const rows=await query("SELECT a.id,m.boarding_id FROM unihood_private.media_assets a JOIN unihood_private.boarding_media m ON m.retained_asset_id=a.id WHERE a.id=$1 AND m.state='ACTIVE'",[input.targetId]);if(!rows.length)throw new NotFoundException();return {ownerBoardingRef:rows[0].boarding_id};}
  const rows=await query("SELECT id FROM public.route_segments WHERE id=$1 AND data_kind='SYNTHETIC' AND public_status='ELIGIBLE'",[input.targetId]);
  if(!rows.length)throw new NotFoundException();
  return {ownerBoardingRef:null};
 }
 private async restoreSuppression(query:Query,reportId:string,actorId:string){const rows=await query("SELECT id,state,target_type,target_ref,listing_ref,prior_publication_status,prior_is_current FROM unihood_private.report_suppressions WHERE report_id=$1 FOR UPDATE",[reportId]);if(!rows.length||rows[0].state!=='ACTIVE')return false;await query("UPDATE unihood_private.report_suppressions SET state='RESTORED',revision=revision+1,restored_at=CURRENT_TIMESTAMP WHERE report_id=$1",[reportId]);if(rows[0].listing_ref)await query('UPDATE public.listings SET publication_status=$2,is_current=$3 WHERE id=$1',[rows[0].listing_ref,rows[0].prior_publication_status,rows[0].prior_is_current]);await this.bump(query);await this.audit(query,reportId,'PUBLIC_SUPPRESSION_RESTORED',actorId,'RESTORED');return true;}
 async create(actor:ActorContext,value:unknown){
  const actorId=await this.contributor(actor),input=ReportInputSchema.parse(value),key=reportKey();
  if(!key)throw new ServiceUnavailableException();
  if(input.observedOn&&input.observedOn>new Date().toISOString().slice(0,10))throw new BadRequestException();
  const {key:idempotencyKey,...payload}=input,hash=createHash('sha256').update('report-v1:'+JSON.stringify(payload)).digest('hex');
  return this.repository.transaction(async query=>{
   await query('SELECT pg_advisory_xact_lock(44044,1)',[]);
   const previous=await query(`SELECT ${reportColumns},payload_hash FROM unihood_private.report_cases WHERE reporter_ref=$1 AND idempotency_key=$2`,[actorId,idempotencyKey]);
   if(previous.length&&previous[0].payload_hash!==hash)throw new ConflictException();
   if(previous.length)return this.receipt(previous[0]);
   const target=await this.target(query,input),severity=severityOf(input.reportType),effect=automaticEffect(input.reportType,input.targetType),status=effect!=='NONE'?'SUPPRESSED':severity==='P0'?'ESCALATED':'HELD',reportId=randomUUID(),encrypted=encryptReportEvidence('case',reportId,input.details,key);
   await query('INSERT INTO unihood_private.report_cases(id,reporter_ref,idempotency_key,payload_hash,target_type,target_ref,owner_boarding_ref,report_type,severity,status,public_effect,details_ciphertext,details_iv,details_auth_tag,key_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',[reportId,actorId,idempotencyKey,hash,input.targetType,input.targetId,target.ownerBoardingRef,input.reportType,severity,status,effect,encrypted.ciphertext,encrypted.iv,encrypted.tag,'LOCAL_TEST_V1']);
   if(effect!=='NONE'){let listing:Row|undefined;if(effect==='LISTING_HIDDEN'){const rows=await query('SELECT id,publication_status,is_current FROM public.listings WHERE boarding_id=$1 AND is_current FOR UPDATE',[input.targetId]);if(!rows.length)throw new NotFoundException();listing=rows[0];}
   await query('INSERT INTO unihood_private.report_suppressions(id,report_id,target_type,target_ref,effect,listing_ref,prior_publication_status,prior_is_current) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),reportId,input.targetType,input.targetId,effect,listing?.id??null,listing?.publication_status??null,listing?.is_current??null]);
   if(listing)await query("UPDATE public.listings SET publication_status='DISPUTED',is_current=false WHERE id=$1",[listing.id]);await this.bump(query);await this.audit(query,reportId,'PUBLIC_SUPPRESSION_APPLIED',actorId,'SUPPRESSED');}
   if(status==='ESCALATED')await this.audit(query,reportId,'REPORT_ESCALATED',actorId,'ESCALATED');
   await this.audit(query,reportId,'REPORT_RECEIVED',actorId,'RECEIVED');
   const conflicting=Number((await query("SELECT count(*)::int AS n FROM unihood_private.report_cases WHERE target_type=$1 AND target_ref=$2 AND id<>$3 AND status IN ('HELD','SUPPRESSED','ESCALATED')",[input.targetType,input.targetId,reportId]))[0]?.n??0);
   const recent=Number((await query("SELECT count(*)::int AS n FROM unihood_private.report_cases WHERE reporter_ref=$1 AND created_at>CURRENT_TIMESTAMP-INTERVAL '24 hours'",[actorId]))[0]?.n??0);
   const signals=baseSignals('REPORT',input.targetType,{...contentSignals(input.details),sensitivePrivateText:input.reportType==='PRIVATE_DATA_EXPOSED',ownershipClaim:input.reportType==='FAKE_OWNERSHIP'});
   await recordRisk(query,'REPORT',reportId,{...signals,
    evidence:{sourceConfidence:'COMMUNITY_SUBMITTED',hasEvidenceNote:true,evidenceRequired:true,observedWithinDays:observedRecently(input.observedOn)},
    conflicts:{...signals.conflicts,activeSuppression:effect!=='NONE',conflictingReports:conflicting},
    submissionPattern:{recentSameActor:recent,recentDistinctActors:recent},
    sensitiveReport:severity==='P0'});
   return this.receipt({id:reportId,severity,status,public_effect:effect});
  });
 }
 async status(actor:ActorContext,idValue:unknown){
  const actorId=await this.actorId(actor),reportId=PublicIdSchema.parse(idValue),rows=await this.repository.query(`SELECT ${reportColumns} FROM unihood_private.report_cases WHERE id=$1`,[reportId]);
  if(!rows.length)throw new NotFoundException();const row=rows[0];
  const operator=await this.permissions.canOperateReports(actor),owner=row.owner_boarding_ref?await this.permissions.canManageProperty(actor,String(row.owner_boarding_ref)):false;
  if(!operator&&row.reporter_ref!==actorId&&!owner)throw new NotFoundException();
  const appeals=await this.repository.query('SELECT id,status FROM unihood_private.report_appeals WHERE report_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[reportId]);
  return ReportStatusViewSchema.parse({reportId:row.id,reportType:row.report_type,targetType:row.target_type,targetId:row.target_type==='MEDIA'?null:row.target_ref,severity:row.severity,status:row.status,publicEffect:row.public_effect,createdAt:row.created_at,appeal:this.appealView(appeals[0]??null),reporterIdentity:'PROTECTED',dataKind:'SYNTHETIC'});
 }
 async appeal(actor:ActorContext,idValue:unknown,value:unknown){
  const actorId=await this.contributor(actor),reportId=PublicIdSchema.parse(idValue),input=ReportAppealInputSchema.parse(value),key=reportKey();
  if(!key)throw new ServiceUnavailableException();
  const {key:idempotencyKey,...payload}=input,hash=createHash('sha256').update('report-appeal-v1:'+JSON.stringify(payload)).digest('hex');
  return this.repository.transaction(async query=>{
   await query('SELECT pg_advisory_xact_lock(44045,1)',[]);
   const reports=await query('SELECT id,reporter_ref,owner_boarding_ref FROM unihood_private.report_cases WHERE id=$1 FOR UPDATE',[reportId]);
   if(!reports.length)throw new NotFoundException();const report=reports[0];
   const isReporter=report.reporter_ref===actorId,isOwner=report.owner_boarding_ref?await this.permissions.canManageProperty(actor,String(report.owner_boarding_ref)):false;
   if(!isReporter&&!isOwner)throw new NotFoundException();
   const previous=await query('SELECT id,payload_hash,status FROM unihood_private.report_appeals WHERE appellant_ref=$1 AND idempotency_key=$2',[actorId,idempotencyKey]);
   if(previous.length&&previous[0].payload_hash!==hash)throw new ConflictException();
   if(previous.length)return this.appealReceipt(reportId,previous[0]);
   if((await query('SELECT id FROM unihood_private.report_appeals WHERE report_id=$1 AND appellant_ref=$2',[reportId,actorId])).length)throw new ConflictException();
   const appealId=randomUUID(),encrypted=encryptReportEvidence('appeal',appealId,input.reason,key);
   await query('INSERT INTO unihood_private.report_appeals(id,report_id,appellant_ref,appellant_role,idempotency_key,payload_hash,reason_ciphertext,reason_iv,reason_auth_tag,key_version,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[appealId,reportId,actorId,isReporter?'REPORTER':'AFFECTED_OWNER',idempotencyKey,hash,encrypted.ciphertext,encrypted.iv,encrypted.tag,'LOCAL_TEST_V1','OPEN']);
   await this.audit(query,reportId,'APPEAL_OPENED',actorId,'APPEAL_OPEN');
   return this.appealReceipt(reportId,{id:appealId,status:'OPEN'});
  });
 }
 async operate(actor:ActorContext,idValue:unknown,value:unknown){
  if(!await this.permissions.canOperateReports(actor))throw new ForbiddenException();
  const actorId=await this.actorId(actor),reportId=PublicIdSchema.parse(idValue),input=ReportOperatorInputSchema.parse(value);
  return this.repository.transaction(async query=>{
   await query('SELECT pg_advisory_xact_lock(44046,1)',[]);
   const rows=await query('SELECT id,status FROM unihood_private.report_cases WHERE id=$1 FOR UPDATE',[reportId]);
   if(!rows.length)throw new NotFoundException();
   if(input.action==='RESTORE_PUBLIC'){
    if(!await this.restoreSuppression(query,reportId,actorId))throw new ConflictException();
    await query("UPDATE unihood_private.report_cases SET public_effect='NONE',status='HELD',revision=revision+1 WHERE id=$1",[reportId]);
   } else if(input.action==='DISMISS_REPORT'){
    if(rows[0].status==='DISMISSED')throw new ConflictException();
    await this.restoreSuppression(query,reportId,actorId);
    await query("UPDATE unihood_private.report_cases SET public_effect='NONE',status='DISMISSED',closed_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE id=$1",[reportId]);
    await this.audit(query,reportId,'REPORT_DISMISSED',actorId,'DISMISSED');
   } else {
    const appeals=await query('SELECT id,status FROM unihood_private.report_appeals WHERE id=$1 AND report_id=$2 FOR UPDATE',[input.appealId,reportId]);
    if(!appeals.length)throw new NotFoundException();
    if(appeals[0].status!=='OPEN')throw new ConflictException();
    await query('UPDATE unihood_private.report_appeals SET status=$2,decided_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE id=$1',[input.appealId,input.decision]);
    if(input.decision==='GRANTED'){await this.restoreSuppression(query,reportId,actorId);await query("UPDATE unihood_private.report_cases SET public_effect='NONE',status='RESOLVED',closed_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE id=$1",[reportId]);await this.audit(query,reportId,'APPEAL_GRANTED',actorId,'APPEAL_GRANTED');}
    else await this.audit(query,reportId,'APPEAL_DENIED',actorId,'APPEAL_DENIED');
   }
   const updated=(await query('SELECT id,status,severity,public_effect,revision FROM unihood_private.report_cases WHERE id=$1',[reportId]))[0],appeal=(await query('SELECT id,status FROM unihood_private.report_appeals WHERE report_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[reportId]))[0];
   return ReportOperatorReceiptSchema.parse({reportId:updated.id,status:updated.status,severity:updated.severity,publicEffect:updated.public_effect,revision:updated.revision,appeal:this.appealView(appeal??null),dataKind:'SYNTHETIC'});
  });
 }
}
