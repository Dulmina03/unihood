import { Injectable, NotFoundException } from '@nestjs/common';
import { UniversityPageSchema, CampusPageSchema, CampusEntrancePageSchema,
  type UniversityListQuery, type CampusListQuery, type EntranceListQuery } from '@unihood/contracts';
import { UniversityRepository } from './university.repository';

// Each public projection is explicit: never SELECT * or join residential/identity tables.
const provenance = (alias: string) => `json_build_object('dataKind', ${alias}.data_kind, 'sourceLabel', ${alias}.source_label, 'verifiedAt', to_char(${alias}.verified_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) AS provenance`;
const visible = (alias: string) => `${alias}.status='ACTIVE' AND ($1::boolean OR ${alias}.data_kind='VERIFIED')`;
function paging(query: CampusListQuery) {return {page: Number(query.page ?? '1'), pageSize: Number(query.pageSize ?? '20')};}
function pageRows(rows: unknown[], page: number, pageSize: number) {
  return {items: rows.slice(0, pageSize), page: {page, pageSize, hasNextPage: rows.length > pageSize}};
}
@Injectable()
export class UniversityService {
  constructor(private readonly repository: UniversityRepository) {}
  async universities(query: UniversityListQuery) {
    const {page, pageSize} = paging(query);
    const rows = await this.repository.query(`SELECT u.id, u.slug, u.name, u.city, u.country, ${provenance('u')}
      FROM public.universities u WHERE ${visible('u')} AND ($2::text IS NULL OR u.slug=$2)
      ORDER BY u.name COLLATE "C", u.id LIMIT $3 OFFSET $4`, [this.repository.includeSynthetic, query.slug ?? null, pageSize + 1, (page - 1) * pageSize]);
    return UniversityPageSchema.parse(pageRows(rows, page, pageSize));
  }
  private async parent(id: string) {
    const rows = await this.repository.query(`SELECT u.id FROM public.universities u WHERE ${visible('u')} AND u.id=$2`, [this.repository.includeSynthetic, id]);
    if (!rows.length) throw new NotFoundException();
  }
  async campuses(id: string, query: CampusListQuery) {
    await this.parent(id);
    const {page, pageSize} = paging(query);
    const rows = await this.repository.query(`SELECT c.id, c.university_id AS "universityId", c.name, c.public_area AS "publicArea", ${provenance('c')}
      FROM public.campuses c JOIN public.universities u ON u.id=c.university_id
      WHERE ${visible('u')} AND ${visible('c')} AND u.id=$2
      ORDER BY c.name COLLATE "C", c.id LIMIT $3 OFFSET $4`, [this.repository.includeSynthetic, id, pageSize + 1, (page - 1) * pageSize]);
    return CampusPageSchema.parse(pageRows(rows, page, pageSize));
  }
  async entrances(id: string, query: EntranceListQuery) {
    await this.parent(id);
    if (query.campusId) {
      const rows = await this.repository.query(`SELECT c.id FROM public.campuses c WHERE ${visible('c')} AND c.university_id=$2 AND c.id=$3`, [this.repository.includeSynthetic, id, query.campusId]);
      if (!rows.length) throw new NotFoundException();
    }
    const {page, pageSize} = paging(query);
    const rows = await this.repository.query(`SELECT e.id, e.campus_id AS "campusId", e.name,
      json_build_object('lat', ST_Y(e.geo), 'lng', ST_X(e.geo)) AS location, e.is_primary AS "isPrimary", ${provenance('e')}
      FROM public.campus_entrances e JOIN public.campuses c ON c.id=e.campus_id JOIN public.universities u ON u.id=c.university_id
      WHERE ${visible('u')} AND ${visible('c')} AND ${visible('e')} AND u.id=$2 AND ($3::uuid IS NULL OR c.id=$3)
      ORDER BY e.name COLLATE "C", e.id LIMIT $4 OFFSET $5`, [this.repository.includeSynthetic, id, query.campusId ?? null, pageSize + 1, (page - 1) * pageSize]);
    return CampusEntrancePageSchema.parse(pageRows(rows, page, pageSize));
  }
}
