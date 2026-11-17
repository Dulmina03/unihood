import { describe, expect, it } from 'vitest';
import {
  parsePublicBoardingResponse,
  PublicBoardingResponseSchema,
  OwnerPublicMapSchema,
  OwnerAreaAdvertisementSchema,
  OwnerHiddenAdvertisementSchema,
  CommunityAreaAdvertisementSchema,
  CommunityHiddenAdvertisementSchema,
  BoardingComparisonResponseSchema,
  BoardingNearbyEssentialsResponseSchema,
} from './index';

const baseId = '00000000-0000-4000-8000-000000000001';

describe('comprehensive privacy matrix contracts (ADR-0001–0005 & §13.2)', () => {
  describe('PUBLIC_MAP visibility mode', () => {
    it('accepts owner-consented public map listings with valid public entrance', () => {
      const valid = {
        id: baseId,
        title: 'Consented public boarding',
        publisherKind: 'OWNER_OFFICIAL',
        ownerVerified: true,
        visibility: 'PUBLIC_MAP',
        publicMapConsent: true,
        entrance: { lat: 6.795, lng: 79.901 },
        locationLabel: 'Katubedda',
        price: { currency: 'LKR', rentMonthly: 18000, verifiedSource: 'OWNER' },
        vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
      };
      expect(PublicBoardingResponseSchema.safeParse(valid).success).toBe(true);
      expect(OwnerPublicMapSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects PUBLIC_MAP without explicit owner consent or valid entrance', () => {
      const base = {
        id: baseId,
        title: 'Unconsented map attempt',
        publisherKind: 'OWNER_OFFICIAL',
        ownerVerified: true,
        visibility: 'PUBLIC_MAP',
        publicMapConsent: false,
        entrance: { lat: 6.795, lng: 79.901 },
        locationLabel: 'Katubedda',
        price: null,
        vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
      };
      expect(PublicBoardingResponseSchema.safeParse(base).success).toBe(false);
      expect(PublicBoardingResponseSchema.safeParse({ ...base, publicMapConsent: true, entrance: null }).success).toBe(false);
      expect(PublicBoardingResponseSchema.safeParse({ ...base, publicMapConsent: true, entrance: { lat: 95, lng: 79.9 } }).success).toBe(false);
    });

    it('rejects arbitrary injected location or internal verification properties', () => {
      const withCanary = {
        id: baseId,
        title: 'Consented public boarding',
        publisherKind: 'OWNER_OFFICIAL',
        ownerVerified: true,
        visibility: 'PUBLIC_MAP',
        publicMapConsent: true,
        entrance: { lat: 6.795, lng: 79.901 },
        locationLabel: 'Katubedda',
        price: null,
        vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
        privateCoordinates: { lat: 6.795123, lng: 79.901456 },
        privateAddress: 'CANARY_ADDRESS',
      };
      expect(PublicBoardingResponseSchema.safeParse(withCanary).success).toBe(false);
    });
  });

  describe('AREA_ONLY visibility mode', () => {
    it('accepts owner area-only advertisement with nonrevealing broad locality label and strictly null entrance/route', () => {
      const valid = {
        id: baseId,
        title: 'Area-only boarding advertisement',
        publisherKind: 'OWNER_OFFICIAL',
        ownerVerified: true,
        visibility: 'AREA_ONLY',
        locationLabel: 'Katubedda North',
        entrance: null,
        distanceMeters: null,
        route: null,
        price: { currency: 'LKR', rentMonthly: 16000, verifiedSource: 'OWNER' },
        vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
      };
      expect(PublicBoardingResponseSchema.safeParse(valid).success).toBe(true);
      expect(OwnerAreaAdvertisementSchema.safeParse(valid).success).toBe(true);
    });

    it('strictly refuses any non-null entrance, distance, or route in AREA_ONLY', () => {
      const base = {
        id: baseId,
        title: 'Area-only leak attempt',
        publisherKind: 'OWNER_OFFICIAL',
        ownerVerified: true,
        visibility: 'AREA_ONLY',
        locationLabel: 'Katubedda North',
        entrance: null,
        distanceMeters: null,
        route: null,
        price: null,
        vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
      };
      // Coordinate leak attempt
      expect(PublicBoardingResponseSchema.safeParse({ ...base, entrance: { lat: 6.795, lng: 79.901 } }).success).toBe(false);
      // Distance inference attempt
      expect(PublicBoardingResponseSchema.safeParse({ ...base, distanceMeters: 450 }).success).toBe(false);
      // Route inference attempt
      expect(PublicBoardingResponseSchema.safeParse({ ...base, route: { durationMinutes: 6 } }).success).toBe(false);
    });
  });

  describe('HIDDEN visibility mode', () => {
    it('accepts location-hidden advertisement with strictly null entrance, locality label, distance, and route', () => {
      const valid = {
        id: baseId,
        title: 'Fully hidden boarding ad',
        publisherKind: 'OWNER_OFFICIAL',
        ownerVerified: true,
        visibility: 'HIDDEN',
        entrance: null,
        locationLabel: null,
        distanceMeters: null,
        route: null,
        price: { currency: 'LKR', rentMonthly: 20000, deposit: 40000, verifiedSource: 'OWNER' },
        vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
      };
      expect(PublicBoardingResponseSchema.safeParse(valid).success).toBe(true);
      expect(OwnerHiddenAdvertisementSchema.safeParse(valid).success).toBe(true);
    });

    it('strictly refuses locationLabel, entrance, or distance in HIDDEN mode', () => {
      const base = {
        id: baseId,
        title: 'Hidden leak attempt',
        publisherKind: 'OWNER_OFFICIAL',
        ownerVerified: true,
        visibility: 'HIDDEN',
        entrance: null,
        locationLabel: null,
        distanceMeters: null,
        route: null,
        price: null,
        vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
      };
      expect(PublicBoardingResponseSchema.safeParse({ ...base, locationLabel: 'Katubedda' }).success).toBe(false);
      expect(PublicBoardingResponseSchema.safeParse({ ...base, entrance: { lat: 6.795, lng: 79.901 } }).success).toBe(false);
      expect(PublicBoardingResponseSchema.safeParse({ ...base, distanceMeters: 250 }).success).toBe(false);
    });
  });

  describe('COMMUNITY_RECOMMENDATION contributions (ADR-0002)', () => {
    it('accepts valid community recommendations with mandatory disclaimer, null price, and UNKNOWN vacancy', () => {
      const areaRec = {
        id: baseId,
        title: 'Student recommended boarding',
        publisherKind: 'COMMUNITY_RECOMMENDATION',
        visibility: 'AREA_ONLY',
        locationLabel: 'Near University Back Gate',
        price: null,
        vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
        disclaimer: 'Community-submitted, not owner-verified',
        entrance: null,
        distanceMeters: null,
        route: null,
      };
      expect(PublicBoardingResponseSchema.safeParse(areaRec).success).toBe(true);
      expect(CommunityAreaAdvertisementSchema.safeParse(areaRec).success).toBe(true);

      const hiddenRec = {
        ...areaRec,
        visibility: 'HIDDEN',
        locationLabel: null,
      };
      expect(PublicBoardingResponseSchema.safeParse(hiddenRec).success).toBe(true);
      expect(CommunityHiddenAdvertisementSchema.safeParse(hiddenRec).success).toBe(true);
    });

    it('strictly refuses student attempt to publish exact entrance pin', () => {
      const studentPinAttempt = {
        id: baseId,
        title: 'Student pin attempt',
        publisherKind: 'COMMUNITY_RECOMMENDATION',
        visibility: 'PUBLIC_MAP',
        publicMapConsent: true,
        entrance: { lat: 6.795, lng: 79.901 },
        locationLabel: 'Katubedda',
        price: null,
        vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
        disclaimer: 'Community-submitted, not owner-verified',
      };
      expect(PublicBoardingResponseSchema.safeParse(studentPinAttempt).success).toBe(false);
    });

    it('strictly refuses student attempt to set official price or confirmed vacancy', () => {
      const base = {
        id: baseId,
        title: 'Student official field attempt',
        publisherKind: 'COMMUNITY_RECOMMENDATION',
        visibility: 'AREA_ONLY',
        locationLabel: 'Katubedda',
        price: null,
        vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
        disclaimer: 'Community-submitted, not owner-verified',
        entrance: null,
        distanceMeters: null,
        route: null,
      };
      // Student price spoofing
      expect(PublicBoardingResponseSchema.safeParse({
        ...base,
        price: { currency: 'LKR', rentMonthly: 15000, verifiedSource: 'OWNER' },
      }).success).toBe(false);

      // Student vacancy spoofing
      expect(PublicBoardingResponseSchema.safeParse({
        ...base,
        vacancy: { status: 'AVAILABLE', confirmedAt: '2026-11-17T00:00:00Z', expiresAt: '2026-11-30T00:00:00Z' },
      }).success).toBe(false);
    });
  });

  describe('Vacancy Freshness & Expiry Invariant (ADR-0003 & §6.4)', () => {
    it('automatically downgrades expired confirmed vacancies to UNKNOWN on serialization', () => {
      const pastConfirmed = '2026-11-01T00:00:00Z';
      const pastExpired = '2026-11-15T00:00:00Z';
      const referenceNow = Date.parse('2026-11-18T00:00:00Z');

      const expiredInput = {
        id: baseId,
        title: 'Stale vacancy boarding',
        publisherKind: 'OWNER_OFFICIAL',
        ownerVerified: true,
        visibility: 'HIDDEN',
        entrance: null,
        locationLabel: null,
        distanceMeters: null,
        route: null,
        price: null,
        vacancy: {
          status: 'AVAILABLE' as const,
          confirmedAt: pastConfirmed,
          expiresAt: pastExpired,
        },
      };

      const result = parsePublicBoardingResponse(expiredInput, referenceNow);
      expect(result.vacancy).toEqual({
        status: 'UNKNOWN',
        confirmedAt: null,
        expiresAt: null,
      });
    });

    it('automatically downgrades future-confirmed vacancies to UNKNOWN (clock tampering protection)', () => {
      const futureConfirmed = '2026-11-20T00:00:00Z';
      const futureExpired = '2026-12-04T00:00:00Z';
      const referenceNow = Date.parse('2026-11-18T00:00:00Z');

      const futureInput = {
        id: baseId,
        title: 'Future confirmed vacancy boarding',
        publisherKind: 'OWNER_OFFICIAL',
        ownerVerified: true,
        visibility: 'HIDDEN',
        entrance: null,
        locationLabel: null,
        distanceMeters: null,
        route: null,
        price: null,
        vacancy: {
          status: 'AVAILABLE' as const,
          confirmedAt: futureConfirmed,
          expiresAt: futureExpired,
        },
      };

      const result = parsePublicBoardingResponse(futureInput, referenceNow);
      expect(result.vacancy).toEqual({
        status: 'UNKNOWN',
        confirmedAt: null,
        expiresAt: null,
      });
    });
  });

  describe('Nearby Essentials and Comparison Privacy Matrix (UNI-038 & ADR-0001)', () => {
    const provenanceFixture = {
      dataKind: 'SYNTHETIC' as const,
      sourceLabel: 'UNI-039 privacy matrix fixture',
      verifiedAt: null,
    };

    it('strictly requires PUBLIC_MAP and owner consent for Nearby Essentials response', () => {
      const validEssentials = {
        boardingId: baseId,
        visibility: 'PUBLIC_MAP' as const,
        entrance: { lat: 6.795, lng: 79.901 },
        items: [{
          id: '10000000-0000-4000-8000-000000000001',
          name: 'Campus Pharmacy',
          category: { code: 'PHARMACY', label: 'Pharmacy' },
          location: { lat: 6.796, lng: 79.903 },
          distanceMeters: 350,
          provenance: provenanceFixture,
        }],
      };
      expect(BoardingNearbyEssentialsResponseSchema.safeParse(validEssentials).success).toBe(true);

      // Area-only or Hidden must fail essentials schema
      expect(BoardingNearbyEssentialsResponseSchema.safeParse({
        ...validEssentials,
        visibility: 'AREA_ONLY',
      }).success).toBe(false);
      expect(BoardingNearbyEssentialsResponseSchema.safeParse({
        ...validEssentials,
        visibility: 'HIDDEN',
      }).success).toBe(false);
    });

    it('enforces comparison matrix separation: public boarding has essentials, private boardings have null essentials and null entrance', () => {
      const comparisonMatrix = {
        requestedCount: 3,
        comparedCount: 3,
        items: [
          // Item 1: PUBLIC_MAP with consent
          {
            id: '00000000-0000-4000-8000-000000000001',
            title: 'Public Boarding A',
            publisherKind: 'OWNER_OFFICIAL' as const,
            visibility: 'PUBLIC_MAP' as const,
            locationLabel: 'Katubedda',
            hasExactEntrance: true,
            entrance: { lat: 6.795, lng: 79.901 },
            price: { currency: 'LKR' as const, rentMonthly: 18000, verifiedSource: 'OWNER' as const },
            vacancy: { status: 'AVAILABLE' as const, confirmedAt: '2026-11-17T00:00:00.000Z', expiresAt: '2026-11-30T00:00:00.000Z' },
            unitsSummary: [],
            nearbyEssentials: [{
              category: 'PHARMACY',
              label: 'Pharmacy',
              count: 2,
              nearestDistanceMeters: 350,
            }],
            summary: 'Consented public listing with exact entrance and nearby services',
            updatedAt: '2026-11-17T00:00:00.000Z',
            provenance: provenanceFixture,
          },
          // Item 2: AREA_ONLY
          {
            id: '00000000-0000-4000-8000-000000000002',
            title: 'Area Boarding B',
            publisherKind: 'OWNER_OFFICIAL' as const,
            visibility: 'AREA_ONLY' as const,
            locationLabel: 'Katubedda North',
            hasExactEntrance: false,
            entrance: null,
            price: null,
            vacancy: { status: 'UNKNOWN' as const, confirmedAt: null, expiresAt: null },
            unitsSummary: [],
            nearbyEssentials: null,
            summary: 'Area advertisement without exact pin or proximity metrics',
            updatedAt: '2026-11-17T00:00:00.000Z',
            provenance: provenanceFixture,
          },
          // Item 3: HIDDEN
          {
            id: '00000000-0000-4000-8000-000000000003',
            title: 'Hidden Boarding C',
            publisherKind: 'COMMUNITY_RECOMMENDATION' as const,
            visibility: 'HIDDEN' as const,
            locationLabel: null,
            hasExactEntrance: false,
            entrance: null,
            price: null,
            vacancy: { status: 'UNKNOWN' as const, confirmedAt: null, expiresAt: null },
            unitsSummary: [],
            nearbyEssentials: null,
            summary: 'Community ad with location completely hidden',
            updatedAt: '2026-11-17T00:00:00.000Z',
            provenance: provenanceFixture,
          },
        ],
      };

      expect(BoardingComparisonResponseSchema.safeParse(comparisonMatrix).success).toBe(true);

      // Attempting to inject entrance or essentials for Item 2 or 3 must fail comparison schema
      const leakedComparison = {
        ...comparisonMatrix,
        items: [
          comparisonMatrix.items[0],
          {
            ...comparisonMatrix.items[1],
            hasExactEntrance: true,
            entrance: { lat: 6.795, lng: 79.901 },
          },
          comparisonMatrix.items[2],
        ],
      };
      // Refinement check: hasExactEntrance is true but visibility is AREA_ONLY -> must fail
      expect(BoardingComparisonResponseSchema.safeParse(leakedComparison).success).toBe(false);

      // Attempting to inject essentials for Item 3 must fail
      const leakedEssentials = {
        ...comparisonMatrix,
        items: [
          comparisonMatrix.items[0],
          comparisonMatrix.items[1],
          {
            ...comparisonMatrix.items[2],
            nearbyEssentials: [{
              category: 'PHARMACY',
              label: 'Pharmacy',
              count: 1,
              nearestDistanceMeters: 200,
            }],
          },
        ],
      };
      expect(BoardingComparisonResponseSchema.safeParse(leakedEssentials).success).toBe(false);
    });
  });
});

describe('comparison privacy cannot bypass advertisement policy', () => {
  const item = {
    id: baseId, title: 'Synthetic private comparison', publisherKind: 'OWNER_OFFICIAL',
    visibility: 'HIDDEN', locationLabel: null, hasExactEntrance: false, entrance: null,
    price: null, vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
    unitsSummary: [], nearbyEssentials: null, summary: 'Synthetic fixture only',
    updatedAt: '2026-11-18T00:00:00Z',
    provenance: { dataKind: 'SYNTHETIC', sourceLabel: 'UNI-039 synthetic fixture', verifiedAt: null },
  };
  const accepts = (value: unknown) => BoardingComparisonResponseSchema.safeParse({
    items: [value], requestedCount: 1, comparedCount: 1,
  }).success;
  it('rejects hidden locality, community public pins and community official facts', () => {
    expect(accepts(item)).toBe(true);
    expect(accepts({ ...item, locationLabel: 'PRIVATE_LOCALITY_CANARY' })).toBe(false);
    expect(accepts({ ...item, publisherKind: 'COMMUNITY_RECOMMENDATION', visibility: 'PUBLIC_MAP',
      hasExactEntrance: true, entrance: { lat: 0, lng: 0 }, nearbyEssentials: [] })).toBe(false);
    expect(accepts({ ...item, publisherKind: 'COMMUNITY_RECOMMENDATION',
      price: { currency: 'LKR', rentMonthly: 100, verifiedSource: 'OWNER' } })).toBe(false);
    expect(accepts({ ...item, publisherKind: 'COMMUNITY_RECOMMENDATION', unitsSummary: [{
      id: baseId, label: 'Synthetic unit', template: 'STUDY_ROOM', capacity: 1,
      rentMinor: 10000, basis: 'ROOM', vacancyStatus: 'AVAILABLE',
    }] })).toBe(false);
  });
});
