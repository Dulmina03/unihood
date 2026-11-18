import {ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {createHash,randomUUID} from 'node:crypto';
import {ReviewInputSchema,ReviewReceiptSchema,type ActorContext,type PermissionService} from '@unihood/contracts';
import {PERMISSION_SERVICE} from '../identity/tokens';
import {UniversityRepository} from '../universities/university.repository';
const eligible=`FROM public.places p WHERE p.id=$1 AND p.kind=$2 AND p.status='ACTIVE' AND p.merged_into IS NULL AND p.data_kind='SYNTHETIC'`;
const sensitive=/(\+?\d[\d ().,-]{6,}\d)|\b(address|apartment|house number|latitude|longitude|coordinates|phone|contact|owner|rent|price|vacancy)\b|https?:\/\/|www\.|@/i;
@Injectable()
export class ReviewService{
 constructor(private readonly repository:UniversityRepository,@Inject(PERMISSION_SERVICE)private readonly permissions:PermissionService){}
 async create(actor:ActorContext,value:unknown){
  if(!await this.permissions.canSuggestPlace(actor))throw new ForbiddenException();
  const actorId=actor.actorId;if(!actorId)throw new ForbiddenException();
  const input=ReviewInputSchema.parse(value);
  const {key,...payload}=input,hash=createHash('sha256').update('review-v1:'+JSON.stringify(payload)).digest('hex');
  if(input.targetType==='BOARDING'&&await this.permissions.canManageProperty(actor,input.targetId))throw new ForbiddenException();
  return this.repository.transaction(async query=>{
   await query('SELECT pg_advisory_xact_lock(42043,1)',[]);
   const previous=await query('SELECT id,payload_hash,review_state FROM unihood_private.review_intake WHERE actor_ref=$1 AND idempotency_key=$2',[actorId,key]);
   if(previous.length&&previous[0].payload_hash!==hash)throw new ConflictException();
   const visible=await query(`SELECT p.id ${eligible}`,[input.targetId,input.targetType]);
   const receipt=(id:unknown,state:unknown)=>ReviewReceiptSchema.parse({contributionId:id,outcome:'HELD_REVIEW',reviewState:state,published:false,dataKind:'SYNTHETIC'});
   if(previous.length)return receipt(previous[0].id,previous[0].review_state);
   if(!visible.length)throw new NotFoundException();
   const state=sensitive.test(input.observation??'')?'NEEDS_EVIDENCE':'PENDING';
   const id=randomUUID();
   await query(`INSERT INTO unihood_private.review_intake(id,actor_ref,idempotency_key,payload_hash,target_type,target_id,review_kind,rating,observation,review_state,source_confidence,source_label,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CURRENT_TIMESTAMP)`,[id,actorId,key,hash,input.targetType,input.targetId,input.reviewKind,input.rating??null,input.observation??null,state,input.sourceConfidence,input.sourceLabel]);
   return receipt(id,state);
  });
 }
}
