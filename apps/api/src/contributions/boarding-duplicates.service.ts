import { ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { BoardingDuplicateInputSchema, BoardingDuplicateResultSchema, BoardingDuplicateCandidateSchema, BoardingResolutionInputSchema, BoardingResolutionReceiptSchema, boardingNameScore, type ActorContext, type BoardingDuplicateInput } from '@unihood/contracts';
import { UniversityRepository } from '../universities/university.repository';
import { BoardingRecommendationService } from './boarding-recommendation.service';
type Query = (sql: string, values: unknown[]) => Promise<Record<string, unknown>[]>;
const publicAds = `FROM public.boarding_advertisement_previews a
 JOIN public.listings l ON l.id=a.listing_id AND l.boarding_id=a.boarding_id
 JOIN public.boarding_properties b ON b.place_id=a.boarding_id JOIN public.places p ON p.id=b.place_id
 WHERE $1::boolean AND p.kind='BOARDING' AND p.status='ACTIVE' AND p.merged_into IS NULL
 AND p.data_kind='SYNTHETIC' AND b.data_kind='SYNTHETIC' AND a.data_kind='SYNTHETIC'
 AND a.visibility IN ('HIDDEN','AREA_ONLY') AND b.visibility=a.visibility AND l.visibility_snapshot=a.visibility
 AND l.is_current AND l.publication_status='PUBLISHED'
 AND (a.visibility='HIDDEN' OR (b.locality_consent AND b.general_locality=a.locality))
 AND (l.publisher_kind='COMMUNITY_RECOMMENDATION' OR b.authorization_status='LOCAL_TEST_AUTHORIZED')`;
@Injectable()
export class BoardingDuplicatesService {
  constructor(private readonly repository: UniversityRepository, private readonly intake: BoardingRecommendationService) {}
  private async rows(query: Query, id?: string) {
    return query(`SELECT p.id,a.title,l.publisher_kind,a.visibility,a.locality ${publicAds}${id ? ' AND p.id=$2' : ''} ORDER BY a.title COLLATE "C",p.id LIMIT 101`, id ? [this.repository.includeSynthetic,id] : [this.repository.includeSynthetic]);
  }
  private project(row: Record<string, unknown>, title: string) {
    return BoardingDuplicateCandidateSchema.parse({ boardingId: row.id, title: row.title, publisherKind: row.publisher_kind,
      visibility: row.visibility, locality: row.visibility==='HIDDEN' ? null : row.locality,
      nameScore: boardingNameScore(title, String(row.title)), dataKind: 'SYNTHETIC' });
  }
  async check(actor: ActorContext, value: unknown) {
    await this.intake.authorize(actor); const input = BoardingDuplicateInputSchema.parse(value);
    return this.candidates((sql,args) => this.repository.query(sql,args), input);
  }
  private async candidates(query: Query, input: BoardingDuplicateInput) {
    const rows = await this.rows(query); const candidates = rows.slice(0,100).map(row => this.project(row,input.title))
      .filter(row => row.nameScore>=35 && (!input.locality || row.visibility==='HIDDEN' || row.locality===input.locality)).sort((a,b) => b.nameScore-a.nameScore || (a.title<b.title?-1:a.title>b.title?1:a.boardingId.localeCompare(b.boardingId)));
    return BoardingDuplicateResultSchema.parse({ policyVersion:'boarding-ad-text-v1',candidates:candidates.slice(0,5),hasMore:candidates.length>5,incomplete:rows.length>100,requiresReview:true });
  }
  async resolve(actor: ActorContext, value: unknown) {
    await this.intake.authorize(actor); const input = BoardingResolutionInputSchema.parse(value);
    const resolutionHash=createHash('sha256').update('boarding-resolution-v1:'+JSON.stringify(input.resolution)).digest('hex');
    return this.repository.transaction(async query => {
      // Uses the same transaction advisory lock as the existing intake endpoint.
      const receipt = await this.intake.save(query,actor,{key:input.key,draft:input.draft});
      const previous=await query('SELECT resolution_hash,canonical_boarding_id,review_state FROM unihood_private.boarding_recommendation_resolutions WHERE contribution_id=$1',[receipt.contributionId]);
      if(previous.length&&previous[0].resolution_hash!==resolutionHash)throw new ConflictException();
      if(input.resolution.kind==='EXISTING') {
        const target=input.resolution.boardingId;
        // Serialize against the existing owner visibility transaction, without
        // reading a verification point, building, contact or private fee.
        const matches=(rows:Record<string,unknown>[])=>rows.length===1&&boardingNameScore(input.draft.title,String(rows[0].title))>=35&&(!input.draft.locality||rows[0].visibility==='HIDDEN'||rows[0].locality===input.draft.locality);
        let eligible=matches(await this.rows(query,target));
        if(eligible){
          // Never lock an arbitrary unlisted private target as an existence probe.
          await query('SELECT place_id FROM public.boarding_properties WHERE place_id=$1 FOR SHARE',[target]);
          eligible=matches(await this.rows(query,target));
        }
        if(!eligible&&!previous.length)throw new ConflictException();
        if(!eligible)return BoardingResolutionReceiptSchema.parse({...receipt,reviewState:'NEEDS_EVIDENCE',resolution:'REVIEW_REQUIRED',canonicalBoardingId:null});
        if(!previous.length)await query(`INSERT INTO unihood_private.boarding_recommendation_resolutions(contribution_id,resolution_hash,resolution_kind,canonical_boarding_id,review_state) VALUES($1,$2,'EXISTING',$3,$4)`,[receipt.contributionId,resolutionHash,target,receipt.reviewState]);
        return BoardingResolutionReceiptSchema.parse({...receipt,resolution:'ATTACHED_FOR_REVIEW',canonicalBoardingId:target});
      }
      if(!previous.length) {
        // Pending titles stay server-private; neither a related ID, count nor
        // differing outward result reveals another contributor's submission.
        const pending=await query('SELECT id,title FROM unihood_private.boarding_recommendation_intake WHERE id<>$1 ORDER BY created_at,id LIMIT 101',[receipt.contributionId]);
        const related=pending.slice(0,100).find(row=>boardingNameScore(input.draft.title,String(row.title))>=80);
        await query(`INSERT INTO unihood_private.boarding_recommendation_resolutions(contribution_id,resolution_hash,resolution_kind,possible_related_intake_id,distinction_reason,review_state) VALUES($1,$2,'DISTINCT',$3,$4,'NEEDS_EVIDENCE')`,[receipt.contributionId,resolutionHash,related?.id??null,input.resolution.reason]);
      }
      return BoardingResolutionReceiptSchema.parse({...receipt,reviewState:'NEEDS_EVIDENCE',resolution:'REVIEW_REQUIRED',canonicalBoardingId:null});
    });
  }
}
