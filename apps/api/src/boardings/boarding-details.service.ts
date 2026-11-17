import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BoardingComparisonQuery,
  BoardingComparisonResponse,
  BoardingComparisonResponseSchema,
  BoardingNearbyEssentialsResponse,
  BoardingNearbyEssentialsResponseSchema,
  BoardingComparisonItem,
} from '@unihood/contracts';
import { UniversityRepository } from '../universities/university.repository';

@Injectable()
export class BoardingDetailsService {
  constructor(private readonly repository: UniversityRepository) {}

  async nearbyEssentials(id: string): Promise<BoardingNearbyEssentialsResponse> {
    const boarding = await this.repository.query(
      `SELECT b.place_id, p.canonical_name AS title, ST_Y(e.entrance_geo) AS lat, ST_X(e.entrance_geo) AS lng
       FROM public.boarding_properties b
       JOIN public.places p ON p.id = b.place_id
       JOIN public.listings l ON l.boarding_id = b.place_id AND l.is_current = true AND l.publication_status = 'PUBLISHED'
       JOIN public.boarding_public_entrances e ON e.boarding_id = b.place_id AND e.listing_id = l.id AND e.purpose = 'OWNER_SELECTED_PUBLIC_ENTRANCE'
       WHERE $1::boolean AND b.place_id = $2
         AND p.kind = 'BOARDING' AND p.status = 'ACTIVE' AND p.merged_into IS NULL
         AND p.data_kind = 'SYNTHETIC' AND b.data_kind = 'SYNTHETIC'
         AND b.visibility = 'PUBLIC_MAP' AND b.public_map_consent = true
         AND b.authorization_status = 'LOCAL_TEST_AUTHORIZED'
         AND l.publisher_kind = 'OWNER_OFFICIAL' AND l.visibility_snapshot = b.visibility
         AND e.consent_at = b.map_consent_at
       LIMIT 1`,
      [this.repository.includeSynthetic, id],
    );

    if (!boarding.length) {
      throw new NotFoundException('Nearby essentials are only available for owner-consented public map listings');
    }

    const entrance = { lat: Number(boarding[0].lat), lng: Number(boarding[0].lng) };

    const rows = await this.repository.query(
      `SELECT p.id, p.canonical_name AS name,
         json_build_object('code', c.code, 'label', c.label) AS category,
         json_build_object('lat', ST_Y(l.entrance_geo), 'lng', ST_X(l.entrance_geo)) AS location,
         round(ST_Distance(l.entrance_geo::geography, ST_SetSRID(ST_Point($2, $3), 4326)::geography))::int AS "distanceMeters",
         json_build_object('dataKind', p.data_kind, 'sourceLabel', p.source_label, 'verifiedAt', to_char(p.verified_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) AS provenance
       FROM public.places p
       JOIN public.public_place_locations l ON l.place_id = p.id AND l.place_kind = p.kind AND l.place_status = p.status
       JOIN public.poi_categories c ON c.code = p.category
       WHERE p.kind = 'POI' AND p.status = 'ACTIVE' AND p.merged_into IS NULL
         AND ($1::boolean OR p.data_kind = 'VERIFIED')
         AND ST_DWithin(l.entrance_geo::geography, ST_SetSRID(ST_Point($2, $3), 4326)::geography, 2000)
       ORDER BY "distanceMeters" ASC, p.canonical_name COLLATE "C", p.id
       LIMIT 25`,
      [this.repository.includeSynthetic, entrance.lng, entrance.lat],
    );

    return BoardingNearbyEssentialsResponseSchema.parse({
      boardingId: id,
      visibility: 'PUBLIC_MAP',
      entrance,
      items: rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        location: r.location,
        distanceMeters: r.distanceMeters,
        provenance: r.provenance,
      })),
    });
  }

  async compare(query: BoardingComparisonQuery): Promise<BoardingComparisonResponse> {
    const ids = Array.from(new Set(query.ids.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)));
    const items: BoardingComparisonItem[] = [];

    for (const id of ids) {
      const propRows = await this.repository.query(
        `SELECT b.place_id AS id, a.title, l.publisher_kind, b.visibility,
                b.general_locality, b.locality_consent, b.public_map_consent, b.authorization_status,
                a.summary,
                to_char(a.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "updatedAt",
                ST_Y(e.entrance_geo) AS lat, ST_X(e.entrance_geo) AS lng
         FROM public.boarding_properties b
         JOIN public.places p ON p.id = b.place_id
         JOIN public.listings l ON l.boarding_id = b.place_id AND l.is_current = true AND l.publication_status = 'PUBLISHED'
         JOIN public.boarding_advertisement_previews a ON a.listing_id = l.id AND a.boarding_id = b.place_id
         LEFT JOIN public.boarding_public_entrances e ON e.boarding_id = b.place_id AND e.listing_id = l.id AND e.purpose = 'OWNER_SELECTED_PUBLIC_ENTRANCE' AND e.consent_at = b.map_consent_at
         WHERE $1::boolean AND b.place_id = $2
           AND p.kind = 'BOARDING' AND p.status = 'ACTIVE' AND p.merged_into IS NULL
           AND p.data_kind = 'SYNTHETIC' AND b.data_kind = 'SYNTHETIC'
           AND l.visibility_snapshot = b.visibility AND a.visibility = b.visibility AND a.data_kind = 'SYNTHETIC'
           AND (b.visibility <> 'AREA_ONLY' OR (b.locality_consent AND b.general_locality = a.locality))
           AND (l.publisher_kind = 'COMMUNITY_RECOMMENDATION' OR b.authorization_status = 'LOCAL_TEST_AUTHORIZED')
         LIMIT 1`,
        [this.repository.includeSynthetic, id],
      );

      if (!propRows.length) continue;
      const r = propRows[0];
      const isPublicMap = r.publisher_kind === 'OWNER_OFFICIAL' && r.visibility === 'PUBLIC_MAP' && r.public_map_consent === true && r.authorization_status === 'LOCAL_TEST_AUTHORIZED' && r.lat !== null && r.lng !== null;

      const unitRows = r.publisher_kind === 'OWNER_OFFICIAL' ? await this.repository.query(
        `SELECT u.id, CASE u.public_template WHEN 'STUDY_ROOM' THEN 'Synthetic Study Room' ELSE 'Synthetic Shared Room' END AS label, u.public_template AS template, u.capacity,
                p.rent_minor AS "rentMinor", p.basis,
                COALESCE(c.status, 'UNKNOWN') AS "vacancyStatus",
                to_char(c.confirmed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "confirmedAt",
                to_char(c.expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "expiresAt"
         FROM public.boarding_units u
         LEFT JOIN LATERAL (
           SELECT op.rent_minor, op.basis, op.deposit_minor
           FROM public.boarding_official_prices op
           WHERE op.unit_id = u.id AND op.boarding_id = u.boarding_id AND op.effective_at <= CURRENT_TIMESTAMP
           ORDER BY op.revision DESC LIMIT 1
         ) p ON true
         LEFT JOIN LATERAL (
           SELECT vc.status, vc.confirmed_at, vc.expires_at
           FROM public.boarding_vacancy_confirmations vc
           WHERE vc.unit_id = u.id AND vc.boarding_id = u.boarding_id AND vc.expires_at > CURRENT_TIMESTAMP
             AND vc.confirmed_at <= CURRENT_TIMESTAMP AND vc.revision = u.vacancy_revision AND vc.unit_revision = u.revision
           ORDER BY vc.revision DESC LIMIT 1
         ) c ON true
         WHERE u.boarding_id = $1 AND u.public_template IS NOT NULL
         ORDER BY u.id LIMIT 20`,
        [id],
      ) : [];

      let price: { currency: 'LKR'; rentMonthly: number; deposit?: number; verifiedSource: 'OWNER' } | null = null;
      const pricedUnits = unitRows.filter((u: Record<string, unknown>) => u.rentMinor !== null);
      if (r.publisher_kind === 'OWNER_OFFICIAL' && pricedUnits.length > 0) {
        const minRentMinor = Math.min(...pricedUnits.map((u: Record<string, unknown>) => Number(u.rentMinor)));
        price = {
          currency: 'LKR',
          rentMonthly: Math.round(minRentMinor / 100),
          verifiedSource: 'OWNER',
        };
      }

      let vacancyStatus: 'AVAILABLE' | 'FULL' | 'UNKNOWN' = 'UNKNOWN';
      let confirmedAt: string | null = null;
      let expiresAt: string | null = null;
      if (r.publisher_kind === 'OWNER_OFFICIAL') {
        const activeConfirmations = unitRows.filter((u: Record<string, unknown>) => u.vacancyStatus === 'AVAILABLE');
        if (activeConfirmations.length > 0) {
          vacancyStatus = 'AVAILABLE';
          confirmedAt = activeConfirmations[0].confirmedAt as string;
          expiresAt = activeConfirmations[0].expiresAt as string;
        } else if (unitRows.some((u: Record<string, unknown>) => u.vacancyStatus === 'FULL')) {
          vacancyStatus = 'FULL';
          const fullUnit = unitRows.find((u: Record<string, unknown>) => u.vacancyStatus === 'FULL');
          confirmedAt = (fullUnit?.confirmedAt as string) ?? null;
          expiresAt = (fullUnit?.expiresAt as string) ?? null;
        }
      }

      let nearbyEssentials: Array<{ category: string; label: string; count: number; nearestDistanceMeters: number | null }> | null = null;
      if (isPublicMap) {
        const essRows = await this.repository.query(
          `SELECT c.code AS category, c.label,
                  count(*)::int AS count,
                  min(round(ST_Distance(l.entrance_geo::geography, ST_SetSRID(ST_Point($2, $3), 4326)::geography)))::int AS "nearestDistanceMeters"
           FROM public.places p
           JOIN public.public_place_locations l ON l.place_id = p.id AND l.place_kind = p.kind AND l.place_status = p.status
           JOIN public.poi_categories c ON c.code = p.category
           WHERE p.kind = 'POI' AND p.status = 'ACTIVE' AND p.merged_into IS NULL
             AND ($1::boolean OR p.data_kind = 'VERIFIED')
             AND ST_DWithin(l.entrance_geo::geography, ST_SetSRID(ST_Point($2, $3), 4326)::geography, 2000)
           GROUP BY c.code, c.label
           ORDER BY "nearestDistanceMeters" ASC LIMIT 10`,
          [this.repository.includeSynthetic, Number(r.lng), Number(r.lat)],
        );
        nearbyEssentials = essRows.map((e: Record<string, unknown>) => ({
          category: String(e.category),
          label: String(e.label),
          count: Number(e.count),
          nearestDistanceMeters: e.nearestDistanceMeters !== null ? Number(e.nearestDistanceMeters) : null,
        }));
      }

      items.push({
        id: r.id,
        title: r.title,
        publisherKind: r.publisher_kind,
        visibility: r.visibility,
        locationLabel: r.visibility === 'AREA_ONLY' && r.locality_consent ? r.general_locality : null,
        hasExactEntrance: isPublicMap,
        entrance: isPublicMap ? { lat: Number(r.lat), lng: Number(r.lng) } : null,
        price,
        vacancy: vacancyStatus === 'UNKNOWN' ? { status: 'UNKNOWN', confirmedAt: null, expiresAt: null } : { status: vacancyStatus, confirmedAt: confirmedAt!, expiresAt: expiresAt! },
        unitsSummary: unitRows.map((u: Record<string, unknown>) => ({
          id: String(u.id),
          label: String(u.label),
          template: String(u.template),
          capacity: Number(u.capacity),
          rentMinor: u.rentMinor !== null ? Number(u.rentMinor) : null,
          basis: u.basis as 'ROOM' | 'BED' | null,
          vacancyStatus: u.vacancyStatus as 'AVAILABLE' | 'FULL' | 'UNKNOWN',
        })),
        nearbyEssentials,
        summary: r.summary,
        updatedAt: r.updatedAt,
        provenance: {
          dataKind: 'SYNTHETIC',
          sourceLabel: 'UNI-038 synthetic comparison fixture',
          verifiedAt: null,
        },
      });
    }

    return BoardingComparisonResponseSchema.parse({
      items,
      requestedCount: ids.length,
      comparedCount: items.length,
    });
  }
}
