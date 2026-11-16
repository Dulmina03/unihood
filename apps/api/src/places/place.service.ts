import { Injectable, NotFoundException } from '@nestjs/common';
import { PublicPoiDetailSchema, PoiCategoryPageSchema, PoiPageSchema, poiBounds, type PoiListQuery } from '@unihood/contracts';
import { UniversityRepository } from '../universities/university.repository';
// Reuse the existing bounded read-only pool and deployed synthetic-data policy.
const joins = `FROM public.places p JOIN public.public_place_locations l ON l.place_id=p.id AND l.place_kind=p.kind AND l.place_status=p.status
  JOIN public.poi_categories c ON c.code=p.category`;
const visible = `p.kind='POI' AND p.status='ACTIVE' AND p.merged_into IS NULL AND ($1::boolean OR p.data_kind='VERIFIED')
  AND ST_Intersects(l.entrance_geo, ST_MakeEnvelope($2,$3,$4,$5,4326))`;
@Injectable()
export class PlaceService {
  constructor(private readonly repository: UniversityRepository) {}
  async detail(id: string) {
    const rows = await this.repository.query(`SELECT p.id,p.kind,p.canonical_name AS name,
      json_build_object('code',c.code,'label',c.label) AS category,
      json_build_object('lat',ST_Y(l.entrance_geo),'lng',ST_X(l.entrance_geo)) AS location,
      json_build_object('dataKind',p.data_kind,'sourceLabel',p.source_label,'verifiedAt',to_char(p.verified_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) AS provenance,
      to_char(l.last_confirmed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "lastConfirmedAt",
      to_char(p.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "updatedAt"
      ${joins} WHERE p.id=$2 AND p.kind='POI' AND p.status='ACTIVE' AND p.merged_into IS NULL
      AND ($1::boolean OR p.data_kind='VERIFIED') LIMIT 1`, [this.repository.includeSynthetic, id]);
    // Identical absence for private, unpublished, merged, archived and unknown IDs.
    if (!rows.length) throw new NotFoundException();
    return PublicPoiDetailSchema.parse(rows[0]);
  }
  async categories(bbox: string) {
    const rows = await this.repository.query(`SELECT DISTINCT c.code,c.label ${joins} WHERE ${visible} ORDER BY c.code LIMIT 101`, [this.repository.includeSynthetic, ...poiBounds(bbox)!]);
    // A bounded category set is metadata, not a hidden unbounded inventory count.
    return PoiCategoryPageSchema.parse({items: rows.slice(0, 100), page: {page: 1, pageSize: 100, hasNextPage: rows.length > 100}});
  }
  async list(query: PoiListQuery) {
    const page = Number(query.page ?? 1), pageSize = Number(query.pageSize ?? 20);
    const q = query.q ? `%${query.q.replace(/[\\%_]/g, '\\$&')}%` : null;
    const order = query.sort === 'newest' ? 'p.created_at DESC,p.id' : 'p.canonical_name COLLATE "C",p.id';
    const rows = await this.repository.query(`SELECT p.id,p.kind,p.canonical_name AS name,
      json_build_object('code',c.code,'label',c.label) AS category,
      json_build_object('lat',ST_Y(l.entrance_geo),'lng',ST_X(l.entrance_geo)) AS location,
      json_build_object('dataKind',p.data_kind,'sourceLabel',p.source_label,'verifiedAt',to_char(p.verified_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) AS provenance,
      to_char(l.last_confirmed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "lastConfirmedAt"
      ${joins} WHERE ${visible} AND ($6::text IS NULL OR p.category=$6)
      AND ($7::text IS NULL OR p.canonical_name ILIKE $7 OR EXISTS(SELECT 1 FROM public.place_aliases a WHERE a.place_id=p.id AND a.alias ILIKE $7))
      ORDER BY ${order} LIMIT $8 OFFSET $9`,
    [this.repository.includeSynthetic, ...poiBounds(query.bbox)!, query.category ?? null, q, pageSize + 1, (page - 1) * pageSize]);
    return PoiPageSchema.parse({items: rows.slice(0, pageSize), page: {page, pageSize, hasNextPage: rows.length > pageSize}});
  }
}
