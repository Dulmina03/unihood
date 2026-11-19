import {Body,Controller,Get,Header,HttpCode,Inject,Param,Post,Req,UseGuards} from '@nestjs/common';
import {BoardingRequestInputSchema,PublicIdSchema,type IdentityProvider} from '@unihood/contracts';
import {ContractValidationPipe} from '../http/contract-validation.pipe';
import {RequirePermission} from '../identity/protected-boundary.guard';
import {IDENTITY_PROVIDER} from '../identity/tokens';
import {DuplicateRateGuard} from '../duplicates/duplicate.controller';
import {ApiContract} from '../openapi/operation';
import {BoardingRequestService} from './boarding-request.service';

const errors = {
  '400': {schema:'ErrorResponse',description:'Invalid request, unavailable action or location already public'},
  '401': {schema:'ErrorResponse',description:'Contributing actor required; deployed mode closed'},
  '403': {schema:'ErrorResponse',description:'Only the local synthetic contributor may send mock requests'},
  '404': {schema:'ErrorResponse',description:'Owner advertisement or requester-owned request unavailable'},
  '409': {schema:'ErrorResponse',description:'Request key reused with different intent'},
  '429': {schema:'ErrorResponse',description:'Shared bounded simulator budget'},
  '500': {schema:'ErrorResponse',description:'Internal error'},
  '503': {schema:'ErrorResponse',description:'Unavailable; retry unchanged request'},
} as const;
const auth = 'Issued local/test contributing capability only; production/staging disabled. No owner notification, contact disclosure or location disclosure.';

@Controller('api/v1/boarding-requests')
export class BoardingRequestController {
  constructor(private readonly service: BoardingRequestService, @Inject(IDENTITY_PROVIDER) private readonly identity: IdentityProvider) {}
  @Post() @HttpCode(200) @Header('Cache-Control','no-store') @RequirePermission({action:'suggest'}) @UseGuards(DuplicateRateGuard)
  @ApiContract({summary:'Record an owner-ad contact or location mock request without notifying, disclosing or changing publication',protected:true,authorization:auth,bodySchema:'BoardingRequestInput',responses:{
    '200':{schema:'BoardingRequestReceipt',description:'Pending synthetic receipt; owner not notified and no location disclosed'},...errors}})
  async create(@Req() request: unknown, @Body(new ContractValidationPipe(BoardingRequestInputSchema)) input: unknown) {
    return this.service.create(await this.identity.resolveRequestActor(request), input);
  }
  @Get(':requestId') @Header('Cache-Control','no-store') @RequirePermission({action:'suggest'})
  @ApiContract({summary:'Read only the requesting contributor’s mock request status; no owner private facts',protected:true,authorization:auth,responses:{
    '200':{schema:'BoardingRequestStatusView',description:'Pending synthetic status; never owner notification or location access'},...errors}})
  async status(@Param('requestId',new ContractValidationPipe(PublicIdSchema)) requestId: string, @Req() request: unknown) {
    return this.service.status(await this.identity.resolveRequestActor(request), requestId);
  }
}
