import { ApiContract } from './openapi/operation';
import { Controller, Get } from '@nestjs/common';
import { HealthResponseSchema, type HealthResponse } from '@unihood/contracts';
@Controller(['health', 'api/v1/health'])
export class HealthController {
  @Get()
  @ApiContract({summary: 'Process liveness (independent of database)', responses: {'200': {schema: 'HealthResponse', description: 'Process is live'}, '500': {schema: 'ErrorResponse', description: 'Internal error'}}})
  getHealth(): HealthResponse {
    return HealthResponseSchema.parse({ status: 'ok', service: 'unihood-api' });
  }
}
