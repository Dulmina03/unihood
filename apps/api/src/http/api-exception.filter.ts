import { randomUUID } from 'node:crypto';
import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { ErrorResponseSchema, ReadinessResponseSchema } from '@unihood/contracts';
export const requestIdKey = Symbol('unihood.requestId');
const errors = {
  400: ['BAD_REQUEST', 'The request is invalid.'], 401: ['UNAUTHORIZED', 'Authorization is required.'],
  403: ['FORBIDDEN', 'This action is not permitted.'], 404: ['NOT_FOUND', 'The resource was not found.'],
  413: ['PAYLOAD_TOO_LARGE', 'The request exceeds the allowed size.'],
  409: ['CONFLICT', 'The request conflicts with the current state.'], 422: ['UNPROCESSABLE_ENTITY', 'The request cannot be processed.'],
  429: ['RATE_LIMITED', 'Too many requests.'], 503: ['SERVICE_UNAVAILABLE', 'The service is unavailable.'],
} as const;
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp(), request = http.getRequest(), response = http.getResponse();
    const candidate = exception instanceof HttpException ? exception.getStatus() : 500;
    const status = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599 ? candidate : 500;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    // Preserve UNI-002's intentionally separate monitor/readiness protocol, including its 503 outcome.
    const readiness = ReadinessResponseSchema.safeParse(raw);
    if (status === 503 && readiness.success && readiness.data.status === 'not_ready') {
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('X-Request-Id', request[requestIdKey] ?? randomUUID());
      response.status(503).json(readiness.data); return;
    }
    const [code, message] = errors[status as keyof typeof errors] ?? ['INTERNAL_ERROR', 'An internal error occurred.'];
    const validation = status === 400 && raw && typeof raw === 'object' && 'contractValidation' in raw && raw.contractValidation === true && 'details' in raw;
    // Re-parse details using a strict public schema; never echo raw Nest/Zod/SQL/parser errors.
    const details = validation ? ErrorResponseSchema.shape.error.shape.details.safeParse(raw.details) : null;
    const body = ErrorResponseSchema.parse({error: {code: validation ? 'VALIDATION_FAILED' : code,
      message: validation ? 'The request failed validation.' : message, details: details?.success ? details.data : [],
      requestId: request[requestIdKey] ?? randomUUID()}});
    response.setHeader('X-Request-Id', body.error.requestId);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type','application/json; charset=utf-8');
    response.status(status).json(body);
  }
}
