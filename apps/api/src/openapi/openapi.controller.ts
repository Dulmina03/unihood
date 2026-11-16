import { Controller, Get, Header } from '@nestjs/common';
import { OpenApiService } from './openapi.service';
import { ApiContract } from './operation';
@Controller('api/v1/openapi.json')
export class OpenApiController {
  constructor(private readonly openapi: OpenApiService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiContract({summary: 'Generated OpenAPI 3.1 baseline', responses: {'200': {description: 'OpenAPI document'}, '500': {schema: 'ErrorResponse', description: 'Internal error'}}})
  getDocument() {return this.openapi.document();}
}
