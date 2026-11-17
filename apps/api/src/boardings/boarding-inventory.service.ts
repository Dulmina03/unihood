import {unitVacancyJson,vacancyHistoryJson} from './boarding-vacancy.sql';
import { BadRequestException,ConflictException,Injectable,NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BoardingUnitPageSchema,InventoryMutationSchema,OwnerInventorySchema,OwnerPriceHistoryPageSchema,PublicBoardingUnitSchema,type OwnerPriceInput,type OwnerUnitCreate,type OwnerUnitUpdate } from '@unihood/contracts';
import { UniversityRepository } from '../universities/university.repository';
const property=`FROM public.boarding_properties b JOIN public.places p ON p.id=b.place_id JOIN public.listings l ON l.boarding_id=b.place_id JOIN public.boarding_advertisement_previews a ON a.listing_id=l.id AND a.boarding_id=b.place_id`;
const eligible=`p.kind='BOARDING' AND p.status='ACTIVE' AND p.merged_into IS NULL AND p.data_kind='SYNTHETIC' AND b.data_kind='SYNTHETIC' AND b.authorization_status='LOCAL_TEST_AUTHORIZED'
 AND l.publisher_kind='OWNER_OFFICIAL' AND l.publication_status='PUBLISHED' AND l.is_current AND l.visibility_snapshot=b.visibility AND a.visibility=b.visibility AND a.data_kind='SYNTHETIC'`;
const priceJson=`json_build_object('currency',r.currency,'period',r.period,'basis',r.basis,'rentMinor',r.rent_minor::double precision,'depositMinor',r.deposit_minor::double precision,'utilityTerms',r.utility_terms,'mealTerms',r.meal_terms,'effectiveAt',to_char(r.effective_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'revision',r.revision,'recordedAt',to_char(r.recorded_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))`;
const unitJson=`json_build_object('id',u.id,'boardingId',u.boarding_id,'label',CASE u.public_template WHEN 'STUDY_ROOM' THEN 'Synthetic Study Room' ELSE 'Synthetic Shared Room' END,'template',u.public_template,'capacity',u.capacity,
 'price',(SELECT ${priceJson} FROM public.boarding_official_prices r WHERE r.unit_id=u.id AND r.boarding_id=u.boarding_id AND r.revision<=u.price_revision AND r.effective_at<=CURRENT_TIMESTAMP ORDER BY r.effective_at DESC,r.revision DESC LIMIT 1),
 'vacancy',${unitVacancyJson},'provenance',json_build_object('dataKind','SYNTHETIC','sourceLabel','Fictional owner inventory, fee and confirmation simulation; no real property, verified ownership or live vacancy','verifiedAt',NULL))`;
type Query=(sql:string,values:unknown[])=>Promise<Record<string,unknown>[]>;
@Injectable()
export class BoardingInventoryService {
 constructor(private readonly repository:UniversityRepository){}
 async requireSyntheticOwnerProperty(query:Query,id:string,lock=false){
  if(!this.repository.includeSynthetic)throw new NotFoundException();
  if(lock)await query('SELECT place_id FROM public.boarding_properties WHERE place_id=$1 FOR UPDATE',[id]);
  const rows=await query(`SELECT b.inventory_revision ${property} WHERE b.place_id=$1 AND ${eligible} AND p.source_label='UNI-034 closed synthetic owner fixture'`,[id]);
  if(!rows.length)throw new NotFoundException();return rows[0];
 }
 async publicUnits(id:string,input:{page?:string;pageSize?:string}){
  const available=await this.repository.query(`SELECT b.place_id ${property} WHERE $1::boolean AND b.place_id=$2 AND ${eligible}`,[this.repository.includeSynthetic,id]);if(!available.length)throw new NotFoundException();
  const page=Number(input.page??1),pageSize=Number(input.pageSize??20);
  // Recheck eligibility in the data query as well; revocation between queries
  // cannot promote stale facts. No private location/building/media joins.
  const rows=await this.repository.query(`SELECT ${unitJson} AS payload ${property} JOIN public.boarding_units u ON u.boarding_id=b.place_id WHERE $1::boolean AND b.place_id=$2 AND ${eligible} AND u.public_template IS NOT NULL ORDER BY u.id LIMIT $3 OFFSET $4`,[this.repository.includeSynthetic,id,pageSize+1,(page-1)*pageSize]);
  return BoardingUnitPageSchema.parse({items:rows.slice(0,pageSize).map(r=>PublicBoardingUnitSchema.parse(r.payload)),page:{page,pageSize,hasNextPage:rows.length>pageSize}});
 }
 async inventory(id:string){return this.repository.transaction(async query=>{
  const row=await this.requireSyntheticOwnerProperty(query,id,true);
  const units=await query(`SELECT ${unitJson} AS payload,u.revision,u.price_revision,u.vacancy_revision,
   COALESCE((SELECT json_agg(x.entry ORDER BY x.revision DESC) FROM (SELECT r.revision,(${priceJson})::jsonb||json_build_object('reason',r.change_reason)::jsonb AS entry FROM public.boarding_official_prices r WHERE r.unit_id=u.id AND r.boarding_id=u.boarding_id ORDER BY r.revision DESC LIMIT 20) x),'[]'::json) AS history,
   (SELECT count(*)>20 FROM public.boarding_official_prices r WHERE r.unit_id=u.id AND r.boarding_id=u.boarding_id) AS more
    ,COALESCE((SELECT json_agg(x.entry ORDER BY x.revision DESC) FROM (SELECT c.revision,${vacancyHistoryJson} AS entry FROM public.boarding_vacancy_confirmations c WHERE c.unit_id=u.id AND c.boarding_id=u.boarding_id ORDER BY c.revision DESC LIMIT 20) x),'[]'::json) AS vacancy_history,
   (SELECT count(*)>20 FROM public.boarding_vacancy_confirmations c WHERE c.unit_id=u.id AND c.boarding_id=u.boarding_id) AS more_vacancy
   FROM public.boarding_units u WHERE u.boarding_id=$1 AND u.public_template IS NOT NULL ORDER BY u.id LIMIT 100`,[id]);
  return OwnerInventorySchema.parse({id,synthetic:true,inventoryRevision:row.inventory_revision,units:units.map(r=>({...PublicBoardingUnitSchema.parse(r.payload),vacancyRevision:r.vacancy_revision,vacancyHistory:r.vacancy_history,hasMoreVacancyHistory:r.more_vacancy,revision:r.revision,priceRevision:r.price_revision,priceHistory:r.history,hasMoreHistory:r.more}))});
 });}
 async create(id:string,input:OwnerUnitCreate){return this.repository.transaction(async query=>{
  const row=await this.requireSyntheticOwnerProperty(query,id,true);if(row.inventory_revision!==input.expectedInventoryRevision)throw new ConflictException();
  const count=await query('SELECT count(*)::int AS n FROM public.boarding_units WHERE boarding_id=$1',[id]);if(Number(count[0].n)>=100)throw new BadRequestException();
  const unitId=randomUUID(),label=input.template==='STUDY_ROOM'?'Synthetic Study Room':'Synthetic Shared Room';
  await query('INSERT INTO public.boarding_units(id,boarding_id,label,room_type,capacity,public_template) VALUES($1,$2,$3,$4,$5,$4)',[unitId,id,label,input.template,input.capacity]);
  await query('UPDATE public.boarding_properties SET inventory_revision=inventory_revision+1 WHERE place_id=$1',[id]);
  return InventoryMutationSchema.parse({id,unitId,synthetic:true});
 });}
 async history(id:string,unitId:string,input:{page?:string;pageSize?:string}){return this.repository.transaction(async query=>{
  await this.requireSyntheticOwnerProperty(query,id,true);const unit=await query('SELECT id FROM public.boarding_units WHERE id=$1 AND boarding_id=$2 AND public_template IS NOT NULL',[unitId,id]);if(!unit.length)throw new NotFoundException();
  const page=Number(input.page??1),pageSize=Number(input.pageSize??20);const rows=await query(`SELECT (${priceJson})::jsonb||json_build_object('reason',r.change_reason)::jsonb AS payload FROM public.boarding_official_prices r WHERE r.boarding_id=$1 AND r.unit_id=$2 ORDER BY r.revision DESC LIMIT $3 OFFSET $4`,[id,unitId,pageSize+1,(page-1)*pageSize]);
  return OwnerPriceHistoryPageSchema.parse({items:rows.slice(0,pageSize).map(r=>r.payload),page:{page,pageSize,hasNextPage:rows.length>pageSize}});
 });}
 async update(id:string,unitId:string,input:OwnerUnitUpdate){return this.repository.transaction(async query=>{
  await this.requireSyntheticOwnerProperty(query,id,true);
  const rows=await query('SELECT revision,available_beds FROM public.boarding_units WHERE id=$1 AND boarding_id=$2 AND public_template IS NOT NULL FOR UPDATE',[unitId,id]);if(!rows.length)throw new NotFoundException();if(rows[0].revision!==input.expectedRevision)throw new ConflictException();
  if(rows[0].available_beds!==null&&Number(rows[0].available_beds)>input.capacity)throw new BadRequestException();
  await query('UPDATE public.boarding_units SET label=$3,room_type=$4,public_template=$4,capacity=$5,revision=revision+1 WHERE id=$1 AND boarding_id=$2',[unitId,id,input.template==='STUDY_ROOM'?'Synthetic Study Room':'Synthetic Shared Room',input.template,input.capacity]);
  await query('UPDATE public.boarding_properties SET inventory_revision=inventory_revision+1 WHERE place_id=$1',[id]);
  return InventoryMutationSchema.parse({id,unitId,synthetic:true});
 });}
 async price(id:string,input:OwnerPriceInput,actorId:string){if((input.expectedPriceRevision===0)!==(input.reason==='INITIAL'))throw new BadRequestException();return this.repository.transaction(async query=>{
  await this.requireSyntheticOwnerProperty(query,id,true);
  const rows=await query('SELECT price_revision FROM public.boarding_units WHERE id=$1 AND boarding_id=$2 AND public_template IS NOT NULL FOR UPDATE',[input.unitId,id]);if(!rows.length)throw new NotFoundException();if(rows[0].price_revision!==input.expectedPriceRevision)throw new ConflictException();
  await query(`INSERT INTO public.boarding_official_prices(id,boarding_id,unit_id,revision,currency,period,basis,rent_minor,deposit_minor,utility_terms,meal_terms,effective_at,author_ref,change_reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[randomUUID(),id,input.unitId,input.expectedPriceRevision+1,input.currency,input.period,input.basis,input.rentMinor,input.depositMinor,input.utilityTerms,input.mealTerms,input.effectiveAt,actorId,input.reason]);
  await query('UPDATE public.boarding_units SET price_revision=price_revision+1 WHERE id=$1 AND boarding_id=$2',[input.unitId,id]);
  return InventoryMutationSchema.parse({id,unitId:input.unitId,synthetic:true});
 });}
}
