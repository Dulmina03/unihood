import {Body,Controller,Get,Header,HttpCode,Inject,Post,Query,Req,UseGuards} from '@nestjs/common';
import {PoiCorrectionInputSchema,ContributionHistoryQuerySchema,type IdentityProvider} from '@unihood/contracts';
import {IDENTITY_PROVIDER} from '../identity/tokens';
import {RequirePermission} from '../identity/protected-boundary.guard';
import {DuplicateRateGuard} from '../duplicates/duplicate.controller';
import {ContractValidationPipe} from '../http/contract-validation.pipe';
import {ApiContract} from '../openapi/operation';
import {PoiCorrectionService} from './poi-correction.service';
const errors={'400':{schema:'ErrorResponse',description:'Invalid or future-dated synthetic input'},'401':{schema:'ErrorResponse',description:'Contributing actor required; deployed mode closed'},'403':{schema:'ErrorResponse',description:'Not authorized'},'404':{schema:'ErrorResponse',description:'Current public synthetic POI unavailable'},'409':{schema:'ErrorResponse',description:'Changed idempotency intent or category unavailable'},'429':{schema:'ErrorResponse',description:'Shared bounded simulator budget'},'500':{schema:'ErrorResponse',description:'Internal error'},'503':{schema:'ErrorResponse',description:'Unavailable; retry unchanged request'}} as const;
@Controller('api/v1/contributions')
export class PoiCorrectionController{
 constructor(private readonly service:PoiCorrectionService,@Inject(IDENTITY_PROVIDER)private readonly identity:IdentityProvider){}
 @Post('correction') @HttpCode(200) @Header('Cache-Control','no-store') @RequirePermission({action:'suggest'}) @UseGuards(DuplicateRateGuard)
 @ApiContract({summary:'Hold a synthetic current-public-POI correction; never edits canonical facts or boardings',protected:true,bodySchema:'PoiCorrectionInput',responses:{'200':{schema:'PoiCorrectionReceipt',description:'Own held correction receipt; unavailable source ID suppressed'},...errors}})
 async create(@Req()request:unknown,@Body(new ContractValidationPipe(PoiCorrectionInputSchema))input:unknown){return this.service.create(await this.identity.resolveRequestActor(request),input);}
 @Get() @Header('Cache-Control','no-store') @RequirePermission({action:'suggest'}) @UseGuards(DuplicateRateGuard)
 @ApiContract({summary:'Own minimal held contribution status/history only; no private payload, geometry, contact or other actors',protected:true,querySchema:'ContributionHistoryQuery',responses:{'200':{schema:'ContributionHistoryPage',description:'Paginated own recorded submissions; no fabricated moderation decisions'},...errors}})
 async history(@Req()request:unknown,@Query(new ContractValidationPipe(ContributionHistoryQuerySchema))query:unknown){return this.service.history(await this.identity.resolveRequestActor(request),query);}
}
