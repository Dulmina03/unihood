import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseReadinessService } from './database-readiness.service';
import { ReadinessController } from './readiness.controller';
@Module({ controllers: [HealthController, ReadinessController], providers: [DatabaseReadinessService] })
export class AppModule {}
