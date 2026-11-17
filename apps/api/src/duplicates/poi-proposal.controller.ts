import { Body,Controller,Header,HttpCode,HttpException,Inject,Post,Req } from '@nestjs/common';
import { PublicPoiProposalInputSchema,PublicPoiProposalResultSchema,type IdentityProvider } from '@unihood/contracts';
import { RequirePermission } from '../identity/protected-boundary.guard';
import { IDENTITY_PROVIDER } from '../identity/tokens';
import { ContractValidationPipe } from '../http/contract-validation.pipe';
import { ApiContract } from '../openapi/operation';
import { DuplicateRateGuard } from './duplicate.controller';
import { UseGuards } from '@nestjs/common';
import { PoiSubmissionService } from './poi-submission.service';
@Controller('api/v1/places')
export class PoiProposalController{
 private active=0;
 constructor(private readonly service:PoiSubmissionService,@Inject(IDENTITY_PROVIDER) private readonly identity:IdentityProvider){}
 @Post('proposals') @HttpCode(200) @Header('Cache-Control','no-store')
 @RequirePermission({action:'suggest'}) @UseGuards(DuplicateRateGuard)
 @ApiContract({summary:'Local/test synthetic public POI proposal only; held, never published or owner-verified',protected:true,bodySchema:'PublicPoiProposalInput',responses:{
  '200':{schema:'PublicPoiProposalResult',description:'Held own-proposal receipt or review/existing-public-record outcome; not publication'},
  '400':{schema:'ErrorResponse',description:'Invalid/unsupported fields'},'401':{schema:'ErrorResponse',description:'Contributing actor required; staging/production remain denied'},
  '403':{schema:'ErrorResponse',description:'Actor/environment/declaration not permitted'},'409':{schema:'ErrorResponse',description:'Idempotency payload conflict, unavailable category or changed selection'},
  '429':{schema:'ErrorResponse',description:'Shared local 20/minute budget or three active proposal requests'},'500':{schema:'ErrorResponse',description:'Internal error'},'503':{schema:'ErrorResponse',description:'Proposal unavailable; retry same key/body'}}})
 async create(@Req() request:unknown,@Body(new ContractValidationPipe(PublicPoiProposalInputSchema)) input:unknown){
  if(this.active>=3)throw new HttpException('Rate limit',429);this.active++;
  try{return PublicPoiProposalResultSchema.parse(await this.service.prepare(await this.identity.resolveRequestActor(request),input));}
  finally{this.active--;}
 }
}
