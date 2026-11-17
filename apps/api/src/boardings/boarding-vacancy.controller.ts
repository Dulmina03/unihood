import {Body,Controller,ForbiddenException,Get,Header,HttpCode,Inject,Param,Post,Query,Req} from '@nestjs/common';
import {BoardingUnitQuerySchema,OwnerVacancyInputSchema,PublicIdSchema,type IdentityProvider,type PermissionService,type OwnerVacancyInput} from '@unihood/contracts';
import {ApiContract} from '../openapi/operation';
import {ContractValidationPipe} from '../http/contract-validation.pipe';
import {RequirePermission} from '../identity/protected-boundary.guard';
import {IDENTITY_PROVIDER,PERMISSION_SERVICE} from '../identity/tokens';
import {BoardingVacancyService} from './boarding-vacancy.service';
const errors={'400':{schema:'ErrorResponse',description:'Invalid confirmation'},'401':{schema:'ErrorResponse',description:'No issued local/test actor'},'403':{schema:'ErrorResponse',description:'Property permission denied'},'404':{schema:'ErrorResponse',description:'Not available'},'409':{schema:'ErrorResponse',description:'Revision conflict; reload'},'500':{schema:'ErrorResponse',description:'Internal error'},'503':{schema:'ErrorResponse',description:'Service unavailable'}} as const;
@Controller('api/v1')
export class BoardingVacancyController{
 constructor(private readonly service:BoardingVacancyService,@Inject(IDENTITY_PROVIDER)private readonly identity:IdentityProvider,@Inject(PERMISSION_SERVICE)private readonly permissions:PermissionService){}
 private async authorize(req:unknown,id:string,confirm=false){const actor=await this.identity.resolveRequestActor(req);if(actor.authStatus!=='LOCAL_TEST_ACTOR'||!actor.actorId||!await this.permissions.canManageProperty(actor,id)||(confirm&&!await this.permissions.canConfirmVacancy(actor,id)))throw new ForbiddenException();return actor.actorId;}
 @Post('boardings/:id/vacancy-confirmations') @HttpCode(200) @Header('Cache-Control','no-store') @RequirePermission({action:'confirmVacancy',propertyParam:'id'})
 @ApiContract({summary:'Append a scoped synthetic owner unit confirmation with server time/expiry; no geography or production writer',protected:true,authorization:'Issued local/test management plus CONFIRM_VACANCY for exact property/unit; no map consent required',bodySchema:'OwnerVacancyInput',responses:{'200':{schema:'InventoryMutation',description:'Confirmation retained; public expiry becomes UNKNOWN'},...errors}})
 async confirm(@Param('id',new ContractValidationPipe(PublicIdSchema))id:string,@Body(new ContractValidationPipe(OwnerVacancyInputSchema))input:OwnerVacancyInput,@Req()req:unknown){const actor=await this.authorize(req,id,true);return this.service.confirm(id,input,actor);}
 @Get('owner/boardings/:boardingId/units/:unitId/vacancy-confirmations') @Header('Cache-Control','no-store') @RequirePermission({action:'manage'})
 @ApiContract({summary:'Complete bounded synthetic owner confirmation history; no actor evidence or location',protected:true,authorization:'Issued local/test management for exact property/unit',querySchema:'BoardingUnitQuery',responses:{'200':{schema:'OwnerVacancyHistoryPage',description:'Retained status/reason/time/expiry/unit revisions'},...errors}})
 async history(@Param('boardingId',new ContractValidationPipe(PublicIdSchema))id:string,@Param('unitId',new ContractValidationPipe(PublicIdSchema))unitId:string,@Query(new ContractValidationPipe(BoardingUnitQuerySchema))query:{page?:string;pageSize?:string},@Req()req:unknown){await this.authorize(req,id);return this.service.history(id,unitId,query);}
}
