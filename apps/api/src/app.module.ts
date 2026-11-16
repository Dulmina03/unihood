import { IDENTITY_PROVIDER, PERMISSION_SERVICE } from './identity/tokens';
import { OpenApiService } from './openapi/openapi.service';
import { OpenApiController } from './openapi/openapi.controller';
import { APP_GUARD } from '@nestjs/core';
import { SyntheticActors } from './identity/synthetic-actors';
import { ProtectedBoundaryGuard } from './identity/protected-boundary.guard';
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseReadinessService } from './database-readiness.service';
import { ReadinessController } from './readiness.controller';
@Module({ controllers: [HealthController, ReadinessController, OpenApiController], providers: [DatabaseReadinessService, OpenApiService, {provide: SyntheticActors, useFactory: () => new SyntheticActors()}, {provide: IDENTITY_PROVIDER, useExisting: SyntheticActors}, {provide: PERMISSION_SERVICE, useExisting: SyntheticActors}, {provide: APP_GUARD, useClass: ProtectedBoundaryGuard}] })
export class AppModule {}
