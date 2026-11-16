import { PublicIdSchema, PublicPoiDetailSchema, ErrorResponseSchema, type PublicPoiDetail } from '@unihood/contracts';
export type PoiDetailResult = {status: 'found'; item: PublicPoiDetail} | {status: 'missing' | 'unavailable'};
export async function publicPoiDetail(id: string, options: {baseUrl?: string; fetcher?: typeof fetch} = {}): Promise<PoiDetailResult> {
  if (!PublicIdSchema.safeParse(id).success) return {status: 'missing'};
  try {
    const base = new URL(options.baseUrl ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001/api/v1');
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error();
    const url = new URL(`${base.pathname.replace(/\/$/, '')}/places/${id}`, base.origin);
    const response = await (options.fetcher ?? fetch)(url, {cache: 'no-store', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(3500), headers: {Accept: 'application/json'}});
    if (response.status === 404) return {status: 'missing'};
    if (!response.ok) throw new Error();
    const item = PublicPoiDetailSchema.parse(await response.json());
    if (item.id !== id) throw new Error();
    return {status: 'found', item};
  } catch {return {status: 'unavailable'};}
}
export async function proxyPoiDetail(id: string, request: Request, options: Parameters<typeof publicPoiDetail>[1] = {}) {
  const requestId = crypto.randomUUID(), headers = {'Cache-Control': 'no-store', 'X-Request-Id': requestId};
  const invalid = !PublicIdSchema.safeParse(id).success || Boolean(new URL(request.url).search);
  const result = invalid ? null : await publicPoiDetail(id, options);
  if (result?.status === 'found') return Response.json(result.item, {headers});
  const status = invalid ? 400 : result?.status === 'missing' ? 404 : 503;
  return Response.json(ErrorResponseSchema.parse({error: {code: status === 400 ? 'VALIDATION_FAILED' : status === 404 ? 'NOT_FOUND' : 'SERVICE_UNAVAILABLE', message: status === 400 ? 'The public place request is invalid.' : status === 404 ? 'This public place is not available.' : 'Public place details are temporarily unavailable.', details: [], requestId}}), {status, headers});
}
