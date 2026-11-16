import { describe, expect, it } from 'vitest';
import * as contracts from './index';
const id = '00000000-0000-4000-8000-000000000001';
const now = Date.parse('2026-11-16T09:00:00Z');
const unknown = {status: 'UNKNOWN', confirmedAt: null, expiresAt: null};
const owner = {id, title: 'Synthetic contract boarding', publisherKind: 'OWNER_OFFICIAL', ownerVerified: true, price: {currency: 'LKR', rentMonthly: 18000, verifiedSource: 'OWNER'}, vacancy: unknown};
const hidden = {...owner, visibility: 'HIDDEN', entrance: null, locationLabel: null, route: null, distanceMeters: null};
const area = {...hidden, visibility: 'AREA_ONLY', locationLabel: 'Synthetic broad locality'};
const publicMap = {...owner, visibility: 'PUBLIC_MAP', publicMapConsent: true, entrance: {lat: 0, lng: 0}, locationLabel: 'Synthetic area'};
const community = {id, title: 'Synthetic community recommendation', publisherKind: 'COMMUNITY_RECOMMENDATION', visibility: 'HIDDEN', entrance: null, locationLabel: null, price: null, vacancy: unknown, route: null, distanceMeters: null, disclaimer: 'Community-submitted, not owner-verified'};
describe('shared contract baseline', () => {
  it.each(['PlaceKind', 'BoardingVisibility', 'PublisherKind', 'PublicationStatus', 'VacancyStatus', 'SourceConfidence', 'SubmissionRisk', 'RouteTimeContext'])('exports strict %s enum', (family) => {
    const schema = contracts[`${family}Schema` as keyof typeof contracts] as typeof contracts.PlaceKindSchema;
    expect(schema.options.length).toBeGreaterThan(1);
    for (const value of schema.options) expect(schema.safeParse(value).success).toBe(true);
    for (const value of ['owner', '', null, 1, 'UNKNOWN_ENUM']) expect(schema.safeParse(value).success).toBe(false);
  });
  it('bounds wire pagination, rejects arrays, coercion tricks, unknown sorting and nested filters', () => {
    expect(contracts.parsePaginationQuery({})).toEqual({page: 1, pageSize: 20, sort: 'newest'});
    expect(contracts.parsePaginationQuery({page: '2', pageSize: '100', q: ' sample '})).toEqual({page: 2, pageSize: 100, sort: 'newest', q: 'sample'});
    for (const input of [{page: '-1'}, {page: '0'}, {page: '1e3'}, {page: '01'}, {pageSize: '101'}, {pageSize: true}, {page: ['1', '2']}, {sort: 'distance'}, {latitude: 0}, {q: 'a'.repeat(121)}, {q: ' '}, {q: {contains: 'x'}}]) expect(contracts.PaginationQuerySchema.safeParse(input).success).toBe(false);
  });
  it('accepts all five safe publisher/privacy projections and rejects recursive private extras', () => {
    for (const value of [publicMap, area, hidden, community, {...community, visibility: 'AREA_ONLY', locationLabel: 'Synthetic broad locality'}]) expect(contracts.parsePublicBoardingResponse(value, now)).toEqual(value);
    for (const value of [hidden, area, community]) {
      for (const extra of [{latitude: 0}, {geo: {lat: 0}}, {privateContact: 'secret'}, {url: '/route?lat=0'}, {ownerProof: 'private'}]) expect(contracts.PublicBoardingResponseSchema.safeParse({...value, ...extra}).success).toBe(false);
      expect(contracts.PublicBoardingResponseSchema.safeParse({...value, entrance: {lat: 0, lng: 0}}).success).toBe(false);
    }
    expect(contracts.PublicBoardingResponseSchema.safeParse({...publicMap, entrance: {lat: 0, lng: 0, address: 'secret'}}).success).toBe(false);
    expect(contracts.PublicBoardingResponseSchema.safeParse({...hidden, price: {...owner.price, phone: 'secret'}}).success).toBe(false);
  });
  it('denies owner claims from community, unconsented map geometry and hidden locality', () => {
    for (const extra of [{price: owner.price}, {visibility: 'PUBLIC_MAP'}, {ownerVerified: true}, {publicMapConsent: true}, {vacancy: {status: 'AVAILABLE', confirmedAt: '2026-11-15T00:00:00Z', expiresAt: '2026-11-29T00:00:00Z'}}]) expect(contracts.PublicBoardingResponseSchema.safeParse({...community, ...extra}).success).toBe(false);
    expect(contracts.PublicBoardingResponseSchema.safeParse({...publicMap, publicMapConsent: false}).success).toBe(false);
    expect(contracts.PublicBoardingResponseSchema.safeParse({...publicMap, ownerVerified: false}).success).toBe(false);
    expect(contracts.PublicBoardingResponseSchema.safeParse({...hidden, locationLabel: 'Private locality'}).success).toBe(false);
    for (const price of [-1, Infinity, NaN]) expect(contracts.OwnerPriceSchema.safeParse({...owner.price, rentMonthly: price}).success).toBe(false);
  });
  it('normalizes stale and future owner confirmations and rejects invalid intervals', () => {
    const confirmedAt = '2026-11-15T09:00:00Z', expiresAt = '2026-11-29T09:00:00Z';
    for (const status of ['AVAILABLE', 'FULL']) {
      expect(contracts.parsePublicBoardingResponse({...hidden, vacancy: {status, confirmedAt, expiresAt}}, now).vacancy.status).toBe(status);
      expect(contracts.parsePublicBoardingResponse({...hidden, vacancy: {status, confirmedAt, expiresAt}}, Date.parse(expiresAt)).vacancy).toEqual(unknown);
      expect(contracts.parsePublicBoardingResponse({...hidden, vacancy: {status, confirmedAt, expiresAt}}, Date.parse(confirmedAt) - 1).vacancy).toEqual(unknown);
    }
    expect(contracts.PublicBoardingResponseSchema.safeParse({...hidden, vacancy: {status: 'AVAILABLE', confirmedAt, expiresAt: confirmedAt}}).success).toBe(false);
  });
  it('allows only public validation paths/reasons and strict paginated items', () => {
    expect(contracts.publicValidationDetails([{path: ['PRIVATE_CANARY'], code: 'unrecognized_keys'}, {path: ['page'], code: 'invalid_type'}])).toEqual([{field: 'request', reason: 'UNKNOWN_FIELD'}, {field: 'page', reason: 'INVALID_VALUE'}]);
    const page = {items: [hidden], page: {page: 1, pageSize: 20, hasNextPage: false}};
    expect(contracts.PublicBoardingPageSchema.safeParse(page).success).toBe(true);
    expect(contracts.PublicBoardingPageSchema.safeParse({...page, items: [hidden, hidden], page: {...page.page, pageSize: 1}}).success).toBe(false);
    expect(contracts.PublicBoardingPageSchema.safeParse({...page, items: [{...hidden, coords: [0, 0]}]}).success).toBe(false);
  });
  it('generates JSON Schema without any private actor or verification model', () => {
    const schemas = contracts.publicJsonSchemas();
    expect(schemas.PublicBoardingResponse).toBeDefined();
    for (const key of ['ActorContext', 'IdentityProvider', 'PermissionService', 'private_boarding_locations']) expect(schemas).not.toHaveProperty(key);
    expect(JSON.stringify(schemas)).toContain('additionalProperties');
  });
});
