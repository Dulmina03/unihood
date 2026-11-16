import { z } from 'zod';

// Strict, minimal liveness contract. Database readiness is a separate concern.
export const HealthResponseSchema = z.strictObject({
  status: z.literal('ok'),
  service: z.literal('unihood-api'),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// Readiness is separate from process liveness and contains no connection details.
export const ReadyResponseSchema = z.strictObject({status: z.literal('ready'), service: z.literal('unihood-api'), checks: z.strictObject({database: z.literal('ready')})});
export const NotReadyResponseSchema = z.strictObject({status: z.literal('not_ready'), service: z.literal('unihood-api'), checks: z.strictObject({database: z.literal('unavailable')})});
export const ReadinessResponseSchema = z.discriminatedUnion('status', [ReadyResponseSchema, NotReadyResponseSchema]);
export type ReadinessResponse = z.infer<typeof ReadinessResponseSchema>;

