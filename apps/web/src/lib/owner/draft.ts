import { OwnerWizardDraftSchema,type OwnerWizardDraft } from '@unihood/contracts';
import { duplicateEndpoint } from '../places/duplicate-endpoint';
export const ownerProperty='00000000-0000-4000-8000-000000000001';
export const ownerDraftKey='unihood:synthetic-owner-draft:v1';
export const emptyOwnerDraft:OwnerWizardDraft={version:1,title:'',summary:'',facilities:[],requestedVisibility:'HIDDEN',locality:null,mediaConsent:false};
export function ownerDraftEndpoint(env:Readonly<Record<string,string|undefined>>){return duplicateEndpoint(env)?.replace(/\/duplicates\/check$/,`/owner/boardings/${ownerProperty}/draft-check`)??null;}
export function readOwnerDraft(storage:Pick<Storage,'getItem'|'removeItem'>):{draft:OwnerWizardDraft|null;unavailable:boolean}{
 try{const raw=storage.getItem(ownerDraftKey);if(raw===null)return {draft:null,unavailable:false};if(raw.length>4000)throw new Error();const value=OwnerWizardDraftSchema.safeParse(JSON.parse(raw));if(!value.success){storage.removeItem(ownerDraftKey);return {draft:null,unavailable:true};}return {draft:value.data,unavailable:false};}catch{return {draft:null,unavailable:true};}
}
export function saveOwnerDraft(storage:Pick<Storage,'setItem'>,draft:unknown){try{storage.setItem(ownerDraftKey,JSON.stringify(OwnerWizardDraftSchema.parse(draft)));return true;}catch{return false;}}
