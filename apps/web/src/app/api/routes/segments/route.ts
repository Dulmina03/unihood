import { PedestrianRouteSegmentsResultUnion, PedestrianRouteSegmentsRequestSchema, ErrorResponseSchema } from '@unihood/contracts';

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': requestId };
  const params = new URL(request.url).searchParams;
  const input = PedestrianRouteSegmentsRequestSchema.safeParse(Object.fromEntries(params));
  if (!input.success || Array.from(params.keys()).some((k) => params.getAll(k).length > 1)) {
    return Response.json(
      ErrorResponseSchema.parse({ error: { code: 'VALIDATION_FAILED', message: 'The route segments request is invalid.', details: [], requestId } }),
      { status: 400, headers },
    );
  }
  try {
    const base = new URL(process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001/api/v1');
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error();
    const url = new URL(base.pathname.replace(/\/$/, '') + '/routes/segments', base.origin);
    url.search = new URLSearchParams(input.data).toString();
    const response = await fetch(url, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(3500) });
    if (!response.ok) throw new Error();
    const data = PedestrianRouteSegmentsResultUnion.parse(await response.json());
    return Response.json(data, { headers });
  } catch {
    return Response.json(
      ErrorResponseSchema.parse({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Route segments are temporarily unavailable.', details: [], requestId } }),
      { status: 503, headers },
    );
  }
}
