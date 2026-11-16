import { afterEach, describe, expect, it, vi } from 'vitest';
import UniversityPage from '../src/app/u/[slug]/page';
vi.mock('next/navigation', () => ({notFound: () => {throw new Error('NEXT_NOT_FOUND');}, useRouter: () => ({push: vi.fn(), refresh: vi.fn()})}));
const row = {id: '10000000-0000-4000-8000-000000000001', slug: 'synthetic-demo', name: 'Synthetic Demo', city: 'Synthetic City', country: 'ZZ', provenance: {dataKind: 'SYNTHETIC', sourceLabel: 'Synthetic fixture', verifiedAt: null}};
afterEach(() => vi.unstubAllGlobals());
describe('QR university route', () => {
  it('resolves the slug from awaited route params and passes validated data to the guest landing', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({items: [row], page: {page: 1, pageSize: 20, hasNextPage: false}}));
    vi.stubGlobal('fetch', fetcher);
    const result = await UniversityPage({params: Promise.resolve({slug: row.slug})});
    expect(result.props.university).toEqual(row);
    expect(String(fetcher.mock.calls[0][0])).toContain('slug=synthetic-demo');
  });
  it('rejects malformed slugs without upstream requests', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(UniversityPage({params: Promise.resolve({slug: 'INVALID'})})).rejects.toThrow('NEXT_NOT_FOUND');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('returns not-found only on a successful empty lookup', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({items: [], page: {page: 1, pageSize: 20, hasNextPage: false}})));
    await expect(UniversityPage({params: Promise.resolve({slug: 'unknown-university'})})).rejects.toThrow('NEXT_NOT_FOUND');
  });
  it('renders a retry state, without calling a network failure an invalid QR link', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('PRIVATE_CANARY')));
    const result = await UniversityPage({params: Promise.resolve({slug: 'synthetic-demo'})});
    expect(result.props.unavailableSlug).toBe('synthetic-demo');
    expect(result.props).not.toHaveProperty('university');
    expect(JSON.stringify(result.props)).not.toContain('PRIVATE_CANARY');
  });
});
