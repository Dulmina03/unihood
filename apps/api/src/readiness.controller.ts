import { ApiContract } from './openapi/operation';
import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { ReadinessResponseSchema, type ReadinessResponse } from '@unihood/contracts';
import { DatabaseReadinessService } from './database-readiness.service';

@Controller(['health/ready', 'api/v1/health/ready'])
export class ReadinessController {
  constructor(private readonly database: DatabaseReadinessService) {}

  @Get()
  @ApiContract({summary: 'Database readiness; legacy flat monitor protocol', responses: {'200': {schema: 'ReadyResponse', description: 'Database is ready'}, '503': {schema: 'NotReadyResponse', description: 'Database is unavailable or unmigrated'}, '500': {schema: 'ErrorResponse', description: 'Internal error'}}})
  @Header('Cache-Control', 'no-store')
  async getReadiness(): Promise<ReadinessResponse> {
    const ready = await this.database.isReady();
    const body = ReadinessResponseSchema.parse({
      status: ready ? 'ready' : 'not_ready', service: 'unihood-api',
      checks: { database: ready ? 'ready' : 'unavailable' },
    });
    if (!ready) throw new ServiceUnavailableException(body);
    return body;
  }
}
