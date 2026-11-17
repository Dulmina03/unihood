import { projectBoardingPublic } from './public-projection';
import { Body,Controller,ForbiddenException,Header,HttpCode,Inject,Param,Post,Req } from '@nestjs/common';
import { OwnerVisibilityPreviewInputSchema,OwnerVisibilityPreviewSchema,OwnerWizardDraftSchema,OwnerDraftCheckSchema,type IdentityProvider,type PermissionService,type OwnerWizardDraft,type OwnerVisibilityPreviewInput } from '@unihood/contracts';
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
 @Post(':boardingId/visibility-preview') @HttpCode(200) @Header('Cache-Control','no-store')
 @RequirePermission({action:'manage'})
 @ApiContract({summary:'Synthetic server-derived visibility preview only; no publication, persistence or real data',protected:true,authorization:'Issued local/test actor with property-specific management; PUBLIC_MAP additionally requires exact-location capability and explicit acknowledgement. No identity-header authority.',bodySchema:'OwnerVisibilityPreviewInput',responses:{
 '200':{schema:'OwnerVisibilityPreview',description:'Unpublished synthetic template, with server-filtered visibility fields'},'400':{schema:'ErrorResponse',description:'Invalid mode-specific input or missing explicit acknowledgement'},'401':{schema:'ErrorResponse',description:'No local/test actor; deployed access denied'},'403':{schema:'ErrorResponse',description:'No property management or public-map capability'},'500':{schema:'ErrorResponse',description:'Internal error'}}})
 async preview(@Param('boardingId') id:string,@Body(new ContractValidationPipe(OwnerVisibilityPreviewInputSchema)) input:OwnerVisibilityPreviewInput,@Req() request:unknown){
  const actor=await this.identity.resolveRequestActor(request);
  if(actor.authStatus!=='LOCAL_TEST_ACTOR'||!await this.permissions.canManageProperty(actor,id)||(input.visibility==='PUBLIC_MAP'&&!await this.permissions.canPublishExactBoardingLocation(actor,id)))throw new ForbiddenException();
  // Closed, curated fictional template. Unreviewed wizard text never becomes
  // public merely because it parses or an owner checked a consent box.
  const preview=projectBoardingPublic({id,title:'Synthetic owner visibility preview',publisherKind:'OWNER_OFFICIAL',dataKind:'SYNTHETIC',authorizationStatus:'LOCAL_TEST_AUTHORIZED',visibility:input.visibility,
   localityConsent:input.visibility==='AREA_ONLY',locality:input.visibility==='AREA_ONLY'?input.locality:null,publicMapConsent:input.visibility==='PUBLIC_MAP',
   ...(input.visibility==='PUBLIC_MAP'?{publicEntrance:{boardingId:id,purpose:'OWNER_SELECTED_PUBLIC_ENTRANCE',lat:0,lng:0}}:{})});
  if(!preview)throw new ForbiddenException();
  return OwnerVisibilityPreviewSchema.parse({outcome:'PREVIEW_ONLY',published:false,provenance:{dataKind:'SYNTHETIC',sourceLabel:'Fictional entrance template; no real property, location or verified owner',verifiedAt:null},preview});
 }

}
