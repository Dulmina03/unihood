import { randomUUID,createHash } from 'node:crypto';
import { Inject,Injectable,ForbiddenException,ConflictException,ServiceUnavailableException } from '@nestjs/common';
import { normalizePoiName,PoiSubmissionInputSchema,PoiSubmissionResultSchema,type PoiSubmissionResult,type ActorContext,type PermissionService } from '@unihood/contracts';
import { PERMISSION_SERVICE } from '../identity/tokens';
import { UniversityRepository } from '../universities/university.repository';
import { PoiMatcherService } from './poi-matcher.service';
@Injectable()
export class PoiSubmissionService {
 constructor(@Inject(UniversityRepository) private readonly repository:Pick<UniversityRepository,'transaction'|'includeSynthetic'>,
  @Inject(PERMISSION_SERVICE) private readonly permissions:Pick<PermissionService,'canSuggestPlace'>){}
 async prepare(actor:ActorContext,input:unknown):Promise<PoiSubmissionResult>{
  // No body/header-selected identity. Existing issuer must recognize this exact
  // actor, and the environment must permit synthetic data, before any DB access.
  const actorId=actor.actorId;
  if(!this.repository.includeSynthetic||actor.authStatus!=='LOCAL_TEST_ACTOR'||!actor.actorId?.startsWith('synthetic:')||actor.actorId.length>160||!await this.permissions.canSuggestPlace(actor))throw new ForbiddenException();
  if(actor.actorId!==actorId)throw new ForbiddenException();
  const parsed=PoiSubmissionInputSchema.parse(input),{key,...payload}=parsed;
  const hash=createHash('sha256').update('poi-intent-v1:'+JSON.stringify(payload)).digest('hex');
  return this.repository.transaction(async query=>{
   // One transaction-level global scope is conservative across radius/cell and
   // source-geometry drift. No session lock leaks through the shared pool.
   await query('SELECT pg_advisory_xact_lock(25025,1)',[]);
   const previous=await query('SELECT payload_hash,result FROM public.poi_submission_requests WHERE actor_ref=$1 AND idempotency_key=$2',[actorId,key]);
   if(previous.length){
    if(previous[0].payload_hash!==hash)throw new ConflictException();
    const cached=PoiSubmissionResultSchema.parse(previous[0].result);
    if(cached.outcome==='EXISTING_PUBLIC_PLACE'){
     const visible=await query(`SELECT p.id FROM public.places p JOIN public.public_place_locations l ON l.place_id=p.id
       WHERE p.id=$1 AND p.kind='POI' AND p.status='ACTIVE' AND p.merged_into IS NULL`,[cached.placeId]);
     if(!visible.length)return PoiSubmissionResultSchema.parse({outcome:'REVIEW_REQUIRED',requiresReview:true});
    }
    return cached;
   }
   const category=await query('SELECT code FROM public.poi_categories WHERE code=$1',[parsed.draft.category]);
   if(!category.length)throw new ConflictException();
   const save=async(result:unknown)=>{
    const safe=PoiSubmissionResultSchema.parse(result);
    await query('INSERT INTO public.poi_submission_requests(actor_ref,idempotency_key,payload_hash,result) VALUES($1,$2,$3,$4::jsonb)',[actorId,key,hash,JSON.stringify(safe)]);return safe;
   };
   const review=()=>save({outcome:'REVIEW_REQUIRED',requiresReview:true});
   if(parsed.source){
    const source=await query('SELECT place_id FROM public.place_source_refs WHERE provider=$1 AND external_id=$2',[parsed.source.provider,parsed.source.externalId]);
    if(source.length){
     const eligible=await query(`SELECT p.id FROM public.places p JOIN public.public_place_locations l ON l.place_id=p.id
       WHERE p.id=$1 AND p.kind='POI' AND p.status='ACTIVE' AND p.merged_into IS NULL`,[source[0].place_id]);
     return eligible.length?save({outcome:'EXISTING_PUBLIC_PLACE',placeId:eligible[0].id,requiresReview:true}):review();
    }
    const pendingSource=await query('SELECT 1 FROM public.poi_pending_source_refs WHERE provider=$1 AND external_id=$2',[parsed.source.provider,parsed.source.externalId]);
    if(pendingSource.length)return review();
   }
   const normalized=normalizePoiName(parsed.draft.name);
   const pending=await query(`SELECT 1 FROM public.poi_pending_proposals WHERE status='PENDING' AND category=$1
     AND ST_DWithin(public_entrance::geography,ST_SetSRID(ST_Point($2,$3),4326)::geography,50)
     AND (normalized_name=$4 OR similarity(normalized_name,$4)>=0.6) LIMIT 1`,[parsed.draft.category,parsed.draft.location.lng,parsed.draft.location.lat,normalized]);
   // Never expose someone else's pending ID, name, reason or geometry.
   if(pending.length)return review();
   const matcher=new PoiMatcherService({includeSynthetic:true,query});
   const canonical=await matcher.match({...parsed.draft,limit:20});
   if(canonical.incomplete||canonical.hasMore)return review();
   if(parsed.resolution.action==='suggest_update'){
    const placeId=parsed.resolution.placeId;
    if(!canonical.candidates.some(item=>item.id===placeId))throw new ConflictException();
    return save({outcome:'EXISTING_PUBLIC_PLACE',placeId:parsed.resolution.placeId,requiresReview:true});
   }
   // Distinct claims are held, never authority to publish or bypass review.
   const id=randomUUID();
   await query(`INSERT INTO public.poi_pending_proposals(id,actor_ref,name,normalized_name,category,public_entrance,distinct_reason)
     VALUES($1,$2,$3,$4,$5,ST_SetSRID(ST_Point($6,$7),4326),$8)`,[id,actorId,parsed.draft.name,normalized,parsed.draft.category,parsed.draft.location.lng,parsed.draft.location.lat,parsed.resolution.reason]);
   if(parsed.source)await query('INSERT INTO public.poi_pending_source_refs(proposal_id,provider,external_id,license_tag) VALUES($1,$2,$3,$4)',[id,parsed.source.provider,parsed.source.externalId,parsed.source.licenseTag]);
   return save({outcome:'PENDING_REVIEW',proposalId:id,requiresReview:true});
  }).catch(error=>{if(error instanceof ConflictException)throw error;throw new ServiceUnavailableException();});
 }
}
