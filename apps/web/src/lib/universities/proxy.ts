import { randomUUID } from 'node:crypto';
import { ErrorResponseSchema } from '@unihood/contracts';
import { universityData, UniversityApiError, type Resource } from './api';
export async function proxyUniversity(resource: Resource, request: Request, id?: string) {
  const requestId = randomUUID();
  const headers = {'Cache-Control': 'no-store', 'X-Request-Id': requestId};
  try {
    const result = await universityData(resource, id, new URL(request.url).searchParams);
    if (result.missing) return Response.json(ErrorResponseSchema.parse({error: {code: 'NOT_FOUND', message: 'The university or campus is unavailable.', details: [], requestId}}), {status: 404, headers});
    return Response.json(result.data, {headers});
  } catch (error) {
    const invalid = error instanceof UniversityApiError && error.kind === 'invalid';
    return Response.json(ErrorResponseSchema.parse({error: {code: invalid ? 'VALIDATION_FAILED' : 'SERVICE_UNAVAILABLE', message: invalid ? 'The selection is invalid.' : 'University information is temporarily unavailable.', details: [], requestId}}), {status: invalid ? 400 : 503, headers});
  }
}
