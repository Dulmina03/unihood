import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from './index';
describe('public liveness contract', () => {
  it('accepts liveness without claiming database readiness', () => {
    expect(HealthResponseSchema.parse({status: 'ok', service: 'unihood-api'})).toEqual({status: 'ok', service: 'unihood-api'});
  });
  it('rejects extra fields and invalid status', () => {
    expect(HealthResponseSchema.safeParse({status: 'ok', service: 'unihood-api', databaseUrl: 'private'}).success).toBe(false);
    expect(HealthResponseSchema.safeParse({status: 'ready', service: 'unihood-api'}).success).toBe(false);
  });
});
