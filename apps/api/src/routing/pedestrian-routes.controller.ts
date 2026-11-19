import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { RoutePublicQuerySchema, type RoutePublicQuery } from '@unihood/contracts';
import { ContractValidationPipe } from '../http/contract-validation.pipe';
import { ApiContract } from '../openapi/operation';
import { PedestrianRoutesService } from './pedestrian-routes.service';

// Minimal structural view of the Express response: only the close signal is used,
// so no framework response type or handler bypass is introduced.
type CloseSignalResponse = {
  writableEnded?: boolean;
  on?: (event: 'close', listener: () => void) => unknown;
  off?: (event: 'close', listener: () => void) => unknown;
};

const errors = {
  '400': { schema: 'ErrorResponse', description: 'Invalid route query parameters' },
  '404': { schema: 'ErrorResponse', description: 'Gate or boarding is not publicly eligible for routing' },
  '500': { schema: 'ErrorResponse', description: 'Internal error' },
  '503': { schema: 'ErrorResponse', description: 'Routing unavailable: disabled provider, timeout, provider error, invalid response or cancelled request' },
} as const;

@Controller('api/v1')
export class PedestrianRoutesController {
  constructor(private readonly service: PedestrianRoutesService) {}

  @Get('routes')
  @Header('Cache-Control', 'no-store')
  @ApiContract({
    summary: 'Eligible public campus gate to owner-selected public boarding entrance; synthetic fixture routing only, no safety or verification claim',
    querySchema: 'RoutePublicQuery',
    responses: {
      '200': { schema: 'PublicRouteResponse', description: 'Available synthetic options or a typed no-route/time-context result; unavailable payloads contain no metrics' },
      ...errors,
    },
  })
  async routes(
    @Query(new ContractValidationPipe(RoutePublicQuerySchema)) query: RoutePublicQuery,
    @Res({ passthrough: true }) response: CloseSignalResponse,
  ) {
    const abort = new AbortController();
    const onClose = () => { if (!response.writableEnded) abort.abort(); };
    response?.on?.('close', onClose);
    try {
      return await this.service.route(query, abort.signal);
    } finally {
      response?.off?.('close', onClose);
    }
  }
}
