import {Body,Controller,Get,Header,HttpCode,Inject,Param,Post,Req,UseGuards} from '@nestjs/common';
import {PublicIdSchema,ReportAppealInputSchema,ReportInputSchema,ReportOperatorInputSchema,type IdentityProvider} from '@unihood/contracts';
import {IDENTITY_PROVIDER} from '../identity/tokens';
import {RequirePermission} from '../identity/protected-boundary.guard';
import {DuplicateRateGuard} from '../duplicates/duplicate.controller';
import {ContractValidationPipe} from '../http/contract-validation.pipe';
import {ApiContract} from '../openapi/operation';
import {ReportService} from './report.service';
const errors={'400':{schema:'ErrorResponse',description:'Invalid, future-dated or mismatched structured report input'},'401':{schema:'ErrorResponse',description:'Authenticated contributing actor required; deployed mode closed'},'403':{schema:'ErrorResponse',description:'Not authorized for this report action'},'404':{schema:'ErrorResponse',description:'Unavailable target, report or ineligible route segment'},'409':{schema:'ErrorResponse',description:'Changed idempotency intent or conflicting case state'},'429':{schema:'ErrorResponse',description:'Shared bounded simulator budget'},'500':{schema:'ErrorResponse',description:'Internal error'},'503':{schema:'ErrorResponse',description:'Unavailable evidence encryption or retry unchanged request'}} as const;
const protectedNote='Issued local/test actor only; production/staging writes fail closed. Reporter identity and confidential evidence are never returned.';
@Controller('api/v1/reports')
export class ReportController{
 constructor(private readonly service:ReportService,@Inject(IDENTITY_PROVIDER)private readonly identity:IdentityProvider){}
 @Post() @HttpCode(200) @Header('Cache-Control','no-store') @RequirePermission({action:'suggest'}) @UseGuards(DuplicateRateGuard)
 @ApiContract({summary:'Hold a confidential structured report; only obvious private-data exposure or inappropriate media temporarily suppresses its public target',protected:true,authorization:protectedNote,bodySchema:'ReportInput',responses:{'200':{schema:'ReportReceipt',description:'Own protected receipt; canonical P0/P1/P2 severity and reversible public effect only'},...errors}})
 async create(@Req()request:unknown,@Body(new ContractValidationPipe(ReportInputSchema))input:unknown){return this.service.create(await this.identity.resolveRequestActor(request),input);}
 @Get(':reportId') @Header('Cache-Control','no-store') @RequirePermission({action:'suggest'})
 @ApiContract({summary:'Actor-scoped report status for the reporter or affected property manager only; no reporter identity, evidence or operator notes',protected:true,authorization:protectedNote,responses:{'200':{schema:'ReportStatusView',description:'Redacted status, canonical severity, public effect and appeal outcome only'},...errors}})
 async status(@Req()request:unknown,@Param('reportId',new ContractValidationPipe(PublicIdSchema))reportId:string){return this.service.status(await this.identity.resolveRequestActor(request),reportId);}
 @Post(':reportId/appeal') @HttpCode(200) @Header('Cache-Control','no-store') @RequirePermission({action:'suggest'}) @UseGuards(DuplicateRateGuard)
 @ApiContract({summary:'Reporter or affected property manager opens one encrypted private appeal; decisions stay with restricted local/test operators',protected:true,authorization:protectedNote,bodySchema:'ReportAppealInput',responses:{'200':{schema:'ReportAppealReceipt',description:'Protected appeal receipt; no reason disclosure or automatic ownership effect'},...errors}})
 async appeal(@Req()request:unknown,@Param('reportId',new ContractValidationPipe(PublicIdSchema))reportId:string,@Body(new ContractValidationPipe(ReportAppealInputSchema))input:unknown){return this.service.appeal(await this.identity.resolveRequestActor(request),reportId,input);}
 @Post(':reportId/operator') @HttpCode(200) @Header('Cache-Control','no-store') @RequirePermission({action:'operateReports'}) @UseGuards(DuplicateRateGuard)
 @ApiContract({summary:'Synthetic local/test operator only: restore suppressed public data, dismiss a held case or decide an open appeal',protected:true,authorization:protectedNote,bodySchema:'ReportOperatorInput',responses:{'200':{schema:'ReportOperatorReceipt',description:'Restricted reversible case transition; never transfers ownership, force-merges or edits official facts'},...errors}})
 async operate(@Req()request:unknown,@Param('reportId',new ContractValidationPipe(PublicIdSchema))reportId:string,@Body(new ContractValidationPipe(ReportOperatorInputSchema))input:unknown){return this.service.operate(await this.identity.resolveRequestActor(request),reportId,input);}
}
