import { Body, Controller, Header, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { BoardingDuplicateInputSchema, BoardingResolutionInputSchema, type BoardingDuplicateInput, type BoardingResolutionInput, type IdentityProvider } from '@unihood/contracts';
import { IDENTITY_PROVIDER } from '../identity/tokens';
import { RequirePermission } from '../identity/protected-boundary.guard';
import { DuplicateRateGuard } from '../duplicates/duplicate.controller';
import { ContractValidationPipe } from '../http/contract-validation.pipe';
import { ApiContract } from '../openapi/operation';
import { BoardingDuplicatesService } from './boarding-duplicates.service';
const errors={ '400':{schema:'ErrorResponse',description:'Unsupported or invalid nonspatial draft'},'401':{schema:'ErrorResponse',description:'Contributing actor required; deployed simulations disabled'},'403':{schema:'ErrorResponse',description:'Contribution not authorized'},'409':{schema:'ErrorResponse',description:'Changed intent or no longer eligible public candidate'},'429':{schema:'ErrorResponse',description:'Shared bounded local contribution budget'},'500':{schema:'ErrorResponse',description:'Internal error'},'503':{schema:'ErrorResponse',description:'Unavailable; retry unchanged intent'} } as const;
@Controller('api/v1/contributions/boarding')
export class BoardingDuplicatesController {
  constructor(private readonly service:BoardingDuplicatesService,@Inject(IDENTITY_PROVIDER)private readonly identity:IdentityProvider){}
  @Post('duplicates') @HttpCode(200) @Header('Cache-Control','no-store') @RequirePermission({action:'suggest'}) @UseGuards(DuplicateRateGuard)
  @ApiContract({summary:'Synthetic public-text HIDDEN/AREA_ONLY advertisement candidates only; no residential geography or private fingerprints',protected:true,bodySchema:'BoardingDuplicateInput',responses:{'200':{schema:'BoardingDuplicateResult',description:'Possible public matches, never identity proof'},...errors}})
  async check(@Req()request:unknown,@Body(new ContractValidationPipe(BoardingDuplicateInputSchema))input:BoardingDuplicateInput){return this.service.check(await this.identity.resolveRequestActor(request),input);}
  @Post('resolve') @HttpCode(200) @Header('Cache-Control','no-store') @RequirePermission({action:'suggest'}) @UseGuards(DuplicateRateGuard)
  @ApiContract({summary:'Attach a held synthetic recommendation to a current canonical public advertisement, or retain private ambiguity; no merge/publication/authority transfer',protected:true,bodySchema:'BoardingResolutionInput',responses:{'200':{schema:'BoardingResolutionReceipt',description:'Own held receipt with a currently eligible canonical ID or opaque review-required state'},...errors}})
  async resolve(@Req()request:unknown,@Body(new ContractValidationPipe(BoardingResolutionInputSchema))input:BoardingResolutionInput){return this.service.resolve(await this.identity.resolveRequestActor(request),input);}
}
