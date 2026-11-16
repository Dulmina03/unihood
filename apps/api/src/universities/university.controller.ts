import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { UniversityListQuerySchema, CampusListQuerySchema, EntranceListQuerySchema, UniversityPathSchema,
  type UniversityListQuery, type CampusListQuery, type EntranceListQuery } from '@unihood/contracts';
import { ContractValidationPipe } from '../http/contract-validation.pipe';
import { ApiContract } from '../openapi/operation';
import { UniversityService } from './university.service';
const errors = {'400': {schema: 'ErrorResponse', description: 'Invalid parameters'}, '500': {schema: 'ErrorResponse', description: 'Internal error'}, '503': {schema: 'ErrorResponse', description: 'Database unavailable'}} as const;
const missing = {'404': {schema: 'ErrorResponse', description: 'University or campus not publicly available'}} as const;
@Controller('api/v1/universities')
export class UniversityController {
  constructor(private readonly service: UniversityService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiContract({summary: 'Public universities; synthetic demo data is explicitly labeled and local/test only', querySchema: 'UniversityListQuery', responses: {'200': {schema: 'UniversityPage', description: 'Universities ordered by name/id'}, ...errors}})
  universities(@Query(new ContractValidationPipe(UniversityListQuerySchema)) query: UniversityListQuery) {return this.service.universities(query);}
  @Get(':id/campuses')
  @Header('Cache-Control', 'no-store')
  @ApiContract({summary: 'Public campuses belonging to one university', querySchema: 'CampusListQuery', responses: {'200': {schema: 'CampusPage', description: 'Campuses ordered by name/id'}, ...errors, ...missing}})
  campuses(@Param(new ContractValidationPipe(UniversityPathSchema)) path: {id: string}, @Query(new ContractValidationPipe(CampusListQuerySchema)) query: CampusListQuery) {return this.service.campuses(path.id, query);}
  @Get(':id/entrances')
  @Header('Cache-Control', 'no-store')
  @ApiContract({summary: 'Public gates belonging to one university, optionally scoped to one campus', querySchema: 'EntranceListQuery', responses: {'200': {schema: 'CampusEntrancePage', description: 'Gates ordered by name/id; public campus coordinates only'}, ...errors, ...missing}})
  entrances(@Param(new ContractValidationPipe(UniversityPathSchema)) path: {id: string}, @Query(new ContractValidationPipe(EntranceListQuerySchema)) query: EntranceListQuery) {return this.service.entrances(path.id, query);}
}
