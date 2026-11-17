import type { PoiRiskFlag } from '@unihood/contracts';
// Conservative English/contact/link signals for holding synthetic examples.
// Absence of a signal never certifies safe text or authorizes publication.
export function poiReviewPolicy(text:string){
 const flags:PoiRiskFlag[]=[];
 if(/\b(boarding|residential|bedroom|owner|vacancy|rent)\b/i.test(text))flags.push('PRIVATE_TEXT');
 if(/@|(?:\+?\d[\d ()-]{6,}\d)/.test(text))flags.push('CONTACT_TEXT');
 if(/https?:\/\/|www\./i.test(text))flags.push('EXTERNAL_REFERENCE');
 return {reviewState:flags.length?'NEEDS_EVIDENCE' as const:'PENDING' as const,flags};
}
