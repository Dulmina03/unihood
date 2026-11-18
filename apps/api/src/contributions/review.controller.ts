import {Body,Controller,Header,HttpCode,Inject,Post,Req,UseGuards} from '@nestjs/common';
import {ReviewInputSchema,type IdentityProvider} from '@unihood/contracts';
import {IDENTITY_PROVIDER} from '../identity/tokens';
import {RequirePermission} from '../identity/protected-boundary.guard';
import {DuplicateRateGuard} from '../duplicates/duplicate.controller';
import {ContractValidationPipe} from '../http/contract-validation.pipe';
import {ApiContract} from '../openapi/operation';
import {ReviewService} from './review.service';
const errors={'400':{schema:'ErrorResponse',description:'Invalid or sensitive synthetic review input'},'401':{schema:'ErrorResponse',description:'Contributing actor required; deployed mode closed'},'403':{schema:'ErrorResponse',description:'Property managers cannot review their own properties; not authorized'},'404':{schema:'ErrorResponse',description:'Current public synthetic target unavailable'},'409':{schema:'ErrorResponse',description:'Changed idempotency intent'},'429':{schema:'ErrorResponse',description:'Shared bounded simulator budget'},'500':{schema:'ErrorResponse',description:'Internal error'},'503':{schema:'ErrorResponse',description:'Unavailable; retry unchanged request'}} as const;
@Controller('api/v1/contributions')
export class ReviewController{
 constructor(private readonly service:ReviewService,@Inject(IDENTITY_PROVIDER)private readonly identity:IdentityProvider){}
 @Post('review') @HttpCode(200) @Header('Cache-Control','no-store') @RequirePermission({action:'suggest'}) @UseGuards(DuplicateRateGuard)
 @ApiContract({summary:'Hold a synthetic structured review; property-manager self-review conflicts are rejected server-side',protected:true,bodySchema:'ReviewInput',responses:{'200':{schema:'ReviewReceipt',description:'Own held review receipt; never published or public-trust influencing'},...errors}})
 async create(@Req()request:unknown,@Body(new ContractValidationPipe(ReviewInputSchema))input:unknown){return this.service.create(await this.identity.resolveRequestActor(request),input);}
}
