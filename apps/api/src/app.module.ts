import { PoiProposalController } from './duplicates/poi-proposal.controller';
import { PoiSubmissionService } from './duplicates/poi-submission.service';
import { DuplicateController, DuplicateRateGuard } from './duplicates/duplicate.controller';
import { PlaceController } from './places/place.controller';
import { PoiMatcherService } from './duplicates/poi-matcher.service';
import { PlaceService } from './places/place.service';
import { UniversityController } from './universities/university.controller';
import { UniversityService } from './universities/university.service';
import { UniversityRepository } from './universities/university.repository';
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
import { BoardingController } from './boardings/boarding.controller';
import { BoardingService } from './boardings/boarding.service';
@Module({ controllers: [BoardingController, PoiProposalController, DuplicateController, PlaceController, UniversityController, HealthController, ReadinessController, OpenApiController], providers: [BoardingService, PoiSubmissionService, DuplicateRateGuard, PoiMatcherService, PlaceService, UniversityService, UniversityRepository, DatabaseReadinessService, OpenApiService, {provide: SyntheticActors, useFactory: () => new SyntheticActors()}, {provide: IDENTITY_PROVIDER, useExisting: SyntheticActors}, {provide: PERMISSION_SERVICE, useExisting: SyntheticActors}, {provide: APP_GUARD, useClass: ProtectedBoundaryGuard}] })
export class AppModule {}
