// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { universityData, UniversityApiError } from '../src/lib/universities/api';
import { proxyUniversity } from '../src/lib/universities/proxy';
const uid = '10000000-0000-4000-8000-000000000001';
const cid = '20000000-0000-4000-8000-000000000001';
const provenance = {dataKind: 'SYNTHETIC', sourceLabel: 'Synthetic test', verifiedAt: null};
const row = {id: uid, slug: 'synthetic-demo', name: 'Synthetic Demo', city: 'Synthetic City', country: 'ZZ', provenance};
const page = {items: [row], page: {page: 1, pageSize: 20, hasNextPage: false}};
afterEach(() => {vi.unstubAllGlobals(); vi.unstubAllEnvs();});
describe('read-only university API adapter', () => {
  it('uses a configured origin, bounded validated params, timeout/no-store and no identity forwarding', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(page));
    const result = await universityData('universities', undefined, new URLSearchParams({slug: 'synthetic-demo'}), {baseUrl: 'https://api.example.test/api/v1/', fetcher});
    expect(result).toEqual({missing: false, data: page});
    expect(String(fetcher.mock.calls[0][0])).toBe('https://api.example.test/api/v1/universities?slug=synthetic-demo');
    expect(fetcher.mock.calls[0][1]).toMatchObject({cache: 'no-store', redirect: 'error', headers: {Accept: 'application/json'}});
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty('credentials');
  });
  it.each(['page=1&page=2', 'pageSize=101', 'slug=UPPER', 'target=http://private', 'ownerId=PRIVATE_CANARY', '__proto__=PRIVATE_CANARY'])('rejects invalid/repeated query before fetch: %s', async (query) => {
    const fetcher = vi.fn();
    await expect(universityData('universities', undefined, new URLSearchParams(query), {fetcher})).rejects.toMatchObject({kind: 'invalid'});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects invalid IDs before fetch and validates parent projections', async () => {
    const fetcher = vi.fn();
    await expect(universityData('campuses', '../private', new URLSearchParams(), {fetcher})).rejects.toMatchObject({kind: 'invalid'});
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(Response.json({...page, items: [{id: cid, universityId: cid, name: 'Synthetic Campus', publicArea: null, provenance}]}));
    await expect(universityData('campuses', uid, new URLSearchParams(), {fetcher})).rejects.toMatchObject({kind: 'unavailable'});
  });
  it.each([
    {...page, items: [{...row, privateAddress: 'PRIVATE_CANARY'}]},
    {...page, items: [{...row, slug: 'other-university'}]},
    {...page, page: {...page.page, page: 2}},
    {...page, page: {...page.page, pageSize: 100}},
  ])('rejects unsafe or inconsistent upstream data', async (body) => {
    await expect(universityData('universities', undefined, new URLSearchParams({slug: 'synthetic-demo'}), {fetcher: vi.fn().mockResolvedValue(Response.json(body))})).rejects.toBeInstanceOf(UniversityApiError);
  });
  it.each([500, 503, 302])('treats upstream %s as unavailable, not an unknown slug', async (status) => {
    await expect(universityData('universities', undefined, new URLSearchParams(), {fetcher: vi.fn().mockResolvedValue(new Response('PRIVATE_CANARY', {status}))})).rejects.toMatchObject({kind: 'unavailable'});
  });
  it('distinguishes missing children from network failure and rejects bad config', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, {status: 404}));
    expect(await universityData('campuses', uid, new URLSearchParams(), {fetcher})).toEqual({missing: true});
    await expect(universityData('universities', undefined, new URLSearchParams(), {baseUrl: 'file:///etc/private', fetcher})).rejects.toMatchObject({kind: 'unavailable'});
    await expect(universityData('universities', undefined, new URLSearchParams(), {fetcher: vi.fn().mockRejectedValue(new Error('SECRET database URL'))})).rejects.toThrow('University information is unavailable.');
  });
  it('returns safe errors and server IDs without reflecting upstream or inbound headers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('PRIVATE_CANARY postgres://private')));
    const response = await proxyUniversity('universities', new Request('http://web.test/api/universities', {headers: {'X-User-Id': 'PRIVATE_CANARY', 'X-Request-Id': 'PRIVATE_CANARY'}}));
    expect(response.status).toBe(503); expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).not.toMatch(/PRIVATE_CANARY|postgres/);
    const invalid = await proxyUniversity('universities', new Request('http://web.test/api/universities?PRIVATE_CANARY=x'));
    expect(invalid.status).toBe(400); expect(await invalid.text()).not.toContain('PRIVATE_CANARY');
  });
});
