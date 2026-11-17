import { Body,Controller,ForbiddenException,Header,HttpCode,Inject,Param,Post,Req } from '@nestjs/common';
import { OwnerWizardDraftSchema,OwnerDraftCheckSchema,type IdentityProvider,type PermissionService,type OwnerWizardDraft } from '@unihood/contracts';
import { IDENTITY_PROVIDER,PERMISSION_SERVICE } from '../identity/tokens';
import { RequirePermission } from '../identity/protected-boundary.guard';
import { ContractValidationPipe } from '../http/contract-validation.pipe';
import { ApiContract } from '../openapi/operation';
@Controller('api/v1/owner/boardings')
export class OwnerDraftController {
 constructor(@Inject(IDENTITY_PROVIDER) private readonly identity:IdentityProvider,@Inject(PERMISSION_SERVICE) private readonly permissions:PermissionService){}
 @Post(':boardingId/draft-check') @HttpCode(200) @Header('Cache-Control','no-store')
 @RequirePermission({action:'manage'})
 @ApiContract({summary:'Local/test owner draft validation only; never persists, publishes, claims or changes a property',protected:true,authorization:'Issued local/test owner actor with MANAGE_PROPERTY for the exact boarding; PUBLIC_MAP draft also requires PUBLISH_EXACT_LOCATION. No production publication or identity-header authority.',bodySchema:'OwnerWizardDraft',responses:{
 '200':{schema:'OwnerDraftCheck',description:'Synthetic draft checked; browser-session save remains optional; nothing published'},
 '400':{schema:'ErrorResponse',description:'Invalid synthetic draft'},'401':{schema:'ErrorResponse',description:'No local/test actor; deployed access denied'},
 '403':{schema:'ErrorResponse',description:'No property-specific management or requested map capability'},'500':{schema:'ErrorResponse',description:'Internal error'}}})
 async check(@Param('boardingId') id:string,@Body(new ContractValidationPipe(OwnerWizardDraftSchema)) draft:OwnerWizardDraft,@Req() request:unknown){
  const actor=await this.identity.resolveRequestActor(request);
  if(actor.authStatus!=='LOCAL_TEST_ACTOR'||!await this.permissions.canManageProperty(actor,id)||
    (draft.requestedVisibility==='PUBLIC_MAP'&&!await this.permissions.canPublishExactBoardingLocation(actor,id)))throw new ForbiddenException();
  // No repository, canonical creation, authority grant, media or geometry side effect.
  return OwnerDraftCheckSchema.parse({outcome:'DRAFT_ONLY',published:false,draft});
 }
}
