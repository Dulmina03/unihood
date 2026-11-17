import { BoardingComparisonQuerySchema, BoardingComparisonResponseSchema, ErrorResponseSchema } from '@unihood/contracts';

export async function proxyBoardingCompare(request: Request) {
  const requestId = crypto.randomUUID();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': requestId };
  const params = new URL(request.url).searchParams;
  const input = BoardingComparisonQuerySchema.safeParse({ ids: params.get('ids') ?? '' });
  if (!input.success) {
    return Response.json(ErrorResponseSchema.parse({
      error: { code: 'VALIDATION_FAILED', message: 'Between 1 and 4 valid boarding IDs must be specified for comparison.', details: [], requestId },
    }), { status: 400, headers });
  }

  try {
    const base = new URL(process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001/api/v1');
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error();
    const url = new URL(`${base.pathname.replace(/\/$/, '')}/boardings/compare`, base.origin);
    url.searchParams.set('ids', input.data.ids);
    const response = await fetch(url, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error();
    const data = BoardingComparisonResponseSchema.parse(await response.json());
    return Response.json(data, { headers });
  } catch {
    return Response.json(ErrorResponseSchema.parse({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Boarding comparison is temporarily unavailable.', details: [], requestId },
    }), { status: 503, headers });
  }
}
