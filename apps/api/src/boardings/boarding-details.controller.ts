import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import {
  BoardingComparisonQuerySchema,
  PublicIdSchema,
  type BoardingComparisonQuery,
} from '@unihood/contracts';
import { ContractValidationPipe } from '../http/contract-validation.pipe';
import { ApiContract } from '../openapi/operation';
import { BoardingDetailsService } from './boarding-details.service';

const errors = {
  '400': { schema: 'ErrorResponse', description: 'Invalid request parameters' },
  '404': { schema: 'ErrorResponse', description: 'Boarding not found or not eligible for public location / essentials' },
  '500': { schema: 'ErrorResponse', description: 'Internal server error' },
  '503': { schema: 'ErrorResponse', description: 'Service temporarily unavailable' },
} as const;

@Controller('api/v1/boardings')
export class BoardingDetailsController {
  constructor(private readonly service: BoardingDetailsService) {}

  @Get('compare')
  @Header('Cache-Control', 'no-store')
  @ApiContract({
    summary: 'Editorial comparison matrix for 1 to 4 boardings; public map listings show exact entrance & nearby essentials summary, while area/hidden boardings disclose no proximity or geometry',
    querySchema: 'BoardingComparisonQuery',
    responses: {
      '200': { schema: 'BoardingComparisonResponse', description: 'Structured comparison items with explicit unknown/not-shared values' },
      ...errors,
    },
  })
  compare(@Query(new ContractValidationPipe(BoardingComparisonQuerySchema)) query: BoardingComparisonQuery) {
    return this.service.compare(query);
  }

  @Get(':id/nearby-essentials')
  @Header('Cache-Control', 'no-store')
  @ApiContract({
    summary: 'Factual nearby essentials for eligible precise public map boardings with per-POI walking access from the public entrance; strictly refuses area-only and hidden boardings to prevent proximity inference',
    responses: {
      '200': { schema: 'BoardingNearbyEssentialsResponse', description: 'Nearby public POIs with straight-line distance from public entrance' },
      ...errors,
    },
  })
  nearbyEssentials(@Param('id', new ContractValidationPipe(PublicIdSchema)) id: string) {
    return this.service.nearbyEssentials(id);
  }
}
