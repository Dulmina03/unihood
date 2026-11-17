import { ConflictException,Injectable,NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BoardingMapPageSchema,BoardingMapPinSchema,BoardingMapSettingsSchema,type BoardingMapChange } from '@unihood/contracts';
import { UniversityRepository } from '../universities/university.repository';
import { projectBoardingPublic } from './public-projection';
const joined=`FROM public.boarding_public_entrances e JOIN public.boarding_properties b ON b.place_id=e.boarding_id JOIN public.places p ON p.id=b.place_id
 JOIN public.listings l ON l.id=e.listing_id AND l.boarding_id=b.place_id JOIN public.boarding_advertisement_previews a ON a.listing_id=l.id AND a.boarding_id=b.place_id`;
const eligible=`$1::boolean AND p.kind='BOARDING' AND p.status='ACTIVE' AND p.merged_into IS NULL AND p.data_kind='SYNTHETIC' AND b.data_kind='SYNTHETIC' AND a.data_kind='SYNTHETIC'
 AND b.visibility='PUBLIC_MAP' AND b.authorization_status='LOCAL_TEST_AUTHORIZED' AND b.public_map_consent AND b.map_consent_at=e.consent_at
 AND l.publisher_kind='OWNER_OFFICIAL' AND l.publication_status='PUBLISHED' AND l.is_current AND l.visibility_snapshot='PUBLIC_MAP' AND a.visibility='PUBLIC_MAP'
 AND e.purpose='OWNER_SELECTED_PUBLIC_ENTRANCE'`;
@Injectable()
export class BoardingMapService {
 constructor(private readonly repository:UniversityRepository){}
 async list(query:{page?:string;pageSize?:string;q?:string}){
  const page=Number(query.page??1),pageSize=Number(query.pageSize??20),q=query.q?'%'+query.q.replace(/[\\%_]/g,'\\$&')+'%':null;
  const rows=await this.repository.query(`SELECT p.id,a.title,b.data_kind,b.authorization_status,b.public_map_consent,e.purpose,ST_Y(e.entrance_geo) AS lat,ST_X(e.entrance_geo) AS lng ${joined} WHERE ${eligible} AND ($2::text IS NULL OR a.title ILIKE $2) ORDER BY a.title COLLATE "C",p.id LIMIT $3 OFFSET $4`,[this.repository.includeSynthetic,q,pageSize+1,(page-1)*pageSize]);
  return BoardingMapPageSchema.parse({items:rows.slice(0,pageSize).map(r=>{
   const value=projectBoardingPublic({id:r.id,title:r.title,publisherKind:'OWNER_OFFICIAL',visibility:'PUBLIC_MAP',dataKind:r.data_kind,authorizationStatus:r.authorization_status,publicMapConsent:r.public_map_consent,localityConsent:false,locality:null,publicEntrance:{boardingId:r.id,purpose:r.purpose,lat:r.lat,lng:r.lng}});
   if(!value)throw new Error('Unavailable public projection');
   return BoardingMapPinSchema.parse({...value,kind:'BOARDING',provenance:{dataKind:'SYNTHETIC',sourceLabel:'Fictional owner-selected entrance; no real property or verified owner',verifiedAt:null}});
  }),page:{page,pageSize,hasNextPage:rows.length>pageSize}});
 }
 // Only the separately installed closed synthetic fixture can be mutated. A
 // canonical ID/owner adapter alone cannot claim or promote another record.
 private async current(query:(sql:string,values:unknown[])=>Promise<Record<string,unknown>[]>,id:string,lock=false){
  if(!this.repository.includeSynthetic)throw new NotFoundException();
  if(lock)await query('SELECT place_id FROM public.boarding_properties WHERE place_id=$1 FOR UPDATE',[id]);
  const rows=await query(`SELECT b.visibility,b.general_locality,l.revision,a.title,a.summary FROM public.boarding_properties b JOIN public.places p ON p.id=b.place_id JOIN public.listings l ON l.boarding_id=b.place_id JOIN public.boarding_advertisement_previews a ON a.listing_id=l.id AND a.boarding_id=b.place_id
   WHERE b.place_id=$1 AND p.kind='BOARDING' AND p.data_kind='SYNTHETIC' AND b.data_kind='SYNTHETIC' AND p.source_label='UNI-034 closed synthetic owner fixture'
   AND p.status='ACTIVE' AND p.merged_into IS NULL AND b.authorization_status='LOCAL_TEST_AUTHORIZED' AND l.publisher_kind='OWNER_OFFICIAL' AND l.is_current AND l.publication_status='PUBLISHED' AND l.visibility_snapshot=b.visibility AND a.visibility=b.visibility `,[id]);
  if(!rows.length)throw new NotFoundException();return rows[0];
 }
 async settings(id:string){const r=await this.current((s,v)=>this.repository.query(s,v),id);return BoardingMapSettingsSchema.parse({id,revision:r.revision,visibility:r.visibility,locality:r.general_locality,synthetic:true});}
 async change(id:string,input:BoardingMapChange,actorId:string){
  return this.repository.transaction(async query=>{
   const row=await this.current(query,id,true);if(row.revision!==input.expectedRevision)throw new ConflictException();
   const choice=input.choice,revision=Number(row.revision)+1,listingId=randomUUID(),locality=choice.visibility==='AREA_ONLY'?choice.locality:null;
   // Destroy public geometry before applying the next publication. All state,
   // current-listing revision and minimal audit event commit atomically.
   await query('DELETE FROM public.boarding_public_entrances WHERE boarding_id=$1',[id]);
   await query('UPDATE public.listings SET is_current=false WHERE boarding_id=$1 AND is_current',[id]);
   await query(`UPDATE public.boarding_properties SET visibility=$2,general_locality=$3,locality_consent=($2='AREA_ONLY'),public_map_consent=($2='PUBLIC_MAP'),map_consent_at=CASE WHEN $2='PUBLIC_MAP' THEN CURRENT_TIMESTAMP ELSE NULL END,last_updated=CURRENT_TIMESTAMP WHERE place_id=$1`,[id,choice.visibility,locality]);
   await query(`INSERT INTO public.listings(id,boarding_id,revision,publisher_kind,publication_status,title,visibility_snapshot,is_current,published_at) VALUES($1,$2,$3,'OWNER_OFFICIAL','PUBLISHED',$4,$5,true,CURRENT_TIMESTAMP)`,[listingId,id,revision,row.title,choice.visibility]);
   await query(`INSERT INTO public.boarding_advertisement_previews(listing_id,boarding_id,title,summary,visibility,locality,updated_at) VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)`,[listingId,id,row.title,row.summary,choice.visibility,locality]);
   if(choice.visibility==='PUBLIC_MAP')await query(`INSERT INTO public.boarding_public_entrances(boarding_id,listing_id,purpose,entrance_geo,consent_at) SELECT place_id,$2,'OWNER_SELECTED_PUBLIC_ENTRANCE',ST_SetSRID(ST_MakePoint(0,0),4326),map_consent_at FROM public.boarding_properties WHERE place_id=$1`,[id,listingId]);
   await query('INSERT INTO unihood_private.boarding_visibility_events(boarding_id,revision,visibility,actor_ref) VALUES($1,$2,$3,$4)',[id,revision,choice.visibility,actorId]);
   return BoardingMapSettingsSchema.parse({id,revision,visibility:choice.visibility,locality,synthetic:true});
  });
 }
}
