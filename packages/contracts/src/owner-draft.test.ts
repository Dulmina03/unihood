import { describe,it,expect } from 'vitest';
import { OwnerWizardDraftSchema,OwnerDraftCheckSchema } from './owner-draft';
const draft={version:1,title:'Synthetic Study courtyard',summary:'Fictional example, never a real property.',facilities:['Study space'],requestedVisibility:'HIDDEN',locality:null,mediaConsent:false};
describe('owner wizard input is synthetic and not a public publication contract',()=>{
 it('accepts three planned visibility choices without location fields',()=>{for(const requestedVisibility of ['HIDDEN','AREA_ONLY','PUBLIC_MAP'])expect(OwnerWizardDraftSchema.safeParse({...draft,requestedVisibility,locality:requestedVisibility==='AREA_ONLY'?'Synthetic North Quarter':null}).success).toBe(true);});
 it('rejects injected private/official fields, mismatched locality and unbounded content',()=>{
  for(const input of [{...draft,title:'Real owner verified'},{...draft,locality:'Synthetic North Quarter'},{...draft,requestedVisibility:'AREA_ONLY'},...['location','entrance','price','vacancy','phone','ownerVerified','boardingId','mediaUrl'].map(k=>({...draft,[k]:'PRIVATE_CANARY'})),{...draft,summary:'a'.repeat(401)},{...draft,facilities:['Wi-Fi','Wi-Fi']}])expect(OwnerWizardDraftSchema.safeParse(input).success).toBe(false);
 });
 it('never treats a draft check as publication',()=>{expect(OwnerDraftCheckSchema.safeParse({outcome:'DRAFT_ONLY',published:false,draft}).success).toBe(true);expect(OwnerDraftCheckSchema.safeParse({outcome:'PUBLISHED',published:true,draft}).success).toBe(false);});
});
