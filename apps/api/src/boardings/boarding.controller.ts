import { Controller,Get,Header,Param,Query } from '@nestjs/common';
import { BoardingAdvertisementQuerySchema,PublicIdSchema,type BoardingAdvertisementQuery } from '@unihood/contracts';
import { ContractValidationPipe } from '../http/contract-validation.pipe';
import { ApiContract } from '../openapi/operation';
import { BoardingService } from './boarding.service';
const errors={'400':{schema:'ErrorResponse',description:'Invalid nonspatial request'},'500':{schema:'ErrorResponse',description:'Internal error'},'503':{schema:'ErrorResponse',description:'Advertisements unavailable'}} as const;
@Controller('api/v1/boardings')
export class BoardingController {
 constructor(private readonly service:BoardingService){}
 @Get()
 @Header('Cache-Control','no-store')
 @ApiContract({summary:'Read-only curated synthetic advertisement previews in local/test; no production inventory or spatial search',querySchema:'BoardingAdvertisementQuery',responses:{'200':{schema:'BoardingAdvertisementPage',description:'Stable bounded public page; no raw/private content'},...errors}})
 list(@Query(new ContractValidationPipe(BoardingAdvertisementQuerySchema)) query:BoardingAdvertisementQuery){return this.service.list(query);}
 @Get(':id')
 @Header('Cache-Control','no-store')
 @ApiContract({summary:'Canonical boarding advertisement preview; no contacts/media/geometry or inferred owner claims',responses:{'200':{schema:'PublicBoardingAdvertisement',description:'Current eligible curated preview'},'404':{schema:'ErrorResponse',description:'Not publicly available'},...errors}})
 detail(@Param('id',new ContractValidationPipe(PublicIdSchema)) id:string,@Query(new ContractValidationPipe(BoardingAdvertisementQuerySchema.pick({}))) query:Record<string,never>){void query;return this.service.detail(id);}
}
