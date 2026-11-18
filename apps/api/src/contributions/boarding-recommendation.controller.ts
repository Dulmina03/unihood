import { Body, Controller, Header, HttpCode, HttpException, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { BoardingRecommendationInputSchema, type BoardingRecommendationInput, type IdentityProvider } from '@unihood/contracts';
import { IDENTITY_PROVIDER } from '../identity/tokens';
import { RequirePermission } from '../identity/protected-boundary.guard';
import { DuplicateRateGuard } from '../duplicates/duplicate.controller';
import { ContractValidationPipe } from '../http/contract-validation.pipe';
import { ApiContract } from '../openapi/operation';
import { BoardingRecommendationService } from './boarding-recommendation.service';

@Controller('api/v1/contributions')
export class BoardingRecommendationController {
  private active = 0;
  constructor(private readonly service: BoardingRecommendationService, @Inject(IDENTITY_PROVIDER) private readonly identity: IdentityProvider) {}
  @Post('boarding') @HttpCode(200) @Header('Cache-Control', 'no-store')
  @RequirePermission({ action: 'suggest' }) @UseGuards(DuplicateRateGuard)
  @ApiContract({ summary: 'Local/test synthetic boarding recommendation intake; held only, no pin or official facts', protected: true, bodySchema: 'BoardingRecommendationInput', responses: {
    '200': { schema: 'BoardingRecommendationReceipt', description: 'Private own-intake receipt, never publication or canonical creation' },
    '400': { schema: 'ErrorResponse', description: 'Unsupported fields or invalid synthetic draft' },
    '401': { schema: 'ErrorResponse', description: 'Contributor required; production/staging remain denied' },
    '403': { schema: 'ErrorResponse', description: 'Synthetic contribution not authorized' },
    '409': { schema: 'ErrorResponse', description: 'Same idempotency key with changed draft' },
    '429': { schema: 'ErrorResponse', description: 'Shared local contribution budget or concurrency limit' },
    '500': { schema: 'ErrorResponse', description: 'Internal error' },
    '503': { schema: 'ErrorResponse', description: 'Intake unavailable; retry unchanged key and draft' },
  } })
  async create(@Req() request: unknown, @Body(new ContractValidationPipe(BoardingRecommendationInputSchema)) input: BoardingRecommendationInput) {
    if (this.active >= 3) throw new HttpException('Rate limit', 429);
    this.active++;
    try { return await this.service.create(await this.identity.resolveRequestActor(request), input); }
    finally { this.active--; }
  }
}
