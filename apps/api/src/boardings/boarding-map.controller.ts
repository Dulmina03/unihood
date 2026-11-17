import { Body,Controller,ForbiddenException,Get,Header,HttpCode,Inject,Param,Patch,Post,Query,Req } from '@nestjs/common';
import { BoardingMapChangeSchema,BoardingMapQuerySchema,PublicIdSchema,type BoardingMapChange,type IdentityProvider,type PermissionService } from '@unihood/contracts';
import { ContractValidationPipe } from '../http/contract-validation.pipe';
import { ApiContract } from '../openapi/operation';
import { RequirePermission } from '../identity/protected-boundary.guard';
import { IDENTITY_PROVIDER,PERMISSION_SERVICE } from '../identity/tokens';
import { BoardingMapService } from './boarding-map.service';
const errors={'400':{schema:'ErrorResponse',description:'Invalid request'},'500':{schema:'ErrorResponse',description:'Internal error'},'503':{schema:'ErrorResponse',description:'Service unavailable'}} as const;
const protectedErrors={...errors,'401':{schema:'ErrorResponse',description:'No local/test actor'},'403':{schema:'ErrorResponse',description:'No property permission'},'404':{schema:'ErrorResponse',description:'Synthetic fixture unavailable'}} as const;
@Controller('api/v1')
export class BoardingMapController {
 constructor(private readonly service:BoardingMapService,@Inject(IDENTITY_PROVIDER)private readonly identity:IdentityProvider,@Inject(PERMISSION_SERVICE)private readonly permissions:PermissionService){}
 @Get('boardings/map') @Header('Cache-Control','no-store')
 @ApiContract({summary:'Current owner-consented PUBLIC_MAP entrances only; synthetic local/test data, no private spatial lookup',querySchema:'BoardingMapQuery',responses:{'200':{schema:'BoardingMapPage',description:'Current eligible pins in title order'},...errors}})
 list(@Query(new ContractValidationPipe(BoardingMapQuerySchema)) q:{page?:string;pageSize?:string;q?:string}){return this.service.list(q);}
 @Get('owner/boardings/:boardingId/map-settings') @Header('Cache-Control','no-store') @RequirePermission({action:'manage'})
 @ApiContract({summary:'Read fictional owner fixture mode and revision; no location payload',protected:true,authorization:'Issued local/test property manager only; no production identity adapter',responses:{'200':{schema:'BoardingMapSettings',description:'Minimal current settings'},...protectedErrors}})
 settings(@Param('boardingId',new ContractValidationPipe(PublicIdSchema)) id:string){return this.service.settings(id);}
 @Patch('boardings/:id/visibility') @HttpCode(200) @Header('Cache-Control','no-store') @RequirePermission({action:'manage',propertyParam:'id'})
 @ApiContract({summary:'Canonical visibility change: atomic consent/revocation for the closed synthetic owner fixture only',protected:true,authorization:'Issued local/test property management; PUBLIC_MAP additionally requires exact-location permission and explicit consent. Real-data and deployed writes remain denied.',bodySchema:'BoardingMapChange',responses:{'200':{schema:'BoardingMapSettings',description:'Committed settings; same canonical identity, no geometry'},'409':{schema:'ErrorResponse',description:'Revision changed; reload before deliberate retry'},...protectedErrors}})
 visibility(@Param('id',new ContractValidationPipe(PublicIdSchema)) id:string,@Body(new ContractValidationPipe(BoardingMapChangeSchema)) input:BoardingMapChange,@Req() req:unknown){return this.change(id,input,req);}
 @Post('owner/boardings/:boardingId/map-settings') @HttpCode(200) @Header('Cache-Control','no-store') @RequirePermission({action:'manage'})
 @ApiContract({summary:'Change visibility of the closed fictional owner fixture only; revision-safe atomic consent/revocation, never real publication',protected:true,authorization:'Issued local/test property management; PUBLIC_MAP additionally requires exact-location permission and explicit consent. No header identity authority.',bodySchema:'BoardingMapChange',responses:{'200':{schema:'BoardingMapSettings',description:'Committed settings; no geometry in response'},'409':{schema:'ErrorResponse',description:'Revision changed; reload before deliberate retry'},...protectedErrors}})
 async change(@Param('boardingId',new ContractValidationPipe(PublicIdSchema)) id:string,@Body(new ContractValidationPipe(BoardingMapChangeSchema)) input:BoardingMapChange,@Req() req:unknown){
  const actor=await this.identity.resolveRequestActor(req);if(actor.authStatus!=='LOCAL_TEST_ACTOR'||!actor.actorId||!await this.permissions.canManageProperty(actor,id)||(input.choice.visibility==='PUBLIC_MAP'&&!await this.permissions.canPublishExactBoardingLocation(actor,id)))throw new ForbiddenException();
  return this.service.change(id,input,actor.actorId);
 }
}
