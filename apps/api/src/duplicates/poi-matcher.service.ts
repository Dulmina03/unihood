import { Inject, Injectable } from '@nestjs/common';
import { normalizePoiName, PoiMatchInputSchema, PoiMatchResultSchema, PoiMatchCandidateSchema, type PoiMatchCandidate } from '@unihood/contracts';
import { UniversityRepository } from '../universities/university.repository';
const scanLimit = 200, aliasLimit = 20;
const signal = PoiMatchCandidateSchema.shape.signals.shape;
const ScanRowSchema = PoiMatchCandidateSchema.pick({id:true,name:true,category:true}).extend({
  withinRadius:signal.withinRadius,sameBuilding:signal.sameBuilding,sourceMatch:signal.sourceMatch,
  aliases:PoiMatchCandidateSchema.shape.name.array().max(aliasLimit+1)}).array().max(scanLimit+1);
const SimilarityRowsSchema = PoiMatchCandidateSchema.pick({id:true}).extend({similarity:signal.nameSimilarity}).array().max(scanLimit);
@Injectable()
export class PoiMatcherService {
  constructor(@Inject(UniversityRepository) private readonly repository: Pick<UniversityRepository,'query'|'includeSynthetic'>) {}
  async match(input: unknown) {
    const query = PoiMatchInputSchema.parse(input), normalized = normalizePoiName(query.name);
    // Only already-public active POIs. Never use building geometry, private
    // boarding rows or unpublished proposal geometry as a spatial fallback.
    const rows = ScanRowSchema.parse(await this.repository.query(`WITH eligible AS NOT MATERIALIZED (
      SELECT p.id,p.canonical_name AS name,p.category,p.building_id,l.entrance_geo
      FROM public.places p JOIN public.public_place_locations l
        ON l.place_id=p.id AND l.place_kind=p.kind AND l.place_status=p.status
      WHERE p.kind='POI' AND p.status='ACTIVE' AND p.merged_into IS NULL
        AND ($1::boolean OR p.data_kind='VERIFIED')
    ), candidates AS (
      SELECT e.id FROM eligible e WHERE ST_DWithin(e.entrance_geo::geography,ST_SetSRID(ST_Point($2,$3),4326)::geography,$4)
      UNION
      SELECT e.id FROM eligible e JOIN public.place_source_refs s ON s.place_id=e.id WHERE s.provider=$5 AND s.external_id=$6
      UNION
      SELECT e.id FROM eligible e JOIN public.buildings b ON b.id=e.building_id
        WHERE b.id=$7::uuid AND b.status='ACTIVE' AND b.public_geo IS NOT NULL AND ($1::boolean OR b.data_kind='VERIFIED')
    ) SELECT e.id,e.name,e.category,
      ST_DWithin(e.entrance_geo::geography,ST_SetSRID(ST_Point($2,$3),4326)::geography,$4) AS "withinRadius",
      EXISTS(SELECT 1 FROM public.buildings b WHERE b.id=e.building_id AND b.id=$7::uuid
        AND b.status='ACTIVE' AND b.public_geo IS NOT NULL AND ($1::boolean OR b.data_kind='VERIFIED')) AS "sameBuilding",
      EXISTS(SELECT 1 FROM public.place_source_refs s WHERE s.place_id=e.id AND s.provider=$5 AND s.external_id=$6) AS "sourceMatch",
      ARRAY(SELECT a.alias FROM public.place_aliases a WHERE a.place_id=e.id ORDER BY a.id LIMIT $8) AS aliases
      FROM candidates c JOIN eligible e ON e.id=c.id
      ORDER BY "sourceMatch" DESC,"sameBuilding" DESC,e.id LIMIT $9`,
    [this.repository.includeSynthetic, query.location.lng, query.location.lat, query.radiusMeters,
      query.source?.provider ?? null, query.source?.externalId ?? null, query.buildingId ?? null, aliasLimit + 1, scanLimit + 1]));
    const selected = rows.slice(0, scanLimit);
    let incomplete = rows.length > scanLimit || selected.some(row => row.aliases.length > aliasLimit);
    // Normalize bounded raw display names/aliases in one implementation, including
    // legacy normalized_name values. No backfill or mutable database GUC required.
    const names = selected.flatMap(row => [row.name, ...row.aliases.slice(0, aliasLimit)].map(value => ({id: row.id, name: normalizePoiName(value)})));
    const scores = names.length ? SimilarityRowsSchema.parse(await this.repository.query(`SELECT n.id,max(similarity(n.name,$2::text))::float8 AS similarity
      FROM jsonb_to_recordset($1::jsonb) AS n(id uuid,name text) GROUP BY n.id`, [JSON.stringify(names), normalized])) : [];
    const byId = new Map(scores.map(row => [row.id, row.similarity]));
    const candidates: PoiMatchCandidate[] = [];
    for (const row of selected) {
      const raw = byId.get(row.id);
      if (raw === undefined || !Number.isFinite(raw) || raw < 0 || raw > 1) {incomplete = true; continue;}
      const exact = [row.name,...row.aliases.slice(0,aliasLimit)].some(value => normalizePoiName(value) === normalized);
      const similarity = exact ? 1 : raw, categoryMatch = row.category === query.category;
      if (!row.sourceMatch && !row.sameBuilding && similarity < .25) continue;
      let score = row.sourceMatch ? 100 : Math.round(similarity * 70 + (categoryMatch ? 15 : 0) + (row.withinRadius ? 10 : 0) + (row.sameBuilding ? 5 : 0));
      const conflict = !categoryMatch || (row.sameBuilding && !row.sourceMatch);
      if (conflict) score = Math.min(score, categoryMatch ? 79 : 49);
      candidates.push({id: row.id, name: row.name, category: row.category, score,
        classification: conflict ? 'REVIEW_REQUIRED' : row.sourceMatch || score >= 80 ? 'STRONG_CANDIDATE' : 'POSSIBLE_CANDIDATE',
        signals: {nameSimilarity: similarity, normalizedNameExact: exact, categoryMatch, withinRadius: row.withinRadius, sameBuilding: row.sameBuilding, sourceMatch: row.sourceMatch}, requiresReview: true});
    }
    candidates.sort((a,b) => b.score-a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return PoiMatchResultSchema.parse({policyVersion: 'public-poi-v1', scope: 'PUBLIC_POI_ONLY', candidates: candidates.slice(0,query.limit),
      hasMore: candidates.length > query.limit, incomplete, requiresReview: true});
  }
}
