import { projectBoardingPublic } from './public-projection';
import { Injectable,NotFoundException } from '@nestjs/common';
import { BoardingAdvertisementPageSchema,parseBoardingAdvertisement,PublicBoardingAdvertisementSchema,type BoardingAdvertisementQuery } from '@unihood/contracts';
import { UniversityRepository } from '../universities/university.repository';
// Explicit curated text only: no private schemas, geometry, raw descriptions or inventory.
const from=`FROM public.boarding_advertisement_previews a JOIN public.listings l ON l.id=a.listing_id AND l.boarding_id=a.boarding_id
 JOIN public.boarding_properties b ON b.place_id=a.boarding_id JOIN public.places p ON p.id=b.place_id`;
const eligible=`$1::boolean AND p.kind='BOARDING' AND p.status='ACTIVE' AND p.merged_into IS NULL
 AND p.data_kind='SYNTHETIC' AND b.data_kind='SYNTHETIC' AND a.data_kind='SYNTHETIC'
 AND a.visibility<>'PUBLIC_MAP' AND l.is_current AND l.publication_status='PUBLISHED' AND b.visibility=a.visibility AND l.visibility_snapshot=a.visibility
 AND (a.visibility='HIDDEN' OR (b.locality_consent AND b.general_locality=a.locality))
 AND (l.publisher_kind='COMMUNITY_RECOMMENDATION' OR b.authorization_status='LOCAL_TEST_AUTHORIZED')`;
const projection=`json_build_object('listing',json_build_object('id',p.id,'listingId',l.id,'kind','BOARDING','title',a.title,
 'publisherKind',l.publisher_kind,'visibility',a.visibility,'locationLabel',a.locality,'entrance',NULL,'distanceMeters',NULL,'route',NULL,
 'price',NULL,'vacancy',json_build_object('status','UNKNOWN','confirmedAt',NULL,'expiresAt',NULL),
 'provenance',json_build_object('dataKind','SYNTHETIC','sourceLabel','UNI-031 curated synthetic demonstration; no real property or owner','verifiedAt',NULL))::jsonb
 || CASE WHEN l.publisher_kind='OWNER_OFFICIAL' THEN json_build_object('ownerVerified',true)::jsonb ELSE json_build_object('disclaimer','Community-submitted, not owner-verified')::jsonb END,
 'summary',a.summary,'updatedAt',to_char(a.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) AS payload,
 json_build_object('dataKind',b.data_kind,'authorizationStatus',b.authorization_status,'localityConsent',b.locality_consent,
 'visibility',b.visibility,'publicMapConsent',b.public_map_consent) AS policy`;
@Injectable()
export class BoardingService {
 private serialize(row:Record<string,unknown>){
  // Reject unexpected payload extensions before constructing an explicit public
  // whitelist; policy facts are read from current server records, not DTO badges.
  const item=parseBoardingAdvertisement(row.payload),policy=row.policy as {dataKind?:unknown;authorizationStatus?:unknown;localityConsent?:unknown;visibility?:unknown;publicMapConsent?:unknown}|undefined;
  if(!policy||typeof policy.dataKind!=='string'||typeof policy.authorizationStatus!=='string'||typeof policy.visibility!=='string'||policy.visibility!==item.listing.visibility||typeof policy.localityConsent!=='boolean'||typeof policy.publicMapConsent!=='boolean')throw new Error('Unavailable projection');
  const listing=projectBoardingPublic({id:item.listing.id,title:item.listing.title,publisherKind:item.listing.publisherKind,visibility:policy.visibility,
   dataKind:policy.dataKind,authorizationStatus:policy.authorizationStatus,localityConsent:policy.localityConsent,locality:item.listing.locationLabel,publicMapConsent:policy.publicMapConsent});
  if(!listing)throw new Error('Unavailable projection');
  return PublicBoardingAdvertisementSchema.parse({listing:{...listing,kind:item.listing.kind,listingId:item.listing.listingId,provenance:item.listing.provenance},summary:item.summary,updatedAt:item.updatedAt});
 }
 constructor(private readonly repository:UniversityRepository){}
 async list(query:BoardingAdvertisementQuery){
  const page=Number(query.page??1),pageSize=Number(query.pageSize??12);
  const q=query.q?`%${query.q.replace(/[\\%_]/g,'\\$&')}%`:null;
  const order=query.sort==='title'?'a.title COLLATE "C",p.id':'l.published_at DESC,p.id';
  const rows=await this.repository.query(`SELECT ${projection} ${from} WHERE ${eligible}
   AND ($2::text IS NULL OR l.publisher_kind=$2) AND ($3::text IS NULL OR a.visibility=$3)
   AND ($4::text IS NULL OR a.title ILIKE $4 OR a.locality ILIKE $4)
   ORDER BY ${order} LIMIT $5 OFFSET $6`,[this.repository.includeSynthetic,query.publisherKind??null,query.visibility??null,q,pageSize+1,(page-1)*pageSize]);
  return BoardingAdvertisementPageSchema.parse({items:rows.slice(0,pageSize).map(r=>this.serialize(r)),page:{page,pageSize,hasNextPage:rows.length>pageSize}});
 }
 async detail(id:string){
  const rows=await this.repository.query(`SELECT ${projection} ${from} WHERE ${eligible} AND p.id=$2 LIMIT 1`,[this.repository.includeSynthetic,id]);
  if(!rows.length)throw new NotFoundException();
  return this.serialize(rows[0]);
 }
}
