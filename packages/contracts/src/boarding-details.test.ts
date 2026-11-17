import { describe, it, expect } from 'vitest';
import {
  NearbyEssentialItemSchema,
  BoardingNearbyEssentialsResponseSchema,
  BoardingComparisonQuerySchema,
  BoardingComparisonItemSchema,
  BoardingComparisonResponseSchema,
  parseBoardingComparisonResponse,
  type BoardingComparisonItem,
} from './boarding-details';

const provenance = {
  dataKind: 'SYNTHETIC' as const,
  sourceLabel: 'UNI-038 synthetic fixture',
  verifiedAt: null,
};

const publicEntrance = {lat: 6.795, lng: 79.901};

const validEssential = {
  id: '40000000-0000-4000-8000-000000000001',
  name: 'Synthetic Pharmacy',
  category: {code: 'pharmacy', label: 'Pharmacy'},
  location: {lat: 6.796, lng: 79.902},
  distanceMeters: 140,
  provenance,
};

describe('UNI-038 Boarding Details & Nearby Essentials Contracts', () => {
  it('validates a nearby essential item', () => {
    expect(NearbyEssentialItemSchema.safeParse(validEssential).success).toBe(true);
  });

  it('rejects negative distance or invalid coords for nearby essentials', () => {
    expect(NearbyEssentialItemSchema.safeParse({...validEssential, distanceMeters: -1}).success).toBe(false);
    expect(NearbyEssentialItemSchema.safeParse({...validEssential, location: {lat: 95, lng: 0}}).success).toBe(false);
  });

  it('validates a public map boarding nearby essentials response', () => {
    const response = {
      boardingId: '00000000-0000-4000-8000-000000000001',
      visibility: 'PUBLIC_MAP' as const,
      entrance: publicEntrance,
      items: [validEssential],
    };
    expect(BoardingNearbyEssentialsResponseSchema.safeParse(response).success).toBe(true);
  });

  it('strictly rejects nearby essentials response for non-PUBLIC_MAP visibility', () => {
    const invalid = {
      boardingId: '00000000-0000-4000-8000-000000000001',
      visibility: 'AREA_ONLY',
      entrance: publicEntrance,
      items: [validEssential],
    };
    expect(BoardingNearbyEssentialsResponseSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates comparison query with 1 to 4 IDs', () => {
    expect(BoardingComparisonResponseSchema.safeParse({ items: [], requestedCount: 0, comparedCount: 0 }).success).toBe(true);
    expect(BoardingComparisonQuerySchema.safeParse({ids: '00000000-0000-4000-8000-000000000001,00000000-0000-4000-8000-000000000002'}).success).toBe(true);
    expect(BoardingComparisonQuerySchema.safeParse({ids: '00000000-0000-4000-8000-000000000001'}).success).toBe(true);
    expect(BoardingComparisonQuerySchema.safeParse({ids: ''}).success).toBe(false);
    expect(BoardingComparisonQuerySchema.safeParse({ids: 'not-a-uuid'}).success).toBe(false);
    expect(BoardingComparisonQuerySchema.safeParse({
      ids: '00000000-0000-4000-8000-000000000001,00000000-0000-4000-8000-000000000002,00000000-0000-4000-8000-000000000003,00000000-0000-4000-8000-000000000004,00000000-0000-4000-8000-000000000005',
    }).success).toBe(false);
  });

  it('validates comparison item with PUBLIC_MAP (requires entrance and nearbyEssentials)', () => {
    const publicItem: BoardingComparisonItem = {
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Synthetic Public Courtyard',
      publisherKind: 'OWNER_OFFICIAL',
      visibility: 'PUBLIC_MAP',
      locationLabel: null,
      hasExactEntrance: true,
      entrance: publicEntrance,
      price: {currency: 'LKR', rentMonthly: 15000, deposit: 30000, verifiedSource: 'OWNER'},
      vacancy: {status: 'AVAILABLE', confirmedAt: '2026-11-17T00:00:00.000Z', expiresAt: '2026-11-20T00:00:00.000Z'},
      unitsSummary: [{
        id: '75000000-0000-4000-8000-000000000001',
        label: 'Single Room',
        template: 'STUDY_ROOM',
        capacity: 1,
        rentMinor: 1500000,
        basis: 'ROOM',
        vacancyStatus: 'AVAILABLE',
      }],
      nearbyEssentials: [{
        category: 'pharmacy',
        label: 'Pharmacy',
        count: 1,
        nearestDistanceMeters: 140,
      }],
      summary: 'Public preview summary.',
      updatedAt: '2026-11-17T00:00:00.000Z',
      provenance,
    };
    expect(BoardingComparisonItemSchema.safeParse(publicItem).success).toBe(true);
  });

  it('ADR-0002/0003: rejects comparison item if AREA_ONLY contains entrance coordinates or nearbyEssentials', () => {
    const areaWithLeakedLocation = {
      id: '71000000-0000-4000-8000-000000000001',
      title: 'Synthetic Area Home',
      publisherKind: 'OWNER_OFFICIAL',
      visibility: 'AREA_ONLY',
      locationLabel: 'Synthetic Locality',
      hasExactEntrance: true, // LEAK
      entrance: publicEntrance, // LEAK
      price: null,
      vacancy: {status: 'UNKNOWN', confirmedAt: null, expiresAt: null},
      unitsSummary: [],
      nearbyEssentials: [{category: 'pharmacy', label: 'Pharmacy', count: 1, nearestDistanceMeters: 100}], // LEAK
      summary: 'Area summary.',
      updatedAt: '2026-11-17T00:00:00.000Z',
      provenance,
    };
    expect(BoardingComparisonItemSchema.safeParse(areaWithLeakedLocation).success).toBe(false);
  });

  it('validates AREA_ONLY and HIDDEN comparison items with strictly null entrance and nearbyEssentials', () => {
    const areaItem = {
      id: '71000000-0000-4000-8000-000000000001',
      title: 'Synthetic Area Home',
      publisherKind: 'OWNER_OFFICIAL',
      visibility: 'AREA_ONLY' as const,
      locationLabel: 'Synthetic Locality',
      hasExactEntrance: false,
      entrance: null,
      price: null,
      vacancy: {status: 'UNKNOWN' as const, confirmedAt: null, expiresAt: null},
      unitsSummary: [],
      nearbyEssentials: null,
      summary: 'Area summary.',
      updatedAt: '2026-11-17T00:00:00.000Z',
      provenance,
    };
    expect(BoardingComparisonItemSchema.safeParse(areaItem).success).toBe(true);

    const hiddenItem = {
      ...areaItem,
      id: '71000000-0000-4000-8000-000000000002',
      visibility: 'HIDDEN' as const,
      locationLabel: null,
    };
    expect(BoardingComparisonItemSchema.safeParse(hiddenItem).success).toBe(true);
  });

  it('parseBoardingComparisonResponse demotes expired vacancy status to UNKNOWN', () => {
    const past = new Date('2026-11-15T00:00:00.000Z').getTime();
    const expiredItem = {
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Synthetic Public Courtyard',
      publisherKind: 'OWNER_OFFICIAL' as const,
      visibility: 'PUBLIC_MAP' as const,
      locationLabel: null,
      hasExactEntrance: true,
      entrance: publicEntrance,
      price: null,
      vacancy: {status: 'AVAILABLE' as const, confirmedAt: '2026-11-10T00:00:00.000Z', expiresAt: '2026-11-12T00:00:00.000Z'},
      unitsSummary: [],
      nearbyEssentials: [],
      summary: 'Public preview summary.',
      updatedAt: '2026-11-10T00:00:00.000Z',
      provenance,
    };
    const response = {
      items: [expiredItem],
      requestedCount: 1,
      comparedCount: 1,
    };
    const parsed = parseBoardingComparisonResponse(response, past);
    expect(parsed.items[0].vacancy.status).toBe('UNKNOWN');
    expect(parsed.items[0].vacancy.confirmedAt).toBe(null);
  });
});
