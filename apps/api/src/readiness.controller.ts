import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { ReadinessResponseSchema, type ReadinessResponse } from '@unihood/contracts';
import { DatabaseReadinessService } from './database-readiness.service';

@Controller(['health/ready', 'api/v1/health/ready'])
export class ReadinessController {
  constructor(private readonly database: DatabaseReadinessService) {}

  @Get()
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
