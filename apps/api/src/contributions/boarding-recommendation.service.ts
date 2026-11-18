import { ConflictException, ForbiddenException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { BoardingRecommendationInputSchema, BoardingRecommendationReceiptSchema, type ActorContext, type PermissionService } from '@unihood/contracts';
import { PERMISSION_SERVICE } from '../identity/tokens';
import { baseSignals, contentSignals } from '../risk/risk-signals';
import { recordRisk } from '../risk/risk-evaluation';
import { UniversityRepository } from '../universities/university.repository';

@Injectable()
export class BoardingRecommendationService {
  constructor(private readonly repository: UniversityRepository, @Inject(PERMISSION_SERVICE) private readonly permissions: PermissionService) {}
  async authorize(actor: ActorContext) {
    const actorId = actor.actorId;
    if (!this.repository.includeSynthetic || actor.authStatus !== 'LOCAL_TEST_ACTOR' || !actorId ||
      !['synthetic:contributor', 'synthetic:owner-a', 'synthetic:price-manager-a'].includes(actorId) ||
      !await this.permissions.canSuggestPlace(actor) || actor.actorId !== actorId) throw new ForbiddenException();
    return actorId;
  }
  async save(query: (sql: string, values: unknown[]) => Promise<Record<string, unknown>[]>, actor: ActorContext, input: unknown) {
    const actorId = await this.authorize(actor);
    const { key, draft } = BoardingRecommendationInputSchema.parse(input);
    const canonical = { ...draft, facilities: [...draft.facilities].sort() };
    const hash = createHash('sha256').update('boarding-recommendation-v1:' + JSON.stringify(canonical)).digest('hex');
    // All drafts remain held. These conservative signals do not certify safety.
    const reviewState = /@|https?:\/\/|www\.|(?:\+?\d[\d ().,-]{6,}\d)|\b(address|apartment|house number|latitude|longitude|coordinates)\b/i.test(`${draft.title} ${draft.description}`) ? 'NEEDS_EVIDENCE' : 'PENDING';
    await query('SELECT pg_advisory_xact_lock(40040,1)', []);
      const previous = await query('SELECT id,payload_hash,review_state FROM unihood_private.boarding_recommendation_intake WHERE actor_ref=$1 AND idempotency_key=$2', [actorId, key]);
      if (previous.length && previous[0].payload_hash !== hash) throw new ConflictException();
      const id = previous[0]?.id ?? randomUUID();
      if (!previous.length) {
        await query(`INSERT INTO unihood_private.boarding_recommendation_intake
        (id,actor_ref,idempotency_key,payload_hash,title,description,locality,facilities,review_state,privacy_acknowledged,media_guidance_acknowledged)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true,true)`, [id, actorId, key, hash, draft.title, draft.description, draft.locality, canonical.facilities, reviewState]);
        const recent = Number((await query("SELECT count(*)::int AS n FROM unihood_private.boarding_recommendation_intake WHERE actor_ref=$1 AND created_at>CURRENT_TIMESTAMP-INTERVAL '24 hours'", [actorId]))[0]?.n ?? 0);
        const signals = baseSignals('BOARDING_RECOMMENDATION', 'BOARDING', contentSignals(draft.title, draft.description));
        await recordRisk(query, 'BOARDING_RECOMMENDATION', String(id), { ...signals, submissionPattern: { recentSameActor: recent, recentDistinctActors: recent } });
      }
      return BoardingRecommendationReceiptSchema.parse({ contributionId: id, outcome: 'HELD_RECOMMENDATION',
        reviewState: previous[0]?.review_state ?? reviewState, publisherKind: 'COMMUNITY_RECOMMENDATION', dataKind: 'SYNTHETIC', published: false });
  }
  async create(actor: ActorContext, input: unknown) {
    await this.authorize(actor);
    return this.repository.transaction(query => this.save(query, actor, input))
      .catch(error => { if (error instanceof ConflictException) throw error; throw new ServiceUnavailableException(); });
  }
}
