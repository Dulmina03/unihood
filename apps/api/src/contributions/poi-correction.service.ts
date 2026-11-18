import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {createHash,randomUUID} from 'node:crypto';
import {PoiCorrectionInputSchema,PoiCorrectionReceiptSchema,ContributionHistoryQuerySchema,ContributionHistoryPageSchema,type ActorContext} from '@unihood/contracts';
import {UniversityRepository} from '../universities/university.repository';
import {BoardingRecommendationService} from './boarding-recommendation.service';
import {poiReviewPolicy} from '../duplicates/poi-review-policy';
import {baseSignals,contentSignals,observedRecently} from '../risk/risk-signals';
import {recordRisk} from '../risk/risk-evaluation';
const eligible=`FROM public.places p JOIN public.public_place_locations l ON l.place_id=p.id AND l.place_kind=p.kind AND l.place_status=p.status WHERE p.id=$1 AND p.kind='POI' AND p.status='ACTIVE' AND p.merged_into IS NULL AND p.data_kind='SYNTHETIC'`;
@Injectable()
export class PoiCorrectionService{
 constructor(private readonly repository:UniversityRepository,private readonly access:BoardingRecommendationService){}
 async create(actor:ActorContext,value:unknown){
  const actorId=await this.access.authorize(actor),input=PoiCorrectionInputSchema.parse(value);
  if(input.observedOn>new Date().toISOString().slice(0,10))throw new BadRequestException();
  const {key,...payload}=input,hash=createHash('sha256').update('poi-correction-v1:'+JSON.stringify(payload)).digest('hex');
  return this.repository.transaction(async query=>{
   await query('SELECT pg_advisory_xact_lock(42042,1)',[]);
   const previous=await query('SELECT id,payload_hash,review_state FROM unihood_private.poi_correction_intake WHERE actor_ref=$1 AND idempotency_key=$2',[actorId,key]);
   if(previous.length&&previous[0].payload_hash!==hash)throw new ConflictException();
   const visible=await query(`SELECT p.id ${eligible} FOR SHARE OF p,l`,[input.placeId]);
   const receipt=(id:unknown,state:unknown)=>PoiCorrectionReceiptSchema.parse({contributionId:id,placeId:visible.length?input.placeId:null,outcome:'HELD_CORRECTION',reviewState:state,published:false,dataKind:'SYNTHETIC'});
   if(previous.length)return receipt(previous[0].id,previous[0].review_state);
   if(!visible.length)throw new NotFoundException();
   if(input.change.kind==='CATEGORY'&&!(await query('SELECT code FROM public.poi_categories WHERE code=$1',[input.change.category])).length)throw new ConflictException();
   const policy=poiReviewPolicy(JSON.stringify(input.change)+' '+input.evidenceNote);
   const state=['MOVED','CLOSURE'].includes(input.change.kind)?'NEEDS_EVIDENCE':policy.reviewState,id=randomUUID();
   await query(`INSERT INTO unihood_private.poi_correction_intake(id,actor_ref,idempotency_key,payload_hash,place_id,correction_kind,payload,observed_on,review_state) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,[id,actorId,key,hash,input.placeId,input.change.kind,JSON.stringify(payload),input.observedOn,state]);
   const conflicting=Number((await query("SELECT count(*)::int AS n FROM unihood_private.poi_correction_intake WHERE place_id=$1 AND actor_ref<>$2 AND review_state IN ('PENDING','NEEDS_EVIDENCE')",[input.placeId,actorId]))[0]?.n??0);
   const recent=Number((await query("SELECT count(*)::int AS n FROM unihood_private.poi_correction_intake WHERE actor_ref=$1 AND created_at>CURRENT_TIMESTAMP-INTERVAL '24 hours'",[actorId]))[0]?.n??0);
   const distinct=Number((await query("SELECT count(DISTINCT actor_ref)::int AS n FROM unihood_private.poi_correction_intake WHERE place_id=$1 AND created_at>CURRENT_TIMESTAMP-INTERVAL '24 hours'",[input.placeId]))[0]?.n??0);
   const signals=baseSignals('POI_CORRECTION','POI',contentSignals(JSON.stringify(input.change),input.evidenceNote));
   await recordRisk(query,'POI_CORRECTION',id,{...signals,
    evidence:{sourceConfidence:'COMMUNITY_SUBMITTED',hasEvidenceNote:true,evidenceRequired:['MOVED','CLOSURE'].includes(input.change.kind),observedWithinDays:observedRecently(input.observedOn)},
    conflicts:{...signals.conflicts,conflictingReports:conflicting},
    submissionPattern:{recentSameActor:recent,recentDistinctActors:distinct}});
   return receipt(id,state);
  });
 }
 async history(actor:ActorContext,value:unknown){
  const actorId=await this.access.authorize(actor),input=ContributionHistoryQuerySchema.parse(value),page=Number(input.page??1),pageSize=Number(input.pageSize??20);
  // Only the requesting actor's minimal receipts. No payload, pending text,
  // residential geometry/contact, private match evidence or other actor ID.
  const rows=await this.repository.query(`SELECT h.id,h.kind,h.state,to_char(h.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt",h.place_id AS "placeId",h.correction_kind AS "correctionKind",h.review_kind AS "reviewKind",h.rating,h.report_type AS "reportType",h.severity,re.decision AS "riskDecision",re.risk_level AS "riskLevel",re.rule_version AS "riskRuleVersion",re.reasons AS "riskReasons",re.explanation AS "riskExplanation",'SYNTHETIC' AS "dataKind" FROM (
   SELECT c.id,'POI_CORRECTION' AS kind,c.review_state AS state,c.created_at,
    CASE WHEN EXISTS(SELECT 1 ${eligible.replaceAll('$1','c.place_id')}) THEN c.place_id ELSE NULL END AS place_id,c.correction_kind,NULL::text AS review_kind,NULL::smallint AS rating,NULL::text AS report_type,NULL::text AS severity
    FROM unihood_private.poi_correction_intake c WHERE c.actor_ref=$1
   UNION ALL SELECT id,'POI_PROPOSAL',review_state,created_at,NULL::uuid,NULL::text,NULL::text,NULL::smallint,NULL::text,NULL::text FROM public.poi_pending_proposals WHERE actor_ref=$1 AND data_kind='SYNTHETIC'
   UNION ALL SELECT i.id,'BOARDING_RECOMMENDATION',COALESCE(r.review_state,i.review_state),i.created_at,NULL::uuid,NULL::text,NULL::text,NULL::smallint,NULL::text,NULL::text FROM unihood_private.boarding_recommendation_intake i LEFT JOIN unihood_private.boarding_recommendation_resolutions r ON r.contribution_id=i.id WHERE i.actor_ref=$1
   UNION ALL SELECT r.id,'REVIEW',r.review_state,r.created_at,r.target_id,NULL::text,r.review_kind,r.rating,NULL::text,NULL::text FROM unihood_private.review_intake r WHERE r.actor_ref=$1
   UNION ALL SELECT p.id,'REPORT',p.status,p.created_at,NULL::uuid,NULL::text,NULL::text,NULL::smallint,p.report_type,p.severity FROM unihood_private.report_cases p WHERE p.reporter_ref=$1
  ) h LEFT JOIN unihood_private.risk_evaluations re ON re.contribution_kind=h.kind AND re.contribution_id=h.id WHERE ($2::text IS NULL OR h.kind=$2) AND ($3::text IS NULL OR h.state=$3) ORDER BY h.created_at DESC,h.kind,h.id LIMIT $4 OFFSET $5`,[actorId,input.kind??null,input.state??null,pageSize+1,(page-1)*pageSize]);
  return ContributionHistoryPageSchema.parse({items:rows.slice(0,pageSize),page:{page,pageSize,hasNextPage:rows.length>pageSize}});
 }
}
