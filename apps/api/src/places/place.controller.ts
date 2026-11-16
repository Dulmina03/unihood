import { Controller, Get, Header, Query } from '@nestjs/common';
import { PoiCategoryQuerySchema, PoiListQuerySchema, type PoiListQuery } from '@unihood/contracts';
import { ContractValidationPipe } from '../http/contract-validation.pipe';
import { ApiContract } from '../openapi/operation';
import { PlaceService } from './place.service';
const errors = {'400': {schema: 'ErrorResponse', description: 'Invalid or missing bounded query'}, '500': {schema: 'ErrorResponse', description: 'Internal error'}, '503': {schema: 'ErrorResponse', description: 'Directory unavailable'}} as const;
@Controller('api/v1')
export class PlaceController {
  constructor(private readonly service: PlaceService) {}
  @Get('places')
  @Header('Cache-Control', 'no-store')
  @ApiContract({summary: 'Read-only eligible public POIs in a bounded bbox; no boarding geometry or distances', querySchema: 'PoiListQuery', responses: {'200': {schema: 'PoiPage', description: 'Stable name/id or newest/id page; one extra row determines hasNextPage'}, ...errors}})
  list(@Query(new ContractValidationPipe(PoiListQuerySchema)) query: PoiListQuery) {return this.service.list(query);}
  @Get('place-categories')
  @Header('Cache-Control', 'no-store')
  @ApiContract({summary: 'Eligible public POI categories within the required bbox', querySchema: 'PoiCategoryQuery', responses: {'200': {schema: 'PoiCategoryPage', description: 'At most 100 category codes; metadata truncation is explicit'}, ...errors}})
  categories(@Query(new ContractValidationPipe(PoiCategoryQuerySchema)) query: {bbox: string}) {return this.service.categories(query.bbox);}
}
