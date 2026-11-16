import { UniversityPageSchema, CampusPageSchema, CampusEntrancePageSchema, UniversityListQuerySchema, CampusListQuerySchema, EntranceListQuerySchema, PublicIdSchema } from '@unihood/contracts';
export type Resource = 'universities' | 'campuses' | 'entrances';
export class UniversityApiError extends Error {
  constructor(readonly kind: 'invalid' | 'unavailable') {super(kind === 'invalid' ? 'Invalid selection.' : 'University information is unavailable.');}
}
export function parseQuery(resource: Resource, params: URLSearchParams) {
  const values: Record<string, string> = Object.create(null);
  for (const [key, value] of params) {if (Object.hasOwn(values, key)) throw new UniversityApiError('invalid'); values[key] = value;}
  const schemas = {universities: UniversityListQuerySchema, campuses: CampusListQuerySchema, entrances: EntranceListQuerySchema};
  const result = schemas[resource].safeParse(values);
  if (!result.success) throw new UniversityApiError('invalid');
  return result.data;
}
// Server callers only: base configuration is never derived from incoming URLs, cookies or headers.
export async function universityData(resource: Resource, id: string | undefined, params: URLSearchParams, options: {baseUrl?: string; fetcher?: typeof fetch} = {}) {
  const query = parseQuery(resource, params);
  if (resource !== 'universities' && !PublicIdSchema.safeParse(id).success) throw new UniversityApiError('invalid');
  try {
    const base = new URL(options.baseUrl ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001/api/v1');
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error('Invalid base');
    const suffix = resource === 'universities' ? 'universities' : `universities/${id}/${resource}`;
    const url = new URL(`${base.pathname.replace(/\/$/, '')}/${suffix}`, base.origin);
    for (const [key, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(key, value);
    const response = await (options.fetcher ?? fetch)(url, {cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(3500), headers: {Accept: 'application/json'}});
    if (response.status === 404 && resource !== 'universities') return {missing: true as const};
    if (!response.ok) throw new Error('Upstream unavailable');
    const raw: unknown = await response.json();
    const data = resource === 'universities' ? UniversityPageSchema.parse(raw) : resource === 'campuses' ? CampusPageSchema.parse(raw) : CampusEntrancePageSchema.parse(raw);
    if (data.page.page !== Number(query.page ?? 1) || data.page.pageSize !== Number(query.pageSize ?? 20)) throw new Error('Page mismatch');
    if (resource === 'universities' && 'slug' in query && query.slug && data.items.some((row) => !('slug' in row) || row.slug !== query.slug)) throw new Error('Slug mismatch');
    if (resource === 'campuses' && data.items.some((row) => !('universityId' in row) || row.universityId !== id)) throw new Error('Parent mismatch');
    if (resource === 'entrances' && 'campusId' in query && query.campusId && data.items.some((row) => !('campusId' in row) || row.campusId !== query.campusId)) throw new Error('Campus mismatch');
    return {missing: false as const, data};
  } catch {throw new UniversityApiError('unavailable');}
}
