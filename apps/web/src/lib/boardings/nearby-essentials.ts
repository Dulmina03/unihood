import { BoardingNearbyEssentialsResponseSchema, ErrorResponseSchema, PublicIdSchema } from '@unihood/contracts';

export async function proxyNearbyEssentials(request: Request, id: string) {
  void request;
  const requestId = crypto.randomUUID();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': requestId };
  if (!PublicIdSchema.safeParse(id).success) {
    return Response.json(ErrorResponseSchema.parse({
      error: { code: 'VALIDATION_FAILED', message: 'The boarding ID is invalid.', details: [], requestId },
    }), { status: 400, headers });
  }

  try {
    const base = new URL(process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001/api/v1');
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error();
    const url = new URL(`${base.pathname.replace(/\/$/, '')}/boardings/${id.toLowerCase()}/nearby-essentials`, base.origin);
    const response = await fetch(url, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(3500) });
    if (response.status === 404) {
      return Response.json(ErrorResponseSchema.parse({
        error: { code: 'NOT_FOUND', message: 'Nearby essentials are only available for owner-consented public map listings.', details: [], requestId },
      }), { status: 404, headers });
    }
    if (!response.ok) throw new Error();
    const data = BoardingNearbyEssentialsResponseSchema.parse(await response.json());
    return Response.json(data, { headers });
  } catch {
    return Response.json(ErrorResponseSchema.parse({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Nearby essentials are temporarily unavailable.', details: [], requestId },
    }), { status: 503, headers });
  }
}
