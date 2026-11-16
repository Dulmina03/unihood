import { afterEach, describe, expect, it, vi } from 'vitest';
import { UniversityPageSchema } from '@unihood/contracts';
import { readDirectory } from '../src/lib/explore/directory';
const provenance = {dataKind: 'SYNTHETIC', sourceLabel: 'Synthetic test fixture', verifiedAt: null};
const university = {id: '10000000-0000-4000-8000-000000000001', slug: 'synthetic-demo', name: 'Synthetic Demo', city: 'Synthetic City', country: 'ZZ', provenance};
const page = (number: number, more: boolean, items: unknown[]) => ({items, page: {page: number, pageSize: 100, hasNextPage: more}});
afterEach(() => vi.unstubAllGlobals());
describe('public directory loader', () => {
  it('follows pagination, validates each page and omits credentials', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(page(1, true, []))).mockResolvedValueOnce(Response.json(page(2, false, [university])));
    vi.stubGlobal('fetch', fetcher);
    const signal = new AbortController().signal;
    expect(await readDirectory('/api/universities', UniversityPageSchema, signal)).toEqual([university]);
    expect(fetcher).toHaveBeenLastCalledWith('/api/universities?page=2&pageSize=100', {signal, credentials: 'omit', cache: 'no-store'});
  });
  it.each([Response.json({privateLocation: [1, 2]}), Response.json(page(2, false, [])), new Response('', {status: 503})])('fails closed for invalid payload/page or outage', async (response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(readDirectory('/api/universities', UniversityPageSchema, new AbortController().signal)).rejects.toThrow();
  });
  it('forwards cancellation and does not invent fallback records', async () => {
    const controller = new AbortController(); controller.abort();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));
    await expect(readDirectory('/api/universities', UniversityPageSchema, controller.signal)).rejects.toThrow('Aborted');
  });
});
