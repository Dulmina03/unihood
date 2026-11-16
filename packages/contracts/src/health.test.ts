import { describe, expect, it } from 'vitest';
import { HealthResponseSchema, ReadinessResponseSchema } from './index';
describe('public liveness contract', () => {
  it('accepts liveness without claiming database readiness', () => {
    expect(HealthResponseSchema.parse({status: 'ok', service: 'unihood-api'})).toEqual({status: 'ok', service: 'unihood-api'});
  });
  it('rejects extra fields and invalid status', () => {
    expect(HealthResponseSchema.safeParse({status: 'ok', service: 'unihood-api', databaseUrl: 'private'}).success).toBe(false);
    expect(HealthResponseSchema.safeParse({status: 'ready', service: 'unihood-api'}).success).toBe(false);
  });
});

it('rejects inconsistent readiness and nested private connection fields', () => {
  expect(ReadinessResponseSchema.safeParse({ status: 'ready', service: 'unihood-api', checks: {database: 'unavailable'} }).success).toBe(false);
  expect(ReadinessResponseSchema.safeParse({ status: 'not_ready', service: 'unihood-api', checks: {database: 'unavailable', url: 'private'} }).success).toBe(false);
});
